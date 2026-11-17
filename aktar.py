"""
aktar.py — MedArchive masaüstü veritabanını web sistemine aktarır
Kullanım: python aktar.py
"""

import sqlite3
import json
import requests
import os
import sys

SQLITE_PATH = os.path.join(os.path.expanduser("~"), "MedArchive", "medarchive.db")
API_URL     = "http://localhost/api"
USERNAME    = "admin"
PASSWORD    = os.environ.get("MEDARCHIVE_ADMIN_PASSWORD", "")  # Ortam değişkeninden alınır
if not PASSWORD:
    raise SystemExit("MEDARCHIVE_ADMIN_PASSWORD ortam değişkenini ayarlayın.")


def main():
    # 1. SQLite veritabanını aç
    if not os.path.exists(SQLITE_PATH):
        print(f"HATA: Veritabanı bulunamadı: {SQLITE_PATH}")
        sys.exit(1)

    conn = sqlite3.connect(SQLITE_PATH)
    conn.row_factory = sqlite3.Row
    patients = conn.execute("SELECT * FROM patients ORDER BY id").fetchall()
    print(f"✅ {len(patients)} hasta bulundu.")

    # 2. Web sistemine giriş yap
    print("🔑 Web sistemine giriş yapılıyor...")
    try:
        r = requests.post(f"{API_URL}/auth/login",
                          json={"username": USERNAME, "password": PASSWORD},
                          timeout=10)
        r.raise_for_status()
        token = r.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("✅ Giriş başarılı.")
    except Exception as e:
        print(f"HATA: Web sistemine bağlanılamadı: {e}")
        print("Docker çalışıyor mu? http://localhost/api/health adresini kontrol edin.")
        sys.exit(1)

    # 3. Hastaları aktar
    success = 0
    failed  = 0

    for p in patients:
        p = dict(p)
        # Links alanını parse et
        links = []
        if p.get("links"):
            try:
                links = json.loads(p["links"])
            except Exception:
                links = [p["links"]] if p["links"] else []

        payload = {
            "name":       p.get("name", ""),
            "surname":    p.get("surname", ""),
            "id_no":      p.get("id_no") or "",
            "birth_date": p.get("birth_date") or "",
            "gender":     p.get("gender") or "Belirtilmedi",
            "country":    p.get("country") or "",
            "city":       "",
            "phone":      p.get("phone") or "",
            "email":      p.get("email") or "",
            "study_type": p.get("study_type") or "MRI",
            "study_date": p.get("study_date") or "",
            "study_body": p.get("study_body") or "",
            "referring":  p.get("referring") or "",
            "notes":      p.get("notes") or "",
            "links":      links,
            "priority":   "Normal",
            "status":     p.get("status") or "Bekliyor",
        }

        try:
            r = requests.post(f"{API_URL}/patients",
                              json=payload, headers=headers, timeout=15)
            r.raise_for_status()
            new_id = r.json()["id"]

            # Rapor varsa aktar
            if p.get("report"):
                requests.put(f"{API_URL}/patients/{new_id}/report",
                             json={"report": p["report"]},
                             headers=headers, timeout=10)

            print(f"  ✅ {p['name']} {p['surname']} → ID: {new_id}")
            success += 1

        except Exception as e:
            print(f"  ❌ {p.get('name','')} {p.get('surname','')}: {e}")
            failed += 1

    conn.close()
    print(f"\n{'='*40}")
    print(f"✅ Aktarıldı: {success} hasta")
    if failed:
        print(f"❌ Başarısız: {failed} hasta")
    print(f"{'='*40}")
    print("\nWeb sistemini tarayıcıda açın: http://localhost")
    input("\nDevam etmek için Enter'a basın...")


if __name__ == "__main__":
    # requests kütüphanesi kurulu mu?
    try:
        import requests
    except ImportError:
        print("'requests' kuruluyor...")
        import subprocess
        subprocess.run([sys.executable, "-m", "pip", "install", "requests", "--quiet"])
        import requests
    main()
