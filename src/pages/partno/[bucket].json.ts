// The part number index the scan page reads: /partno/123.json holds {key: [[url, title, kind], ...]} for the
// printed numbers (number and numbers) of the parts and the numbers of the releases, bucketed by hash of the key.
import { db, url, brandName } from '../../lib/data';
import { partNoKey, bucketOf, PARTNO_BUCKETS } from '../../lib/gtinCode';

type Hit = [string, string, 'part' | 'release'];
let buckets: Map<number, Record<string, Hit[]>> | undefined;

function index() {
  if (buckets) return buckets;
  buckets = new Map();
  const add = (number: string, hit: Hit) => {
    const key = partNoKey(number);
    if (key.length < 2) return;
    const b = bucketOf(key, PARTNO_BUCKETS);
    if (!buckets!.has(b)) buckets!.set(b, {});
    const bucket = buckets!.get(b)!;
    const list = (bucket[key] ??= []);
    if (!list.some((h) => h[0] === hit[0])) list.push(hit);   // a number listed twice on one record is one hit
  };
  for (const p of db.parts) {
    const title = `${brandName(p.brand)} ${p.name}`;
    for (const n of new Set([p.number, ...(p.numbers ?? [])].filter((x): x is string => !!x)))
      add(n, [url.part(p.id), title, 'part']);
  }
  for (const r of db.releases) if (r.number) add(r.number, [url.release(r.id), `${brandName(r.brand)} ${r.name}`, 'release']);
  return buckets;
}

export function getStaticPaths() {
  return [...index().keys()].map((b) => ({ params: { bucket: String(b) } }));
}

export function GET({ params }: { params: { bucket: string } }) {
  return new Response(JSON.stringify(index().get(Number(params.bucket)) ?? {}), { headers: { 'Content-Type': 'application/json' } });
}
