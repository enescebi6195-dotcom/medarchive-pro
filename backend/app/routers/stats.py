from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from ..core.database import get_db
from ..core.security import get_current_user
from ..models.models import Patient, User, ActivityLog
from datetime import datetime, timedelta

router = APIRouter()

@router.get("")
async def get_stats(db: Session = Depends(get_db), _=Depends(get_current_user)):
    now = datetime.utcnow()
    total    = db.query(func.count(Patient.id)).scalar()
    today    = db.query(func.count(Patient.id)).filter(
        func.date(Patient.created_at) == now.date()).scalar()
    week     = db.query(func.count(Patient.id)).filter(
        Patient.created_at >= now - timedelta(days=7)).scalar()
    month    = db.query(func.count(Patient.id)).filter(
        Patient.created_at >= now - timedelta(days=30)).scalar()
    pending  = db.query(func.count(Patient.id)).filter(Patient.status == "Bekliyor").scalar()
    completed= db.query(func.count(Patient.id)).filter(Patient.status == "Tamamlandı").scalar()

    by_type  = db.query(Patient.study_type, func.count(Patient.id).label("cnt"))\
                 .group_by(Patient.study_type).order_by(desc("cnt")).all()
    by_country=db.query(Patient.country, func.count(Patient.id).label("cnt"))\
                 .group_by(Patient.country).order_by(desc("cnt")).limit(10).all()
    by_user  = db.query(User.full_name, User.username, func.count(Patient.id).label("cnt"))\
                 .join(Patient, Patient.assigned_to_id == User.id, isouter=True)\
                 .group_by(User.id).all()

    recent   = db.query(ActivityLog).order_by(desc(ActivityLog.created_at)).limit(20).all()

    return {
        "total_patients": total, "today": today, "this_week": week,
        "this_month": month, "pending": pending, "completed": completed,
        "by_study_type": [{"type": r[0] or "Diğer", "count": r[1]} for r in by_type],
        "by_country":    [{"country": r[0] or "Belirtilmedi", "count": r[1]} for r in by_country],
        "by_user":       [{"name": r[0] or r[1], "count": r[2]} for r in by_user],
        "recent_activity": [
            {"action": a.action, "detail": a.detail,
             "created_at": a.created_at.isoformat()} for a in recent
        ],
    }
