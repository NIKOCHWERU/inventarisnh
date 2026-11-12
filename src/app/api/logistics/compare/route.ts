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
    const startDateParam = searchParams.get('start_date');
    const endDateParam = searchParams.get('end_date');
    const categoryParam = searchParams.get('category');

    const now = new Date();
    // Default current period: awal bulan ini s/d hari ini / akhir bulan
    let start: Date;
    let end: Date;

    if (startDateParam && endDateParam) {
      start = new Date(`${startDateParam}T00:00:00.000Z`);
      end = new Date(`${endDateParam}T23:59:59.999Z`);
    } else {
      start = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0));
      end = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));
    }

    // Hitung periode perbandingan sebelumnya (1 bulan sebelumnya dengan durasi yang setara)
    const prevStart = new Date(start);
    prevStart.setUTCMonth(prevStart.getUTCMonth() - 1);

    const prevEnd = new Date(end);
    prevEnd.setUTCMonth(prevEnd.getUTCMonth() - 1);

    // Ambil semua barang logistik aktif
    const whereLogistic: any = {};
    if (categoryParam && categoryParam !== 'Semua Kategori') {
      whereLogistic.category = categoryParam;
    }

    const allLogistics = await prisma.logistic.findMany({
      where: whereLogistic,
      orderBy: { name: 'asc' },
      include: { creator: { select: { id: true, name: true } } },
    });

    // Ambil riwayat logistik periode sekarang
    const currentHistories = await prisma.logisticHistory.findMany({
      where: {
        created_at: {
          gte: start,
          lte: end,
        },
      },
    });

    // Ambil riwayat logistik periode sebelumnya
    const previousHistories = await prisma.logisticHistory.findMany({
      where: {
        created_at: {
          gte: prevStart,
          lte: prevEnd,
        },
      },
    });

    // Map agregat per logistic_id untuk periode sekarang
    const currentMap = new Map<string, { stockIn: number; stockOut: number; count: number }>();
    currentHistories.forEach((h) => {
      const entry = currentMap.get(h.logistic_id) || { stockIn: 0, stockOut: 0, count: 0 };
      if (h.stock_change > 0) {
        entry.stockIn += h.stock_change;
      } else if (h.stock_change < 0) {
        entry.stockOut += Math.abs(h.stock_change);
      }
      entry.count += 1;
      currentMap.set(h.logistic_id, entry);
    });

    // Map agregat per logistic_id untuk periode sebelumnya
    const previousMap = new Map<string, { stockIn: number; stockOut: number; count: number }>();
    previousHistories.forEach((h) => {
      const entry = previousMap.get(h.logistic_id) || { stockIn: 0, stockOut: 0, count: 0 };
      if (h.stock_change > 0) {
        entry.stockIn += h.stock_change;
      } else if (h.stock_change < 0) {
        entry.stockOut += Math.abs(h.stock_change);
      }
      entry.count += 1;
      previousMap.set(h.logistic_id, entry);
    });

    // Buat daftar komparasi per item
    let totalStockInCurrent = 0;
    let totalStockOutCurrent = 0;
    let totalStockInPrevious = 0;
    let totalStockOutPrevious = 0;

    const categoryStats: Record<string, {
      currentIn: number;
      currentOut: number;
      previousIn: number;
      previousOut: number;
      itemCount: number;
    }> = {};

    const itemsComparison = allLogistics.map((item) => {
      const cur = currentMap.get(item.id) || { stockIn: 0, stockOut: 0, count: 0 };
      const prev = previousMap.get(item.id) || { stockIn: 0, stockOut: 0, count: 0 };

      totalStockInCurrent += cur.stockIn;
      totalStockOutCurrent += cur.stockOut;
      totalStockInPrevious += prev.stockIn;
      totalStockOutPrevious += prev.stockOut;

      // Group per kategori
      if (!categoryStats[item.category]) {
        categoryStats[item.category] = {
          currentIn: 0,
          currentOut: 0,
          previousIn: 0,
          previousOut: 0,
          itemCount: 0,
        };
      }
      categoryStats[item.category].currentIn += cur.stockIn;
      categoryStats[item.category].currentOut += cur.stockOut;
      categoryStats[item.category].previousIn += prev.stockIn;
      categoryStats[item.category].previousOut += prev.stockOut;
      categoryStats[item.category].itemCount += 1;

      const outDiff = cur.stockOut - prev.stockOut;
      const inDiff = cur.stockIn - prev.stockIn;
      let outPct = 0;
      if (prev.stockOut > 0) {
        outPct = Math.round(((cur.stockOut - prev.stockOut) / prev.stockOut) * 100);
      } else if (cur.stockOut > 0) {
        outPct = 100;
      }

      return {
        id: item.id,
        name: item.name,
        category: item.category,
        unit: item.unit,
        currentStock: item.quantity,
        minStock: item.min_stock,
        location: item.location,
        price: item.price,
        photoPath: item.photo_path,
        currentPeriod: {
          stockIn: cur.stockIn,
          stockOut: cur.stockOut,
          netChange: cur.stockIn - cur.stockOut,
          activityCount: cur.count,
        },
        previousPeriod: {
          stockIn: prev.stockIn,
          stockOut: prev.stockOut,
          netChange: prev.stockIn - prev.stockOut,
          activityCount: prev.count,
        },
        comparison: {
          inDiff,
          outDiff,
          outPercentageChange: outPct,
          trend: outDiff > 0 ? 'UP' : outDiff < 0 ? 'DOWN' : 'STABLE',
        },
      };
    });

    // Urutkan item yang paling banyak dipakai periode ini
    const topUsedItems = [...itemsComparison]
      .sort((a, b) => b.currentPeriod.stockOut - a.currentPeriod.stockOut)
      .slice(0, 5);

    const outDiffTotal = totalStockOutCurrent - totalStockOutPrevious;
    let totalOutPct = 0;
    if (totalStockOutPrevious > 0) {
      totalOutPct = Math.round(((totalStockOutCurrent - totalStockOutPrevious) / totalStockOutPrevious) * 100);
    } else if (totalStockOutCurrent > 0) {
      totalOutPct = 100;
    }

    return NextResponse.json({
      success: true,
      periods: {
        current: {
          start: start.toISOString(),
          end: end.toISOString(),
          label: `${start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} - ${end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`,
        },
        previous: {
          start: prevStart.toISOString(),
          end: prevEnd.toISOString(),
          label: `${prevStart.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} - ${prevEnd.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`,
        },
      },
      summary: {
        totalItems: allLogistics.length,
        current: {
          totalStockIn: totalStockInCurrent,
          totalStockOut: totalStockOutCurrent,
          netChange: totalStockInCurrent - totalStockOutCurrent,
        },
        previous: {
          totalStockIn: totalStockInPrevious,
          totalStockOut: totalStockOutPrevious,
          netChange: totalStockInPrevious - totalStockOutPrevious,
        },
        comparison: {
          inDiff: totalStockInCurrent - totalStockInPrevious,
          outDiff: outDiffTotal,
          outPercentageChange: totalOutPct,
          trend: outDiffTotal > 0 ? 'UP' : outDiffTotal < 0 ? 'DOWN' : 'STABLE',
        },
      },
      topUsedItems,
      categoryStats,
      items: itemsComparison,
    });
  } catch (error: any) {
    console.error('Logistics compare error:', error);
    return NextResponse.json({ error: 'Gagal memuat komparasi logistik.' }, { status: 500 });
  }
}
