const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const os = require('os');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const TUNNEL_FILE = path.join(__dirname, '..', '.tunnel_url');
const BIN_DIR = path.join(__dirname, '..', '.bin');
const CLOUDFLARED_BIN = path.join(BIN_DIR, 'cloudflared');

// Ensure .bin directory exists
if (!fs.existsSync(BIN_DIR)) {
  fs.mkdirSync(BIN_DIR, { recursive: true });
}

function getLocalIpDetails() {
  const interfaces = os.networkInterfaces();
  const list = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        list.push({ name, address: net.address });
      }
    }
  }
  // Sort Wi-Fi / Ethernet (192.168.x.x, 10.x.x.x) first
  list.sort((a, b) => {
    if (a.address.startsWith('192.168.') && !b.address.startsWith('192.168.')) return -1;
    if (!a.address.startsWith('192.168.') && b.address.startsWith('192.168.')) return 1;
    return 0;
  });
  return list;
}

function isBinaryAvailable(command) {
  try {
    execSync(`which ${command}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function downloadCloudflared() {
  if (fs.existsSync(CLOUDFLARED_BIN)) {
    try {
      execSync(`"${CLOUDFLARED_BIN}" --version`, { stdio: 'ignore' });
      return CLOUDFLARED_BIN;
    } catch {
      // Corrupt or wrong arch, re-download
    }
  }

  const arch = os.arch();
  let binaryName = 'cloudflared-linux-amd64';
  if (arch === 'arm64') binaryName = 'cloudflared-linux-arm64';
  else if (arch === 'arm') binaryName = 'cloudflared-linux-arm';

  const downloadUrl = `https://github.com/cloudflare/cloudflared/releases/latest/download/${binaryName}`;
  console.log(`⬇️  Mengunduh binary cloudflared (${binaryName}) ke ${CLOUDFLARED_BIN}...`);

  // Try curl first (handles IPv4/IPv6 redirects cleanly)
  if (isBinaryAvailable('curl')) {
    try {
      execSync(`curl -4 -sL "${downloadUrl}" -o "${CLOUDFLARED_BIN}"`, { stdio: 'inherit' });
      fs.chmodSync(CLOUDFLARED_BIN, 0o755);
      console.log('✅ Berhasil mengunduh cloudflared binary via curl.');
      return CLOUDFLARED_BIN;
    } catch (curlErr) {
      console.log('⚠️  Curl gagal, mencoba via Node https...');
    }
  }

  return new Promise((resolve, reject) => {
    function fetchUrl(url) {
      https.get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchUrl(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`Gagal mengunduh cloudflared (HTTP ${res.statusCode})`));
          return;
        }
        const fileStream = fs.createWriteStream(CLOUDFLARED_BIN);
        res.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          fs.chmodSync(CLOUDFLARED_BIN, 0o755);
          console.log('✅ Berhasil mengunduh cloudflared binary.');
          resolve(CLOUDFLARED_BIN);
        });
      }).on('error', reject);
    }
    fetchUrl(downloadUrl);
  });
}

async function updateDbTunnelUrl(url) {
  try {
    await prisma.appSetting.upsert({
      where: { key: 'tunnel_url' },
      update: { value: url },
      create: { key: 'tunnel_url', value: url },
    });
  } catch (err) {
    // Non-fatal if DB not yet accessible
  }
}

async function run() {
  console.log('🌐 Memulai Cloudflare Tunnel untuk Inventaris Kantor...');
  console.log('   Port target: 3000 (http://localhost:3000)');

  const localIps = getLocalIpDetails();
  console.log('\n📌 URL Akses Lokal / Wi-Fi (Bisa diakses HP di Wi-Fi yang sama):');
  localIps.forEach((item, idx) => {
    const isPreferred = idx === 0 ? ' [Rekomendasi HP]' : '';
    console.log(`   - ${item.name.padEnd(10)}: http://${item.address}:3000${isPreferred}`);
  });
  console.log(`   - Localhost : http://localhost:3000 (Hanya laptop ini)\n`);

  let binaryPath = 'cloudflared';
  if (!isBinaryAvailable('cloudflared')) {
    if (fs.existsSync(CLOUDFLARED_BIN)) {
      binaryPath = CLOUDFLARED_BIN;
    } else {
      try {
        binaryPath = await downloadCloudflared();
      } catch (err) {
        console.error('⚠️  Tidak dapat mengunduh cloudflared otomatis:', err.message);
        console.log('💡 Anda dapat mengunduh manual dari https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/');
        console.log('   Atau gunakan URL IP Wi-Fi Lokal di atas untuk HP yang tersambung di Wi-Fi yang sama.');
        return;
      }
    }
  }

  console.log(`🚀 Menjalankan: ${binaryPath} tunnel --url http://127.0.0.1:3000\n`);

  const proc = spawn(binaryPath, ['tunnel', '--url', 'http://127.0.0.1:3000'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let detectedUrl = null;
  const urlRegex = /https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/;

  function handleData(chunk) {
    const text = chunk.toString();
    const match = text.match(urlRegex);
    if (match && !detectedUrl) {
      detectedUrl = match[0];
      fs.writeFileSync(TUNNEL_FILE, detectedUrl, 'utf8');
      updateDbTunnelUrl(detectedUrl);

      console.log('\n======================================================');
      console.log('✨ CLOUDFLARE TUNNEL AKTIF & SIAP DIGUNAKAN!');
      console.log(`🔗 Public HTTPS URL: ${detectedUrl}`);
      console.log('📱 Karyawan dari jaringan seluler / internet luar');
      console.log('   dapat mengakses atau scan QR Code secara langsung!');
      console.log('======================================================\n');
    }
  }

  proc.stdout.on('data', handleData);
  proc.stderr.on('data', handleData);

  function cleanup() {
    if (fs.existsSync(TUNNEL_FILE)) {
      try {
        fs.unlinkSync(TUNNEL_FILE);
      } catch {}
    }
    updateDbTunnelUrl('');
    console.log('\n🛑 Cloudflare Tunnel dihentikan.');
    process.exit(0);
  }

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

run();
