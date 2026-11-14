import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { saveUploadedFile, deleteUploadedFile, saveMultipleUploadedFiles, parsePhotoPaths } from '@/lib/upload';
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
        photoPaths: parsePhotoPaths(item),
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

    // Authorization check: Admin atau penginput yang menginput data ini
    if (user.role !== 'Admin' && existing.created_by !== user.id) {
      return NextResponse.json(
        { error: 'Anda hanya memiliki izin untuk mengedit barang yang Anda input sendiri.' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const name = formData.get('name')?.toString().trim();
    const category_id = formData.get('category_id')?.toString().trim();
    const location = formData.get('location')?.toString().trim();
    const quantityStr = formData.get('quantity')?.toString().trim();
    const condition = formData.get('condition')?.toString().trim();
    const notesRaw = formData.get('notes');
    const priceRaw = formData.get('price');
    const unit = formData.get('unit')?.toString().trim();

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

    // Photos handling (supports up to 100 photos per item)
    const existingPhotosInDb = parsePhotoPaths(existing as any);
    const existingPhotosRaw = formData.get('existing_photos')?.toString();
    const removePhoto = formData.get('remove_photo') === 'true';
    const removeAllPhotos = formData.get('remove_all_photos') === 'true';

    // Get newly uploaded photos
    const newPhotoFiles = formData.getAll('photos') as File[];
    const singlePhotoFile = formData.get('photo') as File | null;
    const allNewFiles: File[] = [];
    if (newPhotoFiles.length > 0) {
      allNewFiles.push(...newPhotoFiles.filter((f) => f && f.size > 0));
    } else if (singlePhotoFile && singlePhotoFile.size > 0) {
      allNewFiles.push(singlePhotoFile);
    }

    // Determine kept photos from existing
    let keptPhotos: string[] = [];
    if (existingPhotosRaw !== undefined && existingPhotosRaw !== null) {
      try {
        const parsed = JSON.parse(existingPhotosRaw);
        if (Array.isArray(parsed)) {
          keptPhotos = parsed.filter((p: any) => typeof p === 'string' && existingPhotosInDb.includes(p));
        }
      } catch {}
    } else if (!removePhoto && !removeAllPhotos) {
      keptPhotos = [...existingPhotosInDb];
    }

    if (removeAllPhotos || (removePhoto && allNewFiles.length === 0 && !existingPhotosRaw)) {
      keptPhotos = [];
    }

    // Delete removed photos from disk
    const photosToDelete = existingPhotosInDb.filter((p) => !keptPhotos.includes(p));
    for (const p of photosToDelete) {
      await deleteUploadedFile(p);
    }

    // Check max 100 limit
    if (keptPhotos.length + allNewFiles.length > 100) {
      return NextResponse.json(
        { error: 'Maksimal 100 foto yang diperbolehkan per barang.' },
        { status: 400 }
      );
    }

    // Save newly uploaded files
    let newlySavedPaths: string[] = [];
    if (allNewFiles.length > 0) {
      const uploadRes = await saveMultipleUploadedFiles(allNewFiles, '', 100 - keptPhotos.length);
      newlySavedPaths = uploadRes.filePaths;
    }

    // If either existing photos changed or new photos uploaded or removed
    if (existingPhotosRaw !== undefined || allNewFiles.length > 0 || removePhoto || removeAllPhotos) {
      const finalPhotos = [...keptPhotos, ...newlySavedPaths];
      updateData.photo_path = finalPhotos[0] || null;
      updateData.photo_paths = finalPhotos.length > 0 ? JSON.stringify(finalPhotos) : null;
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
        photo_paths: (existing as any).photo_paths || null,
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
        photo_paths: (updated as any).photo_paths || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Data inventaris berhasil diperbarui.',
      inventory: {
        ...updated,
        photoPath: updated.photo_path,
        photoPaths: parsePhotoPaths(updated as any),
      },
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

    // Authorization: Admin atau penginput yang menginput data ini
    if (user.role !== 'Admin' && existing.created_by !== user.id) {
      return NextResponse.json(
        { error: 'Anda hanya memiliki izin untuk menghapus barang yang Anda input sendiri.' },
        { status: 403 }
      );
    }

    // Delete all photos from disk
    const allPhotosToDelete = parsePhotoPaths(existing as any);
    for (const p of allPhotosToDelete) {
      await deleteUploadedFile(p);
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
