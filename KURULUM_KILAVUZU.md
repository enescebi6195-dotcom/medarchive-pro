# MedArchive Pro — Kurulum Kılavuzu

## 🖥️ Sistem Gereksinimleri
- Windows 10/11 (64-bit)
- En az 8 GB RAM
- 20 GB boş disk
- İnternet bağlantısı (ilk kurulum için)

---

## 🚀 Kurulum Adımları

### Adım 1 — Docker Desktop Kur
1. https://www.docker.com/products/docker-desktop adresine git
2. "Docker Desktop for Windows" indir
3. Kur ve bilgisayarı **yeniden başlat**
4. Docker Desktop'ı aç ve çalıştığını doğrula (sağ altta balina ikonu)

### Adım 2 — MedArchive Pro'yu Başlat
1. `medarchive-pro` klasörünü `C:\MedArchivePro\` gibi bir yere kopyala
2. `kur_ve_baslat.bat` dosyasına **çift tıkla**
3. İlk kurulumda 5-10 dakika sürebilir (Docker imajları indirilir)
4. "KURULUM TAMAMLANDI" mesajını bekle

### Adım 3 — Sisteme Giriş
- Tarayıcıda: `http://localhost`
- İlk yönetici kullanıcı adı: `admin`
- İlk yönetici parolası: `.env` dosyasında sizin belirlediğiniz `ADMIN_INITIAL_PASSWORD` değeridir.
- **Güçlü ve benzersiz bir parola belirleyin; `.env` dosyasını GitHub'a yüklemeyin.**

---

## 👥 Ekip Erişimi

Ekibinizin tabletten/telefondan/bilgisayardan erişmesi için:

1. Bu bilgisayarın IP adresini öğren:
   - `Başlat → cmd → ipconfig`
   - `IPv4 Address` satırındaki adres (örn: `192.168.1.100`)

2. Ekip üyeleri tarayıcıda şunu açsın:
   ```
   http://192.168.1.100
   ```

3. Her ekip üyesi için kullanıcı oluştur:
   - Sisteme admin olarak gir
   - Sol menü → Kullanıcılar → Kullanıcı Ekle

---

## ⚙️ Yönetim

`yonet.bat` ile:
- Servisleri başlat/durdur
- Logları izle
- Veritabanı yedeği al
- Güncelleme yap

---

## 📁 Veri Yedekleme

**Otomatik yedek** için `yonet.bat → 5. Yedek Al`

**Manuel klasör yedeği:**
```
C:\Users\[Kullanici]\MedArchivePro\
```
Bu klasörü düzenli olarak harici diske kopyalayın.

---

## 🔧 Sorun Giderme

**"Port 80 kullanımda" hatası:**
```
docker compose down
netstat -ano | findstr :80
taskkill /PID [PID] /F
docker compose up -d
```

**Servisler çalışmıyor:**
```
docker compose logs backend
docker compose logs db
```

**Veritabanı sıfırla (DİKKAT: tüm veri silinir):**
```
docker compose down -v
docker compose up -d --build
```

---

## 🌐 İnternet Erişimi (Opsiyonel)

Ofis dışından erişim için router'da port yönlendirme yapın:
- Dış port: 80 → İç IP: 192.168.1.100:80

**Güvenlik için önerilen:** Cloudflare Tunnel veya VPN kullanın.

---

## 📱 Mobil Kullanım

Tarayıcıdan `http://[SUNUCU_IP]` adresine gidin.
Anasayfaya kısayol ekleyebilirsiniz (mobil cihazda "Ana Ekrana Ekle").
