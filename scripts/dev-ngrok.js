const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const TUNNEL_FILE = path.join(__dirname, '..', '.tunnel_url');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isServerReady(port = 3000) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/api/auth/me`, (res) => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function getNgrokPublicUrl() {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:4040/api/tunnels', (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const tunnels = json.tunnels || [];
          const httpsTunnel = tunnels.find((t) => t.proto === 'https') || tunnels[0];
          if (httpsTunnel && httpsTunnel.public_url) {
            resolve(httpsTunnel.public_url);
            return;
          }
        } catch {}
        resolve(null);
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(null);
    });
  });
}

async function updateDbTunnelUrl(url) {
  try {
    await prisma.appSetting.upsert({
      where: { key: 'tunnel_url' },
      update: { value: url },
      create: { key: 'tunnel_url', value: url },
    });
  } catch (err) {}
}

async function run() {
  console.log('🚀 Menjalankan Server Next.js + Ngrok dalam 1 Perintah...\n');

  // 1. Start Next.js dev server
  const nextProc = spawn('npm', ['run', 'dev'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
  });

  // 2. Wait for port 3000 to be ready
  console.log('⏳ Menunggu server lokal port 3000 aktif...');
  let ready = false;
  for (let i = 0; i < 30; i++) {
    await sleep(1000);
    ready = await isServerReady(3000);
    if (ready) break;
  }

  if (!ready) {
    console.error('❌ Server Next.js gagal siap dalam 30 detik.');
    nextProc.kill();
    process.exit(1);
  }

  console.log('✅ Server lokal aktif! Menghubungkan Ngrok...\n');

  // 3. Start ngrok with --host-header=rewrite and explicit IPv4
  const ngrokProc = spawn(
    'ngrok',
    ['http', 'http://127.0.0.1:3000', '--host-header=rewrite', '--log=stdout'],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );

  let detectedUrl = null;

  ngrokProc.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    const match = text.match(/url=(https:\/\/[^\s]+)/);
    if (match && !detectedUrl) {
      detectedUrl = match[1];
      printSuccess(detectedUrl);
    }
  });

  // Also poll ngrok local API at 4040
  for (let i = 0; i < 15; i++) {
    await sleep(800);
    if (detectedUrl) break;
    const url = await getNgrokPublicUrl();
    if (url && !detectedUrl) {
      detectedUrl = url;
      printSuccess(detectedUrl);
      break;
    }
  }

  function printSuccess(url) {
    fs.writeFileSync(TUNNEL_FILE, url, 'utf8');
    updateDbTunnelUrl(url);

    console.log('\n======================================================');
    console.log('✨ SERVER & NGROK BERHASIL AKTIF BERSAMAAN!');
    console.log(`💻 Local URL : http://localhost:3000`);
    console.log(`🔗 Ngrok URL : ${url}`);
    console.log('📱 QR Code di Dashboard Admin otomatis menggunakan link ini.');
    console.log('======================================================\n');
  }

  function cleanup() {
    if (fs.existsSync(TUNNEL_FILE)) {
      try {
        fs.unlinkSync(TUNNEL_FILE);
      } catch {}
    }
    updateDbTunnelUrl('');
    try {
      ngrokProc.kill();
    } catch {}
    try {
      nextProc.kill();
    } catch {}
    console.log('\n🛑 Server dan Ngrok dihentikan.');
    process.exit(0);
  }

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

run().catch(console.error);
