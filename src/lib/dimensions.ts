// A car's size and weight (hobbydex-rc docs/schema.md "Dimensions"): the `dimensions` table of a kit or release, and the
// wheelbase, track and width a body states. Pure functions: the pages pass in the records.

// a length as the maker states it: a number, a range, or (wheelbase and track) the configurable values with their labels
export type Length = number | { min: number; max: number } | { mm: number; label?: string }[];
export type Dimensions = {
  length_mm?: Length; width_mm?: Length; height_mm?: Length; wheelbase_mm?: Length; track_mm?: Length;
  track_front_mm?: Length; track_rear_mm?: Length; ground_clearance_mm?: Length; weight_g?: number;
  source: string; stated?: Record<string, string>;
};
export const MEASURES = ['wheelbase_mm', 'track_mm', 'track_front_mm', 'track_rear_mm', 'length_mm', 'width_mm', 'height_mm',
  'ground_clearance_mm', 'weight_g'] as const;
export type Measure = typeof MEASURES[number];
// one figure with the table it came from: the release's own, else its kit's
export type Figure = { value: Length; source: string; stated?: string };
export type Figures = Partial<Record<Measure, Figure>>;

const TRACKS = ['track_mm', 'track_front_mm', 'track_rear_mm'] as const;

// The figures shown for a release: each measure from the release's own table, else from its kit's. A track is taken
// whole from one table (a release's single track does not mix with its kit's front and rear).
export function figuresOf(own?: Dimensions, kit?: Dimensions): Figures {
  const out: Figures = {};
  const take = (d: Dimensions | undefined, keys: readonly Measure[]) => {
    for (const k of keys) if (d?.[k] !== undefined && out[k] === undefined) out[k] = { value: d[k]!, source: d.source, stated: d.stated?.[k] };
  };
  const trackTable = TRACKS.some((k) => own?.[k] !== undefined) ? own : kit;
  take(own, MEASURES.filter((k) => !(TRACKS as readonly string[]).includes(k)));
  take(kit, MEASURES.filter((k) => !(TRACKS as readonly string[]).includes(k)));
  take(trackTable, TRACKS);
  return out;
}

const num = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10));

// "257 mm", "255-262 mm", "210 / 225 / 239 mm (S / M / L)"
export function lengthText(v: Length): string {
  if (typeof v === 'number') return `${num(v)} mm`;
  if (Array.isArray(v)) {
    const labels = v.every((o) => o.label) ? ` (${v.map((o) => o.label).join(' / ')})` : '';
    return `${v.map((o) => num(o.mm)).join(' / ')} mm${labels}`;
  }
  return `${num(v.min)}-${num(v.max)} mm`;
}

// grams below a kilogram, else kilograms with up to two decimals ("1.52 kg"), as makers print them
export const weightText = (g: number) => (g < 1000 ? `${num(g)} g` : `${Math.round(g / 10) / 100} kg`);

export const trackText = (f: Figures) => {
  if (f.track_mm) return lengthText(f.track_mm.value);
  const a = f.track_front_mm, b = f.track_rear_mm;
  if (a && b) return JSON.stringify(a.value) === JSON.stringify(b.value) ? lengthText(a.value) : `${lengthText(a.value).replace(/ mm$/, '')} / ${lengthText(b.value)} (front / rear)`;
  if (a) return `${lengthText(a.value)} (front)`;
  if (b) return `${lengthText(b.value)} (rear)`;
  return undefined;
};

// "463 x 201 x 62 mm" (length x width x height), with what is missing left out of the label
export function sizeRow(f: Figures): { label: string; text: string } | undefined {
  const parts = ([['length_mm', 'length'], ['width_mm', 'width'], ['height_mm', 'height']] as const).filter(([k]) => f[k]);
  if (parts.length === 0) return undefined;
  const label = parts.map(([, l]) => l).join(' x ');
  return { label: label[0].toUpperCase() + label.slice(1), text: parts.map(([k]) => lengthText(f[k]!.value).replace(/ mm$/, '')).join(' x ') + ' mm' };
}

// The rows a kit or release page shows, in order: wheelbase and track first, then size, ground clearance, weight.
// Each row names the measures it shows, so the page can put the source note on the first row of each source.
export function dimensionRows(f: Figures): { label: string; text: string; keys: Measure[]; stated?: string }[] {
  const rows: { label: string; text: string; keys: Measure[]; stated?: string }[] = [];
  if (f.wheelbase_mm) rows.push({ label: 'Wheelbase', text: lengthText(f.wheelbase_mm.value), keys: ['wheelbase_mm'], stated: f.wheelbase_mm.stated });
  const t = trackText(f);
  if (t) rows.push({ label: 'Track width', text: t, keys: TRACKS.filter((k) => f[k]) });
  const s = sizeRow(f);
  if (s) rows.push({ ...s, keys: (['length_mm', 'width_mm', 'height_mm'] as const).filter((k) => f[k]) });
  if (f.ground_clearance_mm) rows.push({ label: 'Ground clearance', text: lengthText(f.ground_clearance_mm.value), keys: ['ground_clearance_mm'] });
  if (f.weight_g) rows.push({ label: 'Weight', text: weightText(f.weight_g.value as number), keys: ['weight_g'], stated: f.weight_g.stated });
  return rows;
}

// ---- bodies that fit ------------------------------------------------------------------------------------------------

// the intervals a length allows: a number is one point, a range one interval, options one point each
export function intervals(v: Length | undefined): [number, number][] {
  if (v === undefined || v === null) return [];
  if (typeof v === 'number') return [[v, v]];
  if (Array.isArray(v)) return v.filter((o) => typeof o?.mm === 'number').map((o) => [o.mm, o.mm]);
  if (typeof v.min === 'number' && typeof v.max === 'number') return [[v.min, v.max]];
  return [];
}
const meets = (a: [number, number][], b: [number, number][]) => a.some(([a0, a1]) => b.some(([b0, b1]) => a0 <= b1 && b0 <= a1));

export type BodyLike = { id: string; category?: string; scale?: string; wheelbase_mm?: Length; width_mm?: Length; track_mm?: Length; track_front_mm?: Length; track_rear_mm?: Length };
export type CarSize = { wheelbase?: Length; width?: Length; tracks: Length[]; scale?: string };

// The car's size for matching: its wheelbase, width and every track it states.
export const carSize = (f: Figures, scale?: string): CarSize => ({
  wheelbase: f.wheelbase_mm?.value, width: f.width_mm?.value, scale,
  tracks: TRACKS.map((k) => f[k]?.value).filter((x): x is Length => x !== undefined),
});

// How a body fits a car: the measures that match, wheelbase first ("wheelbase, width", "wheelbase, track"), when the
// wheelbase matches and every width or track both state matches too (owner 2026-11-18: track width is as important as
// wheelbase); just "wheelbase" when the body or the car states no width or track to check; null when it does not fit
// (another wheelbase, a width or track both state that differs, another scale).
export function bodyFit(body: BodyLike, car: CarSize): string | null {
  if (body.category !== 'body') return null;
  const wb = intervals(body.wheelbase_mm), cw = intervals(car.wheelbase);
  if (!wb.length || !cw.length || !meets(wb, cw)) return null;
  if (body.scale && car.scale && body.scale !== car.scale) return null;
  const by = ['wheelbase'];
  const bw = intervals(body.width_mm), carW = intervals(car.width);
  if (bw.length && carW.length) { if (!meets(bw, carW)) return null; by.push('width'); }
  const bt = [...intervals(body.track_mm), ...intervals(body.track_front_mm), ...intervals(body.track_rear_mm)];
  const ct = car.tracks.flatMap(intervals);
  if (bt.length && ct.length) { if (!meets(bt, ct)) return null; by.push('track'); }
  return by.join(', ');
}

// A full match: the wheelbase and a width or track both state agree (owner 2026-11-19); a fit of "wheelbase" alone is
// listed apart, collapsed.
export const fullFit = (fit: string) => fit !== 'wheelbase';

// The bodies that fit, split into full matches and wheelbase-only ones, each by brand then name (brandOf gives a
// body's brand name).
export function bodiesFitting<B extends BodyLike & { name: string; brand: string }>(bodies: B[], car: CarSize, brandOf: (b: B) => string) {
  const out: { full: { body: B; fit: string }[]; wheelbaseOnly: { body: B; fit: string }[] } = { full: [], wheelbaseOnly: [] };
  if (!intervals(car.wheelbase).length) return out;
  const fits = bodies.map((b) => ({ body: b, fit: bodyFit(b, car) })).filter((x): x is { body: B; fit: string } => x.fit !== null)
    .sort((a, b) => brandOf(a.body).localeCompare(brandOf(b.body)) || a.body.name.localeCompare(b.body.name));
  for (const x of fits) (fullFit(x.fit) ? out.full : out.wheelbaseOnly).push(x);
  return out;
}
