import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { saveUploadedFile } from '@/lib/upload';
import { logInventoryActivity } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Tidak diautentikasi.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const categoryId = searchParams.get('category_id') || '';
    const condition = searchParams.get('condition') || '';
    const location = searchParams.get('location')?.trim() || '';
    const createdBy = searchParams.get('created_by') || '';
    const onlyMine = searchParams.get('only_mine') === 'true';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(200, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { location: { contains: search } },
        { notes: { contains: search } },
        { creator: { name: { contains: search } } },
      ];
    }

    if (categoryId && categoryId !== 'all') {
      where.category_id = categoryId;
    }

    if (condition && condition !== 'all') {
      where.condition = condition;
    }

    if (location && location !== 'all') {
      where.location = { contains: location };
    }

    if (onlyMine) {
      where.created_by = user.id;
    } else if (createdBy && createdBy !== 'all') {
      where.created_by = createdBy;
    }

    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) {
        where.created_at.gte = new Date(`${startDate}T00:00:00.000Z`);
      }
      if (endDate) {
        where.created_at.lte = new Date(`${endDate}T23:59:59.999Z`);
      }
    }

    // Determine orderBy
    let orderBy: any = { created_at: sortOrder };
    if (sortBy === 'name') orderBy = { name: sortOrder };
    else if (sortBy === 'quantity') orderBy = { quantity: sortOrder };
    else if (sortBy === 'condition') orderBy = { condition: sortOrder };
    else if (sortBy === 'location') orderBy = { location: sortOrder };

    const [total, items] = await Promise.all([
      prisma.inventory.count({ where }),
      prisma.inventory.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          category: { select: { id: true, name: true } },
          creator: { select: { id: true, name: true, role: true } },
        },
      }),
    ]);

    const formatted = items.map((item, idx) => ({
      no: skip + idx + 1,
      id: item.id,
      name: item.name,
      categoryId: item.category_id,
      categoryName: item.category.name,
      location: item.location,
      quantity: item.quantity,
      condition: item.condition,
      notes: (item as any).notes || null,
      price: (item as any).price ?? null,
      photoPath: item.photo_path,
      createdById: item.created_by,
      creatorName: item.creator.name,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));

    return NextResponse.json({
      items: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error: any) {
    console.error('Get inventories error:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data inventaris.' },
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

    const formData = await request.formData();
    const name = formData.get('name')?.toString().trim();
    const category_id = formData.get('category_id')?.toString().trim();
    const location = formData.get('location')?.toString().trim();
    const quantityStr = formData.get('quantity')?.toString().trim();
    const condition = formData.get('condition')?.toString().trim();
    const notes = formData.get('notes')?.toString().trim() || null;
    const priceRaw = formData.get('price')?.toString().trim();
    const parsedPrice = priceRaw ? parseFloat(priceRaw.replace(/[^0-9.]/g, '')) : null;
    const price = parsedPrice !== null && !isNaN(parsedPrice) ? parsedPrice : null;
    const photoFile = formData.get('photo') as File | null;

    if (!name) {
      return NextResponse.json({ error: 'Nama barang wajib diisi.' }, { status: 400 });
    }
    if (!category_id) {
      return NextResponse.json({ error: 'Kategori barang wajib dipilih.' }, { status: 400 });
    }
    if (!location) {
      return NextResponse.json({ error: 'Tempat / lokasi barang wajib diisi.' }, { status: 400 });
    }

    const quantity = parseInt(quantityStr || '1', 10);
    if (isNaN(quantity) || quantity < 1) {
      return NextResponse.json({ error: 'Jumlah barang minimal harus 1.' }, { status: 400 });
    }

    if (!condition) {
      return NextResponse.json(
        { error: 'Kondisi barang wajib diisi atau dipilih.' },
        { status: 400 }
      );
    }

    // Verify category exists
    const category = await prisma.category.findUnique({
      where: { id: category_id },
    });
    if (!category) {
      return NextResponse.json({ error: 'Kategori yang dipilih tidak valid.' }, { status: 400 });
    }

    let photo_path: string | null = null;
    if (photoFile && photoFile.size > 0) {
      const uploadResult = await saveUploadedFile(photoFile);
      if (!uploadResult.success) {
        return NextResponse.json({ error: uploadResult.error }, { status: 400 });
      }
      photo_path = uploadResult.filePath || null;
    }

    // Always attribute created_by to current authenticated session user (prevents frontend spoofing)
    const inventory = await (prisma.inventory.create as any)({
      data: {
        name,
        category_id,
        location,
        quantity,
        condition,
        notes,
        price,
        photo_path,
        created_by: user.id,
      },
      include: {
        category: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
    });

    // Audit log
    await logInventoryActivity({
      inventoryId: inventory.id,
      userId: user.id,
      action: 'CREATE',
      newData: {
        name: inventory.name,
        category: inventory.category.name,
        location: inventory.location,
        quantity: inventory.quantity,
        condition: inventory.condition,
        notes: (inventory as any).notes || null,
        price: (inventory as any).price ?? null,
        photo_path: inventory.photo_path,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Data inventaris berhasil disimpan.',
      inventory: {
        id: inventory.id,
        name: inventory.name,
        categoryId: inventory.category_id,
        categoryName: inventory.category.name,
        location: inventory.location,
        quantity: inventory.quantity,
        condition: inventory.condition,
        notes: (inventory as any).notes || null,
        price: (inventory as any).price ?? null,
        photoPath: inventory.photo_path,
        creatorName: inventory.creator.name,
        createdAt: inventory.created_at,
      },
    });
  } catch (error: any) {
    console.error('Create inventory error:', error);
    return NextResponse.json(
      { error: 'Gagal menyimpan data inventaris ke server.' },
      { status: 500 }
    );
  }
}
