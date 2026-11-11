import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

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
    let photoPath: string | null | undefined = undefined; // undefined = no change

    let name: string | undefined;
    let category: string | undefined;
    let unit: string | undefined;
    let quantity: number | undefined;
    let min_stock: number | undefined;
    let location: string | undefined;
    let notes: string | null | undefined;
    let price: number | null | undefined;

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

      const removePhoto = formData.get('remove_photo') === 'true';
      const photoFile = formData.get('photo') as File | null;

      if (removePhoto) {
        // Delete existing photo
        if (existing.photo_path) {
          const absPath = path.join(process.cwd(), 'public', existing.photo_path);
          if (existsSync(absPath)) await unlink(absPath).catch(() => {});
        }
        photoPath = null;
      } else if (photoFile && photoFile.size > 0) {
        // Upload new photo
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'logistics');
        if (!existsSync(uploadsDir)) await mkdir(uploadsDir, { recursive: true });

        const ext = photoFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        const filename = `logistic-${id}-${Date.now()}.${ext}`;
        const buffer = Buffer.from(await photoFile.arrayBuffer());
        await writeFile(path.join(uploadsDir, filename), buffer);

        // Delete old photo if exists
        if (existing.photo_path) {
          const oldAbs = path.join(process.cwd(), 'public', existing.photo_path);
          if (existsSync(oldAbs)) await unlink(oldAbs).catch(() => {});
        }
        photoPath = `/uploads/logistics/${filename}`;
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
      if (body.price !== undefined) {
        if (body.price === null || body.price === '') {
          price = null;
        } else {
          const parsed = parseFloat(String(body.price).replace(/[^0-9.]/g, ''));
          price = isNaN(parsed) ? null : parsed;
        }
      }
    }

    const updated = await (prisma.logistic.update as any)({
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
        ...(photoPath !== undefined && { photo_path: photoPath }),
      },
      include: { creator: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ success: true, item: updated });
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

    // Delete photo file if exists
    if (existing.photo_path) {
      const absPath = path.join(process.cwd(), 'public', existing.photo_path);
      if (existsSync(absPath)) await unlink(absPath).catch(() => {});
    }

    await prisma.logistic.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete logistic error:', error);
    return NextResponse.json({ error: 'Gagal menghapus data logistik.' }, { status: 500 });
  }
}
