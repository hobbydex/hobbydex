import { db, type Part, type Spec } from './data';

// A wheel nut part by its name ("Wheel Nuts M4", "17mm Wheel Nut"); the nut's own spec comes from its equivalent_to.
const WHEEL_NUT = /wheel ?nuts?\b|wheelnuts?\b/i;

/**
 * The wheel nuts for a wheel hex, derived from the data.
 * `bigBore`: the nut specs that carry wheel_hex_mm for this hex (1/8 and 1/5 wheel nuts with a protruding collar),
 * with the branded parts linked to each.
 * `generic`: the nut specs of wheel nut parts that fit a kit whose wheels or hexes use this hex (a standard flanged or
 * serrated M3 or M4 nut for a small car), with the wheel nut parts of those kits that link to each spec.
 */
export function wheelNutsForHex(hex: Spec) {
  const bigBore = db.specs
    .filter((s) => s.category === 'nut' && s.wheel_hex_mm === hex.hex_mm)
    .map((spec) => ({ spec, parts: (db.partsBySpec.get(spec.id) ?? []).length }));
  const kits = new Set((db.partsBySpec.get(hex.id) ?? []).flatMap(({ part }) => (part.fits ?? []).map((f) => f.kit)));
  const groups = new Map<string, { spec: Spec; parts: Set<string> }>();
  const unlinked = new Set<string>();
  for (const kit of kits) for (const { part } of db.fitsByKit.get(kit) ?? []) {
    if (part.category !== 'nut' || !WHEEL_NUT.test(part.name) || bigBore.some((b) => b.spec.id === nutSpecOf(part))) continue;
    const id = nutSpecOf(part);
    if (!id) { unlinked.add(part.id); continue; }
    const spec = db.spec.get(id) as Spec | undefined;
    if (!spec || spec.category !== 'nut') continue;
    if (!groups.has(id)) groups.set(id, { spec, parts: new Set() });
    groups.get(id)!.parts.add(part.id);
  }
  const generic = [...groups.values()]
    .map((g) => ({ spec: g.spec, parts: g.parts.size }))
    .sort((a, b) => threadNum(a.spec) - threadNum(b.spec) || String(a.spec.type).localeCompare(String(b.spec.type)));
  return { bigBore, generic, unlinked: unlinked.size };
}

// The nut spec a part is linked to, if any.
function nutSpecOf(part: Part): string | undefined {
  return (part.equivalent_to ?? []).find((e) => e.spec.startsWith('spec/nut/'))?.spec;
}

const threadNum = (s: Spec) => Number(String(s.thread ?? '').replace(/^M/, '').split('x')[0]) || 0;

/** The wheel nut threads a wheel hex takes, for the list page: the big-bore thread, else the generic ones. */
export function wheelNutThreads(hex: Spec): string {
  const w = wheelNutsForHex(hex);
  const threads = [...new Set([...w.bigBore, ...w.generic].map((x) => String(x.spec.thread)))];
  return threads.length ? threads.join(', ') : '';
}
