import { db, type Spec } from './data';

export const specLabel: Record<string, string> = { screw: 'Screws', bearing: 'Bearings', oil: 'Silicone oils', pinion: 'Pinions', battery: 'Batteries', servo: 'Servos', motor: 'Motors', 'wheel-hex': 'Wheel hexes', pin: 'Pins' };

const num = (v: unknown) => (typeof v === 'number' ? v : Number(String(v ?? '').replace(/^M/, '')) || 0);

/** Sort within a category by its natural size order. */
export function specSort(a: Spec, b: Spec) {
  if (a.category === 'screw') return num(a.thread) - num(b.thread) || num(a.length_mm) - num(b.length_mm) || String(a.head).localeCompare(String(b.head)) || String(a.drive).localeCompare(String(b.drive));
  if (a.category === 'bearing') return String(a.type).localeCompare(String(b.type)) || num(a.bore_mm) - num(b.bore_mm) || num(a.outer_mm) - num(b.outer_mm) || num(a.width_mm) - num(b.width_mm);
  if (a.category === 'oil') return num(a.viscosity_cst) - num(b.viscosity_cst);
  if (a.category === 'battery') return String(a.chemistry).localeCompare(String(b.chemistry)) || num(a.cells) - num(b.cells) || num(a.capacity_mah) - num(b.capacity_mah);
  if (a.category === 'servo') { const o = ['micro', 'mini', 'midi', 'low-profile', 'standard', 'jumbo', 'wing']; return o.indexOf(String(a.size_class)) - o.indexOf(String(b.size_class)) || num(a.spline_teeth) - num(b.spline_teeth); }
  if (a.category === 'wheel-hex') return num(a.hex_mm) - num(b.hex_mm);
  if (a.category === 'motor') return String(a.motor_type).localeCompare(String(b.motor_type)) || num(a.shaft_mm) - num(b.shaft_mm) || num(a.diameter_mm) - num(b.diameter_mm) || num(a.length_mm) - num(b.length_mm);
  if (a.category === 'pin') return num(a.diameter_mm) - num(b.diameter_mm) || num(a.length_mm) - num(b.length_mm);
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
