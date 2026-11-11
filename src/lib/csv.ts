import { InventoryExportItem } from './excel';

function escapeCsvField(val: string | number | boolean | null | undefined): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateCsvReport(items: InventoryExportItem[]): string {
  const headers = [
    'No',
    'Foto',
    'Nama Barang',
    'Kategori',
    'Tempat / Lokasi',
    'Jumlah',
    'Kondisi',
    'Ditambahkan Oleh',
    'Tanggal Input',
  ];

  const rows: string[] = [];
  // UTF-8 BOM
  rows.push(headers.map(escapeCsvField).join(','));

  items.forEach((item) => {
    rows.push(
      [
        item.no,
        item.hasPhoto ? 'Ada Foto' : '-',
        item.name,
        item.category,
        item.location,
        item.quantity,
        item.condition,
        item.creatorName,
        item.createdAt,
      ]
        .map(escapeCsvField)
        .join(',')
    );
  });

  return '\uFEFF' + rows.join('\r\n');
}
