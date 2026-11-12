import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { saveUploadedFile, deleteUploadedFile } from '@/lib/upload';
import { logInventoryActivity } from '@/lib/audit';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Tidak diautentikasi.' }, { status: 401 });
    }

    const { id } = params;
    const item = await prisma.inventory.findUnique({
      where: { id },
      include: {
        category: true,
        creator: { select: { id: true, name: true, role: true } },
        activity_logs: {
          orderBy: { created_at: 'desc' },
          include: {
            user: { select: { id: true, name: true, role: true } },
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Data inventaris tidak ditemukan.' }, { status: 404 });
    }

    return NextResponse.json({
      item: {
        id: item.id,
        name: item.name,
        categoryId: item.category_id,
        categoryName: item.category.name,
        location: item.location,
        quantity: item.quantity,
        unit: (item as any).unit || 'PCS',
        condition: item.condition,
        notes: (item as any).notes || null,
        price: (item as any).price ?? null,
        photoPath: item.photo_path,
        createdById: item.created_by,
        creatorName: item.creator.name,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        activityLogs: item.activity_logs.map((log) => ({
          id: log.id,
          action: log.action,
          userName: log.user.name,
          userRole: log.user.role,
          oldData: log.old_data ? JSON.parse(log.old_data) : null,
          newData: log.new_data ? JSON.parse(log.new_data) : null,
          createdAt: log.created_at,
        })),
      },
    });
  } catch (error: any) {
    console.error('Get inventory detail error:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil detail inventaris.' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Tidak diautentikasi.' }, { status: 401 });
    }

    const { id } = params;
    const existing = await prisma.inventory.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Data inventaris tidak ditemukan.' }, { status: 404 });
    }

    // Authorization check
    if (user.role !== 'Admin') {
      const setting = await prisma.appSetting.findUnique({
        where: { key: 'allow_employee_edit' },
      });
      const allowEmployeeEdit = setting?.value === 'true';

      if (!allowEmployeeEdit || existing.created_by !== user.id) {
        return NextResponse.json(
          { error: 'Anda tidak memiliki izin untuk mengedit inventaris ini.' },
          { status: 403 }
        );
      }
    }

    const formData = await request.formData();
    const name = formData.get('name')?.toString().trim();
    const category_id = formData.get('category_id')?.toString().trim();
    const location = formData.get('location')?.toString().trim();
    const quantityStr = formData.get('quantity')?.toString().trim();
    const condition = formData.get('condition')?.toString().trim();
    const notesRaw = formData.get('notes');
    const priceRaw = formData.get('price');
    const removePhoto = formData.get('remove_photo') === 'true';
    const unit = formData.get('unit')?.toString().trim();
    const photoFile = formData.get('photo') as File | null;

    const updateData: any = {};
    if (name) updateData.name = name;
    if (location) updateData.location = location;
    if (unit) updateData.unit = unit;
    if (notesRaw !== null && notesRaw !== undefined) {
      updateData.notes = notesRaw.toString().trim() || null;
    }
    if (priceRaw !== null && priceRaw !== undefined) {
      const str = priceRaw.toString().trim();
      if (!str) {
        updateData.price = null;
      } else {
        const parsed = parseFloat(str.replace(/[^0-9.]/g, ''));
        updateData.price = isNaN(parsed) ? null : parsed;
      }
    }

    if (category_id) {
      const categoryExists = await prisma.category.findUnique({ where: { id: category_id } });
      if (!categoryExists) {
        return NextResponse.json({ error: 'Kategori tidak valid.' }, { status: 400 });
      }
      updateData.category_id = category_id;
    }

    if (quantityStr) {
      const quantity = parseInt(quantityStr, 10);
      if (isNaN(quantity) || quantity < 1) {
        return NextResponse.json({ error: 'Jumlah barang minimal 1.' }, { status: 400 });
      }
      updateData.quantity = quantity;
    }

    if (condition) {
      updateData.condition = condition;
    }

    // Photo handling
    if (photoFile && photoFile.size > 0) {
      const uploadResult = await saveUploadedFile(photoFile);
      if (!uploadResult.success) {
        return NextResponse.json({ error: uploadResult.error }, { status: 400 });
      }
      if (existing.photo_path) {
        await deleteUploadedFile(existing.photo_path);
      }
      updateData.photo_path = uploadResult.filePath;
    } else if (removePhoto) {
      if (existing.photo_path) {
        await deleteUploadedFile(existing.photo_path);
      }
      updateData.photo_path = null;
    }

    const updated = await prisma.inventory.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        creator: { select: { id: true, name: true } },
      },
    });

    // Audit log
    await logInventoryActivity({
      inventoryId: updated.id,
      userId: user.id,
      action: 'UPDATE',
      oldData: {
        name: existing.name,
        category: existing.category.name,
        location: existing.location,
        quantity: existing.quantity,
        condition: existing.condition,
        notes: (existing as any).notes || null,
        price: (existing as any).price ?? null,
        photo_path: existing.photo_path,
      },
      newData: {
        name: updated.name,
        category: updated.category.name,
        location: updated.location,
        quantity: updated.quantity,
        condition: updated.condition,
        notes: (updated as any).notes || null,
        price: (updated as any).price ?? null,
        photo_path: updated.photo_path,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Data inventaris berhasil diperbarui.',
      inventory: updated,
    });
  } catch (error: any) {
    console.error('Update inventory error:', error);
    return NextResponse.json(
      { error: 'Gagal memperbarui data inventaris.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Tidak diautentikasi.' }, { status: 401 });
    }

    const { id } = params;
    const existing = await prisma.inventory.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Data inventaris tidak ditemukan.' }, { status: 404 });
    }

    // Authorization
    if (user.role !== 'Admin') {
      const setting = await prisma.appSetting.findUnique({
        where: { key: 'allow_employee_edit' },
      });
      const allowEmployeeEdit = setting?.value === 'true';

      if (!allowEmployeeEdit || existing.created_by !== user.id) {
        return NextResponse.json(
          { error: 'Anda tidak memiliki izin untuk menghapus inventaris ini.' },
          { status: 403 }
        );
      }
    }

    // Delete photo if exists
    if (existing.photo_path) {
      await deleteUploadedFile(existing.photo_path);
    }

    await prisma.inventory.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Data inventaris berhasil dihapus.',
    });
  } catch (error: any) {
    console.error('Delete inventory error:', error);
    return NextResponse.json(
      { error: 'Gagal menghapus data inventaris.' },
      { status: 500 }
    );
  }
}
