/**
 * Utility functions for Rupiah currency formatting and parsing
 */

export function formatRupiah(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '-';
  return `Rp ${Math.round(value).toLocaleString('id-ID')}`;
}

export function parseRupiah(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return isNaN(value) ? null : value;
  const cleaned = String(value).replace(/[^0-9]/g, '');
  if (!cleaned) return null;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}
