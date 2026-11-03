// The whole of a big category as filterable rows (category page of a category above BIG parts, and its parts.json).
import { db, brandName, byPartNo, url, key, type Part } from './data';
import { columns, specOf } from './categoryColumns';
import { softness, SOFTNESS } from './compound';
import type { Facet, Row } from './explorerRows';

type Def = { key: string; label: string; unknown?: string; filter?: boolean; column?: boolean; get: (p: Part) => string[];
  label_of?: (v: string) => string; group?: (v: string) => string | undefined; order?: (a: string, b: string) => number; param?: (v: string) => string };

const cap = (s: string) => s.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
const scaleOrder = (a: string, b: string) => Number(a.split('/')[1]) - Number(b.split('/')[1]) || a.localeCompare(b);
const VEHICLE_WORDS: [RegExp, string][] = [[/short.?course|scrt/i, 'short-course'], [/monster/i, 'monster'], [/stadium/i, 'stadium-truck'], [/truggy/i, 'truggy'], [/buggy/i, 'buggy'], [/crawler/i, 'crawler'], [/touring/i, 'touring'], [/on-?road/i, 'on-road'], [/drift/i, 'drift'], [/rally/i, 'rally']];
const MOUNT: Record<string, string> = { 'pre-mounted': 'Pre-mounted', 'pre-mounted-not-glued': 'Pre-mounted, not glued', unmounted: 'Unmounted', 'wheels-included': 'With wheels' };
const POSITION: Record<string, string> = { front: 'Front', 'front-2wd': 'Front', 'front-4wd': 'Front', rear: 'Rear', 'front-rear': 'Front and rear' };
const rank = (a: string, order: readonly string[]) => (order.indexOf(a) + 1 || 99);

const brandDef: Def = { key: 'brand', label: 'Brand', get: (p) => [brandName(p.brand)] };
const tire: Def[] = [
  brandDef,
  { key: 'scale', label: 'Scale', column: true, get: (p) => (p.scale ? [p.scale] : []), order: scaleOrder },
  { key: 'vehicle', label: 'Vehicle type', column: true, get: (p) => {
      const v = (p as unknown as Record<string, string | undefined>).vehicle ?? VEHICLE_WORDS.find(([re]) => re.test(p.applies_to ?? ''))?.[1];
      return v ? [v] : []; }, label_of: cap },
  { key: 'rim', label: 'Rim size', column: true, get: (p) => (p.wheel_size ? p.wheel_size.split('/') : []), order: (a, b) => parseFloat(a) - parseFloat(b) },
  { key: 'position', label: 'Position', column: true, get: (p) => (p.position ? [POSITION[p.position] ?? cap(p.position)] : []), order: (a, b) => rank(a, ['Front', 'Rear', 'Front and rear']) - rank(b, ['Front', 'Rear', 'Front and rear']) },
  { key: 'mounting', label: 'Mounting', column: true, get: (p) => (p.mounting ? [MOUNT[p.mounting] ?? cap(p.mounting)] : []) },
  { key: 'hardness', label: 'Hardness (Shore A)', column: true, unknown: 'not stated', get: (p) => (p.hardness ? [String(p.hardness)] : []), order: (a, b) => Number(a) - Number(b) },
  { key: 'compound', label: 'Compound', column: false, get: (p) => (p.compound ? [softness(p.compound) ?? p.compound] : []),
    group: (v) => ((SOFTNESS as readonly string[]).includes(v) ? 'Softness' : 'Maker names'),
    order: (a, b) => rank(a, SOFTNESS) - rank(b, SOFTNESS) || a.localeCompare(b, undefined, { numeric: true }) },
  { key: 'maker-compound', label: 'Compound (maker)', filter: false, column: true, get: (p) => (p.compound ? [p.compound] : []) },
  { key: 'fits', label: 'Fits platform', unknown: 'no platform listed', get: (p) => [...new Set((p.fits ?? []).map((f) => f.kit))],
    label_of: (k) => { const kit = db.kit.get(k); return kit ? `${brandName(kit.brand)} ${kit.name}` : k; }, group: (k) => { const kit = db.kit.get(k); return kit ? brandName(kit.brand) : undefined; },
    param: (k) => key(k).join('/') },
];

// any other big category: brand, then each pick column of its key spec columns
function genericDefs(category: string): Def[] {
  const defs: Def[] = [brandDef];
  for (const c of columns[category] ?? []) {
    if (c.field.compare_only) continue;
    defs.push({ key: c.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), label: c.label, column: true, filter: c.num || c.pick === false ? false : undefined,
      get: (p) => { const v = c.get(p, specOf(p)); return v === undefined ? [] : c.multi ? String(v).split(', ') : [String(v)]; },
      order: c.num ? (a, b) => parseFloat(a) - parseFloat(b) : undefined });
  }
  return defs;
}

export type Explorer = { facets: Facet[]; rows: Row[] };
export function buildExplorer(category: string, parts: Part[]): Explorer {
  const defs = category === 'tire' ? tire : genericDefs(category);
  const sorted = [...parts].sort((a, b) => brandName(a.brand).localeCompare(brandName(b.brand)) || (a.status === 'discontinued' ? 1 : 0) - (b.status === 'discontinued' ? 1 : 0) || byPartNo(a, b));
  const raw = sorted.map((p) => defs.map((d) => d.get(p)));
  const facets: Facet[] = [], used: boolean[] = [];
  const index: Map<string, number>[] = [];
  defs.forEach((d, i) => {
    const vals = [...new Set(raw.flatMap((r) => r[i]))].sort(d.order ?? ((a, b) => a.localeCompare(b, undefined, { numeric: true })));
    const filter = d.filter ?? (vals.length >= 2 && vals.length <= (d.key === 'fits' ? 5000 : 200));
    const column = d.column ?? false;
    // numeric columns and columns nobody fills are only worth showing when they have values
    used[i] = (filter || column) && vals.length > 0;
    if (!used[i]) return;
    const grouped = d.group ? [...vals].sort((a, b) => (d.group!(a) === 'Softness' ? 0 : 1) - (d.group!(b) === 'Softness' ? 0 : 1)) : vals;
    index[i] = new Map(grouped.map((v, k) => [v, k]));
    facets.push({ key: d.key, label: d.label, unknown: d.unknown ?? 'unknown', filter, column,
      values: grouped.map((v) => [(d.param ?? ((x) => x))(v), d.label_of?.(v) ?? v, d.group?.(v)]) });
  });
  const keep = defs.map((_, i) => i).filter((i) => used[i]);
  const rows: Row[] = sorted.map((p, r) => [url.part(p.id), `${brandName(p.brand)} ${p.number ?? p.name}`, !p.number ? '' : p.name.startsWith(p.number) ? p.name.slice(p.number.length).trim() : p.name, p.status === 'discontinued' ? 1 : 0,
    keep.map((i) => raw[r][i].map((v) => index[i].get(v)!))]);
  return { facets, rows };
}
