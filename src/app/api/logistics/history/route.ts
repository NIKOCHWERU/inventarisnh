import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Tidak diautentikasi.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const logisticId = searchParams.get('logistic_id');
    const action = searchParams.get('action');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (logisticId) where.logistic_id = logisticId;
    if (action && action !== 'ALL') where.action = action;

    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) {
        where.created_at.gte = new Date(`${startDate}T00:00:00.000Z`);
      }
      if (endDate) {
        where.created_at.lte = new Date(`${endDate}T23:59:59.999Z`);
      }
    }

    const [histories, total] = await Promise.all([
      prisma.logisticHistory.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, role: true } },
          logistic: { select: { id: true, name: true, category: true, unit: true, location: true, photo_path: true } },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.logisticHistory.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      histories,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Get logistics history error:', error);
    return NextResponse.json({ error: 'Gagal memuat riwayat logistik.' }, { status: 500 });
  }
}
