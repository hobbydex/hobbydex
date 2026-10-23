// Which specs have a hardware bag drawing (src/assets/hardware/index.json, written by tools/hardware/make_drawings.py),
// and the bag items a part shows: its `includes` when it lists specs (every one must have a drawing), else its
// equivalent_to spec (its pack of one spec, from pack_qty).
import index from '../assets/hardware/index.json';
import type { Part } from './data';

const files = index as Record<string, string>;
// the drawings' text, bundled at build time
const svgs = import.meta.glob('../assets/hardware/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

/** The SVG text of a drawing file (from index.json), or undefined. */
export function hardwareSvg(file: string): string | undefined {
  return svgs[`../assets/hardware/${file}`];
}

/** The drawing file of a spec id (spec/...), or undefined when the spec has none. */
export function hardwareFile(specId: string | undefined): string | undefined {
  return specId ? files[specId.replace(/^spec\//, '')] : undefined;
}

export type BagItem = { spec: string; qty?: number };

/** The bag items for a part, or undefined when it has no drawing to show. */
export function bagItems(part: Part): BagItem[] | undefined {
  if (part.includes?.length) {
    const specs = part.includes.filter((i) => i.spec);
    if (specs.length === 0 || !specs.every((i) => hardwareFile(i.spec))) return undefined;
    const sum = new Map<string, number>();
    for (const i of specs) sum.set(i.spec!, (sum.get(i.spec!) ?? 0) + (i.qty ?? 1));
    return [...sum].map(([spec, qty]) => ({ spec, qty }));
  }
  const e = (part.equivalent_to ?? []).find((x) => hardwareFile(x.spec));
  return e ? [{ spec: e.spec, qty: part.pack_qty ?? 1 }] : undefined;
}

/**
 * The bag of a release's row: a single-spec bag takes the release's qty for the part (the kit's count; undefined when
 * the release gives none, which draws one piece with no count); a bag of several specs keeps its own counts.
 */
export function releaseBagItems(part: Part, qty: number | undefined): BagItem[] | undefined {
  const items = bagItems(part);
  if (!items) return undefined;
  return items.length === 1 ? [{ spec: items[0].spec, qty }] : items;
}
