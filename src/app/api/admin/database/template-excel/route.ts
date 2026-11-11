import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistem Inventaris Kantor';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Template Inventaris');

    // Setup Columns
    sheet.columns = [
      { header: 'Nama Barang *', key: 'name', width: 30 },
      { header: 'Kategori *', key: 'category', width: 22 },
      { header: 'Lokasi / Ruangan *', key: 'location', width: 25 },
      { header: 'Jumlah (Angka) *', key: 'quantity', width: 16 },
      { header: 'Kondisi *', key: 'condition', width: 22 },
      { header: 'Catatan / Keterangan (Opsional)', key: 'notes', width: 35 },
    ];

    // Style Header Row
    const headerRow = sheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFB8860B' }, // Dark Goldenrod
      };
      cell.font = {
        name: 'Segoe UI',
        size: 11,
        bold: true,
        color: { argb: 'FFFFFFFF' },
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF8B6508' } },
        bottom: { style: 'medium', color: { argb: 'FF8B6508' } },
        left: { style: 'thin', color: { argb: 'FF8B6508' } },
        right: { style: 'thin', color: { argb: 'FF8B6508' } },
      };
    });

    // Sample data
    const sampleData = [
      {
        name: 'Laptop Lenovo ThinkPad T14',
        category: 'Elektronik & IT',
        location: 'Ruang IT Lantai 2',
        quantity: 5,
        condition: 'Baik',
      },
      {
        name: 'Kursi Kerja Ergonomis Mesh',
        category: 'Furniture & Perabot',
        location: 'Ruang Staf Lantai 1',
        quantity: 12,
        condition: 'Baik',
      },
      {
        name: 'Printer Canon Pixma G3010',
        category: 'Elektronik & IT',
        location: 'Gudang Inventaris',
        quantity: 1,
        condition: 'Perlu Perbaikan',
      },
    ];

    sampleData.forEach((item) => {
      const row = sheet.addRow(item);
      row.height = 22;
      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Segoe UI', size: 10 };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFEAE4D9' } },
          bottom: { style: 'thin', color: { argb: 'FFEAE4D9' } },
          left: { style: 'thin', color: { argb: 'FFEAE4D9' } },
          right: { style: 'thin', color: { argb: 'FFEAE4D9' } },
        };
        if (colNumber === 4) {
          cell.alignment = { horizontal: 'center' };
        }
      });
    });

    // Add instructions worksheet
    const guideSheet = workbook.addWorksheet('Petunjuk Pengisian');
    guideSheet.columns = [
      { header: 'Kolom', key: 'col', width: 20 },
      { header: 'Keterangan & Aturan', key: 'desc', width: 60 },
    ];
    guideSheet.getRow(1).font = { bold: true };
    guideSheet.addRow({
      col: 'Nama Barang',
      desc: 'Wajib diisi. Nama lengkap barang inventaris beserta merk/tipe jika ada.',
    });
    guideSheet.addRow({
      col: 'Kategori',
      desc: 'Wajib diisi. Jika kategori belum ada di sistem, sistem akan otomatis membuatnya.',
    });
    guideSheet.addRow({
      col: 'Lokasi / Ruangan',
      desc: 'Wajib diisi. Tempat barang diletakkan.',
    });
    guideSheet.addRow({
      col: 'Jumlah',
      desc: 'Wajib diisi angka bulat minimal 1 (contoh: 1, 5, 10).',
    });
    guideSheet.addRow({
      col: 'Kondisi',
      desc: 'Pilihan valid: "Baik", "Rusak Ringan", "Rusak Berat", atau "Perlu Perbaikan".',
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Template_Import_Inventaris.xlsx"',
      },
    });
  } catch (error: any) {
    console.error('Template excel error:', error);
    return NextResponse.json({ error: 'Gagal membuat template Excel.' }, { status: 500 });
  }
}
