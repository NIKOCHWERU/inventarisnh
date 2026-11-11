# Panduan Setup & Deployment Server Public Domain
## Sistem Inventaris & Logistik Kantor Narasumberhukum
**URL Domain Akses:** [https://dashboard.narasumberhukum.com/inventaris-nh](https://dashboard.narasumberhukum.com/inventaris-nh)

---

### Daftar Isi
1. [Prasyarat Server (VPS / Cloud)](#1-prasyarat-server)
2. [Langkah Clone & Install](#2-langkah-clone--install)
3. [Konfigurasi Environment (.env)](#3-konfigurasi-environment-env)
4. [Build Aplikasi](#4-build-aplikasi)
5. [Menjalankan Aplikasi dengan PM2](#5-menjalankan-aplikasi-dengan-pm2)
6. [Konfigurasi Reverse Proxy Nginx](#6-konfigurasi-reverse-proxy-nginx)
7. [SSL / HTTPS dengan Certbot Let's Encrypt](#7-ssl--https-dengan-certbot)
8. [Verifikasi & Uji Akses](#8-verifikasi--uji-akses)
9. [Pemeliharaan, Backup & Update](#9-pemeliharaan-backup--update)

---

### 1. Prasyarat Server
- **OS**: Ubuntu 20.04 / 22.04 LTS atau Debian 11/12 (atau distro Linux lainnya)
- **Node.js**: Versi 20 LTS atau lebih baru (`node -v`)
- **NPM**: Versi 10+ (`npm -v`)
- **Nginx Web Server** terpasang (`sudo apt install nginx`)
- **PM2 Process Manager**:
  ```bash
  sudo npm install -g pm2
  ```

---

### 2. Langkah Clone & Install

Masuk ke direktori server tempat Anda biasa menyimpan project (misalnya `/var/www/` atau `/home/ubuntu/`):

```bash
cd /var/www
git clone https://github.com/NIKOCHWERU/inventarisnh.git inventaris-kantor
cd inventaris-kantor
npm install
```

---

### 3. Konfigurasi Environment (.env)

Salin file contoh konfigurasi:
```bash
cp .env.example .env
```

Pastikan isi `.env` sebagai berikut:
```env
DATABASE_URL="file:./prisma/dev.db"
APP_URL="https://dashboard.narasumberhukum.com/inventaris-nh"
BASE_PATH="/inventaris-nh"
NEXT_PUBLIC_BASE_PATH="/inventaris-nh"
SESSION_SECRET="ganti-dengan-kunci-rahasia-acak-anda-2026"
COOKIE_SECURE="true"
PORT=3829
HOST="127.0.0.1"
```

Inisialisasi database SQLite dan akun default Admin:
```bash
npx prisma generate
node scripts/seed.js
```
> Akun Admin bawaan:
> - **Username**: `admin`
> - **Password**: `admin123`

---

### 4. Build Aplikasi

Jalankan perintah build produksi:
```bash
npm run build
```
Build ini otomatis mengompilasi semua halaman Next.js di bawah subpath `/inventaris-nh` dan menghasilkan bundle siap produksi.

---

### 5. Menjalankan Aplikasi dengan PM2

Project ini sudah dilengkapi file `ecosystem.config.js`. Anda cukup menjalankan:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

Untuk memantau status atau log:
```bash
pm2 status
pm2 logs inventaris-nh
```

---

### 6. Konfigurasi Reverse Proxy Nginx

Buka konfigurasi Nginx untuk domain `dashboard.narasumberhukum.com` (biasanya di `/etc/nginx/sites-available/dashboard.narasumberhukum.com` atau `/etc/nginx/conf.d/`):

```bash
sudo nano /etc/nginx/sites-available/dashboard.narasumberhukum.com
```

Tambahkan blok `location /inventaris-nh` di dalam blok `server { ... }`:

```nginx
server {
    server_name dashboard.narasumberhukum.com;

    # Batas ukuran upload (foto & backup db hingga 100MB)
    client_max_body_size 100M;

    # ----------------------------------------------------------------------
    # Route Subpath Aplikasi Inventaris Kantor
    # ----------------------------------------------------------------------
    location /inventaris-nh {
        proxy_pass http://127.0.0.1:3829;
        proxy_http_version 1.1;

        # WebSocket & connection headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Forwarded headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Prefix /inventaris-nh;

        # Timeouts untuk kelancaran transfer backup
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    # Caching aset statis Next.js
    location /inventaris-nh/_next/static {
        proxy_pass http://127.0.0.1:3829;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        expires 365d;
        access_log off;
    }
}
```

Uji konfigurasi Nginx lalu reload:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

### 7. SSL / HTTPS dengan Certbot

Jika SSL domain `dashboard.narasumberhukum.com` belum aktif, pasang gratis dengan Certbot:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d dashboard.narasumberhukum.com
```

---

### 8. Verifikasi & Uji Akses

1. **Akses Dashboard Admin**:
   Buka di browser: [https://dashboard.narasumberhukum.com/inventaris-nh](https://dashboard.narasumberhukum.com/inventaris-nh)
   - Anda akan diarahkan ke login admin atau portal karyawan.
   - Masuk sebagai Admin (`admin` / `admin123`).

2. **Uji QR Code Karyawan**:
   - Buka menu **Admin** -> **Sistem QR Code Karyawan**.
   - Sistem akan otomatis mendeteksi domain publik:
     `https://dashboard.narasumberhukum.com/inventaris-nh`
   - Klik **+ Buat QR Code Penginput**.
   - Pindai QR Code menggunakan kamera HP karyawan dari koneksi internet manapun (Wi-Fi kantor maupun paket data seluler).
   - Isi nama karyawan -> langsung masuk ke **Portal Penginput Inventaris & Logistik** tanpa password dan sesi tersimpan di HP.

---

### 9. Pemeliharaan, Backup & Update

#### Cara Melakukan Pembaruan Kode (Update):
```bash
cd /var/www/inventaris-kantor
git pull origin main
npm install
npm run build
pm2 restart inventaris-nh
```

#### Backup Database:
- Database berada di `prisma/dev.db`.
- Admin juga bisa mengunduh file `.db` atau Full Backup `.zip` (database + foto) kapan saja melalui menu **Admin -> Pengaturan Sistem & Database -> Backup Database**.
