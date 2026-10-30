// The barcode and part-number lookup in the browser, shared by the scan page and the search page. It reads the
// index files the build writes under /gtin/, /partno/ and /fit/ (src/pages/gtin/[...shard].json.ts and friends).
import { gtinPath, partNoKey, bucketOf, PARTNO_BUCKETS } from './gtinCode';

export type Hit = [string, string, 'part' | 'release'];

// each index file is fetched once; a missing file is an empty index, a failed download is retried later
const files = new Map<string, Promise<any>>();
export function file(dir: string, name: string): Promise<any> {
  const path = `/${dir}/${name}.json`;
  if (!files.has(path)) {
    const p = fetch(path).then((r) => (r.ok ? r.json() : {}));
    p.catch(() => files.delete(path));
    files.set(path, p);
  }
  return files.get(path)!;
}

// the records with a barcode (its 13-digit form, see gtin13); a big prefix is split in threes of digits, down to
// small files. Rejects when an index file cannot be loaded.
export async function lookupGtin(code: string): Promise<Hit[]> {
  let depth = 3, idx = await file('gtin', gtinPath(code.slice(0, depth)));
  while (idx.split) { depth = idx.split; idx = await file('gtin', gtinPath(code.slice(0, depth))); }
  return idx[code] ?? [];
}

// the records with a printed part number, across all brands
export async function lookupPartNo(text: string): Promise<Hit[]> {
  const key = partNoKey(text);
  return key.length >= 2 ? (await file('partno', String(bucketOf(key, PARTNO_BUCKETS))))[key] ?? [] : [];
}

// what to say when nothing matches: the wording, the normal site search for the raw text, and a prefilled report
export function missingWords(text: string, isCode: boolean): string {
  return isCode || /^\d{8,14}$/.test(text) ? `No part with this barcode yet: ${text}` : `No part with this number yet: ${text}`;
}
export function missingLinks(text: string): HTMLElement {
  const a = (href: string, t: string) => { const e = document.createElement('a'); e.href = href; e.textContent = t; return e; };
  const title = encodeURIComponent(`Missing barcode ${text}`);
  const body = encodeURIComponent(`Barcode or part number ${text} is not in Hobbydex.\n\nWhat it is (brand, part or kit name):\n`);
  const p = document.createElement('p');
  p.className = 'scan-missing';
  p.append(a(`/search/?q=${encodeURIComponent(text)}`, `Search the site for ${text}`), ' or ',
    a(`https://github.com/hobbydex/hobbydex-rc/issues/new?title=${title}&body=${body}`, 'report this code'), ' so it can be added.');
  return p;
}
