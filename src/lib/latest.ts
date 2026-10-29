import { db, dateKey, brandName, type Part, type Release } from './data';
import { dateRows } from './colourways';
import { buildLabel } from './build';
import { showPartInLatest } from './latestParts';

// The "Latest" view (/rc/latest/): releases, bodies and generic electronics and power parts with a date, newest first,
// in tabs (which parts count: lib/latestParts.ts). Undated items never appear; a release dated only by seen_by shows as
// such (DateText's asterisk), not as a release date.
export const TABS = [
  { id: 'all', label: 'Everything' },
  { id: 'cars', label: 'Cars' },
  { id: 'bodies', label: 'Bodies' },
  { id: 'electronics', label: 'Electronics', hint: 'servos, radios, ESCs, motors' },
  { id: 'power', label: 'Power', hint: 'batteries, chargers' },
] as const;
export type TabId = (typeof TABS)[number]['id'];

const ELECTRONICS = new Set(['servo', 'radio', 'esc', 'motor', 'electronics']);
export const partTab = (p: Part): Exclude<TabId, 'all' | 'cars'> =>
  p.category === 'body' ? 'bodies' : ELECTRONICS.has(p.category ?? '') ? 'electronics' : 'power';

export type LatestRow = { key: string; tab: Exclude<TabId, 'all'>; what: string; r: Release | Part; group?: Release[]; inAll: boolean };

const categoryName = (id?: string) => db.categories.find((c) => c.id === 'category/' + id)?.name ?? id ?? 'Part';

/** The newest `perTab` dated items of every tab (and of Everything), newest first; each row says if it is in the
 * newest of Everything (`inAll`) and its own tab. A car is one row per colourway group, as on the releases page. */
export function latestRows(perTab = 100, allCount = 150) {
  const cmp = (a: { key: string; r: { name: string; brand: string } }, b: typeof a) =>
    b.key.localeCompare(a.key) || brandName(a.r.brand).localeCompare(brandName(b.r.brand)) || a.r.name.localeCompare(b.r.name);
  const cars = dateRows(db.releases.filter((r) => r.status !== 'discontinued'), dateKey, () => 0)
    .map((x) => ({ key: x.key, tab: 'cars' as const, what: x.head.kind ? `Car · ${buildLabel(x.head.kind, x.head.power)}` : 'Car', r: x.head as Release | Part, group: x.group }));
  const brandOf = (kit: string) => db.kit.get(kit)?.brand;
  const parts = db.parts.filter((p) => showPartInLatest(p, brandOf) && p.status !== 'discontinued')
    .map((p) => ({ key: dateKey(p), tab: partTab(p), what: p.category === 'body' ? 'Body' : categoryName(p.category), r: p as Release | Part, group: undefined as Release[] | undefined }));
  const all = [...cars, ...parts].sort(cmp);
  const seen: Record<string, number> = {};
  const rows: LatestRow[] = [];
  all.forEach((x, i) => {
    seen[x.tab] = (seen[x.tab] ?? 0) + 1;
    const inAll = i < allCount;
    if (inAll || seen[x.tab] <= perTab) rows.push({ ...x, inAll, tab: x.tab });
  });
  const counts = Object.fromEntries(TABS.map((t) => [t.id, t.id === 'all' ? all.length : all.filter((x) => x.tab === t.id).length]));
  return { rows, counts };
}
