from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..core.database import get_db
from ..core.security import get_current_user
from ..models.models import Study, Patient
from ..schemas.schemas import StudyCreate, StudyOut

router = APIRouter()

@router.get("/patient/{pid}", response_model=List[StudyOut])
async def get_studies(pid: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(Study).filter(Study.patient_id == pid).all()

@router.post("", response_model=StudyOut)
async def create_study(data: StudyCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    s = Study(**data.model_dump())
    db.add(s); db.commit(); db.refresh(s)
    return s

@router.put("/{sid}/report")
async def save_study_report(sid: int, body: dict, db: Session = Depends(get_db), _=Depends(get_current_user)):
    s = db.query(Study).filter(Study.id == sid).first()
    if not s: raise HTTPException(404)
    s.report = body.get("report","")
    s.status = "Tamamlandı"
    db.commit()
    return {"ok": True}
