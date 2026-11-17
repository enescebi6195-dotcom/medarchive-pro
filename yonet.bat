@echo off
title MedArchive Pro - Yonetim
color 0B
echo.
echo  =====================================================
echo    MedArchive Pro - Yonetim Menusu
echo  =====================================================
echo.
echo  1. Servisleri Baslat
echo  2. Servisleri Durdur
echo  3. Servisleri Yeniden Baslat
echo  4. Loglari Goster
echo  5. Yedek Al (Veritabani)
echo  6. Guncelle
echo  7. Durum Kontrol
echo  0. Cikis
echo.
set /p SECIM="Seciminiz: "

if "%SECIM%"=="1" (
    docker compose up -d
    echo Servisler baslatildi.
)
if "%SECIM%"=="2" (
    docker compose down
    echo Servisler durduruldu.
)
if "%SECIM%"=="3" (
    docker compose restart
    echo Servisler yeniden baslatildi.
)
if "%SECIM%"=="4" (
    docker compose logs --tail=100 -f
)
if "%SECIM%"=="5" (
    set TARIH=%date:~6,4%-%date:~3,2%-%date:~0,2%
    docker compose exec db pg_dump -U medarchive medarchive > yedek_%TARIH%.sql
    echo Yedek alindi: yedek_%TARIH%.sql
)
if "%SECIM%"=="6" (
    docker compose down
    docker compose pull
    docker compose up -d --build
    echo Guncelleme tamamlandi.
)
if "%SECIM%"=="7" (
    docker compose ps
)
if "%SECIM%"=="0" exit

pause
