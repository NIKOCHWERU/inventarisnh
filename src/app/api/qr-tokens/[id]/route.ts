import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

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
    const body = await request.json().catch(() => ({}));
    const { action } = body; // 'revoke' | 'activate'

    const newStatus = action === 'activate' ? 'ACTIVE' : 'REVOKED';

    const updated = await prisma.enrollmentToken.update({
      where: { id },
      data: { status: newStatus },
    });

    return NextResponse.json({ success: true, updated });
  } catch (error: any) {
    console.error('Update QR token error:', error);
    return NextResponse.json(
      { error: 'Gagal memperbarui status QR Code.' },
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
    await prisma.enrollmentToken.deleteMany({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'QR Code berhasil dihapus.' });
  } catch (error: any) {
    console.error('Delete QR token error:', error);
    return NextResponse.json(
      { error: 'Gagal menghapus QR Code.' },
      { status: 500 }
    );
  }
}
