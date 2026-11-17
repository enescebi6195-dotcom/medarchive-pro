@echo off
title MedArchive Pro - Sunucu Kurulumu
color 0A
echo.
echo  =====================================================
echo    MedArchive Pro - Sunucu Kurulumu
echo  =====================================================
echo.

:: Docker kontrolu
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  [HATA] Docker bulunamadi!
    echo.
    echo  Lutfen Docker Desktop'i kurun:
    echo  https://www.docker.com/products/docker-desktop
    echo.
    echo  Kurulum sonrasi bilgisayari yeniden baslatin ve
    echo  bu scripti tekrar calistirin.
    pause
    exit /b 1
)
echo  [OK] Docker bulundu.

:: Docker Compose kontrolu
docker compose version >nul 2>&1
if %errorlevel% neq 0 (
    echo  [HATA] Docker Compose bulunamadi!
    echo  Docker Desktop'i guncelleyin.
    pause
    exit /b 1
)
echo  [OK] Docker Compose bulundu.
echo.

:: IP adresi al
echo  Bilgisayarinizin IP adresi:
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /r "IPv4"') do (
    set IP=%%a
    set IP=!IP: =!
    echo    !IP!
)
echo.
echo  Ekibiniz tarayicidan su adrese girecek:
echo  http://[YUKARIDAKI_IP_ADRESI]
echo.

:: .env dosyasi olustur
if not exist .env (
    echo  .env dosyasi olusturuluyor...
    (
        echo POSTGRES_PASSWORD=CHANGE_THIS_DB_PASSWORD
        echo SECRET_KEY=REPLACE_WITH_RANDOM_SECRET_AT_LEAST_32_CHARS
        echo ADMIN_INITIAL_PASSWORD=SET_A_STRONG_UNIQUE_ADMIN_PASSWORD
        echo FILES_DIR=/app/files
        echo MAX_UPLOAD_MB=500
    ) > .env
    echo  [OK] .env olusturuldu.
    echo.
    echo  ONEMLI: .env dosyasini acip SECRET_KEY'i degistirin!
)

echo  Servisler baslatiliyor (ilk seferde ~5-10 dk surebilir)...
echo.
docker compose up -d --build

if %errorlevel% neq 0 (
    echo.
    echo  [HATA] Baslatma basarisiz!
    echo  docker compose logs komutunu calistirin.
    pause
    exit /b 1
)

echo.
echo  =====================================================
echo    KURULUM TAMAMLANDI!
echo  =====================================================
echo.
echo  Yerel erisim : http://localhost
echo  Ag erisimi   : http://[BILGISAYAR_IP_ADRESI]
echo.
echo  Ilk yonetici hesabi:
echo    Kullanici: admin
echo    Sifre    : .env dosyasinda belirlediginiz ADMIN_INITIAL_PASSWORD
echo.
echo  ONEMLI: .env dosyasini GitHub'a yuklemeyin!
echo.
pause
