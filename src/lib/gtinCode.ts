// Barcode codes for the scan page and the shard index (src/pages/gtin/[shard].json.ts). A code is read as the
// 13-digit EAN form the data stores: UPC-A (12 digits) gets a leading 0, GTIN-14 with a leading 0 drops it, and
// UPC-E (8 digits, as a scanner may read it) is expanded to UPC-A first. The check digit must be right.
// Returns null for anything else (EAN-8 and other lengths: Hobbydex holds none).
// the GTIN check digit, weighted as EAN-13 (1, 3, 1, 3...); a 12-digit UPC-A is checked with a leading 0
export function checkDigitOk(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length - 1; i++) sum += Number(digits[i]) * (i % 2 === 0 ? 1 : 3);
  return (10 - (sum % 10)) % 10 === Number(digits[digits.length - 1]);
}

// UPC-E (8 digits, number system 0 or 1) -> the 12-digit UPC-A it stands for
export function expandUpcE(e: string): string | null {
  if (e[0] !== '0' && e[0] !== '1') return null;
  const [x1, x2, x3, x4, x5, x6] = e.slice(1, 7);
  let body: string;
  if ('012'.includes(x6)) body = x1 + x2 + x6 + '0000' + x3 + x4 + x5;
  else if (x6 === '3') body = x1 + x2 + x3 + '00000' + x4 + x5;
  else if (x6 === '4') body = x1 + x2 + x3 + x4 + '00000' + x5;
  else body = x1 + x2 + x3 + x4 + x5 + '0000' + x6;
  const upca = e[0] + body + e[7];
  return checkDigitOk('0' + upca) ? upca : null;   // checked as EAN-13, where the weights start at 1
}

export function gtin13(input: string): string | null {
  const d = input.replace(/\s+/g, '');
  if (!/^\d+$/.test(d)) return null;
  let code: string | null = null;
  if (d.length === 13) code = d;
  else if (d.length === 12) code = '0' + d;
  else if (d.length === 14 && d[0] === '0') code = d.slice(1);
  else if (d.length === 8) { const upca = expandUpcE(d); code = upca && '0' + upca; }
  return code && checkDigitOk(code) ? code : null;
}

// the shard file a code is listed in: the first three digits of its 13-digit form
export const shardOf = (code13: string) => code13.slice(0, 3);

// A printed part number as the index keys it: capitals and digits only, so "ifw 472" and "IFW472" are one key
export const partNoKey = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');

// FNV-1a of a string, modulo n: the bucket a key lives in. Hashing spreads part numbers evenly (a prefix would
// put 8,000 TFE numbers in one file); the same function runs in the build and in the browser.
export function bucketOf(s: string, n: number): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h % n;
}
export const PARTNO_BUCKETS = 1024;
export const FIT_BUCKETS = 4096;

// the path of a barcode group below /gtin/: its digits in threes, "075891" -> "075/891"
export const gtinPath = (digits: string) => digits.match(/.{1,3}/g)!.join('/');
