import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'Pilih file database (.db) yang valid.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Verify SQLite header (first 16 bytes: "SQLite format 3\0")
    if (buffer.length < 16 || !buffer.subarray(0, 16).toString('utf8').startsWith('SQLite format 3')) {
      return NextResponse.json(
        { error: 'File yang diunggah bukan merupakan file database SQLite yang valid.' },
        { status: 400 }
      );
    }

    const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
    const walPath = path.join(process.cwd(), 'prisma', 'dev.db-wal');
    const shmPath = path.join(process.cwd(), 'prisma', 'dev.db-shm');
    const backupSafetyPath = path.join(process.cwd(), 'prisma', `dev.db.bak_${Date.now()}`);

    // Create automatic safety backup of current database
    if (fs.existsSync(dbPath)) {
      await fs.promises.copyFile(dbPath, backupSafetyPath);
    }

    try {
      // Disconnect active client
      await prisma.$disconnect();

      // Overwrite database
      await fs.promises.writeFile(dbPath, buffer);

      // Clean old WAL files
      if (fs.existsSync(walPath)) await fs.promises.unlink(walPath).catch(() => {});
      if (fs.existsSync(shmPath)) await fs.promises.unlink(shmPath).catch(() => {});

      // Reconnect and verify schema
      await prisma.$connect();
      const userCount = await prisma.user.count();
      const inventoryCount = await prisma.inventory.count();

      return NextResponse.json({
        success: true,
        message: `Database berhasil dipulihkan! Terdeteksi ${userCount} pengguna dan ${inventoryCount} data inventaris.`,
        backupCreated: path.basename(backupSafetyPath),
      });
    } catch (restoreErr: any) {
      console.error('Failed to verify restored database, rolling back:', restoreErr);
      // Rollback to safety backup
      if (fs.existsSync(backupSafetyPath)) {
        await fs.promises.copyFile(backupSafetyPath, dbPath);
        await prisma.$connect();
      }
      return NextResponse.json(
        { error: `Database gagal dipulihkan (struktur tabel tidak sesuai): ${restoreErr.message}` },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Restore database error:', error);
    return NextResponse.json({ error: 'Gagal memulihkan database.' }, { status: 500 });
  }
}
