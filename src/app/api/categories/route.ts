import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Tidak diautentikasi.' }, { status: 401 });
    }

    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { inventories: true },
        },
      },
    });

    const formatted = categories.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      createdAt: c.created_at,
      inventoryCount: c._count.inventories,
    }));

    return NextResponse.json({ categories: formatted });
  } catch (error: any) {
    console.error('Get categories error:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data kategori.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Tidak diautentikasi.' }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Nama kategori wajib diisi.' },
        { status: 400 }
      );
    }

    const trimmed = name.trim();
    const existing = await prisma.category.findUnique({
      where: { name: trimmed },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Kategori dengan nama tersebut sudah ada.' },
        { status: 400 }
      );
    }

    const category = await prisma.category.create({
      data: {
        name: trimmed,
        status: 'ACTIVE',
      },
    });

    return NextResponse.json({ success: true, category });
  } catch (error: any) {
    console.error('Create category error:', error);
    return NextResponse.json(
      { error: 'Gagal membuat kategori baru.' },
      { status: 500 }
    );
  }
}
