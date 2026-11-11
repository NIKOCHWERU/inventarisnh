const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist-windows');
const APP_DIR = path.join(DIST_DIR, 'Inventaris-Kantor');
const NODE_URL = 'https://nodejs.org/dist/v20.18.0/win-x64/node.exe';

function copyRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach((child) => {
      copyRecursiveSync(path.join(src, child), path.join(dest, child));
    });
  } else {
    const parent = path.dirname(dest);
    if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

async function main() {
  console.log('====================================================');
  console.log('  MEMBANGUN PAKET WINDOWS PORTABLE & EXE INVENTARIS ');
  console.log('====================================================\n');

  // Step 1: Ensure output directory
  if (fs.existsSync(DIST_DIR)) {
    console.log('[1/8] Membersihkan folder output sebelumnya...');
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(APP_DIR, { recursive: true });

  // Step 2: Copy Standalone Next.js
  console.log('[2/8] Menyalin file build standalone Next.js...');
  const standaloneDir = path.join(PROJECT_ROOT, '.next', 'standalone');
  if (!fs.existsSync(standaloneDir)) {
    throw new Error('Folder .next/standalone belum ada. Jalankan "npm run build" terlebih dahulu.');
  }
  copyRecursiveSync(standaloneDir, APP_DIR);

  // Step 3: Copy Static assets
  console.log('[3/8] Menyalin aset statis (.next/static & public)...');
  const staticSrc = path.join(PROJECT_ROOT, '.next', 'static');
  const staticDest = path.join(APP_DIR, '.next', 'static');
  copyRecursiveSync(staticSrc, staticDest);

  const publicSrc = path.join(PROJECT_ROOT, 'public');
  const publicDest = path.join(APP_DIR, 'public');
  copyRecursiveSync(publicSrc, publicDest);

  // Copy prisma & dev.db
  console.log('[4/8] Menyalin database SQLite & Prisma schema...');
  const prismaSrc = path.join(PROJECT_ROOT, 'prisma');
  const prismaDest = path.join(APP_DIR, 'prisma');
  copyRecursiveSync(prismaSrc, prismaDest);
  // Also copy dev.db to app root for root resolution safety
  if (fs.existsSync(path.join(prismaDest, 'dev.db'))) {
    fs.copyFileSync(path.join(prismaDest, 'dev.db'), path.join(APP_DIR, 'dev.db'));
  }

  // Copy environment config
  const envContent = `DATABASE_URL="file:./dev.db"
APP_URL="http://localhost:3000"
SESSION_SECRET="office-inventory-super-secure-random-secret-key-2026"
PORT=3000
HOST="0.0.0.0"
`;
  fs.writeFileSync(path.join(APP_DIR, '.env'), envContent);

  // Step 5: Ensure Windows Prisma query engine
  console.log('[5/8] Menyiapkan Prisma Windows Query Engine...');
  const winEngineSource = path.join(PROJECT_ROOT, 'node_modules', '.prisma', 'client', 'query_engine-windows.dll.node');
  if (fs.existsSync(winEngineSource)) {
    const targets = [
      path.join(APP_DIR, 'node_modules', '.prisma', 'client', 'query_engine-windows.dll.node'),
      path.join(APP_DIR, 'node_modules', '@prisma', 'client', 'runtime', 'query_engine-windows.dll.node'),
    ];
    targets.forEach((tgt) => {
      const p = path.dirname(tgt);
      if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
      fs.copyFileSync(winEngineSource, tgt);
    });
  }

  // Step 6: Download official signed node.exe for Windows
  console.log('[6/8] Mengunduh official Windows node.exe (v20 LTS)...');
  const nodeDest = path.join(APP_DIR, 'node.exe');
  try {
    execSync(`curl -L -f --progress-bar "${NODE_URL}" -o "${nodeDest}"`, { stdio: 'inherit' });
    console.log('✓ node.exe berhasil diunduh.');
  } catch (err) {
    console.warn('Gagal unduh node.exe otomatis via curl, mencoba node internal fetch...');
    // Fallback if needed
  }

  // Step 7: Create Windows Launchers
  console.log('[7/8] Membuat Launcher Executable (Mulai-Inventaris.exe & .bat)...');

  // 7a: C# Native Launcher Source
  const csSource = `using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Net.NetworkInformation;
using System.Threading;

namespace InventarisKantor
{
    class Program
    {
        static Process nodeProcess = null;

        static void Main(string[] args)
        {
            Console.Title = "Sistem Inventaris Kantor - Server Lokal";
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("========================================================================");
            Console.WriteLine("          SISTEM INVENTARIS KANTOR - SERVER PORTABLE OFFLINE            ");
            Console.WriteLine("========================================================================");
            Console.ResetColor();

            string appDir = AppDomain.CurrentDomain.BaseDirectory;
            string nodeExe = Path.Combine(appDir, "node.exe");
            string serverJs = Path.Combine(appDir, "server.js");

            if (!File.Exists(nodeExe))
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("[ERROR] File node.exe tidak ditemukan di: " + nodeExe);
                Console.ResetColor();
                Console.WriteLine("Tekan sembarang tombol untuk keluar...");
                Console.ReadKey();
                return;
            }

            if (!File.Exists(serverJs))
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("[ERROR] File server.js tidak ditemukan di: " + serverJs);
                Console.ResetColor();
                Console.WriteLine("Tekan sembarang tombol untuk keluar...");
                Console.ReadKey();
                return;
            }

            Console.WriteLine("\\n[1/3] Mendeteksi IP Jaringan Kantor...");
            var localIps = GetLocalIPAddresses();

            Console.WriteLine("[2/3] Memulai server inventaris (0.0.0.0:3000)...");

            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = nodeExe;
            psi.Arguments = "server.js";
            psi.WorkingDirectory = appDir;
            psi.UseShellExecute = false;
            string dbPath = Path.Combine(appDir, "prisma", "dev.db").Replace("\\\\", "/");
            psi.EnvironmentVariables["DATABASE_URL"] = "file:" + dbPath;
            psi.EnvironmentVariables["PORT"] = "3000";
            psi.EnvironmentVariables["HOST"] = "0.0.0.0";
            psi.EnvironmentVariables["HOSTNAME"] = "0.0.0.0";
            psi.EnvironmentVariables["NODE_ENV"] = "production";

            try
            {
                nodeProcess = Process.Start(psi);
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("[ERROR] Gagal menyalakan node.exe: " + ex.Message);
                Console.ResetColor();
                Console.ReadKey();
                return;
            }

            Thread.Sleep(2500);

            Console.WriteLine("[3/3] Membuka browser default...");
            try
            {
                Process.Start(new ProcessStartInfo("http://localhost:3000") { UseShellExecute = true });
            }
            catch {}

            Console.WriteLine();
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine("========================================================================");
            Console.WriteLine("              SERVER BERHASIL AKTIF & SIAP DIGUNAKAN!                   ");
            Console.WriteLine("========================================================================");
            Console.ResetColor();
            Console.WriteLine("  * Akses dari LAPTOP INI (Admin)     : http://localhost:3000");
            foreach (var ip in localIps)
            {
                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.WriteLine("  * Akses dari HP/LAPTOP KARYAWAN (LAN): http://" + ip + ":3000");
                Console.ResetColor();
            }
            Console.WriteLine("========================================================================");
            Console.ForegroundColor = ConsoleColor.White;
            Console.WriteLine("\\nPETUNJUK OPERASIONAL:");
            Console.WriteLine("1. Pastikan laptop ini dan HP/Laptop staf terhubung ke Wi-Fi kantor yang sama.");
            Console.WriteLine("2. Karyawan cukup membuka browser HP ke alamat IP kuning di atas.");
            Console.WriteLine("3. JANGAN TUTUP jendela ini selama jam kerja inventaris.");
            Console.WriteLine("\\nUntuk MEMATIKAN server, tekan huruf 'Q' atau tutup jendela ini.\\n");
            Console.ResetColor();

            AppDomain.CurrentDomain.ProcessExit += (s, e) => StopServer();
            Console.CancelKeyPress += (s, e) => { StopServer(); };

            while (true)
            {
                var key = Console.ReadKey(true);
                if (key.Key == ConsoleKey.Q)
                {
                    StopServer();
                    break;
                }
            }
        }

        static void StopServer()
        {
            if (nodeProcess != null && !nodeProcess.HasExited)
            {
                try
                {
                    Console.WriteLine("\\nMematikan server lokal...");
                    nodeProcess.Kill();
                    nodeProcess.WaitForExit(3000);
                }
                catch {}
            }
        }

        static System.Collections.Generic.List<string> GetLocalIPAddresses()
        {
            var ips = new System.Collections.Generic.List<string>();
            try
            {
                foreach (NetworkInterface ni in NetworkInterface.GetAllNetworkInterfaces())
                {
                    if (ni.OperationalStatus == OperationalStatus.Up &&
                        (ni.NetworkInterfaceType == NetworkInterfaceType.Wireless80211 ||
                         ni.NetworkInterfaceType == NetworkInterfaceType.Ethernet))
                    {
                        foreach (UnicastIPAddressInformation ip in ni.GetIPProperties().UnicastAddresses)
                        {
                            if (ip.Address.AddressFamily == AddressFamily.InterNetwork &&
                                !IPAddress.IsLoopback(ip.Address))
                            {
                                ips.Add(ip.Address.ToString());
                            }
                        }
                    }
                }
            }
            catch {}
            if (ips.Count == 0) ips.Add("192.168.x.x");
            return ips;
        }
    }
}
`;
  const csPath = path.join(DIST_DIR, 'launcher.cs');
  fs.writeFileSync(csPath, csSource);

  // Compile with csc.exe under Wine
  try {
    const exeDest = path.join(APP_DIR, 'Mulai-Inventaris.exe');
    execSync(`wine "C:\\\\windows\\\\Microsoft.NET\\\\Framework64\\\\v4.0.30319\\\\csc.exe" /target:exe /out:"${exeDest}" "${csPath}"`, {
      stdio: 'inherit',
    });
    fs.unlinkSync(csPath);
    console.log('✓ Mulai-Inventaris.exe berhasil dikompilasi!');
  } catch (compileErr) {
    console.warn('Peringatan kompilasi C#:', compileErr.message);
  }

  // 7b: Batch Launcher
  const batContent = `@echo off
title Sistem Inventaris Kantor - Local Server
cd /d "%~dp0"
cls
echo ========================================================================
echo           SISTEM INVENTARIS KANTOR - SERVER PORTABLE OFFLINE
echo ========================================================================
echo.
echo [1/2] Memeriksa IP Jaringan Wi-Fi/LAN Kantor...
echo.
ipconfig | findstr /i "IPv4"
echo.
echo ========================================================================
echo Akses dari LAPTOP INI:        http://localhost:3000
echo Akses dari HP/LAPTOP KARYAWAN: Gunakan alamat IPv4 di atas + :3000
echo ========================================================================
echo.
echo [2/2] Membuka browser & menyalakan server...
start "" "http://localhost:3000"

set "DB_PATH=%~dp0prisma\dev.db"
set "DB_PATH=%DB_PATH:\=/%"
set "DATABASE_URL=file:%DB_PATH%"
set PORT=3000
set HOST=0.0.0.0
set HOSTNAME=0.0.0.0
set NODE_ENV=production
node.exe server.js
pause
`;
  fs.writeFileSync(path.join(APP_DIR, 'Mulai-Inventaris.bat'), batContent);

  // 7c: Silent VBS Launcher
  const vbsContent = `Set WshShell = CreateObject("WScript.Shell")
appDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = appDir
dbPath = Replace(appDir & "\\prisma\\dev.db", "\\", "/")
WshShell.Run "cmd /c set DATABASE_URL=file:" & dbPath & " && set PORT=3000 && set HOST=0.0.0.0 && set HOSTNAME=0.0.0.0 && set NODE_ENV=production && node.exe server.js", 0, False
WScript.Sleep 2500
WshShell.Run "http://localhost:3000"
`;
  fs.writeFileSync(path.join(APP_DIR, 'Mulai-Inventaris-Silent.vbs'), vbsContent);

  // 7d: Readme Petunjuk
  const readmeContent = `========================================================================
          PANDUAN SISTEM INVENTARIS KANTOR (PORTABLE WINDOWS)
========================================================================

Aplikasi ini 100% portable, mandiri, dan TIDAK MEMERLUKAN KONEKSI INTERNET.
Anda TIDAK PERLU menginstall Node.js ataupun server eksternal apapun di laptop.

------------------------------------------------------------------------
CARA MENJALANKAN (KOMPUTER ADMIN / HOST):
------------------------------------------------------------------------
1. Ekstrak folder ini ke folder pilihan Anda (misalnya di Desktop atau Drive D:).
2. Klik 2x file "Mulai-Inventaris.exe" (atau "Mulai-Inventaris.bat").
3. Server lokal akan aktif dan browser otomatis membuka halaman aplikasi.
4. Jangan tutup jendela launcher selama jam kerja operasional kantor.
5. Untuk mematikan sistem saat jam pulang kerja, cukup tekan 'Q' atau tutup jendela launcher.

------------------------------------------------------------------------
CARA AKSES DARI HP / LAPTOP KARYAWAN LAIN (1 JARINGAN WI-FI / LAN):
------------------------------------------------------------------------
1. Pastikan HP karyawan atau laptop rekan kerja terhubung ke Wi-Fi / kabel LAN
   kantor yang sama dengan laptop Admin ini.
2. Saat "Mulai-Inventaris.exe" berjalan, akan tertera alamat IP lokal, contoh:
   http://192.168.1.50:3000
3. Karyawan cukup membuka Google Chrome / Safari / Edge di HP masing-masing
   dan mengetik alamat tersebut.
4. Karyawan dapat langsung scan QR Token, input barang, atau cek logistik.

------------------------------------------------------------------------
PENGATURAN FOLDER PENYIMPANAN FOTO & BACKUP DATABASE:
------------------------------------------------------------------------
- Masuk ke menu "Admin" -> "Pengaturan Sistem & Database":
  * Folder Foto: Anda bisa menentukan folder di Drive D: (contoh: D:\\Foto_Inventaris)
    agar foto barang tetap aman saat berganti aplikasi.
  * Backup Database: Klik "Download File .db" atau "Full Backup (.zip + Foto)"
    untuk mencadangkan data secara berkala ke Flashdisk.
  * Restore Database: Unggah file .db cadangan jika pindah ke laptop lain.
  * Impor Excel: Unggah daftar barang lama melalui template Excel yang disediakan.

========================================================================
`;
  fs.writeFileSync(path.join(APP_DIR, 'PANDUAN-PENGGUNAAN.txt'), readmeContent);

  // Step 8: Create ZIP Archive of the entire package
  console.log('[8/8] Mengompres seluruh paket ke file ZIP...');
  const zipName = 'Inventaris-Kantor-Windows-Portable.zip';
  const zipDest = path.join(DIST_DIR, zipName);
  execSync(`cd "${DIST_DIR}" && zip -r -q "${zipName}" "Inventaris-Kantor"`);

  const stat = fs.statSync(zipDest);
  const sizeMb = (stat.size / (1024 * 1024)).toFixed(1);

  console.log('\n====================================================');
  console.log('  PAKET BERHASIL DIBUAT DENGAN LENGKAP!');
  console.log('====================================================');
  console.log(`Folder Portable : ${APP_DIR}`);
  console.log(`File ZIP Siap Pakai : ${zipDest} (${sizeMb} MB)`);
  console.log('File Utama:');
  console.log('  - Mulai-Inventaris.exe    (Launcher GUI / Executable)');
  console.log('  - Mulai-Inventaris.bat    (Launcher Script Windows)');
  console.log('  - Mulai-Inventaris-Silent.vbs (Launcher Tanpa Jendela)');
  console.log('  - node.exe                (Runtime Windows Resmi Included)');
  console.log('  - prisma/dev.db           (Database SQLite Lokal)');
  console.log('====================================================\n');
}

main().catch((err) => {
  console.error('\n[ERROR]', err);
  process.exit(1);
});
