// The fitment the scan page shows for a part: /fit/123.json holds {part url: {p: [[platform, url]], pn, r: [[release, url, role]], rn}}
// for the parts of its bucket (hash of the part url). p and r are the first 40 of the platforms and releases; pn and rn the counts.
import { db, url, brandName } from '../../lib/data';
import { bucketOf, FIT_BUCKETS } from '../../lib/gtinCode';

const SHOWN = 40;
let buckets: Map<number, Record<string, unknown>> | undefined;

function index() {
  if (buckets) return buckets;
  buckets = new Map();
  for (const part of db.parts) {
    const uses = db.usesByPart.get(part.id) ?? [];
    const kits = new Map<string, string>();   // platform id -> title
    for (const u of uses) kits.set(u.release.kit, '');
    for (const f of part.fits ?? []) kits.set(f.kit, '');
    const platforms = [...kits.keys()].map((id) => {
      const kit = db.kit.get(id);
      return [kit ? `${brandName(kit.brand)} ${kit.name}` : id, url.platform(id)] as [string, string];
    }).sort((a, b) => a[0].localeCompare(b[0]));
    const releases = uses.map((u) => [`${brandName(u.release.brand)} ${u.release.name}`, url.release(u.release.id), u.role === 'kit' ? 'in the box' : u.role] as [string, string, string])
      .sort((a, b) => a[0].localeCompare(b[0]));
    if (!platforms.length && !releases.length) continue;
    const u = url.part(part.id);
    const b = bucketOf(u, FIT_BUCKETS);
    if (!buckets.has(b)) buckets.set(b, {});
    buckets.get(b)![u] = { p: platforms.slice(0, SHOWN), pn: platforms.length, r: releases.slice(0, SHOWN), rn: releases.length };
  }
  return buckets;
}

export function getStaticPaths() {
  return [...index().keys()].map((b) => ({ params: { bucket: String(b) } }));
}

export function GET({ params }: { params: { bucket: string } }) {
  return new Response(JSON.stringify(index().get(Number(params.bucket)) ?? {}), { headers: { 'Content-Type': 'application/json' } });
}
