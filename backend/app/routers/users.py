from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..core.security import get_current_user, hash_password, verify_password, require_admin
from ..models.models import User
from ..schemas.schemas import UserCreate, UserUpdate, UserOut, UserPasswordChange
from typing import List

router = APIRouter()

@router.get("", response_model=List[UserOut])
async def list_users(db: Session = Depends(get_db), _=Depends(require_admin)):
    return db.query(User).all()

@router.post("", response_model=UserOut)
async def create_user(data: UserCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(400, "Bu kullanıcı adı zaten var")
    u = User(**data.model_dump(exclude={"password"}), password=hash_password(data.password))
    db.add(u); db.commit(); db.refresh(u)
    return u

@router.put("/{uid}", response_model=UserOut)
async def update_user(uid: int, data: UserUpdate, db: Session = Depends(get_db), _=Depends(require_admin)):
    u = db.query(User).filter(User.id == uid).first()
    if not u: raise HTTPException(404, "Kullanıcı bulunamadı")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(u, k, v)
    db.commit(); db.refresh(u)
    return u

@router.delete("/{uid}")
async def delete_user(uid: int, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    if uid == current_user.id:
        raise HTTPException(400, "Kendi hesabınızı silemezsiniz")
    u = db.query(User).filter(User.id == uid).first()
    if not u: raise HTTPException(404, "Kullanıcı bulunamadı")
    db.delete(u); db.commit()
    return {"ok": True}

@router.post("/change-password")
async def change_password(data: UserPasswordChange, db: Session = Depends(get_db),
                          current_user=Depends(get_current_user)):
    if not verify_password(data.old_password, current_user.password):
        raise HTTPException(400, "Mevcut şifre hatalı")
    current_user.password = hash_password(data.new_password)
    db.commit()
    return {"ok": True}
