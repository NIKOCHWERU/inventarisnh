import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const VALID_CONDITIONS = ['Baik', 'Rusak Ringan', 'Rusak Berat', 'Perlu Perbaikan'];

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'Pilih file Excel (.xlsx) untuk diimpor.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const sheet = workbook.worksheets[0];
    if (!sheet || sheet.rowCount < 2) {
      return NextResponse.json(
        { error: 'File Excel kosong atau tidak memiliki baris data.' },
        { status: 400 }
      );
    }

    // Load existing categories for fast mapping
    const existingCategories = await prisma.category.findMany();
    const categoryMap = new Map<string, string>();
    existingCategories.forEach((cat) => {
      categoryMap.set(cat.name.trim().toLowerCase(), cat.id);
    });

    let successCount = 0;
    const errors: string[] = [];

    // Row 1 is header, start at Row 2
    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
      const row = sheet.getRow(rowNumber);
      const nameRaw = row.getCell(1).value?.toString()?.trim();
      const categoryRaw = row.getCell(2).value?.toString()?.trim();
      const locationRaw = row.getCell(3).value?.toString()?.trim();
      const quantityRaw = row.getCell(4).value;
      const conditionRaw = row.getCell(5).value?.toString()?.trim();

      // Skip completely empty rows
      if (!nameRaw && !categoryRaw && !locationRaw) {
        continue;
      }

      if (!nameRaw) {
        errors.push(`Baris ${rowNumber}: Nama barang tidak boleh kosong.`);
        continue;
      }

      if (!categoryRaw) {
        errors.push(`Baris ${rowNumber} (${nameRaw}): Kategori tidak boleh kosong.`);
        continue;
      }

      if (!locationRaw) {
        errors.push(`Baris ${rowNumber} (${nameRaw}): Lokasi tidak boleh kosong.`);
        continue;
      }

      let quantity = 1;
      if (typeof quantityRaw === 'number') {
        quantity = Math.max(1, Math.floor(quantityRaw));
      } else if (typeof quantityRaw === 'string') {
        const parsed = parseInt(quantityRaw, 10);
        quantity = isNaN(parsed) || parsed < 1 ? 1 : parsed;
      }

      let condition = conditionRaw ? conditionRaw.trim() : 'Baik';
      const notesRaw = row.getCell(6).text?.trim() || null;

      // Find or create category
      const catKey = categoryRaw.toLowerCase();
      let categoryId = categoryMap.get(catKey);
      if (!categoryId) {
        const newCat = await prisma.category.create({
          data: {
            name: categoryRaw,
            status: 'ACTIVE',
          },
        });
        categoryId = newCat.id;
        categoryMap.set(catKey, categoryId);
      }

      // Create Inventory record
      const createdItem = await (prisma.inventory.create as any)({
        data: {
          name: nameRaw,
          category_id: categoryId,
          location: locationRaw,
          quantity,
          condition,
          notes: notesRaw,
          created_by: admin.id,
        },
      });

      // Create Audit Log
      await prisma.inventoryActivityLog.create({
        data: {
          inventory_id: createdItem.id,
          user_id: admin.id,
          action: 'CREATE',
          new_data: JSON.stringify({
            name: createdItem.name,
            category: categoryRaw,
            location: createdItem.location,
            quantity: createdItem.quantity,
            condition: createdItem.condition,
            imported_via: 'EXCEL',
          }),
        },
      });

      successCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil mengimpor ${successCount} data inventaris dari Excel.`,
      count: successCount,
      errors: errors.slice(0, 10), // return top 10 errors if any
    });
  } catch (error: any) {
    console.error('Import excel error:', error);
    return NextResponse.json(
      { error: `Gagal memproses file Excel: ${error.message || 'Format tidak valid'}` },
      { status: 500 }
    );
  }
}
