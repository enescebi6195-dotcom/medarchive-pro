from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import datetime
from ..core.database import get_db
from ..core.security import verify_password, create_access_token, get_current_user
from ..models.models import User, ActivityLog
from ..schemas.schemas import LoginRequest, TokenResponse

router = APIRouter()

@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        User.username == req.username,
        User.is_active == True
    ).first()
    if not user or not verify_password(req.password, user.password):
        raise HTTPException(status_code=401, detail="Kullanıcı adı veya şifre hatalı")

    token = create_access_token({"sub": user.username, "role": user.role})

    # Son giriş güncelle
    user.last_login = datetime.utcnow()

    # Log
    log = ActivityLog(
        user_id=user.id,
        action="login",
        detail=f"Giriş yapıldı",
        ip_address=request.client.host if request.client else None
    )
    db.add(log)
    db.commit()

    return TokenResponse(
        access_token=token,
        user={
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role,
            "specialty": user.specialty,
        }
    )

@router.get("/me")
async def me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "specialty": current_user.specialty,
        "email": current_user.email,
    }
