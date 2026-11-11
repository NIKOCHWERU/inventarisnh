import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    const { id } = params;
    const employee = await prisma.user.findUnique({
      where: { id },
      include: {
        inventories: {
          orderBy: { created_at: 'desc' },
          include: {
            category: { select: { name: true } },
          },
        },
        activity_logs: {
          orderBy: { created_at: 'desc' },
          take: 50,
          include: {
            inventory: { select: { name: true } },
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Karyawan tidak ditemukan.' }, { status: 404 });
    }

    return NextResponse.json({ employee });
  } catch (error: any) {
    console.error('Get employee detail error:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil detail karyawan.' },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const { status } = body;

    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return NextResponse.json({ error: 'Status tidak valid.' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { status },
    });

    // If deactivated, kill user's active sessions immediately
    if (status === 'INACTIVE') {
      await prisma.session.deleteMany({
        where: { user_id: id },
      });
    }

    return NextResponse.json({ success: true, employee: updated });
  } catch (error: any) {
    console.error('Update employee status error:', error);
    return NextResponse.json(
      { error: 'Gagal memperbarui status karyawan.' },
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
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: 'Karyawan tidak ditemukan.' }, { status: 404 });
    }

    if (target.role === 'Admin') {
      return NextResponse.json({ error: 'Tidak dapat menghapus akun Admin.' }, { status: 400 });
    }

    // Delete user sessions
    await prisma.session.deleteMany({ where: { user_id: id } });

    // Mark as inactive or delete user access
    // If user has inventories, we keep inventories but disassociate or mark inactive, or delete
    // To preserve audit integrity, if inventories exist, we can mark user as INACTIVE with deleted flag or delete user if no inventory
    const inventoryCount = await prisma.inventory.count({ where: { created_by: id } });
    if (inventoryCount > 0) {
      // Set status to INACTIVE and change name to indicate revoked access
      await prisma.user.update({
        where: { id },
        data: {
          status: 'INACTIVE',
          name: `${target.name} (Akses Dicabut)`,
        },
      });
      return NextResponse.json({
        success: true,
        message: 'Akses karyawan berhasil dicabut dan dinonaktifkan (data inventaris dipertahankan).',
      });
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: 'Akun karyawan berhasil dihapus.',
    });
  } catch (error: any) {
    console.error('Delete employee error:', error);
    return NextResponse.json(
      { error: 'Gagal menghapus karyawan.' },
      { status: 500 }
    );
  }
}
