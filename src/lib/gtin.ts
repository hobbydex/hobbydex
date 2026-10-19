// The official name of a barcode by its form: UPC-A (12 digits, North America), EAN-13 (13 digits;
// JAN when it starts with a Japanese prefix 450-459 or 490-499), EAN-8, GTIN-14. Anything else is shown as GTIN.
export function gtinLabel(code: string): string {
  const d = code.replace(/\D/g, '');
  if (d.length === 12) return 'UPC';
  if (d.length === 13) return /^(45|49)/.test(d) ? 'JAN' : 'EAN';
  if (d.length === 8) return 'EAN-8';
  if (d.length === 14) return 'GTIN-14';
  return 'GTIN';
}

