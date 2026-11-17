from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..core.database import Base


class User(Base):
    __tablename__ = "users"
    id         = Column(Integer, primary_key=True, index=True)
    username   = Column(String(50), unique=True, nullable=False, index=True)
    full_name  = Column(String(100))
    email      = Column(String(100), unique=True)
    password   = Column(String(200), nullable=False)
    role       = Column(String(20), default="doctor")
    specialty  = Column(String(100))
    is_active  = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True))

    patients   = relationship(
        "Patient",
        foreign_keys="[Patient.assigned_to_id]",
        back_populates="assigned_to"
    )
    activities = relationship("ActivityLog", back_populates="user")


class Patient(Base):
    __tablename__ = "patients"
    id             = Column(Integer, primary_key=True, index=True)
    name           = Column(String(100), nullable=False, index=True)
    surname        = Column(String(100), nullable=False, index=True)
    id_no          = Column(String(30), index=True)
    birth_date     = Column(String(10))
    gender         = Column(String(20))
    country        = Column(String(100))
    city           = Column(String(100))
    phone          = Column(String(30))
    email          = Column(String(100))
    study_type     = Column(String(50))
    study_date     = Column(String(10))
    study_body     = Column(String(100))
    referring      = Column(String(200))
    notes          = Column(Text)
    status         = Column(String(30), default="Bekliyor")
    priority       = Column(String(20), default="Normal")
    report         = Column(Text)
    report_date    = Column(DateTime(timezone=True))
    links          = Column(JSON, default=list)
    files_dir      = Column(String(300))
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by_id  = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())
    updated_at     = Column(DateTime(timezone=True), onupdate=func.now())

    assigned_to  = relationship(
        "User",
        foreign_keys=[assigned_to_id],
        back_populates="patients"
    )
    created_by_user = relationship(
        "User",
        foreign_keys=[created_by_id]
    )
    studies  = relationship("Study",   back_populates="patient", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="patient", cascade="all, delete-orphan")


class Study(Base):
    __tablename__ = "studies"
    id         = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"))
    study_type = Column(String(50))
    study_date = Column(String(10))
    study_body = Column(String(100))
    links      = Column(JSON, default=list)
    status     = Column(String(30), default="Bekliyor")
    note       = Column(Text)
    report     = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    patient    = relationship("Patient", back_populates="studies")


class Comment(Base):
    __tablename__ = "comments"
    id         = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"))
    user_id    = Column(Integer, ForeignKey("users.id"))
    text       = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    patient    = relationship("Patient", back_populates="comments")
    user       = relationship("User")


class ReportTemplate(Base):
    __tablename__ = "report_templates"
    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String(100), nullable=False)
    content    = Column(Text, nullable=False)
    specialty  = Column(String(100))
    created_by = Column(Integer, ForeignKey("users.id"))
    is_shared  = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ActivityLog(Base):
    __tablename__ = "activity_logs"
    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"))
    action     = Column(String(100))
    detail     = Column(Text)
    patient_id = Column(Integer, nullable=True)
    ip_address = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user       = relationship("User", back_populates="activities")
