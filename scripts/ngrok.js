const { spawn, execSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const TUNNEL_FILE = path.join(__dirname, '..', '.tunnel_url');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

async function isServerRunning(port = 3000) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/api/auth/me`, (res) => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function main() {
  console.log('🌐 Memulai Ngrok Tunnel untuk Inventaris Kantor...');
  console.log('   Target Port: 3000 (http://127.0.0.1:3000)\n');

  // Check if Next.js is running
  const running = await isServerRunning(3000);
  if (!running) {
    console.log('⚠️  PERINGATAN PENTING:');
    console.log('   Server Next.js BELUM BERJALAN di port 3000!');
    console.log('   Ngrok adalah "jembatan" ke server lokal Anda.');
    console.log('   Jika server belum jalan, browser akan menampilkan error / blank.');
    console.log('👉 Buka terminal baru dan jalankan: npm run dev\n');
  }

  // Spawn ngrok process with --host-header=rewrite to avoid ERR_SOCKET_NOT_CONNECTED
  const ngrokProc = spawn(
    'ngrok',
    ['http', 'http://127.0.0.1:3000', '--host-header=rewrite', '--log=stdout'],
    {
      stdio: ['inherit', 'pipe', 'pipe'],
    }
  );

  let detectedUrl = null;

  // Listen to stdout in case ngrok logs the URL directly
  ngrokProc.stdout.on('data', (chunk) => {
    const str = chunk.toString();
    const match = str.match(/url=(https:\/\/[^\s]+)/);
    if (match && !detectedUrl) {
      detectedUrl = match[1];
      onUrlFound(detectedUrl);
    }
  });

  // Also poll ngrok local API at http://127.0.0.1:4040
  for (let i = 0; i < 20; i++) {
    await sleep(800);
    if (detectedUrl) break;
    const url = await getNgrokPublicUrl();
    if (url && !detectedUrl) {
      detectedUrl = url;
      onUrlFound(detectedUrl);
      break;
    }
  }

  function onUrlFound(url) {
    fs.writeFileSync(TUNNEL_FILE, url, 'utf8');
    updateDbTunnelUrl(url);

    console.log('\n======================================================');
    console.log('✨ NGROK TUNNEL AKTIF & SIAP DIGUNAKAN!');
    console.log(`🔗 Public HTTPS URL: ${url}`);
    console.log('📱 QR Code di Dashboard Admin sekarang OTOMATIS');
    console.log(`   menggunakan link Ngrok ini: ${url}/enroll?token=...`);
    console.log('======================================================\n');
  }

  function cleanup() {
    if (fs.existsSync(TUNNEL_FILE)) {
      try {
        fs.unlinkSync(TUNNEL_FILE);
      } catch {}
    }
    updateDbTunnelUrl('');
    console.log('\n🛑 Ngrok Tunnel dihentikan.');
    process.exit(0);
  }

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  ngrokProc.on('exit', (code) => {
    if (code !== 0 && !detectedUrl) {
      console.log('\n💡 Jika ngrok meminta authtoken, jalankan:');
      console.log('   ngrok config add-authtoken <TOKEN_ANDA>');
      console.log('   Token gratis bisa didapat di: https://dashboard.ngrok.com/get-started/your-authtoken');
    }
    cleanup();
  });
}

main().catch(console.error);
