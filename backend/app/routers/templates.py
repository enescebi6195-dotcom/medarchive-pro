from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..core.database import get_db
from ..core.security import get_current_user
from ..models.models import ReportTemplate
from ..schemas.schemas import TemplateCreate, TemplateOut

router = APIRouter()

@router.get("", response_model=List[TemplateOut])
async def list_templates(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return db.query(ReportTemplate).filter(ReportTemplate.is_shared == True).all()

@router.post("", response_model=TemplateOut)
async def create_template(data: TemplateCreate, db: Session = Depends(get_db),
                          current_user=Depends(get_current_user)):
    t = ReportTemplate(**data.model_dump(), created_by=current_user.id)
    db.add(t); db.commit(); db.refresh(t)
    return t

@router.put("/{tid}", response_model=TemplateOut)
async def update_template(tid: int, data: TemplateCreate, db: Session = Depends(get_db),
                          current_user=Depends(get_current_user)):
    t = db.query(ReportTemplate).filter(ReportTemplate.id == tid).first()
    if not t: raise HTTPException(404, "Şablon bulunamadı")
    for k, v in data.model_dump().items():
        setattr(t, k, v)
    db.commit(); db.refresh(t)
    return t

@router.delete("/{tid}")
async def delete_template(tid: int, db: Session = Depends(get_db),
                          current_user=Depends(get_current_user)):
    t = db.query(ReportTemplate).filter(ReportTemplate.id == tid).first()
    if not t: raise HTTPException(404, "Şablon bulunamadı")
    db.delete(t); db.commit()
    return {"ok": True}
