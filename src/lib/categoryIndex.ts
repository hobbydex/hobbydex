// Parts grouped by category, then by brand, for the category listing pages.
import { db, type Part } from './data';
import { categoryLabel } from './categories';

export const byCategory = new Map<string, Map<string, Part[]>>();
for (const p of db.parts) {
  if (!p.category) continue;
  if (!byCategory.has(p.category)) byCategory.set(p.category, new Map());
  const m = byCategory.get(p.category)!;
  if (!m.has(p.brand)) m.set(p.brand, []);
  m.get(p.brand)!.push(p);
}
export const categories = [...byCategory.keys()].sort((a, b) => (categoryLabel[a] ?? a).localeCompare(categoryLabel[b] ?? b));
export const countOf = (c: string) => [...(byCategory.get(c)?.values() ?? [])].reduce((n, ps) => n + ps.length, 0);
// generic spec pages that match a part category
export const specFor: Record<string, string> = { screw: 'screw', bearing: 'bearing', pinion: 'pinion', battery: 'battery', servo: 'servo', 'oil-grease': 'oil' };
