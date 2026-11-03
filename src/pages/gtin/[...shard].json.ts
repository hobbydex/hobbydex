// The barcode index the scan page reads (src/pages/rc/scan.astro): /gtin/501.json holds {code: [[url, title, kind], ...]}
// for the 13-digit codes with the prefix 501; a code on several records lists them all. A prefix with more than
// SPLIT_AT codes is too big for one file: /gtin/075.json is then {"split": 6} and the codes sit in /gtin/075/891.json
// by their 4th to 6th digits; a group that is still too big splits again by three more digits (/gtin/075/891/364.json).
import { db, url, brandName } from '../../lib/data';
import { gtin13, shardOf, gtinPath } from '../../lib/gtinCode';

type Hit = [string, string, 'part' | 'release'];
type Codes = Record<string, Hit[]>;
const SPLIT_AT = 300;
let shards: Map<string, Record<string, unknown>> | undefined;

// a group of codes that share their first `depth` digits: one file, or a marker and the groups below it
function place(prefix: string, codes: Codes, depth: number) {
  if (!shards) return;
  if (Object.keys(codes).length <= SPLIT_AT || depth >= 12) { shards.set(gtinPath(prefix), codes); return; }
  shards.set(gtinPath(prefix), { split: depth + 3 });
  const groups = new Map<string, Codes>();
  for (const [c, hits] of Object.entries(codes)) {
    const g = c.slice(0, depth + 3);
    if (!groups.has(g)) groups.set(g, {});
    groups.get(g)![c] = hits;
  }
  for (const [g, sub] of groups) place(g, sub, depth + 3);
}

function index() {
  if (shards) return shards;
  const byPrefix = new Map<string, Codes>();
  const add = (code: string | undefined, hit: Hit, id: string) => {
    if (!code) return;
    const c = gtin13(code);
    if (!c) throw new Error(`${id}: gtin ${code} is not a valid barcode`);
    const s = shardOf(c);
    if (!byPrefix.has(s)) byPrefix.set(s, {});
    (byPrefix.get(s)![c] ??= []).push(hit);
  };
  for (const p of db.parts) add(p.gtin, [url.part(p.id), `${brandName(p.brand)} ${p.name}`, 'part'], p.id);
  for (const r of db.releases) add(r.gtin, [url.release(r.id), `${brandName(r.brand)} ${r.name}`, 'release'], r.id);
  shards = new Map();
  for (const [prefix, codes] of byPrefix) place(prefix, codes, 3);
  return shards;
}

export function getStaticPaths() {
  return [...index().keys()].map((shard) => ({ params: { shard } }));
}

export function GET({ params }: { params: { shard: string } }) {
  return new Response(JSON.stringify(index().get(params.shard) ?? {}), { headers: { 'Content-Type': 'application/json' } });
}
