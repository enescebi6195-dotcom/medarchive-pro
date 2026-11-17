@echo off
setlocal enabledelayedexpansion
title MedArchive - DICOM Handler Kurulum
color 0A
echo.
echo  MedArchive DICOM Handler kuruluyor...
echo.

set "HANDLER_DIR=%APPDATA%\MedArchive"
mkdir "%HANDLER_DIR%" 2>nul

(
echo import sys, os, subprocess, urllib.parse, glob, time, ctypes
echo.
echo LOG_FILE = os.path.join(os.environ.get('APPDATA',''), 'MedArchive', 'dicom_log.txt')
echo.
echo def log(msg):
echo     with open(LOG_FILE, 'a', encoding='utf-8') as f:
echo         f.write(f"[{time.strftime('%H:%M:%S')}] {msg}\n")
echo.
echo def find_radiant():
echo     paths = [
echo         r"C:\Program Files\RadiAntViewer64bit\RadiAntViewer.exe",
echo         r"C:\Program Files\RadiAnt DICOM Viewer\RadiAntViewer.exe",
echo         r"C:\Program Files (x86)\RadiAnt DICOM Viewer\RadiAntViewer.exe",
echo         r"C:\Program Files\RadiAntViewer\RadiAntViewer.exe",
echo     ]
echo     for p in paths:
echo         if os.path.exists(p):
echo             log(f"RadiAnt bulundu: {p}")
echo             return p
echo     for d in [r"C:\Program Files", r"C:\Program Files (x86)"]:
echo         try:
echo             for f in glob.glob(os.path.join(d, "**", "RadiAnt*.exe"), recursive=True):
echo                 log(f"RadiAnt arama: {f}")
echo                 return f
echo         except Exception:
echo             pass
echo     return None
echo.
echo def find_folder(folder_name):
echo     # Docker Desktop WSL volume yollari
echo     volume_bases = [
echo         r"\\wsl$\docker-desktop-data\data\docker\volumes\medarchive-pro_filedata\_data",
echo         r"\\wsl.localhost\docker-desktop-data\data\docker\volumes\medarchive-pro_filedata\_data",
echo         r"\\wsl$\docker-desktop\mnt\host\wsl\docker-desktop-data\data\docker\volumes\medarchive-pro_filedata\_data",
echo     ]
echo     for base in volume_bases:
echo         p = os.path.join(base, folder_name)
echo         log(f"Deneniyor: {p}")
echo         try:
echo             if os.path.exists(p):
echo                 log(f"BULUNDU: {p}")
echo                 return p
echo         except Exception as e:
echo             log(f"Erisim hatasi: {e}")
echo     # Genel WSL tarama
echo     for wsl_root in [r"\\wsl$\docker-desktop-data", r"\\wsl.localhost\docker-desktop-data"]:
echo         try:
echo             pattern = os.path.join(wsl_root, "**", folder_name)
echo             log(f"Glob araniyor: {pattern}")
echo             results = glob.glob(pattern, recursive=True)
echo             if results:
echo                 log(f"Glob buldu: {results[0]}")
echo                 return results[0]
echo         except Exception as e:
echo             log(f"Glob hatasi: {e}")
echo     return None
echo.
echo def find_dicom_dir(base_path):
echo     """DICOM dosyalarinin oldugu en ust klasoru bul."""
echo     # Once direkt DCM kontrol
echo     try:
echo         for entry in os.listdir(base_path):
echo             if entry.lower().endswith(('.dcm', '.dicom', '.ima')):
echo                 log(f"DICOM direkt bulundu: {base_path}")
echo                 return base_path
echo     except Exception:
echo         pass
echo     # Alt klasorler
echo     for root, dirs, files in os.walk(base_path):
echo         for f in files:
echo             if f.lower().endswith(('.dcm', '.dicom', '.ima')):
echo                 log(f"DICOM alt klasorde bulundu: {root}")
echo                 return root
echo     log("DICOM dosyasi bulunamadi, ana klasor kullaniliyor")
echo     return base_path
echo.
echo if __name__ == "__main__":
echo     open(LOG_FILE, 'w').write(f"=== {time.strftime('%Y-%m-%d %H:%M:%S')} ===\n")
echo     log(f"Argümanlar: {sys.argv}")
echo     if len(sys.argv) < 2:
echo         ctypes.windll.user32.MessageBoxW(0, "Kullanim hatasi: arguman eksik", "MedArchive DICOM", 0x10)
echo         sys.exit(1)
echo     arg = sys.argv[1]
echo     arg = arg.replace("medarchive://dicom/", "").replace("medarchive://dicom", "")
echo     folder_name = urllib.parse.unquote(arg).strip("/\\")
echo     log(f"Klasor adi: {folder_name}")
echo     radiant = find_radiant()
echo     if not radiant:
echo         msg = "HATA: RadiAnt bulunamadi!\nradiantviewer.com adresinden kurun."
echo         log(msg)
echo         ctypes.windll.user32.MessageBoxW(0, msg, "MedArchive DICOM", 0x10)
echo         sys.exit(1)
echo     folder = find_folder(folder_name)
echo     if not folder:
echo         msg = f"HATA: Klasor bulunamadi:\n{folder_name}\n\nDocker Desktop acik mi?\nLog: {LOG_FILE}"
echo         log(msg)
echo         ctypes.windll.user32.MessageBoxW(0, msg, "MedArchive DICOM", 0x10)
echo         sys.exit(1)
echo     dicom_dir = find_dicom_dir(folder)
echo     log(f"RadiAnt aciliyor: {radiant} {dicom_dir}")
echo     # RadiAnt'a tam klasor yolu ver - otomatik yuklenir
echo     subprocess.Popen([radiant, dicom_dir])
echo     log("Islem tamamlandi")
) > "%HANDLER_DIR%\dicom_ac.py"

(
echo @echo off
echo python "%HANDLER_DIR%\dicom_ac.py" "%%1"
) > "%HANDLER_DIR%\dicom_ac.bat"

reg add "HKCU\Software\Classes\medarchive" /ve /d "MedArchive DICOM" /f >nul 2>&1
reg add "HKCU\Software\Classes\medarchive" /v "URL Protocol" /d "" /f >nul 2>&1
reg add "HKCU\Software\Classes\medarchive\shell\open\command" /ve /d "cmd /c \"%HANDLER_DIR%\dicom_ac.bat\" \"%%1\"" /f >nul 2>&1

echo  [OK] Kurulum tamamlandi!
echo.
echo  Log dosyasi: %HANDLER_DIR%\dicom_log.txt
echo  RadiAnt acilmazsa log dosyasini kontrol edin.
echo.
pause
