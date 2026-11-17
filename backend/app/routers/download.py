from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from typing import Dict
import asyncio, os, zipfile, tarfile, urllib.request, urllib.parse, re, json, time
import http.cookiejar, sys, subprocess

from ..core.database import get_db
from ..core.security import get_current_user
from ..core.config import settings
from ..models.models import Patient
from ..schemas.schemas import DownloadRequest

router = APIRouter()
download_status: Dict[str, dict] = {}


@router.post("/start")
async def start_download(
    data: DownloadRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    p = db.query(Patient).filter(Patient.id == data.patient_id).first()
    if not p:
        raise HTTPException(404, "Hasta bulunamadı")
    job_id = f"dl_{data.patient_id}_{int(time.time())}"
    download_status[job_id] = {"status": "starting", "messages": [], "patient_id": data.patient_id}
    dest_dir = p.files_dir or os.path.join(settings.FILES_DIR, f"{data.patient_id:04d}_hasta")
    os.makedirs(dest_dir, exist_ok=True)
    if not p.files_dir:
        p.files_dir = dest_dir
        db.commit()
    background_tasks.add_task(_download_task, job_id, data.patient_id, data.links, dest_dir)
    return {"job_id": job_id}


@router.get("/status/{job_id}")
async def get_status(job_id: str, _=Depends(get_current_user)):
    if job_id not in download_status:
        raise HTTPException(404, "İş bulunamadı")
    return download_status[job_id]


async def _download_task(job_id: str, pid: int, links: list, dest_dir: str):
    status = download_status[job_id]
    status["status"] = "running"
    os.makedirs(dest_dir, exist_ok=True)

    def log(msg):
        status["messages"].append(msg)

    for i, link in enumerate(links, 1):
        log(f"[{i}/{len(links)}] İşleniyor: {link[:60]}...")
        try:
            resolved = _resolve_link(link)
            if not resolved:
                log(f"  ⚠️  Çözümlenemedi: {link[:50]}")
                continue

            fpath = None

            if resolved.startswith("__gdrive__"):
                fid = resolved.replace("__gdrive__", "")
                log("  ⬇️  Google Drive indiriliyor...")
                fpath = await asyncio.to_thread(_download_gdrive, fid, dest_dir, log)

            elif resolved.startswith("__wetransfer__"):
                url = resolved.replace("__wetransfer__", "")
                log("  🌐  WeTransfer indiriliyor...")
                fpath = await asyncio.to_thread(_download_wetransfer, url, dest_dir, log)

            else:
                fname = _fname_from_url(resolved)
                fpath = os.path.join(dest_dir, fname)
                log(f"  ⬇️  İndiriliyor: {fname}")
                await asyncio.to_thread(_download_file, resolved, fpath)
                log(f"  ✅  {fname}")

            if fpath and os.path.exists(fpath):
                extracted = _extract(fpath, dest_dir, log)
                if extracted:
                    log(f"  📦  Arşiv açıldı ({extracted} dosya)")

        except Exception as e:
            log(f"  ❌  Hata: {e}")

    # DB güncelle
    try:
        from ..core.database import SessionLocal
        db2 = SessionLocal()
        p = db2.query(Patient).filter(Patient.id == pid).first()
        if p:
            p.status = "Tamamlandı"
            db2.commit()
        db2.close()
    except Exception:
        pass

    status["status"] = "done"


# ── Link çözümleme ──────────────────────────────────────────────────

def _resolve_link(url):
    url = url.strip()
    if "drive.google.com" in url or "docs.google.com" in url:
        for pat in [r"/file/d/([a-zA-Z0-9_-]+)", r"id=([a-zA-Z0-9_-]+)"]:
            m = re.search(pat, url)
            if m:
                return f"__gdrive__{m.group(1)}"
    if "we.tl" in url or "wetransfer.com" in url:
        return f"__wetransfer__{url}"
    if "dropbox.com" in url:
        u = url.replace("www.dropbox.com", "dl.dropboxusercontent.com")
        return u.replace("?dl=0", "?dl=1") if "?dl=0" in u else (u + "?dl=1" if "?dl=1" not in u else u)
    if "1drv.ms" in url or "onedrive.live.com" in url:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=15) as resp:
                final = resp.url
            sep = "&" if "?" in final else "?"
            return final + sep + "download=1"
        except Exception:
            return url + ("&download=1" if "?" in url else "?download=1")
    if url.startswith("http"):
        return url
    return None


# ── Google Drive ────────────────────────────────────────────────────

def _download_gdrive(fid, dest_dir, log):
    jar = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"}

    req = urllib.request.Request(f"https://drive.google.com/uc?export=download&id={fid}", headers=headers)
    with opener.open(req, timeout=30) as resp:
        ct = resp.headers.get("Content-Type", "")
        raw = resp.read()

    if "text/html" not in ct:
        fpath = os.path.join(dest_dir, f"gdrive_{fid}.bin")
        open(fpath, "wb").write(raw)
        return fpath

    html = raw.decode("utf-8", errors="ignore")
    uuid_m = re.search(r'name="uuid"\s+value="([^"]+)"', html)
    dl_url = (f"https://drive.usercontent.google.com/download?id={fid}&export=download&confirm=t&uuid={uuid_m.group(1)}"
              if uuid_m else f"https://drive.usercontent.google.com/download?id={fid}&export=download&confirm=t")
    log("    Google Drive onay alındı, indiriliyor...")

    req2 = urllib.request.Request(dl_url, headers=headers)
    with opener.open(req2, timeout=180) as resp2:
        cd = resp2.headers.get("Content-Disposition", "")
        m = re.search(r'filename\*?=(?:UTF-8\'\')?["\']?([^"\';\r\n]+)', cd, re.I)
        fname = urllib.parse.unquote(m.group(1).strip().strip('"')) if m else f"gdrive_{fid}"
        fpath = os.path.join(dest_dir, fname)
        with open(fpath, "wb") as f:
            while True:
                chunk = resp2.read(65536)
                if not chunk: break
                f.write(chunk)
    log(f"    ✅  İndirildi: {fname}")
    return fpath


# ── WeTransfer - Çok Katmanlı ───────────────────────────────────────

def _download_wetransfer(url, dest_dir, log):
    """3 yöntemle WeTransfer'ı indir."""

    # Yöntem 1: Playwright
    try:
        from playwright.sync_api import sync_playwright
        log("    🎭  Playwright deneniyor...")
        result = _wt_playwright(url, dest_dir, log)
        if result:
            return result
    except ImportError:
        log("    Playwright kurulu değil.")
    except Exception as e:
        log(f"    Playwright hatası: {e}")

    # Yöntem 2: yt-dlp
    log("    📦  yt-dlp deneniyor...")
    result = _wt_ytdlp(url, dest_dir, log)
    if result:
        return result

    # Yöntem 3: Doğrudan API
    log("    🔗  API deneniyor...")
    result = _wt_api(url, dest_dir, log)
    if result:
        return result

    log("    ❌  WeTransfer otomatik indirilemedi.")
    log("    💡  'Dosya Yükle' butonuyla manuel ekleyebilirsiniz.")
    return None


def _wt_playwright(url, dest_dir, log):
    from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
    before = set(os.listdir(dest_dir))

    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage",
                  "--disable-blink-features=AutomationControlled"]
        )
        ctx = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
            accept_downloads=True,
        )
        ctx.add_init_script("Object.defineProperty(navigator,'webdriver',{get:()=>undefined})")
        page = ctx.new_page()

        try:
            page.goto(url, wait_until="domcontentloaded", timeout=30000)
        except PWTimeout:
            pass
        time.sleep(5)

        # Çerez kapat
        for sel in ["button:has-text('Kabul ediyorum')", "button:has-text('Tümüne İzin Ver')",
                    "button:has-text('Accept')", "#onetrust-accept-btn-handler"]:
            try:
                b = page.locator(sel).first
                if b.is_visible(timeout=1500):
                    b.click()
                    time.sleep(4)
                    break
            except Exception:
                pass

        # Buton ara
        download_btn = None
        for attempt in range(10):
            time.sleep(3)
            # CardTrigger
            try:
                if page.locator("[class*='CardTrigger']").count() > 0:
                    card = page.locator("[class*='CardTrigger']").first
                    if card.is_visible(timeout=1000):
                        download_btn = card
                        break
                    else:
                        page.evaluate("document.querySelector('[class*=CardTrigger]')?.click()")
                        time.sleep(4)
            except Exception:
                pass
            # Metin bazlı
            for kw in ["Download", "İndir", "Hepsini"]:
                try:
                    e = page.get_by_role("button", name=re.compile(kw, re.I)).first
                    if e.is_visible(timeout=1000):
                        download_btn = e
                        break
                except Exception:
                    pass
            if download_btn:
                break

        if not download_btn:
            browser.close()
            return None

        log("    🖱️  İndirme butonu tıklanıyor...")
        try:
            with page.expect_download(timeout=60000) as dl_info:
                download_btn.click()
            dl = dl_info.value
            fname = dl.suggested_filename or f"wetransfer_{int(time.time())}.zip"
            fpath = os.path.join(dest_dir, fname)
            dl.save_as(fpath)
            log(f"    ✅  Playwright: {fname}")
            browser.close()
            return fpath
        except PWTimeout:
            time.sleep(5)
            current = set(os.listdir(dest_dir))
            new_files = [f for f in current - before if not f.endswith(".crdownload")]
            if new_files:
                fpath = os.path.join(dest_dir, new_files[0])
                log(f"    ✅  {new_files[0]}")
                browser.close()
                return fpath
            browser.close()
            return None


def _wt_ytdlp(url, dest_dir, log):
    before = set(os.listdir(dest_dir))
    try:
        cmd = [sys.executable, "-m", "yt_dlp", "--no-warnings",
               "--retries", "5", "--socket-timeout", "30",
               "-o", os.path.join(dest_dir, "%(title)s.%(ext)s"), url]
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        current = set(os.listdir(dest_dir))
        new_files = [f for f in current - before if not f.endswith(".part")]
        if new_files and proc.returncode == 0:
            log(f"    ✅  yt-dlp: {new_files[0]}")
            return os.path.join(dest_dir, new_files[0])
    except Exception as e:
        log(f"    yt-dlp: {e}")
    return None


def _wt_api(url, dest_dir, log):
    headers = {"User-Agent": "Mozilla/5.0 Chrome/120.0.0.0",
               "Accept": "application/json", "x-requested-with": "XMLHttpRequest"}
    try:
        m = re.search(r"/downloads/([^/?#]+)/([^/?#]+)", url)
        if m:
            transfer_id, security_hash = m.groups()
            api = f"https://wetransfer.com/api/v4/transfers/{transfer_id}/download"
            payload = json.dumps({
                "security_hash": security_hash,
                "intent": "entire_transfer",
            }).encode("utf-8")
            req = urllib.request.Request(api, data=payload, method="POST", headers={
                **headers,
                "Content-Type": "application/json",
                "Origin": "https://wetransfer.com",
                "Referer": url,
            })
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read())
            direct = data.get("direct_link") or data.get("url")
            if direct:
                log("    API bağlantısı alındı, indiriliyor...")
                return _download_file_to(direct, dest_dir, log)

        req = urllib.request.Request(url, headers={"User-Agent": headers["User-Agent"]})
        with urllib.request.urlopen(req, timeout=20) as resp:
            final_url = resp.url
            html = resp.read().decode("utf-8", errors="ignore")

        m = re.search(r'"direct_link"\s*:\s*"([^"]+)"', html)
        if m:
            return _download_file_to(m.group(1).replace("\\u0026", "&"), dest_dir, log)

        for pat in [r"/downloads/([a-f0-9]+)", r"/transfers/([a-zA-Z0-9]+)"]:
            m = re.search(pat, final_url + html)
            if m:
                h = m.group(1)
                for api in [f"https://wetransfer.com/api/v4/transfers/{h}/download",
                            f"https://wetransfer.com/api/ui/transfers/{h}/download"]:
                    try:
                        r2 = urllib.request.Request(api, headers=headers)
                        with urllib.request.urlopen(r2, timeout=15) as resp2:
                            data = json.loads(resp2.read())
                            direct = data.get("direct_link") or data.get("url")
                            if direct:
                                return _download_file_to(direct, dest_dir, log)
                    except Exception:
                        pass
    except Exception as e:
        log(f"    API: {e}")
    return None


def _download_file_to(url, dest_dir, log):
    headers = {"User-Agent": "Mozilla/5.0 Chrome/120.0.0.0"}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=120) as resp:
        cd = resp.headers.get("Content-Disposition", "")
        m = re.search(r'filename\*?=(?:UTF-8\'\')?["\']?([^"\';\r\n]+)', cd, re.I)
        fname = urllib.parse.unquote(m.group(1).strip().strip('"')) if m else f"wt_{int(time.time())}.zip"
        fpath = os.path.join(dest_dir, fname)
        with open(fpath, "wb") as f:
            while True:
                chunk = resp.read(65536)
                if not chunk: break
                f.write(chunk)
    log(f"    ✅  {fname}")
    return fpath


# ── Genel ──────────────────────────────────────────────────────────

def _download_file(url, path):
    headers = {"User-Agent": "Mozilla/5.0 Chrome/120.0.0.0"}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=120) as r, open(path, "wb") as f:
        while True:
            chunk = r.read(65536)
            if not chunk: break
            f.write(chunk)


def _fname_from_url(url):
    name = urllib.parse.unquote(os.path.basename(urllib.parse.urlparse(url).path))
    return name if name and "." in name else f"dosya_{int(time.time())}.bin"


def _extract(path, dest, log):
    if not os.path.exists(path): return 0
    low = path.lower()
    try:
        if low.endswith(".zip"):
            with zipfile.ZipFile(path, "r") as zf:
                count = len(zf.namelist()); zf.extractall(dest)
            os.remove(path); return count
        if low.endswith((".tar.gz", ".tgz", ".tar.bz2", ".tar")):
            with tarfile.open(path, "r:*") as tf:
                count = len(tf.getnames()); tf.extractall(dest)
            os.remove(path); return count
        if low.endswith(".7z"):
            import py7zr
            with py7zr.SevenZipFile(path, mode="r") as sz:
                names = sz.getnames(); sz.extractall(dest)
            os.remove(path); return len(names)
        if low.endswith(".rar"):
            before = set()
            for root, _, files in os.walk(dest):
                for f in files:
                    before.add(os.path.join(root, f))
            proc = subprocess.run(
                ["unar", "-force-overwrite", "-o", dest, path],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                timeout=300,
            )
            after = set()
            for root, _, files in os.walk(dest):
                for f in files:
                    after.add(os.path.join(root, f))
            extracted = len(after - before)
            if proc.returncode != 0 and extracted == 0:
                raise RuntimeError(proc.stdout[-1000:])
            if proc.returncode != 0:
                log(f"  ⚠️  RAR kısmi açıldı ({extracted} dosya). Bazı arşiv girdileri bozuk olabilir.")
            os.remove(path)
            return max(1, extracted)
    except Exception as e:
        log(f"  ⚠️  Arşiv açma: {e}")
    return 0
