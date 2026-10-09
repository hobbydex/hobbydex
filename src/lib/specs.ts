import { db, type Spec } from './data';

export const specLabel: Record<string, string> = { screw: 'Screws', bearing: 'Bearings', oil: 'Silicone oils', pinion: 'Pinions' };

const num = (v: unknown) => (typeof v === 'number' ? v : Number(String(v ?? '').replace(/^M/, '')) || 0);

/** Sort within a category by its natural size order. */
export function specSort(a: Spec, b: Spec) {
  if (a.category === 'screw') return num(a.thread) - num(b.thread) || num(a.length_mm) - num(b.length_mm) || String(a.head).localeCompare(String(b.head)) || String(a.drive).localeCompare(String(b.drive));
  if (a.category === 'bearing') return String(a.type).localeCompare(String(b.type)) || num(a.bore_mm) - num(b.bore_mm) || num(a.outer_mm) - num(b.outer_mm) || num(a.width_mm) - num(b.width_mm);
  if (a.category === 'oil') return num(a.viscosity_cst) - num(b.viscosity_cst);
  if (a.category === 'pinion') return num(a.module) - num(b.module) || num(b.pitch_dp) - num(a.pitch_dp) || num(a.teeth) - num(b.teeth);
  return a.id.localeCompare(b.id);
}

export const specsByCategory = (() => {
  const m = new Map<string, Spec[]>();
  for (const s of db.specs) {
    if (!m.has(s.category)) m.set(s.category, []);
    m.get(s.category)!.push(s);
  }
  for (const v of m.values()) v.sort(specSort);
  return m;
})();

/** Branded parts linked to a spec, and how many distinct brands. */
export function linkedCount(id: string) {
  const ps = db.partsBySpec.get(id) ?? [];
  return { parts: ps.length, brands: new Set(ps.map((p) => p.part.brand)).size };
}
