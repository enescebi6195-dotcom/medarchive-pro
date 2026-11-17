# MedArchive Pro

Web tabanlı hasta ve radyolojik inceleme arşiv yönetimi projesi.

## Teknoloji yığını
- Frontend: React 18, Vite, React Router, Axios, Zustand
- Backend: Python, FastAPI, Pydantic, SQLAlchemy
- Veritabanı: PostgreSQL 16
- Dağıtım: Docker Compose, Nginx
- Kimlik doğrulama: JWT, bcrypt

## Proje yapısı
- `frontend/`: React kullanıcı arayüzü
- `backend/`: FastAPI uygulaması, modeller, şemalar ve API yönlendiricileri
- `nginx/`: ters proxy yapılandırması
- `docker-compose.yml`: servis tanımları

## Güvenli kurulum notu
1. `.env.example` dosyasını `.env` adıyla kopyalayın.
2. `POSTGRES_PASSWORD`, `SECRET_KEY` ve `ADMIN_INITIAL_PASSWORD` alanlarını kendinize ait güçlü ve benzersiz değerlerle değiştirin.
3. `.env` dosyasını kesinlikle depoya göndermeyin. `.gitignore` içinde hariç tutulmuştur.
4. Docker Desktop kuruluysa `docker compose up --build` komutuyla servisleri başlatabilirsiniz.
5. İlk yönetici hesabı `admin` kullanıcı adıyla ve `.env` içindeki `ADMIN_INITIAL_PASSWORD` değeriyle oluşturulur.

> Bu depo geliştirme/öğrenci projesidir. Gerçek hasta verileriyle veya klinik ortamda kullanılmadan önce güvenlik, mevzuat, yedekleme ve klinik doğrulama gereksinimleri ayrıca karşılanmalıdır.
