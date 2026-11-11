import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Tidak diautentikasi.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const only_mine = searchParams.get('only_mine') === 'true';
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (category) where.category = category;
    if (only_mine) where.created_by = user.id;
    if (search) where.name = { contains: search };

    const [items, total] = await Promise.all([
      prisma.logistic.findMany({
        where,
        include: { creator: { select: { id: true, name: true } } },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.logistic.count({ where }),
    ]);

    return NextResponse.json({
      items,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    console.error('Get logistics error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data logistik.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Tidak diautentikasi.' }, { status: 401 });
    }

    let name: string, category: string, unit: string, location: string;
    let quantity = 0, min_stock = 5;
    let notes: string | null = null;
    let price: number | null = null;
    let photoPath: string | null = null;

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      name = (formData.get('name') as string)?.trim() || '';
      category = (formData.get('category') as string)?.trim() || '';
      unit = (formData.get('unit') as string)?.trim() || '';
      location = (formData.get('location') as string)?.trim() || '';
      quantity = parseInt(formData.get('quantity') as string, 10) || 0;
      min_stock = parseInt(formData.get('min_stock') as string, 10) || 5;
      notes = ((formData.get('notes') as string) || '').trim() || null;
      const priceRaw = (formData.get('price') as string)?.trim();
      if (priceRaw) {
        const p = parseFloat(priceRaw.replace(/[^0-9.]/g, ''));
        if (!isNaN(p)) price = p;
      }

      const photoFile = formData.get('photo') as File | null;
      if (photoFile && photoFile.size > 0) {
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'logistics');
        if (!existsSync(uploadsDir)) await mkdir(uploadsDir, { recursive: true });
        const ext = photoFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        const filename = `logistic-${Date.now()}.${ext}`;
        const buffer = Buffer.from(await photoFile.arrayBuffer());
        await writeFile(path.join(uploadsDir, filename), buffer);
        photoPath = `/uploads/logistics/${filename}`;
      }
    } else {
      const body = await request.json();
      name = body.name?.trim() || '';
      category = body.category?.trim() || '';
      unit = body.unit?.trim() || '';
      location = body.location?.trim() || '';
      quantity = parseInt(body.quantity, 10) || 0;
      min_stock = parseInt(body.min_stock, 10) || 5;
      notes = body.notes?.trim() || null;
      if (body.price !== undefined && body.price !== null) {
        const p = parseFloat(String(body.price).replace(/[^0-9.]/g, ''));
        if (!isNaN(p)) price = p;
      }
    }

    if (!name) return NextResponse.json({ error: 'Nama barang wajib diisi.' }, { status: 400 });
    if (!category) return NextResponse.json({ error: 'Kategori wajib dipilih.' }, { status: 400 });
    if (!unit) return NextResponse.json({ error: 'Satuan wajib diisi.' }, { status: 400 });
    if (!location) return NextResponse.json({ error: 'Lokasi wajib diisi.' }, { status: 400 });

    const item = await (prisma.logistic.create as any)({
      data: {
        name, category, unit, quantity,
        min_stock: isNaN(min_stock) ? 5 : min_stock,
        location, notes, price,
        photo_path: photoPath,
        created_by: user.id,
      },
      include: { creator: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ success: true, item });
  } catch (error: any) {
    console.error('Create logistic error:', error);
    return NextResponse.json({ error: 'Gagal menyimpan data logistik.' }, { status: 500 });
  }
}
