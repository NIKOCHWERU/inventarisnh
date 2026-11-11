import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InventoryExportItem } from './excel';

export function generatePdfReport(
  items: InventoryExportItem[],
  officeName: string = 'Kantor Narasumberhukum'
): Buffer {
  // A4 Landscape: 297 x 210 mm
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Warm Gold Theme Palette:
  // Primary Gold: #B8860B -> RGB(184, 134, 11)
  // Text Dark: #231F1A -> RGB(35, 31, 26)
  // Muted: #70685C -> RGB(112, 104, 92)
  // Warm Border: #EAE4D9 -> RGB(234, 228, 217)
  // Warm Background: #FAF9F5 -> RGB(250, 249, 245)
  const primaryColor = [184, 134, 11];
  const textColor = [35, 31, 26];
  const mutedColor = [112, 104, 92];
  const borderColor = [234, 228, 217];
  const bgLightColor = [250, 249, 245];

  // 1. Header Bar Accent
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 5, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('LAPORAN DATA INVENTARIS KANTOR', 14, 18);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text(
    `${officeName} | Dicetak: ${new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })} WIB`,
    14,
    24
  );

  // Summary Metrics Box
  const totalItems = items.length;
  const totalUnits = items.reduce((acc, curr) => acc + curr.quantity, 0);
  const baikCount = items.filter((i) => i.condition === 'Baik').length;
  const rusakCount = items.filter(
    (i) => i.condition.includes('Rusak') || i.condition.includes('Perbaikan')
  ).length;

  doc.setFillColor(bgLightColor[0], bgLightColor[1], bgLightColor[2]);
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.roundedRect(14, 28, pageWidth - 28, 14, 2, 2, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);

  const metricY = 37;
  doc.text(`Total Jenis Barang: ${totalItems}`, 20, metricY);
  doc.text(`Total Unit Barang: ${totalUnits}`, 85, metricY);
  doc.text(`Kondisi Baik: ${baikCount}`, 155, metricY);
  doc.text(`Perlu Perhatian / Rusak: ${rusakCount}`, 220, metricY);

  // Determine if any item has a photo to set proper row height
  const hasAnyPhoto = items.some((item) => Boolean(item.imageBase64));

  // 2. Data Table
  const tableData = items.map((item) => [
    item.no.toString(),
    item.imageBase64 ? '' : '-', // Empty string so image renders cleanly without overlapping text
    item.name,
    item.category,
    item.location,
    item.quantity.toString(),
    item.condition,
    item.creatorName,
    item.createdAt,
  ]);

  autoTable(doc, {
    startY: 46,
    head: [
      [
        'No.',
        'Foto',
        'Nama Barang',
        'Kategori',
        'Tempat / Lokasi',
        'Jumlah',
        'Kondisi',
        'Ditambahkan Oleh',
        'Tanggal Input',
      ],
    ],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [184, 134, 11], // Primary Gold
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
      valign: 'middle',
    },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      textColor: [35, 31, 26],
      cellPadding: 2.5,
      lineColor: [234, 228, 217],
      lineWidth: 0.2,
      valign: 'middle',
    },
    bodyStyles: {
      minCellHeight: hasAnyPhoto ? 17 : 9,
    },
    alternateRowStyles: {
      fillColor: [253, 252, 249],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 48 },
      3: { cellWidth: 32 },
      4: { cellWidth: 36 },
      5: { cellWidth: 16, halign: 'right' },
      6: { cellWidth: 26, halign: 'center' },
      7: { cellWidth: 34 },
      8: { cellWidth: 28, halign: 'center' },
    },
    didDrawCell: (data) => {
      // Draw item photo thumbnail in the 'Foto' column (index 1) of the body section
      if (data.section === 'body' && data.column.index === 1) {
        const item = items[data.row.index];
        if (item && item.imageBase64) {
          try {
            const imgSize = 13; // 13mm square thumbnail
            const x = data.cell.x + (data.cell.width - imgSize) / 2;
            const y = data.cell.y + (data.cell.height - imgSize) / 2;
            doc.addImage(
              item.imageBase64,
              item.imageFormat || 'JPEG',
              x,
              y,
              imgSize,
              imgSize
            );
          } catch (err) {
            console.warn('Gagal menggambar gambar pada PDF:', err);
          }
        }
      }
    },
    didDrawPage: (data) => {
      // Footer on every page
      const pageNumber = (doc as any).internal.getNumberOfPages();
      const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(140, 130, 115);

      // Left footer
      doc.text(
        `${officeName} — Dokumen Resmi Inventaris Internal`,
        14,
        pageHeight - 8
      );

      // Right footer
      doc.text(
        `Halaman ${currentPage} dari ${pageNumber}`,
        pageWidth - 14,
        pageHeight - 8,
        { align: 'right' }
      );
    },
  });

  return Buffer.from(doc.output('arraybuffer'));
}
