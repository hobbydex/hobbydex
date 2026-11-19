import { db, url, brandName } from '../../lib/data';
import { figuresOf, lengthText, trackText, weightText } from '../../lib/dimensions';

// Compact data for the compare page: parts as an array, release contents as [part index, role] pairs; dims: the
// release's wheelbase, track width and weight as shown on its page (its own figures, else its platform's), '' when unstated.
export function GET() {
  const index = new Map<string, number>();
  const parts: [string, string, string, string, 1?][] = [];
  const releases = [...db.releases].sort((a, b) => brandName(a.brand).localeCompare(brandName(b.brand)) || a.name.localeCompare(b.name) || (a.year ?? 0) - (b.year ?? 0)).map((r) => {
    const kit = db.kit.get(r.kit);
    const rows = (r.contains ?? []).flatMap((c) => {
      const p = db.part.get(c.part);
      if (!p) return [];
      if (!index.has(p.id)) { index.set(p.id, parts.length); parts.push(p.status === 'discontinued' ? [p.number ?? '', p.name, url.part(p.id), p.category ?? '', 1] : [p.number ?? '', p.name, url.part(p.id), p.category ?? '']); }
      return [[index.get(p.id)!, c.role === 'kit' ? 'k' : c.role === 'option' ? 'o' : 'l']];
    });
    const f = figuresOf(r.dimensions, kit?.dimensions);
    const dims = [f.wheelbase_mm ? lengthText(f.wheelbase_mm.value) : '', trackText(f) ?? '', f.weight_g ? weightText(f.weight_g.value as number) : ''];
    return { id: r.id, label: `${brandName(r.brand)} ${r.name}${r.year ? ` (${r.year})` : ''}`, number: r.number ?? '', kit: kit ? `${brandName(kit.brand)} ${kit.name}` : '', url: url.release(r.id), ...(r.status === 'discontinued' ? { disc: true } : {}), ...(dims.some(Boolean) ? { dims } : {}), rows };
  });
  return new Response(JSON.stringify({ parts, releases }), { headers: { 'Content-Type': 'application/json' } });
}
