from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os
import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from .core.config import settings
from .core.database import Base, engine
from .routers import auth, patients, users, files, studies, templates, stats, download
from .core.security import hash_password
from .core.database import SessionLocal
from .models.models import User, ReportTemplate


def init_db():
    """Veritabanı hazır olana kadar bekle, sonra oluştur."""
    max_retries = 30
    for attempt in range(max_retries):
        try:
            Base.metadata.create_all(bind=engine)
            logger.info("✅ Veritabanı bağlantısı başarılı.")
            break
        except Exception as e:
            logger.warning(f"⏳ DB bekleniyor ({attempt+1}/{max_retries}): {e}")
            time.sleep(2)
    else:
        logger.error("❌ Veritabanına bağlanılamadı!")
        return

    db = SessionLocal()
    try:
        if not db.query(User).first():
            initial_password = settings.ADMIN_INITIAL_PASSWORD
            if not initial_password:
                logger.warning("İlk yönetici hesabı oluşturulmadı. ADMIN_INITIAL_PASSWORD ortam değişkenini ayarlayın.")
            else:
                admin = User(
                    username="admin",
                    full_name="Sistem Yöneticisi",
                    password=hash_password(initial_password),
                    role="admin",
                    is_active=True,
                )
                db.add(admin)
                db.commit()
                logger.info("İlk yönetici hesabı ortam değişkeniyle oluşturuldu.")

        if not db.query(ReportTemplate).first():
            templates_data = [
                ("MRI Beyin — Normal", """Radyolojik Bulgular:
Beyin parankimi normal görünümdedir. Kortikal ve subkortikal yapılar normaldir.
Ventriküler sistem normal boyut ve lokalizasyondadır.
Orta hat yapıları yerindedir. Diffüzyon kısıtlaması izlenmemiştir.

Sonuç ve Görüş:
MRI incelemesinde patolojik bulgu saptanmamıştır.""", "Radyoloji"),
                ("CT Toraks — Normal", """Radyolojik Bulgular:
Her iki akciğer parankimi normal havalanma göstermektedir.
Plevral effüzyon izlenmemektedir. Mediasten yapıları normaldir.

Sonuç ve Görüş:
CT incelemesinde aktif patolojik bulgu saptanmamıştır.""", "Radyoloji"),
                ("CT Abdomen — Normal", """Radyolojik Bulgular:
Karaciğer, safra kesesi, pankreas, dalak normal görünümdedir.
Her iki böbrek normal boyut ve dansitededir.

Sonuç ve Görüş:
Batın CT incelemesinde patolojik bulgu saptanmamıştır.""", "Radyoloji"),
            ]
            for name, content, specialty in templates_data:
                db.add(ReportTemplate(
                    name=name, content=content,
                    specialty=specialty, is_shared=True, created_by=1
                ))
            db.commit()
            logger.info("✅ Varsayılan şablonlar oluşturuldu.")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 MedArchive Pro başlatılıyor...")
    init_db()
    os.makedirs(settings.FILES_DIR, exist_ok=True)
    logger.info(f"✅ Dosya dizini hazır: {settings.FILES_DIR}")
    yield
    logger.info("👋 MedArchive Pro kapatılıyor...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(settings.FILES_DIR, exist_ok=True)
app.mount("/files", StaticFiles(directory=settings.FILES_DIR), name="files")

app.include_router(auth.router,      prefix="/api/auth",      tags=["Auth"])
app.include_router(users.router,     prefix="/api/users",     tags=["Users"])
app.include_router(patients.router,  prefix="/api/patients",  tags=["Patients"])
app.include_router(studies.router,   prefix="/api/studies",   tags=["Studies"])
app.include_router(files.router,     prefix="/api/files",     tags=["Files"])
app.include_router(templates.router, prefix="/api/templates", tags=["Templates"])
app.include_router(stats.router,     prefix="/api/stats",     tags=["Stats"])
app.include_router(download.router,  prefix="/api/download",  tags=["Download"])

@app.get("/api/health")
def health():
    return {"status": "ok", "version": settings.VERSION}

@app.get("/api/ping")
def ping():
    return {"pong": True}
