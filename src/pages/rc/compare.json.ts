import { db, url, brandName } from '../../lib/data';

// Compact data for the compare page: parts as an array, release contents as [part index, role] pairs.
export function GET() {
  const index = new Map<string, number>();
  const parts: [string, string, string, string][] = [];
  const releases = [...db.releases].sort((a, b) => brandName(a.brand).localeCompare(brandName(b.brand)) || a.name.localeCompare(b.name) || (a.year ?? 0) - (b.year ?? 0)).map((r) => {
    const kit = db.kit.get(r.kit);
    const rows = (r.contains ?? []).flatMap((c) => {
      const p = db.part.get(c.part);
      if (!p) return [];
      if (!index.has(p.id)) { index.set(p.id, parts.length); parts.push([p.number, p.name, url.part(p.id), p.category ?? '']); }
      return [[index.get(p.id)!, c.role === 'kit' ? 'k' : c.role === 'option' ? 'o' : 'l']];
    });
    return { id: r.id, label: `${brandName(r.brand)} ${r.name} ${r.year ? ` (${r.year})` : ''}`, kit: kit ? `${brandName(kit.brand)} ${kit.name}` : '', url: url.release(r.id), rows };
  });
  return new Response(JSON.stringify({ parts, releases }), { headers: { 'Content-Type': 'application/json' } });
}
