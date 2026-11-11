import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    const employees = await prisma.user.findMany({
      where: { role: 'Penginventaris' },
      orderBy: { created_at: 'desc' },
      include: {
        inventories: {
          select: {
            id: true,
            name: true,
            quantity: true,
            created_at: true,
          },
        },
        activity_logs: {
          orderBy: { created_at: 'desc' },
          take: 1,
          select: {
            created_at: true,
            action: true,
          },
        },
        enrolled_with: {
          select: {
            id: true,
            created_at: true,
          },
        },
      },
    });

    const formatted = employees.map((emp) => {
      const totalJenis = emp.inventories.length;
      const totalUnits = emp.inventories.reduce((acc, curr) => acc + curr.quantity, 0);

      // Determine latest activity date
      let lastActivity: Date | null = null;
      if (emp.activity_logs.length > 0) {
        lastActivity = emp.activity_logs[0].created_at;
      } else if (emp.inventories.length > 0) {
        lastActivity = emp.inventories[emp.inventories.length - 1].created_at;
      }

      return {
        id: emp.id,
        name: emp.name,
        role: emp.role,
        status: emp.status,
        joinedAt: emp.created_at,
        totalItems: totalJenis,
        totalUnits: totalUnits,
        lastActivity: lastActivity || emp.created_at,
        tokenUsedId: emp.enrolled_with?.id || null,
      };
    });

    return NextResponse.json({ employees: formatted });
  } catch (error: any) {
    console.error('Get employees error:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data karyawan penginput.' },
      { status: 500 }
    );
  }
}
