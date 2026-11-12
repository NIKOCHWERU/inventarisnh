import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Tidak diautentikasi.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() || '';

    const whereClause: any = {};
    if (query) {
      whereClause.name = { contains: query };
    }

    const items = await prisma.inventory.findMany({
      where: whereClause,
      take: query ? 25 : 15,
      orderBy: { created_at: 'desc' },
      include: {
        category: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true, role: true } },
      },
    });

    // Ambil semua nama barang unik dari seluruh penginput untuk autocomplete datalist
    const distinctRows = await prisma.inventory.findMany({
      select: { name: true },
      distinct: ['name'],
      orderBy: { name: 'asc' },
      take: 200,
    });

    const formatted = items.map((item) => ({
      id: item.id,
      name: item.name,
      categoryId: item.category_id,
      categoryName: item.category?.name || 'Umum',
      location: item.location,
      quantity: item.quantity,
      unit: (item as any).unit || 'PCS',
      condition: item.condition,
      price: item.price,
      creatorName: item.creator?.name || 'Pengguna',
      creatorRole: item.creator?.role || 'Karyawan',
      createdAt: item.created_at,
    }));

    return NextResponse.json({
      success: true,
      items: formatted,
      allNames: distinctRows.map((r) => r.name),
    });
  } catch (error: any) {
    console.error('Inventory history fetch error:', error);
    return NextResponse.json({ error: 'Gagal memuat histori barang.' }, { status: 500 });
  }
}
