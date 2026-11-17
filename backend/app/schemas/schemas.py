from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# ── Auth ──────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


# ── User ──────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    username: str
    full_name: str
    email: Optional[str] = None
    password: str
    role: str = "doctor"
    specialty: Optional[str] = None

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    specialty: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class UserPasswordChange(BaseModel):
    old_password: str
    new_password: str

class UserOut(BaseModel):
    id: int
    username: str
    full_name: Optional[str]
    email: Optional[str]
    role: str
    specialty: Optional[str]
    is_active: bool
    created_at: datetime
    class Config: from_attributes = True


# ── Patient ───────────────────────────────────────────────────────────
class PatientCreate(BaseModel):
    name: str
    surname: str
    id_no: Optional[str] = None
    birth_date: Optional[str] = None
    gender: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    study_type: Optional[str] = None
    study_date: Optional[str] = None
    study_body: Optional[str] = None
    referring: Optional[str] = None
    notes: Optional[str] = None
    links: Optional[List[str]] = []
    priority: Optional[str] = "Normal"
    assigned_to_id: Optional[int] = None

class PatientUpdate(PatientCreate):
    name: Optional[str] = None
    surname: Optional[str] = None

class PatientOut(BaseModel):
    id: int
    name: str
    surname: str
    id_no: Optional[str]
    birth_date: Optional[str]
    gender: Optional[str]
    country: Optional[str]
    city: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    study_type: Optional[str]
    study_date: Optional[str]
    study_body: Optional[str]
    referring: Optional[str]
    notes: Optional[str]
    status: str
    priority: str
    report: Optional[str]
    report_date: Optional[datetime]
    links: Optional[List[str]]
    files_dir: Optional[str]
    assigned_to_id: Optional[int]
    created_at: datetime
    updated_at: Optional[datetime]
    class Config: from_attributes = True


# ── Study ─────────────────────────────────────────────────────────────
class StudyCreate(BaseModel):
    patient_id: int
    study_type: str
    study_date: Optional[str] = None
    study_body: Optional[str] = None
    links: Optional[List[str]] = []
    note: Optional[str] = None

class StudyOut(BaseModel):
    id: int
    patient_id: int
    study_type: str
    study_date: Optional[str]
    study_body: Optional[str]
    links: Optional[List[str]]
    status: str
    note: Optional[str]
    report: Optional[str]
    created_at: datetime
    class Config: from_attributes = True


# ── Comment ───────────────────────────────────────────────────────────
class CommentCreate(BaseModel):
    text: str

class CommentOut(BaseModel):
    id: int
    patient_id: int
    user_id: int
    text: str
    created_at: datetime
    username: Optional[str] = None
    class Config: from_attributes = True


# ── Template ──────────────────────────────────────────────────────────
class TemplateCreate(BaseModel):
    name: str
    content: str
    specialty: Optional[str] = None
    is_shared: bool = True

class TemplateOut(BaseModel):
    id: int
    name: str
    content: str
    specialty: Optional[str]
    is_shared: bool
    created_at: datetime
    class Config: from_attributes = True


# ── Download ──────────────────────────────────────────────────────────
class DownloadRequest(BaseModel):
    patient_id: int
    links: List[str]
    study_id: Optional[int] = None


# ── Stats ─────────────────────────────────────────────────────────────
class StatsOut(BaseModel):
    total_patients: int
    today: int
    this_week: int
    this_month: int
    pending: int
    completed: int
    by_study_type: List[dict]
    by_country: List[dict]
    by_user: List[dict]
    recent_activity: List[dict]
