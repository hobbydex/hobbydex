// The bearings a release needs, by size: from its in-box parts linked to a bearing spec, and the bearing
// sets in the box by their recorded contents. Counts are known only where the build manual was read step
// by step (row qty); suspension and shock bushings are not ball bearings and are left out.
import { db, type Part, type Release } from './data';

export type BearingLine = { spec: string; name: string; qty?: number; parts: Part[]; bushing: boolean; sort: number[] };
export type BearingList = { lines: BearingLine[]; unsized: Part[]; counted: boolean };

const isBearingSpec = (id: string) => id.startsWith('spec/bearing/');
const BUSHING = /bush/i;

export function bearingList(release: Release): BearingList | undefined {
  const lines = new Map<string, BearingLine>();
  const unsized: Part[] = [];
  let counted = true;
  const add = (spec: string, qty: number | undefined, p: Part, bushing: boolean) => {
    const s = db.spec.get(spec);
    const l = lines.get(spec) ?? { spec, name: String(s?.name ?? spec.split('/').pop()), qty: 0, parts: [], bushing, sort: [Number(s?.bore_mm) || 0, Number(s?.outer_mm) || 0, Number(s?.width_mm) || 0] };
    l.qty = qty === undefined || l.qty === undefined ? undefined : l.qty + qty;
    if (!l.parts.includes(p)) l.parts.push(p);
    l.bushing = l.bushing && bushing;
    lines.set(spec, l);
  };
  for (const c of release.contains ?? []) {
    if (c.role !== 'kit') continue;
    const p = db.part.get(c.part);
    if (!p) continue;
    const eq = (p.equivalent_to ?? []).find((e) => isBearingSpec(e.spec));
    const inc = (p.includes ?? []).filter((i) => i.spec && isBearingSpec(i.spec));
    if (eq) {
      if (c.qty === undefined) counted = false;
      add(eq.spec, c.qty, p, eq.match === 'close' && BUSHING.test(p.name));
    } else if (inc.length) {
      for (const i of inc) { if (i.qty === undefined) counted = false; add(i.spec!, i.qty === undefined ? undefined : i.qty * (c.qty ?? 1), p, false); }
    } else if (p.category === 'bearing' && !(BUSHING.test(p.name) && !/ball ?-?bearing/i.test(p.name))) {
      unsized.push(p);
    }
  }
  if (!lines.size) return undefined;   // nothing to list: bearing parts of unknown size alone say nothing
  const sorted = [...lines.values()].sort((a, b) => a.sort[0] - b.sort[0] || a.sort[1] - b.sort[1] || a.sort[2] - b.sort[2]);
  return { lines: sorted, unsized, counted: sorted.length > 0 && counted && sorted.every((l) => l.qty !== undefined) };
}
