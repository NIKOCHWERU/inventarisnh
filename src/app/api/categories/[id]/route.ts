import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json();
    const { name, status } = body;

    const existing = await prisma.category.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Kategori tidak ditemukan.' }, { status: 404 });
    }

    const updateData: any = {};
    if (name && name.trim()) {
      const trimmed = name.trim();
      const duplicate = await prisma.category.findFirst({
        where: { name: trimmed, NOT: { id } },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: 'Nama kategori sudah digunakan oleh kategori lain.' },
          { status: 400 }
        );
      }
      updateData.name = trimmed;
    }

    if (status && ['ACTIVE', 'INACTIVE'].includes(status)) {
      updateData.status = status;
    }

    const updated = await prisma.category.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, category: updated });
  } catch (error: any) {
    console.error('Update category error:', error);
    return NextResponse.json(
      { error: 'Gagal memperbarui kategori.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    const { id } = params;
    const inventoryCount = await prisma.inventory.count({
      where: { category_id: id },
    });

    if (inventoryCount > 0) {
      return NextResponse.json(
        {
          error: `Kategori tidak dapat dihapus karena masih digunakan oleh ${inventoryCount} barang inventaris. Ubah kategori barang tersebut terlebih dahulu atau nonaktifkan kategori ini.`,
        },
        { status: 400 }
      );
    }

    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Kategori berhasil dihapus.',
    });
  } catch (error: any) {
    console.error('Delete category error:', error);
    return NextResponse.json(
      { error: 'Gagal menghapus kategori.' },
      { status: 500 }
    );
  }
}
