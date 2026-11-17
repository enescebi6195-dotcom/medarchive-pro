from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
import os, shutil, zipfile, tarfile
from ..core.database import get_db
from ..core.security import get_current_user
from ..core.config import settings
from ..models.models import Patient

router = APIRouter()


def extract_archive(fpath: str, dest_dir: str) -> int:
    """ZIP/RAR/7z/TAR arşivini aç, dosya sayısını döndür."""
    low = fpath.lower()
    try:
        if low.endswith(".zip"):
            with zipfile.ZipFile(fpath, "r") as zf:
                count = len(zf.namelist())
                zf.extractall(dest_dir)
            os.remove(fpath)
            return count
        if low.endswith((".tar.gz", ".tgz", ".tar.bz2", ".tar")):
            with tarfile.open(fpath, "r:*") as tf:
                count = len(tf.getnames())
                tf.extractall(dest_dir)
            os.remove(fpath)
            return count
        if low.endswith(".7z"):
            import py7zr
            with py7zr.SevenZipFile(fpath, mode="r") as sz:
                names = sz.getnames()
                sz.extractall(dest_dir)
            os.remove(fpath)
            return len(names)
        if low.endswith(".rar"):
            try:
                import patoolib
                patoolib.extract_archive(fpath, outdir=dest_dir)
                os.remove(fpath)
                return 1
            except ImportError:
                pass
    except Exception:
        pass
    return 0


@router.post("/upload/{pid}")
async def upload_file(
    pid: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _=Depends(get_current_user)
):
    p = db.query(Patient).filter(Patient.id == pid).first()
    if not p:
        raise HTTPException(404, "Hasta bulunamadı")

    dest_dir = p.files_dir
    if not dest_dir:
        import re
        safe = lambda s: re.sub(r'[\\/:*?"<>|]', '_', s)
        dest_dir = os.path.join(
            settings.FILES_DIR,
            f"{pid:04d}_{safe(p.name)}_{safe(p.surname)}"
        )
        p.files_dir = dest_dir
        db.commit()

    os.makedirs(dest_dir, exist_ok=True)

    # Güvenli dosya adı
    safe_name = os.path.basename(file.filename or "dosya")
    fpath = os.path.join(dest_dir, safe_name)

    with open(fpath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Arşiv ise otomatik aç
    fname_lower = safe_name.lower()
    if any(fname_lower.endswith(ext) for ext in [".zip", ".rar", ".7z", ".tar", ".tar.gz", ".tgz"]):
        count = extract_archive(fpath, dest_dir)
        if count > 0:
            return {"ok": True, "extracted": True, "count": count, "filename": safe_name}

    return {"ok": True, "extracted": False, "filename": safe_name}


@router.delete("/{pid}/{filename}")
async def delete_file(
    pid: int,
    filename: str,
    db: Session = Depends(get_db),
    _=Depends(get_current_user)
):
    p = db.query(Patient).filter(Patient.id == pid).first()
    if not p:
        raise HTTPException(404)
    fpath = os.path.join(p.files_dir or "", filename)
    if os.path.exists(fpath):
        os.remove(fpath)
    return {"ok": True}
