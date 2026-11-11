import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { requireAdmin } from '@/lib/auth';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';

function getWindowsDrives(): string[] {
  const drives: string[] = [];
  for (let i = 65; i <= 90; i++) {
    const driveLetter = String.fromCharCode(i) + ':\\';
    try {
      if (fs.existsSync(driveLetter)) {
        drives.push(driveLetter);
      }
    } catch {}
  }
  return drives.length > 0 ? drives : ['C:\\'];
}

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const targetPath = searchParams.get('path');

    const isWindows = process.platform === 'win32' || targetPath?.includes(':\\');

    // If no path requested, return root drives and quick shortcuts
    if (!targetPath || targetPath.trim() === '') {
      const shortcuts: { name: string; path: string; icon: string }[] = [];

      // Default app uploads directory
      const defaultUploads = path.join(process.cwd(), 'public', 'uploads');
      shortcuts.push({
        name: 'Bawaan Aplikasi (public/uploads)',
        path: defaultUploads,
        icon: 'folder',
      });

      if (isWindows) {
        const drives = getWindowsDrives();
        drives.forEach((d) => {
          shortcuts.push({ name: `Drive (${d.replace('\\', '')})`, path: d, icon: 'hard-drive' });
        });
      } else {
        shortcuts.push({ name: 'Root System (/)', path: '/', icon: 'hard-drive' });
        const homeDir = process.env.HOME || '/home';
        if (fs.existsSync(homeDir)) {
          shortcuts.push({ name: 'User Home', path: homeDir, icon: 'home' });
        }
      }

      return NextResponse.json({
        currentPath: '',
        parentPath: null,
        shortcuts,
        directories: [],
      });
    }

    const normalized = path.resolve(targetPath);
    if (!fs.existsSync(normalized)) {
      return NextResponse.json({ error: 'Folder tidak ditemukan: ' + normalized }, { status: 404 });
    }

    const stat = await fs.promises.stat(normalized);
    if (!stat.isDirectory()) {
      return NextResponse.json({ error: 'Path yang dipilih bukan direktori.' }, { status: 400 });
    }

    const parentPath = path.dirname(normalized) !== normalized ? path.dirname(normalized) : null;

    let entries: fs.Dirent[] = [];
    try {
      entries = await fs.promises.readdir(normalized, { withFileTypes: true });
    } catch (readErr: any) {
      return NextResponse.json({ error: 'Izin ditolak untuk membuka folder ini: ' + readErr.message }, { status: 403 });
    }

    const directories = entries
      .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
      .map((e) => ({
        name: e.name,
        fullPath: path.join(normalized, e.name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    return NextResponse.json({
      currentPath: normalized,
      parentPath,
      directories,
    });
  } catch (error: any) {
    console.error('Browse folder error:', error);
    return NextResponse.json({ error: error.message || 'Gagal menjelajahi folder.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    // Attempt to open native folder dialog via PowerShell on Windows
    if (process.platform === 'win32') {
      try {
        const psCommand = `powershell -NoProfile -Command "[System.Reflection.Assembly]::LoadWithPartialName('System.windows.forms') | Out-Null; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.Description = 'Pilih Folder Penyimpanan Foto Inventaris'; if($f.ShowDialog() -eq 'OK'){ Write-Output $f.SelectedPath }"`;
        const { stdout } = await execAsync(psCommand, { timeout: 60000 });
        const selected = stdout.trim();
        if (selected) {
          return NextResponse.json({ success: true, selectedPath: selected });
        }
        return NextResponse.json({ success: false, message: 'Pemilihan dibatalkan.' });
      } catch (err: any) {
        console.warn('Native folder dialog error:', err.message);
      }
    }

    return NextResponse.json({
      success: false,
      message: 'Dialog native tidak tersedia di lingkungan ini. Gunakan file browser internal.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
