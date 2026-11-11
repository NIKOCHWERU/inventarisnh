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

    // Ambil distinct locations dari tabel inventories
    const locations = await prisma.$queryRaw<{ location: string }[]>`
      SELECT DISTINCT location FROM inventories
      WHERE location IS NOT NULL AND location != ''
      ORDER BY location ASC
    `;

    return NextResponse.json({ locations: locations.map((l) => l.location) });
  } catch (error: any) {
    console.error('Get locations error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data lokasi.' }, { status: 500 });
  }
}
