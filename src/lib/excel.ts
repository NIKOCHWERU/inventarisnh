import ExcelJS from 'exceljs';

export interface InventoryExportItem {
  no: number;
  id: string;
  name: string;
  category: string;
  location: string;
  quantity: number;
  condition: string;
  creatorName: string;
  createdAt: string;
  hasPhoto: boolean;
  photoUrl?: string;
  imageBase64?: string;
  imageFormat?: 'JPEG' | 'PNG' | 'WEBP';
}

export async function generateExcelReport(
  items: InventoryExportItem[],
  officeName: string = 'Kantor Narasumberhukum'
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sistem Inventaris Kantor';
  workbook.lastModifiedBy = 'Admin';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('Data Inventaris', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 5 }],
    pageSetup: { orientation: 'landscape', paperSize: 9 }, // A4
  });

  // 1. Title Rows
  worksheet.mergeCells('A1:I1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'LAPORAN DATA INVENTARIS KANTOR';
  titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF202820' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  worksheet.mergeCells('A2:I2');
  const subCell = worksheet.getCell('A2');
  subCell.value = `${officeName} • Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })}`;
  subCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF556455' } };
  subCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // Summary Row
  worksheet.mergeCells('A3:I3');
  const totalUnits = items.reduce((acc, curr) => acc + curr.quantity, 0);
  const summaryCell = worksheet.getCell('A3');
  summaryCell.value = `Total Jenis Barang: ${items.length} item   |   Total Seluruh Unit: ${totalUnits} unit`;
  summaryCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFB8860B' } };
  summaryCell.alignment = { vertical: 'middle', horizontal: 'center' };

  worksheet.addRow([]); // Row 4 is blank separator

  // 2. Table Headers (Row 5)
  const headers = [
    'No.',
    'Foto',
    'Nama Barang',
    'Kategori',
    'Tempat / Lokasi',
    'Jumlah (Unit)',
    'Kondisi',
    'Ditambahkan Oleh',
    'Tanggal Input',
  ];

  const headerRow = worksheet.addRow(headers);
  headerRow.height = 28;

  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFB8860B' }, // Warm Gold #B8860B
    };
    cell.font = {
      name: 'Arial',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF9E7307' } },
      left: { style: 'thin', color: { argb: 'FF9E7307' } },
      bottom: { style: 'medium', color: { argb: 'FF7A5805' } },
      right: { style: 'thin', color: { argb: 'FF9E7307' } },
    };
  });

  // 3. Data Rows
  items.forEach((item, index) => {
    const row = worksheet.addRow([
      item.no,
      item.hasPhoto ? 'Ada Foto' : '-',
      item.name,
      item.category,
      item.location,
      item.quantity,
      item.condition,
      item.creatorName,
      item.createdAt,
    ]);

    row.height = 22;
    const isEven = index % 2 === 0;

    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Arial', size: 10, color: { argb: 'FF231F1A' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFEAE4D9' } },
        left: { style: 'thin', color: { argb: 'FFEAE4D9' } },
        bottom: { style: 'thin', color: { argb: 'FFEAE4D9' } },
        right: { style: 'thin', color: { argb: 'FFEAE4D9' } },
      };

      if (!isEven) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFAF9F5' },
        };
      }

      // Column alignments
      if (colNumber === 1 || colNumber === 2) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if (colNumber === 6) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = '#,##0';
      } else if (colNumber === 7 || colNumber === 9) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }
    });
  });

  // 4. Auto Column Widths
  worksheet.columns.forEach((column, index) => {
    let maxLength = headers[index].length;
    items.forEach((item) => {
      const values = [
        item.no.toString(),
        item.hasPhoto ? 'Ada Foto' : '-',
        item.name || '',
        item.category || '',
        item.location || '',
        item.quantity.toString(),
        item.condition || '',
        item.creatorName || '',
        item.createdAt || '',
      ];
      const val = values[index];
      if (val && val.length > maxLength) {
        maxLength = val.length;
      }
    });
    column.width = Math.max(maxLength + 4, 12);
  });

  // Enable AutoFilter on row 5
  worksheet.autoFilter = {
    from: 'A5',
    to: `I${5 + items.length}`,
  };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
