import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { generateExcelReport, InventoryExportItem } from '@/lib/excel';
import { generatePdfReport } from '@/lib/pdf';
import { generateCsvReport } from '@/lib/csv';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { format: string } }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    const { format } = params;
    if (!['pdf', 'excel', 'csv'].includes(format.toLowerCase())) {
      return NextResponse.json(
        { error: 'Format export tidak didukung. Pilih pdf, excel, atau csv.' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const categoryId = searchParams.get('category_id') || '';
    const condition = searchParams.get('condition') || '';
    const location = searchParams.get('location')?.trim() || '';
    const createdBy = searchParams.get('created_by') || '';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { location: { contains: search } },
        { creator: { name: { contains: search } } },
      ];
    }
    if (categoryId && categoryId !== 'all') {
      where.category_id = categoryId;
    }
    if (condition && condition !== 'all') {
      where.condition = condition;
    }
    if (location && location !== 'all') {
      where.location = { contains: location };
    }
    if (createdBy && createdBy !== 'all') {
      where.created_by = createdBy;
    }
    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at.gte = new Date(`${startDate}T00:00:00.000Z`);
      if (endDate) where.created_at.lte = new Date(`${endDate}T23:59:59.999Z`);
    }

    const [items, officeSetting] = await Promise.all([
      prisma.inventory.findMany({
        where,
        orderBy: { created_at: 'desc' },
        include: {
          category: { select: { name: true } },
          creator: { select: { name: true } },
        },
      }),
      prisma.appSetting.findUnique({ where: { key: 'office_name' } }),
    ]);

    const officeName = officeSetting?.value || 'Kantor Narasumberhukum';

    const exportItems: InventoryExportItem[] = await Promise.all(
      items.map(async (item, idx) => {
        let imageBase64: string | undefined = undefined;
        let imageFormat: 'JPEG' | 'PNG' | 'WEBP' = 'JPEG';

        if (item.photo_path) {
          try {
            const { resolvePhotoAbsolutePath } = await import('@/lib/upload');
            const fullPath = await resolvePhotoAbsolutePath(item.photo_path);

            if (fullPath && fs.existsSync(fullPath)) {
              const fileBuf = fs.readFileSync(fullPath);
              const ext = path.extname(fullPath).toLowerCase();
              let mime = 'image/jpeg';
              if (ext === '.png') {
                mime = 'image/png';
                imageFormat = 'PNG';
              } else if (ext === '.webp') {
                mime = 'image/webp';
                imageFormat = 'WEBP';
              } else {
                mime = 'image/jpeg';
                imageFormat = 'JPEG';
              }
              imageBase64 = `data:${mime};base64,${fileBuf.toString('base64')}`;
            }
          } catch (imgErr) {
            console.warn(`Could not read photo for inventory ${item.id}:`, imgErr);
          }
        }

      return {
        no: idx + 1,
        id: item.id,
        name: item.name,
        category: item.category.name,
        location: item.location,
        quantity: item.quantity,
        condition: item.condition,
        creatorName: item.creator.name,
        createdAt: item.created_at.toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        hasPhoto: Boolean(item.photo_path),
        photoUrl: item.photo_path || undefined,
        imageBase64,
        imageFormat,
      };
    })
  );

    const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    if (format === 'pdf') {
      const buffer = generatePdfReport(exportItems, officeName);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="Laporan_Inventaris_Kantor_${dateStamp}.pdf"`,
        },
      });
    }

    if (format === 'excel') {
      const buffer = await generateExcelReport(exportItems, officeName);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="Laporan_Inventaris_Kantor_${dateStamp}.xlsx"`,
        },
      });
    }

    if (format === 'csv') {
      const csvString = generateCsvReport(exportItems);
      return new NextResponse(csvString, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="Laporan_Inventaris_Kantor_${dateStamp}.csv"`,
        },
      });
    }

    return NextResponse.json({ error: 'Format tidak dikenal.' }, { status: 400 });
  } catch (error: any) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Gagal mengekspor laporan inventaris.' },
      { status: 500 }
    );
  }
}
