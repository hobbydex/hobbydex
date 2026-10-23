// Which specs have a hardware bag drawing (src/assets/hardware/index.json, written by tools/hardware/make_drawings.py),
// and the bag items a part shows: its `includes` when it lists specs (every one must have a drawing), else its
// equivalent_to spec (its pack of one spec, from pack_qty). A self-tapping screw shows the spec's "-flat" drawing
// (the flat point, as the technical drawing) unless the part says point "cone".
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
export function hardwareFile(specId: string | undefined, point?: string): string | undefined {
  if (!specId) return undefined;
  const key = specId.replace(/^spec\//, '');
  return (point !== 'cone' && files[`${key}-flat`]) || files[key];
}

export type BagItem = { spec: string; qty: number; point?: string };

/** The bag items for a part, or undefined when it has no drawing to show. */
export function bagItems(part: Part): BagItem[] | undefined {
  if (part.includes?.length) {
    const specs = part.includes.filter((i) => i.spec);
    if (specs.length === 0 || !specs.every((i) => hardwareFile(i.spec, part.point))) return undefined;
    const sum = new Map<string, number>();
    for (const i of specs) sum.set(i.spec!, (sum.get(i.spec!) ?? 0) + (i.qty ?? 1));
    return [...sum].map(([spec, qty]) => ({ spec, qty, point: part.point }));
  }
  const e = (part.equivalent_to ?? []).find((x) => hardwareFile(x.spec, part.point));
  return e ? [{ spec: e.spec, qty: part.pack_qty ?? 1, point: part.point }] : undefined;
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
