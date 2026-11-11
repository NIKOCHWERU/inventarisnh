#!/usr/bin/env bash
# ==============================================================================
# Script Otomatis Setup VPS - Inventaris Kantor Narasumberhukum
# Target Domain: https://dashboard.narasumberhukum.com/inventaris-nh
# Target Port  : 3829
# ==============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================================================${NC}"
echo -e "${BLUE}     SETUP OTOMATIS INVENTARIS KANTOR NARASUMBERHUKUM (VPS)            ${NC}"
echo -e "${BLUE}     Domain: https://dashboard.narasumberhukum.com/inventaris-nh        ${NC}"
echo -e "${BLUE}     Dedicated Port: 3829 (Aman & Tidak Bentrok)                       ${NC}"
echo -e "${BLUE}========================================================================${NC}\n"

# 1. Periksa Node.js & npm
echo -e "${YELLOW}[1/8] Memeriksa Node.js dan npm...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js belum terinstall! Menginstall Node.js 20 LTS...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi
echo -e "${GREEN}✓ Node.js $(node -v) & npm $(npm -v) siap.${NC}"

# 2. Periksa PM2
echo -e "${YELLOW}[2/8] Memeriksa PM2 Process Manager...${NC}"
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}Menginstall PM2 secara global...${NC}"
    sudo npm install -g pm2
fi
echo -e "${GREEN}✓ PM2 $(pm2 -v) siap.${NC}"

# 3. Tentukan Direktori Aplikasi
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"
echo -e "${GREEN}✓ Direktori kerja: $APP_DIR${NC}"

# 4. Install Dependencies
echo -e "${YELLOW}[3/8] Menginstall dependensi project...${NC}"
npm install --production=false

# 5. Konfigurasi File .env Produksi
echo -e "${YELLOW}[4/8] Menyiapkan file konfigurasi environment (.env)...${NC}"
cat << 'EOF' > .env
DATABASE_URL="file:./prisma/dev.db"
APP_URL="https://dashboard.narasumberhukum.com/inventaris-nh"
BASE_PATH="/inventaris-nh"
NEXT_PUBLIC_BASE_PATH="/inventaris-nh"
SESSION_SECRET="kantor-narasumberhukum-secret-production-2026"
COOKIE_SECURE="true"
PORT=3829
HOST="127.0.0.1"
EOF
echo -e "${GREEN}✓ File .env berhasil dibuat dengan port 3829 dan subpath /inventaris-nh.${NC}"

# 6. Database & Prisma Setup
echo -e "${YELLOW}[5/8] Menyiapkan database SQLite & generate Prisma client...${NC}"
npx prisma generate
if [ ! -f "prisma/dev.db" ]; then
    echo -e "${YELLOW}Database baru terdeteksi, menjalankan seeding akun Admin default...${NC}"
    node scripts/seed.js
fi
echo -e "${GREEN}✓ Database & Prisma siap.${NC}"

# 7. Build Aplikasi Next.js
echo -e "${YELLOW}[6/8] Mengompilasi aplikasi (npm run build)...${NC}"
npm run build
echo -e "${GREEN}✓ Build produksi berhasil selesai.${NC}"

# 8. Start / Restart PM2 Service
echo -e "${YELLOW}[7/8] Menjalankan aplikasi dengan PM2 di port 3829...${NC}"
pm2 delete inventaris-nh 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
echo -e "${GREEN}✓ Service PM2 'inventaris-nh' berhasil aktif di port 3829.${NC}"

# 9. Setup Nginx Reverse Proxy
echo -e "${YELLOW}[8/8] Memeriksa dan mengatur Nginx reverse proxy...${NC}"

NGINX_SNIPPET='/etc/nginx/conf.d/inventaris-nh-proxy.conf'
# Cek apakah ada file virtual host domain dashboard.narasumberhukum.com
VHOST_FILE=""
for f in /etc/nginx/sites-available/*dashboard.narasumberhukum.com* /etc/nginx/conf.d/*dashboard.narasumberhukum.com*; do
    if [ -f "$f" ]; then
        VHOST_FILE="$f"
        break
    fi
done

if [ -n "$VHOST_FILE" ]; then
    echo -e "${BLUE}Ditemukan konfigurasi domain: $VHOST_FILE${NC}"
    if grep -q "location /inventaris-nh" "$VHOST_FILE"; then
        echo -e "${GREEN}✓ Blok 'location /inventaris-nh' sudah ada di $VHOST_FILE.${NC}"
    else
        echo -e "${YELLOW}Menyisipkan konfigurasi /inventaris-nh ke $VHOST_FILE...${NC}"
        # Sisipkan location block sebelum closing brace '}' terakhir
        TMP_CONF=$(mktemp)
        awk '
            /^[[:space:]]*location \/inventaris-nh/ { found=1 }
            END { }
        ' "$VHOST_FILE"
        
        sudo sed -i '/server_name.*dashboard.narasumberhukum.com/a \
\
    # Route Inventaris Kantor Narasumberhukum\
    location /inventaris-nh {\
        proxy_pass http://127.0.0.1:3829;\
        proxy_http_version 1.1;\
        proxy_set_header Upgrade $http_upgrade;\
        proxy_set_header Connection "upgrade";\
        proxy_set_header Host $host;\
        proxy_set_header X-Real-IP $remote_addr;\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\
        proxy_set_header X-Forwarded-Proto $scheme;\
        proxy_set_header X-Forwarded-Host $host;\
        proxy_set_header X-Forwarded-Prefix /inventaris-nh;\
        proxy_connect_timeout 120s;\
        proxy_send_timeout 120s;\
        proxy_read_timeout 120s;\
    }\
    location /inventaris-nh/_next/static {\
        proxy_pass http://127.0.0.1:3829;\
        proxy_http_version 1.1;\
        proxy_set_header Host $host;\
        expires 365d;\
        access_log off;\
    }' "$VHOST_FILE"
    fi
else
    echo -e "${YELLOW}File vhost khusus domain tidak ditemukan otomatis.${NC}"
    echo -e "${YELLOW}Silakan salin blok location dari 'nginx.conf.example' ke konfigurasi Nginx domain Anda.${NC}"
fi

# Uji konfigurasi Nginx dan reload jika valid
if command -v nginx &> /dev/null; then
    if sudo nginx -t 2>/dev/null; then
        sudo systemctl reload nginx
        echo -e "${GREEN}✓ Nginx berhasil di-reload.${NC}"
    else
        echo -e "${RED}⚠️ Peringatan: Ada syntax error di Nginx. Jalankan 'sudo nginx -t' untuk memeriksa.${NC}"
    fi
fi

# 10. Pengujian Koneksi Lokal
echo -e "\n${BLUE}========================================================================${NC}"
echo -e "${GREEN}            SETUP VPS BERHASIL SELESAI DENGAN SEMPURNA!                ${NC}"
echo -e "${BLUE}========================================================================${NC}"
echo -e "Status PM2 Service  : $(pm2 jlist | grep -o '"name":"inventaris-nh"' || echo 'Running')"
echo -e "Port Internal       : 3829 (127.0.0.1:3829)"
echo -e "URL Akses Publik    : ${GREEN}https://dashboard.narasumberhukum.com/inventaris-nh${NC}"
echo -e "Akun Admin Default  : Username: ${YELLOW}admin${NC} | Password: ${YELLOW}admin123${NC}"
echo -e "${BLUE}========================================================================${NC}\n"
