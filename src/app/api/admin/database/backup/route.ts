import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { getUploadDir, DEFAULT_UPLOAD_DIR } from '@/lib/upload';

export const dynamic = 'force-dynamic';

function addDirectoryToZip(zipInstance: JSZip, localDirPath: string, zipFolderPath: string) {
  if (!fs.existsSync(localDirPath)) return;
  const entries = fs.readdirSync(localDirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(localDirPath, entry.name);
    const zipPath = path.join(zipFolderPath, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      addDirectoryToZip(zipInstance, fullPath, zipPath);
    } else if (entry.isFile()) {
      zipInstance.file(zipPath, fs.readFileSync(fullPath));
    }
  }
}

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'db';

    // Flush SQLite WAL buffer to main file
    try {
      await prisma.$executeRawUnsafe('PRAGMA wal_checkpoint(FULL);');
    } catch (walErr) {
      console.warn('WAL checkpoint warning:', walErr);
    }

    const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
    if (!fs.existsSync(dbPath)) {
      return NextResponse.json({ error: 'File database prisma/dev.db tidak ditemukan.' }, { status: 404 });
    }

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;

    if (type === 'db') {
      const dbBuffer = await fs.promises.readFile(dbPath);
      return new NextResponse(new Uint8Array(dbBuffer), {
        headers: {
          'Content-Type': 'application/x-sqlite3',
          'Content-Disposition': `attachment; filename="inventaris_backup_${dateStamp}.db"`,
        },
      });
    }

    if (type === 'zip') {
      const activeUploadDir = await getUploadDir();
      const zip = new JSZip();

      // Append database file
      const dbBuf = await fs.promises.readFile(dbPath);
      zip.file('dev.db', dbBuf);

      // Append uploads folder
      addDirectoryToZip(zip, activeUploadDir, 'uploads');
      if (activeUploadDir !== DEFAULT_UPLOAD_DIR) {
        addDirectoryToZip(zip, DEFAULT_UPLOAD_DIR, 'uploads_default');
      }

      const zipBuffer = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      return new NextResponse(new Uint8Array(zipBuffer), {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="inventaris_full_backup_${dateStamp}.zip"`,
        },
      });
    }

    return NextResponse.json({ error: 'Tipe backup tidak valid. Pilih "db" atau "zip".' }, { status: 400 });
  } catch (error: any) {
    console.error('Backup database error:', error);
    return NextResponse.json({ error: 'Gagal membuat backup database.' }, { status: 500 });
  }
}
