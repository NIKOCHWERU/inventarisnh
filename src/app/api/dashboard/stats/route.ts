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

    const [
      totalTypes,
      quantitySum,
      totalCategories,
      totalEmployees,
      baikCount,
      rusakRinganCount,
      rusakBeratCount,
      perluPerbaikanCount,
      categoriesWithCount,
      recentInventories,
      recentActivities,
      recentEmployees,
      // Logistics queries
      totalLogisticsTypes,
      logisticsQuantitySum,
      recentLogistics,
      allLogistics,
    ] = await Promise.all([
      prisma.inventory.count(),
      prisma.inventory.aggregate({
        _sum: { quantity: true },
      }),
      prisma.category.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { role: 'Penginventaris', status: 'ACTIVE' } }),
      prisma.inventory.count({ where: { condition: 'Baik' } }),
      prisma.inventory.count({ where: { condition: 'Rusak Ringan' } }),
      prisma.inventory.count({ where: { condition: 'Rusak Berat' } }),
      prisma.inventory.count({ where: { condition: 'Perlu Perbaikan' } }),
      prisma.category.findMany({
        where: { status: 'ACTIVE' },
        include: {
          _count: { select: { inventories: true } },
        },
      }),
      prisma.inventory.findMany({
        take: 8,
        orderBy: { created_at: 'desc' },
        include: {
          category: { select: { name: true } },
          creator: { select: { name: true } },
        },
      }),
      prisma.inventoryActivityLog.findMany({
        take: 8,
        orderBy: { created_at: 'desc' },
        include: {
          user: { select: { name: true, role: true } },
          inventory: { select: { name: true } },
        },
      }),
      prisma.user.findMany({
        where: { role: 'Penginventaris' },
        take: 5,
        orderBy: { created_at: 'desc' },
        include: {
          _count: { select: { inventories: true } },
        },
      }),
      // Logistics
      prisma.logistic.count(),
      prisma.logistic.aggregate({
        _sum: { quantity: true },
      }),
      prisma.logistic.findMany({
        take: 8,
        orderBy: { updated_at: 'desc' },
        include: {
          creator: { select: { name: true } },
        },
      }),
      prisma.logistic.findMany({
        orderBy: { quantity: 'asc' },
      }),
    ]);

    const totalUnits = quantitySum._sum.quantity || 0;
    const totalRusak = rusakRinganCount + rusakBeratCount;

    // Logistics calculations
    const totalLogisticsUnits = logisticsQuantitySum._sum.quantity || 0;
    const lowStockItems = allLogistics.filter((l) => l.quantity <= l.min_stock);
    const lowStockCount = lowStockItems.length;

    const logisticsCategoryMap: Record<string, number> = {};
    allLogistics.forEach((l) => {
      logisticsCategoryMap[l.category] = (logisticsCategoryMap[l.category] || 0) + 1;
    });
    const logisticsByCategory = Object.entries(logisticsCategoryMap).map(([name, count]) => ({
      name,
      count,
    }));

    // Category chart data
    const categoryChart = categoriesWithCount.map((c) => ({
      name: c.name,
      count: c._count.inventories,
    }));

    // Condition chart data
    const conditionChart = [
      { name: 'Baik', count: baikCount, color: '#16A34A' },
      { name: 'Rusak Ringan', count: rusakRinganCount, color: '#D97706' },
      { name: 'Rusak Berat', count: rusakBeratCount, color: '#DC2626' },
      { name: 'Perlu Perbaikan', count: perluPerbaikanCount, color: '#2563EB' },
    ];

    return NextResponse.json({
      stats: {
        totalTypes,
        totalUnits,
        totalCategories,
        totalEmployees,
        baikCount,
        rusakRinganCount,
        rusakBeratCount,
        totalRusak,
        perluPerbaikanCount,
      },
      logisticsStats: {
        totalTypes: totalLogisticsTypes,
        totalUnits: totalLogisticsUnits,
        lowStockCount,
        categoriesCount: logisticsByCategory.length,
        byCategory: logisticsByCategory,
        lowStockItems: lowStockItems.slice(0, 10).map((l) => ({
          id: l.id,
          name: l.name,
          category: l.category,
          unit: l.unit,
          quantity: l.quantity,
          min_stock: l.min_stock,
          location: l.location,
          photo_path: l.photo_path,
        })),
        recentItems: recentLogistics.map((l) => ({
          id: l.id,
          name: l.name,
          category: l.category,
          unit: l.unit,
          quantity: l.quantity,
          min_stock: l.min_stock,
          location: l.location,
          photo_path: l.photo_path,
          creatorName: l.creator?.name || 'Sistem',
          updatedAt: l.updated_at,
        })),
      },
      charts: {
        byCategory: categoryChart,
        byCondition: conditionChart,
      },
      recentInventories: recentInventories.map((i) => ({
        id: i.id,
        name: i.name,
        category: i.category.name,
        location: i.location,
        quantity: i.quantity,
        condition: i.condition,
        photoPath: i.photo_path,
        creatorName: i.creator.name,
        createdAt: i.created_at,
      })),
      recentActivities: recentActivities.map((a) => ({
        id: a.id,
        action: a.action,
        userName: a.user.name,
        itemName: a.inventory?.name || 'Item Inventaris',
        createdAt: a.created_at,
      })),
      recentEmployees: recentEmployees.map((e) => ({
        id: e.id,
        name: e.name,
        joinedAt: e.created_at,
        status: e.status,
        itemCount: e._count.inventories,
      })),
    });
  } catch (error: any) {
    console.error('Get dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Gagal memuat ringkasan dashboard.' },
      { status: 500 }
    );
  }
}
