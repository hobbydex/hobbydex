// Which specs have a hardware bag drawing (src/assets/hardware/index.json, written by hobbydex-tools tools/hardware/make_drawings.py),
// and the bag items a part shows: its `includes` (a spec row, or a part row drawn as that part's equivalent_to spec),
// else its equivalent_to spec (its pack of one spec, from pack_qty). When some includes rows have no drawing, the bag
// draws the others and says how many rows it draws. A self-tapping screw shows the spec's "-flat" drawing
// (the flat point, as the technical drawing) unless the part says point "cone".
import index from '../assets/hardware/index.json';
import approx from '../assets/hardware/approx.json';
import { db, type Includes, type Part } from './data';

const files = index as Record<string, string>;
// the drawings' text, bundled at build time
const svgs = import.meta.glob('../assets/hardware/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

/** The SVG text of a drawing file (from index.json), or undefined. */
export function hardwareSvg(file: string): string | undefined {
  return svgs[`../assets/hardware/${file}`];
}

const approxKeys = new Set(approx as string[]);

/** True when the spec's drawing is for a size the Fasteners tables lack: its head is interpolated (approx.json). */
export function isApproxDrawing(specId: string | undefined): boolean {
  return !!specId && approxKeys.has(specId.replace(/^spec\//, ''));
}

/** The drawing file of a spec id (spec/...), or undefined when the spec has none. */
export function hardwareFile(specId: string | undefined, point?: string): string | undefined {
  if (!specId) return undefined;
  const key = specId.replace(/^spec\//, '');
  return (point !== 'cone' && files[`${key}-flat`]) || files[key];
}

/** One drawing of a bag: qty is the count the data states (undefined when it states none: the caption prints no
 * count); copies is how many are drawn (qty, else one per includes row). */
export type BagItem = { spec: string; qty?: number; copies: number; point?: string };
/** The bag of a part: its items, and how many of its includes rows are drawn out of how many (both 1 for a pack). */
export type Bag = { items: BagItem[]; drawn: number; total: number };

/** The spec an includes row is drawn as: its spec, or the first equivalent_to spec of its part that has a drawing. */
function rowDrawing(row: Includes, point?: string): { spec: string; point?: string } | undefined {
  if (row.spec) return hardwareFile(row.spec, point) ? { spec: row.spec, point } : undefined;
  const p = row.part ? db.part.get(row.part) : undefined;
  const e = p?.equivalent_to?.find((x) => hardwareFile(x.spec, p.point));
  return e && p ? { spec: e.spec, point: p.point } : undefined;
}

/** The bag for a part, or undefined when it has no drawing to show. */
export function bagItems(part: Part): Bag | undefined {
  if (part.includes?.length) {
    const rows = part.includes.filter((i) => i.spec || i.part);
    const drawn = rows.map((i) => ({ row: i, d: rowDrawing(i, part.point) })).filter((r) => r.d);
    if (drawn.length === 0) return undefined;
    // one item per drawing; its count is the sum of the rows' counts, or none when a row states none
    const items = new Map<string, BagItem>();
    for (const { row, d } of drawn) {
      const key = hardwareFile(d!.spec, d!.point)!;
      const prev = items.get(key);
      const qty = prev ? (prev.qty !== undefined && row.qty !== undefined ? prev.qty + row.qty : undefined) : row.qty;
      const rowsSoFar = (prev?.copies ?? 0) + (row.qty ?? 1);
      items.set(key, { spec: d!.spec, point: d!.point, qty, copies: qty ?? rowsSoFar });
    }
    return { items: [...items.values()], drawn: drawn.length, total: rows.length };
  }
  const e = (part.equivalent_to ?? []).find((x) => hardwareFile(x.spec, part.point));
  if (!e) return undefined;
  const qty = part.pack_qty ?? 1;
  return { items: [{ spec: e.spec, qty, copies: qty, point: part.point }], drawn: 1, total: 1 };
}

// A metal or plastic tone for a bag with no colour: the tone's CSS variables are set on the bag (HardwareBag.astro).
export type Tone = 'steel' | 'darkzinc' | 'black' | 'titanium' | 'aluminium' | 'brass' | 'copper' | 'plastic';
const FINISH_TONE: Record<string, Tone> = {
  'bright zinc': 'steel', silver: 'steel', zinc: 'steel', nickel: 'steel', chrome: 'steel',
  'dark zinc': 'darkzinc', 'brown zinc': 'darkzinc', 'dark brown zinc': 'darkzinc',
  'black oxide': 'black', black: 'black',
  'yellow zinc': 'brass', 'yellow chromate': 'brass', gold: 'brass',
  titanium: 'titanium', copper: 'copper',
};
const MATERIAL_TONE: Record<string, Tone> = {
  steel: 'steel', stainless: 'steel', titanium: 'titanium', aluminium: 'aluminium', aluminum: 'aluminium',
  brass: 'brass', copper: 'copper', plastic: 'plastic', nylon: 'plastic',
};

/** The tone of a part with no colour: its finish first, then its material; undefined for the page background. */
export function metalTone(finish?: string, material?: string): Tone | undefined {
  return FINISH_TONE[finish?.trim().toLowerCase() ?? ''] ?? MATERIAL_TONE[material?.trim().toLowerCase() ?? ''];
}
