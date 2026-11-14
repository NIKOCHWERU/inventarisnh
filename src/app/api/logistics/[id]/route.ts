import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { deleteUploadedFile, saveMultipleUploadedFiles, parsePhotoPaths } from '@/lib/upload';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Tidak diautentikasi.' }, { status: 401 });
    }

    const { id } = params;
    const item = await prisma.logistic.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, name: true, role: true } },
        histories: {
          orderBy: { created_at: 'desc' },
          include: {
            user: { select: { id: true, name: true, role: true } },
          },
          take: 50,
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Data logistik tidak ditemukan.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      item: {
        ...item,
        photoPaths: parsePhotoPaths(item),
      },
    });
  } catch (error: any) {
    console.error('Get logistic detail error:', error);
    return NextResponse.json({ error: 'Gagal memuat detail logistik.' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Tidak diautentikasi.' }, { status: 401 });
    }

    const { id } = params;
    const existing = await prisma.logistic.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Data logistik tidak ditemukan.' }, { status: 404 });
    }

    if (existing.created_by !== user.id && user.role !== 'Admin') {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    const contentType = request.headers.get('content-type') || '';
    const existingPhotosInDb = parsePhotoPaths(existing as any);
    let finalPhotoPaths: string[] | undefined = undefined;
    let finalPhotoPath: string | null | undefined = undefined;

    let name: string | undefined;
    let category: string | undefined;
    let unit: string | undefined;
    let quantity: number | undefined;
    let min_stock: number | undefined;
    let location: string | undefined;
    let notes: string | null | undefined;
    let price: number | null | undefined;
    let changeAction: string | undefined;
    let changeReason: string | undefined;

    if (contentType.includes('multipart/form-data')) {
      // FormData with possible photo
      const formData = await request.formData();
      name = (formData.get('name') as string) || undefined;
      category = (formData.get('category') as string) || undefined;
      unit = (formData.get('unit') as string) || undefined;
      const qty = formData.get('quantity');
      if (qty !== null) quantity = parseInt(qty as string, 10);
      const ms = formData.get('min_stock');
      if (ms !== null) min_stock = parseInt(ms as string, 10);
      location = (formData.get('location') as string) || undefined;
      const notesVal = formData.get('notes');
      notes = notesVal ? (notesVal as string).trim() || null : undefined;
      changeAction = (formData.get('action') as string) || undefined;
      changeReason = (formData.get('change_reason') as string) || undefined;

      const priceVal = formData.get('price');
      if (priceVal !== null) {
        const str = (priceVal as string).trim();
        if (!str) {
          price = null;
        } else {
          const parsed = parseFloat(str.replace(/[^0-9.]/g, ''));
          price = isNaN(parsed) ? null : parsed;
        }
      }

      const existingPhotosRaw = formData.get('existing_photos')?.toString();
      const removePhoto = formData.get('remove_photo') === 'true';
      const removeAllPhotos = formData.get('remove_all_photos') === 'true';

      const photoFiles = formData.getAll('photos') as File[];
      const singleFile = formData.get('photo') as File | null;
      const filesToSave: File[] = [];
      if (photoFiles.length > 0) {
        filesToSave.push(...photoFiles.filter((f) => f && f.size > 0));
      } else if (singleFile && singleFile.size > 0) {
        filesToSave.push(singleFile);
      }

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

      if (removeAllPhotos || (removePhoto && filesToSave.length === 0 && !existingPhotosRaw)) {
        keptPhotos = [];
      }

      // Delete removed photos
      const toDelete = existingPhotosInDb.filter((p) => !keptPhotos.includes(p));
      for (const p of toDelete) {
        await deleteUploadedFile(p);
      }

      if (keptPhotos.length + filesToSave.length > 100) {
        return NextResponse.json({ error: 'Maksimal 100 foto yang diperbolehkan.' }, { status: 400 });
      }

      let newlySaved: string[] = [];
      if (filesToSave.length > 0) {
        const uploadResult = await saveMultipleUploadedFiles(filesToSave, 'logistics', 100 - keptPhotos.length);
        newlySaved = uploadResult.filePaths;
      }

      if (existingPhotosRaw !== undefined || removePhoto || removeAllPhotos || filesToSave.length > 0) {
        finalPhotoPaths = [...keptPhotos, ...newlySaved];
        finalPhotoPath = finalPhotoPaths[0] || null;
      }
    } else {
      // JSON body (stock-only update)
      const body = await request.json();
      name = body.name;
      category = body.category;
      unit = body.unit;
      if (body.quantity !== undefined) quantity = parseInt(body.quantity, 10);
      if (body.min_stock !== undefined) min_stock = parseInt(body.min_stock, 10);
      location = body.location;
      notes = body.notes !== undefined ? (body.notes?.trim() || null) : undefined;
      changeAction = body.action;
      changeReason = body.change_reason;
      if (body.price !== undefined) {
        if (body.price === null || body.price === '') {
          price = null;
        } else {
          const parsed = parseFloat(String(body.price).replace(/[^0-9.]/g, ''));
          price = isNaN(parsed) ? null : parsed;
        }
      }
    }

    const newQty = quantity !== undefined && !isNaN(quantity) ? quantity : existing.quantity;
    const stockChange = newQty - existing.quantity;

    let effectiveAction = changeAction;
    if (!effectiveAction) {
      if (stockChange > 0) effectiveAction = 'STOCK_IN';
      else if (stockChange < 0) effectiveAction = 'STOCK_OUT';
      else effectiveAction = 'UPDATE';
    }

    const updated = await prisma.logistic.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(category !== undefined && { category: category.trim() }),
        ...(unit !== undefined && { unit: unit.trim() }),
        ...(quantity !== undefined && !isNaN(quantity) && { quantity }),
        ...(min_stock !== undefined && !isNaN(min_stock) && { min_stock }),
        ...(location !== undefined && { location: location.trim() }),
        ...(notes !== undefined && { notes }),
        ...(price !== undefined && { price }),
        ...(finalPhotoPath !== undefined && { photo_path: finalPhotoPath }),
        ...(finalPhotoPaths !== undefined && {
          photo_paths: finalPhotoPaths.length > 0 ? JSON.stringify(finalPhotoPaths) : null,
        }),
      },
      include: { creator: { select: { id: true, name: true } } },
    });

    // Simpan snapshot perubahan ke riwayat data logistik (LogisticHistory)
    await prisma.logisticHistory.create({
      data: {
        logistic_id: updated.id,
        user_id: user.id,
        action: effectiveAction,
        stock_change: stockChange,
        old_stock: existing.quantity,
        new_stock: updated.quantity,
        old_data: JSON.stringify(existing),
        new_data: JSON.stringify(updated),
        notes: changeReason || (notes !== undefined ? notes : existing.notes) || (effectiveAction === 'STOCK_IN' ? 'Penambahan stok masuk' : effectiveAction === 'STOCK_OUT' ? 'Pengurangan / pemakaian stok' : 'Pembaruan data logistik'),
      },
    });

    return NextResponse.json({
      success: true,
      item: {
        ...updated,
        photoPaths: parsePhotoPaths(updated),
      },
    });
  } catch (error: any) {
    console.error('Update logistic error:', error);
    return NextResponse.json({ error: 'Gagal memperbarui data logistik.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Tidak diautentikasi.' }, { status: 401 });
    }

    const { id } = params;
    const existing = await prisma.logistic.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Data logistik tidak ditemukan.' }, { status: 404 });
    }

    if (existing.created_by !== user.id && user.role !== 'Admin') {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    // Catat log penghapusan sebelum di-cascade delete
    await prisma.logisticHistory.create({
      data: {
        logistic_id: existing.id,
        user_id: user.id,
        action: 'DELETE',
        stock_change: -existing.quantity,
        old_stock: existing.quantity,
        new_stock: 0,
        old_data: JSON.stringify(existing),
        new_data: null,
        notes: `Barang logistik "${existing.name}" dihapus dari sistem`,
      },
    }).catch(() => {});

    // Delete all photo files if exist
    const allPhotos = parsePhotoPaths(existing as any);
    for (const p of allPhotos) {
      await deleteUploadedFile(p);
    }

    await prisma.logistic.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete logistic error:', error);
    return NextResponse.json({ error: 'Gagal menghapus data logistik.' }, { status: 500 });
  }
}
