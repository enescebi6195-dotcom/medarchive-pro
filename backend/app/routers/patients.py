from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, desc
from typing import Optional, List
import os, re
from datetime import datetime

from ..core.database import get_db
from ..core.security import get_current_user
from ..core.config import settings
from ..models.models import User, Patient, ActivityLog, Comment
from ..schemas.schemas import PatientCreate, PatientUpdate, PatientOut, CommentCreate, CommentOut

router = APIRouter()

def _make_patient_dir(pid: int, name: str, surname: str) -> str:
    safe = lambda s: re.sub(r'[\\/:*?"<>|]', '_', s)
    folder = f"{pid:04d}_{safe(name)}_{safe(surname)}"
    path = os.path.join(settings.FILES_DIR, folder)
    os.makedirs(path, exist_ok=True)
    return path

def _log(db, user_id, action, detail, patient_id=None, ip=None):
    db.add(ActivityLog(user_id=user_id, action=action, detail=detail,
                       patient_id=patient_id, ip_address=ip))


@router.get("", response_model=dict)
async def list_patients(
    q: Optional[str] = Query(None),
    status: Optional[str] = None,
    priority: Optional[str] = None,
    study_type: Optional[str] = None,
    assigned_to: Optional[int] = None,
    page: int = 1,
    per_page: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Patient)
    if q:
        query = query.filter(or_(
            Patient.name.ilike(f"%{q}%"),
            Patient.surname.ilike(f"%{q}%"),
            Patient.id_no.ilike(f"%{q}%"),
            Patient.country.ilike(f"%{q}%"),
            Patient.study_body.ilike(f"%{q}%"),
            Patient.referring.ilike(f"%{q}%"),
        ))
    if status:  query = query.filter(Patient.status == status)
    if priority: query = query.filter(Patient.priority == priority)
    if study_type: query = query.filter(Patient.study_type == study_type)
    if assigned_to: query = query.filter(Patient.assigned_to_id == assigned_to)

    total = query.count()
    patients = query.order_by(desc(Patient.created_at))\
                    .offset((page-1)*per_page).limit(per_page).all()
    return {
        "total": total, "page": page, "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
        "items": [PatientOut.model_validate(p).model_dump() for p in patients]
    }


@router.post("", response_model=PatientOut)
async def create_patient(
    data: PatientCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    p = Patient(**data.model_dump(), created_by_id=current_user.id)
    p.status = "Bekliyor" if data.links else "Link Yok"
    db.add(p); db.flush()
    p.files_dir = _make_patient_dir(p.id, p.name, p.surname)
    db.commit(); db.refresh(p)
    _log(db, current_user.id, "patient_create",
         f"{p.name} {p.surname} oluşturuldu", p.id,
         request.client.host if request.client else None)
    db.commit()
    return p


@router.get("/{pid}", response_model=PatientOut)
async def get_patient(pid: int, db: Session = Depends(get_db),
                      current_user: User = Depends(get_current_user)):
    p = db.query(Patient).filter(Patient.id == pid).first()
    if not p: raise HTTPException(404, "Hasta bulunamadı")
    return p


@router.put("/{pid}", response_model=PatientOut)
async def update_patient(
    pid: int, data: PatientUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    p = db.query(Patient).filter(Patient.id == pid).first()
    if not p: raise HTTPException(404, "Hasta bulunamadı")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    db.commit(); db.refresh(p)
    _log(db, current_user.id, "patient_update",
         f"{p.name} {p.surname} güncellendi", pid,
         request.client.host if request.client else None)
    db.commit()
    return p


@router.delete("/{pid}")
async def delete_patient(
    pid: int, db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ("admin", "doctor"):
        raise HTTPException(403, "Yetki yok")
    p = db.query(Patient).filter(Patient.id == pid).first()
    if not p: raise HTTPException(404, "Hasta bulunamadı")
    _log(db, current_user.id, "patient_delete", f"{p.name} {p.surname} silindi", pid)
    db.delete(p); db.commit()
    return {"ok": True}


@router.put("/{pid}/report")
async def save_report(
    pid: int, body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    p = db.query(Patient).filter(Patient.id == pid).first()
    if not p: raise HTTPException(404, "Hasta bulunamadı")
    p.report = body.get("report", "")
    p.report_date = datetime.utcnow()
    db.commit()
    _log(db, current_user.id, "report_save", f"Rapor kaydedildi", pid)
    db.commit()
    return {"ok": True}


@router.post("/{pid}/links")
async def add_links(
    pid: int, body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    p = db.query(Patient).filter(Patient.id == pid).first()
    if not p: raise HTTPException(404, "Hasta bulunamadı")
    new_links = body.get("links", [])
    existing = p.links or []
    combined = existing + [l for l in new_links if l not in existing]
    p.links = combined
    db.commit()
    return {"links": combined}


# YENİ: Tek link sil
@router.delete("/{pid}/links/{link_index}")
async def delete_link(
    pid: int, link_index: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    p = db.query(Patient).filter(Patient.id == pid).first()
    if not p: raise HTTPException(404, "Hasta bulunamadı")
    links = list(p.links or [])
    if link_index < 0 or link_index >= len(links):
        raise HTTPException(400, "Geçersiz link indeksi")
    removed = links.pop(link_index)
    p.links = links
    db.commit()
    _log(db, current_user.id, "link_delete", f"Link silindi: {removed[:60]}", pid)
    db.commit()
    return {"links": links}


@router.get("/{pid}/comments", response_model=List[CommentOut])
async def get_comments(pid: int, db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_user)):
    comments = db.query(Comment).filter(Comment.patient_id == pid).all()
    result = []
    for c in comments:
        co = CommentOut.model_validate(c).model_dump()
        if c.user:
            co["username"] = c.user.full_name or c.user.username
        result.append(co)
    return result


@router.post("/{pid}/comments", response_model=CommentOut)
async def add_comment(
    pid: int, data: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    c = Comment(patient_id=pid, user_id=current_user.id, text=data.text)
    db.add(c); db.commit(); db.refresh(c)
    result = CommentOut.model_validate(c).model_dump()
    result["username"] = current_user.full_name or current_user.username
    return result


@router.get("/{pid}/files")
async def get_files(pid: int, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_user)):
    p = db.query(Patient).filter(Patient.id == pid).first()
    if not p: raise HTTPException(404, "Hasta bulunamadı")

    if not p.files_dir:
        safe = lambda s: re.sub(r'[\\/:*?"<>|]', '_', s)
        p.files_dir = os.path.join(
            settings.FILES_DIR,
            f"{p.id:04d}_{safe(p.name)}_{safe(p.surname)}"
        )
        db.commit()

    files_dir = p.files_dir
    os.makedirs(files_dir, exist_ok=True)

    if not os.path.exists(files_dir):
        return {"files": [], "folders": [], "dir": files_dir, "folder_name": ""}

    # Klasör yapısını oluştur
    folder_map = {}
    flat_files = []
    try:
        top_dirs = [
            d for d in os.listdir(files_dir)
            if os.path.isdir(os.path.join(files_dir, d)) and not d.startswith("_debug")
        ]
    except Exception:
        top_dirs = []
    collapse_series_dirs = len(top_dirs) > 1 and all(re.match(r"^seri\d+$", d, re.I) for d in top_dirs)

    for root, dirs, files in os.walk(files_dir):
        dirs[:] = [d for d in dirs if not d.startswith("_debug")]
        rel_dir = os.path.relpath(root, files_dir)
        if rel_dir == ".":
            rel_dir = ""

        for f in files:
            if f.startswith("_debug"): continue
            fpath = os.path.join(root, f)
            rel_full = os.path.relpath(fpath, files_dir)
            ext = f.lower().rsplit(".", 1)[-1] if "." in f else ""
            try:
                size = os.path.getsize(fpath)
            except Exception:
                size = 0
            rel_parts = rel_full.split(os.sep)
            group_key = rel_parts[0] if len(rel_parts) > 1 else (rel_dir or "(kök)")
            if collapse_series_dirs and group_key in top_dirs:
                group_key = "(indirilen dosyalar)"
            info = {
                "name": f, "path": rel_full, "dir": rel_dir, "group": group_key, "ext": ext,
                "size": size, "size_mb": round(size / 1024 / 1024, 2),
                "is_dicom": ext in ("dcm", "dicom", "ima", "dcm30"),
                "is_pdf":   ext == "pdf",
                "is_image": ext in ("jpg", "jpeg", "png", "gif", "bmp"),
            }
            flat_files.append(info)
            key = group_key
            if key not in folder_map:
                folder_map[key] = []
            folder_map[key].append(info)

    # Klasör özet listesi
    folders = []
    for folder_rel, flist in sorted(folder_map.items()):
        dicom_count = sum(1 for f in flist if f["is_dicom"])
        total_size  = sum(f["size"] for f in flist)
        folders.append({
            "name": folder_rel,
            "display_name": "İndirilen Dosyalar" if folder_rel == "(indirilen dosyalar)" else (folder_rel if folder_rel != "(kök)" else "(ana klasör)"),
            "file_count": len(flist),
            "dicom_count": dicom_count,
            "total_size_mb": round(total_size / 1024 / 1024, 2),
            "files": flist,
        })

    folder_name = os.path.basename(files_dir)
    return {
        "files": flat_files,
        "folders": folders,
        "dir": files_dir,
        "folder_name": folder_name,
        "count": len(flat_files),
        "folder_count": len(folders),
    }


@router.get("/{pid}/files/open")
async def open_patient_file(
    pid: int,
    path: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    p = db.query(Patient).filter(Patient.id == pid).first()
    if not p:
        raise HTTPException(404, "Hasta bulunamadı")
    if not p.files_dir:
        raise HTTPException(404, "Dosya klasörü bulunamadı")

    base = os.path.abspath(p.files_dir)
    target = os.path.abspath(os.path.join(base, path))
    if not target.startswith(base + os.sep):
        raise HTTPException(400, "Geçersiz dosya yolu")
    if not os.path.exists(target) or not os.path.isfile(target):
        raise HTTPException(404, "Dosya bulunamadı")

    media_type = "application/pdf" if target.lower().endswith(".pdf") else "application/octet-stream"
    return FileResponse(target, media_type=media_type, filename=os.path.basename(target))


@router.get("/{pid}/dicom-path")
async def get_dicom_path(pid: int, db: Session = Depends(get_db),
                         current_user: User = Depends(get_current_user)):
    p = db.query(Patient).filter(Patient.id == pid).first()
    if not p:
        raise HTTPException(404, "Hasta bulunamadı")
    if not p.files_dir:
        return {"folder_name": None, "has_files": False}
    folder_name = os.path.basename(p.files_dir)
    has_files = os.path.exists(p.files_dir) and any(
        f for f in os.listdir(p.files_dir)
        if not f.startswith("_debug")
    ) if os.path.exists(p.files_dir) else False
    return {
        "folder_name": folder_name,
        "has_files": has_files,
        "volume_name": "medarchive-pro_filedata"
    }
