import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Tidak diautentikasi.' }, { status: 401 });
    }

    // Ambil distinct locations dari tabel inventories dan logistics (semua penginput)
    const invLocations = await prisma.$queryRaw<{ location: string | null }[]>`
      SELECT DISTINCT location FROM inventories
      WHERE location IS NOT NULL AND location != ''
    `;

    const logLocations = await prisma.$queryRaw<{ location: string | null }[]>`
      SELECT DISTINCT location FROM logistics
      WHERE location IS NOT NULL AND location != ''
    `;

    // Pecah lokasi jika ada yang dipisah koma, kumpulkan semua lokasi unik dari semua penginput
    const allSet = new Set<string>();
    [...invLocations, ...logLocations].forEach((row) => {
      if (row.location) {
        row.location.split(',').forEach((loc) => {
          const trimmed = loc.trim();
          if (trimmed) allSet.add(trimmed);
        });
      }
    });

    const sorted = Array.from(allSet).sort((a, b) => a.localeCompare('id'));

    return NextResponse.json({ locations: sorted });
  } catch (error: any) {
    console.error('Get locations error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data lokasi.' }, { status: 500 });
  }
}
