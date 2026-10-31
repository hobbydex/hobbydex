// The 1:1 hardware reference sheet of a release (/rc/releases/<brand>/<key>/hardware/): the sized hardware of its
// `kit` rows (screws, nuts, washers, bearings, e-clips, pins, ball ends), each with a true-size outline in mm, a size
// label and a quantity, grouped by bag where the rows say which bag they are built from, else by kind.
// A row's sizes come from its part: the specs in `includes`, else the spec it is `equivalent_to`. The outline is the
// traced bag drawing of the spec (src/assets/hardware, see hardwareBag.ts) when there is one, else a plain outline
// drawn from the spec's size (`traced: false`). A spec with a size but no outline is listed as text.
import { db, type Part, type Release, type Spec } from './data';
import { hardwareFile, hardwareSvg } from './hardwareBag';

export type Kind = 'screw' | 'nut' | 'washer' | 'bearing' | 'eclip' | 'pin' | 'ball-end';
const KINDS: Kind[] = ['screw', 'nut', 'washer', 'bearing', 'eclip', 'pin', 'ball-end'];
export const KIND_LABEL: Record<Kind, string> = { screw: 'Screws', nut: 'Nuts', washer: 'Washers', bearing: 'Bearings', eclip: 'E-clips', pin: 'Pins', 'ball-end': 'Ball ends' };

/** A drawing in mm: `svg` is a complete <svg> of width w and height h (viewBox in mm), drawn in currentColor. */
export type Outline = { w: number; h: number; inner: string; viewBox: string; traced: boolean };
export type SheetItem = { spec: string; kind: Kind; size: string; sub: string; qty: number; qtyKnown: boolean; bag?: string; outline?: Outline; parts: string[] };
export type Sheet = { groups: { title: string; items: SheetItem[] }[]; sized: number; noOutline: number; unsized: Part[]; byBag: boolean };

const n = (v: unknown) => String(Number(v));   // 10.0 -> "10", 3.175 -> "3.175"
const num = (v: unknown) => Number(v);
const HEAD_NAME: Record<string, string> = { 'socket-cap': 'cap', 'low-head': 'low cap', button: 'button', countersunk: 'countersunk', flat: 'countersunk', pan: 'pan', set: 'set', truss: 'truss', hex: 'hex', 'flanged-button': 'flanged button', 'flanged-socket-cap': 'flanged cap', 'flanged-pan': 'flanged pan' };

// ---- sizes: the label of a spec ------------------------------------------------------------------------------------
function label(s: Spec): { size: string; sub: string } | undefined {
  switch (s.category) {
    case 'screw': {
      if (!s.thread || !s.length_mm) return undefined;
      const head = HEAD_NAME[String(s.head)] ?? String(s.head ?? '');
      const t = s.thread_type === 'self-tapping' ? ' tapping' : '';
      return { size: `${s.thread}x${n(s.length_mm)} ${head}${t}`.trim(), sub: 'screw' };
    }
    case 'nut': return s.thread ? { size: `${s.thread} ${String(s.type ?? '').replace(/-/g, ' ')}`.trim(), sub: 'nut' } : undefined;
    case 'washer': return s.bore_mm && s.outer_mm ? { size: `${n(s.bore_mm)}x${n(s.outer_mm)}${s.thickness_mm ? `x${n(s.thickness_mm)}` : ''}`, sub: 'washer' } : undefined;
    case 'bearing': return s.bore_mm && s.outer_mm ? { size: `${n(s.bore_mm)}x${n(s.outer_mm)}${s.width_mm ? `x${n(s.width_mm)}` : ''}`, sub: 'bearing' } : undefined;
    case 'eclip': return s.shaft_mm ? { size: `${n(s.shaft_mm)} mm`, sub: 'e-clip' } : undefined;
    case 'pin': return s.diameter_mm && s.length_mm ? { size: `${n(s.diameter_mm)}x${n(s.length_mm)}`, sub: 'pin' } : undefined;
    case 'ball-end': return s.ball_mm ? { size: `${n(s.ball_mm)} mm ${String(s.type ?? '').replace(/-/g, ' ')}`.trim(), sub: 'ball end' } : undefined;
  }
}

// ---- outlines ------------------------------------------------------------------------------------------------------
const fx = (v: number) => String(Math.round(v * 100) / 100);
const LINE = 'fill="none" stroke="currentColor" stroke-width="0.15" stroke-linejoin="round"';
const FILL = 'fill="var(--sheet-fill)"';

/** The traced bag drawing of a spec (true size: its viewBox is in mm). */
function traced(specId: string, point?: string): Outline | undefined {
  const file = hardwareFile(specId, point);
  const svg = file && hardwareSvg(file);
  if (!svg) return undefined;
  const vb = svg.match(/viewBox="([^"]+)"/)![1];
  const [, , w, h] = vb.split(' ').map(Number);
  const sil = svg.match(/<path class="sil" d="([^"]*)"/)?.[1];
  const lines = svg.match(/<g class="lines"[^>]*>([\s\S]*?)<\/g>/)?.[0];
  if (!sil || !lines) return undefined;
  return { w, h, viewBox: vb, traced: true, inner: `<path d="${sil}" ${FILL} fill-rule="evenodd"/>${lines}` };
}

// head diameter and height of a screw by head type and thread, mm (the usual ISO proportions; see screwDrawing.ts)
function headSize(head: string, d: number): { dk: number; k: number } {
  const cap: Record<string, [number, number]> = { 1.6: [3, 1.6], 2: [3.8, 2], 2.5: [4.5, 2.5], 3: [5.5, 3], 4: [7, 4], 5: [8.5, 5], 6: [10, 6] };
  const btn: Record<string, [number, number]> = { 3: [5.7, 1.65], 4: [7.6, 2.2], 5: [9.5, 2.75], 6: [10.5, 3.3] };
  const h = head.replace(/^flanged-/, '');
  const flange = head.startsWith('flanged-') ? 1.2 : 1;
  if (h === 'socket-cap') { const c = cap[String(d)]; return { dk: (c?.[0] ?? 1.75 * d) * flange, k: c?.[1] ?? d }; }
  if (h === 'low-head') return { dk: cap[String(d)]?.[0] ?? 1.75 * d, k: 0.6 * d };
  if (h === 'button') { const c = btn[String(d)]; return { dk: (c?.[0] ?? 1.9 * d) * flange, k: c?.[1] ?? 0.55 * d }; }
  if (h === 'countersunk' || h === 'flat') { const dk = ({ 3: 6.72, 4: 8.96, 5: 11.2, 6: 13.44 } as Record<number, number>)[d] ?? 2 * d; return { dk, k: (dk - d) / 2 }; }
  if (h === 'truss') return { dk: 2 * d, k: 0.5 * d };
  if (h === 'hex') return { dk: 1.8 * d, k: 0.7 * d };
  return { dk: 1.9 * d, k: 0.7 * d };   // pan and the rest
}

function screwOutline(s: Spec): Outline | undefined {
  const d = num(String(s.thread).replace(/^M/, '')), L = num(s.length_mm);
  if (!d || !L) return undefined;
  const head = String(s.head ?? 'pan');
  const m = 0.3;
  if (head === 'set') {
    return wrap(d, L, `<rect x="${fx(-d / 2)}" y="0" width="${d}" height="${L}" ${FILL} ${LINE}/>`, m);
  }
  const { dk, k } = headSize(head, d);
  const base = head.replace(/^flanged-/, '');
  let h: string;
  if (base === 'countersunk' || base === 'flat') h = `M${fx(-dk / 2)} 0H${fx(dk / 2)}L${fx(d / 2)} ${fx(k)}H${fx(-d / 2)}Z`;
  else if (base === 'button' || base === 'pan' || base === 'truss') h = `M${fx(-dk / 2)} ${fx(k)}Q${fx(-dk / 2)} 0 ${fx(-dk / 4)} 0H${fx(dk / 4)}Q${fx(dk / 2)} 0 ${fx(dk / 2)} ${fx(k)}Z`;
  else h = `M${fx(-dk / 2)} 0H${fx(dk / 2)}V${fx(k)}H${fx(-dk / 2)}Z`;
  const body = `<path d="${h}" ${FILL} ${LINE}/><rect x="${fx(-d / 2)}" y="${fx(k)}" width="${d}" height="${L}" ${FILL} ${LINE}/>`;
  // the length is the shank below the head (countersunk: the whole screw under the flat top)
  if (base === 'countersunk' || base === 'flat') {
    const b = `<path d="${h}" ${FILL} ${LINE}/><rect x="${fx(-d / 2)}" y="${fx(k)}" width="${d}" height="${fx(L - k)}" ${FILL} ${LINE}/>`;
    return wrap(dk, L, b, m);
  }
  return wrap(dk, k + L, body, m);
}

/** An outline of width w (centred on x = 0) and height h. */
function wrap(w: number, h: number, inner: string, m: number): Outline {
  const W = w + 2 * m, H = h + 2 * m;
  return { w: W, h: H, viewBox: `${fx(-W / 2)} ${fx(-m)} ${fx(W)} ${fx(H)}`, traced: false, inner };
}

const AF: Record<string, number> = { 1.4: 3, 1.6: 3.2, 2: 4, 2.5: 5, 3: 5.5, 4: 7, 5: 8, 6: 10, 8: 13 };   // hex nut across flats, mm
function nutOutline(s: Spec): Outline | undefined {
  const d = num(String(s.thread).replace(/^M/, ''));
  const type = String(s.type);
  const af = AF[String(d)];
  if (!af || !/^(hex|lock|nylon-lock|metal-lock|flanged.*|serrated-flange.*)$/.test(type)) return undefined;
  const R = af / Math.sqrt(3);
  const pts = [0, 1, 2, 3, 4, 5].map((i) => `${fx(R * Math.cos((i * Math.PI) / 3))} ${fx(R * Math.sin((i * Math.PI) / 3))}`);
  const flanged = /flange/.test(type);
  const fr = flanged ? (af * 1.3) / 2 : 0;
  const out = flanged ? fr : R;
  const body = `${flanged ? `<circle r="${fx(fr)}" ${FILL} ${LINE}/>` : ''}<path d="M${pts.join('L')}Z" ${FILL} ${LINE}/><circle r="${fx(d / 2)}" ${FILL} ${LINE} stroke-dasharray="0.5 0.3"/>`;
  return ring(out, body);
}

function ring(r: number, inner: string): Outline {
  const W = 2 * r + 0.6;
  return { w: W, h: W, viewBox: `${fx(-W / 2)} ${fx(-W / 2)} ${fx(W)} ${fx(W)}`, traced: false, inner };
}

function ringOutline(s: Spec): Outline | undefined {
  if (s.category === 'washer' || s.category === 'bearing') {
    const bore = num(s.bore_mm), out = num(s.outer_mm);
    if (!bore || !out) return undefined;
    const race = s.category === 'bearing' ? `<circle r="${fx(bore / 2 + (out - bore) * 0.22)}" fill="none" stroke="currentColor" stroke-width="0.1"/>` +
      `<circle r="${fx(out / 2 - (out - bore) * 0.22)}" fill="none" stroke="currentColor" stroke-width="0.1"/>` : '';
    return ring(out / 2, `<path d="M${fx(-out / 2)} 0a${fx(out / 2)} ${fx(out / 2)} 0 1 0 ${fx(out)} 0a${fx(out / 2)} ${fx(out / 2)} 0 1 0 ${fx(-out)} 0ZM${fx(-bore / 2)} 0a${fx(bore / 2)} ${fx(bore / 2)} 0 1 0 ${fx(bore)} 0a${fx(bore / 2)} ${fx(bore / 2)} 0 1 0 ${fx(-bore)} 0Z" ${FILL} fill-rule="evenodd" ${LINE}/>${race}`);
  }
  if (s.category === 'ball-end') {
    const b = num(s.ball_mm);
    return b ? ring(b / 2, `<circle r="${fx(b / 2)}" ${FILL} ${LINE}/>`) : undefined;
  }
  if (s.category === 'eclip') {
    const out = num(s.din_outer_mm), g = num(s.groove_mm ?? s.shaft_mm) ;
    if (!out || !g) return undefined;
    const R = out / 2, r = g / 2, a = (35 * Math.PI) / 180;   // the opening: 70 degrees on the right
    const p = (rad: number, t: number) => `${fx(rad * Math.cos(t))} ${fx(rad * Math.sin(t))}`;
    return ring(R, `<path d="M${p(R, a)}A${fx(R)} ${fx(R)} 0 1 0 ${p(R, -a)}L${p(r, -a)}A${fx(r)} ${fx(r)} 0 1 1 ${p(r, a)}Z" ${FILL} ${LINE}/>`);
  }
  return undefined;
}

function pinOutline(s: Spec): Outline | undefined {
  const d = num(s.diameter_mm), L = num(s.length_mm);
  return d && L ? wrap(d, L, `<rect x="${fx(-d / 2)}" y="0" width="${d}" height="${L}" ${FILL} ${LINE}/>`, 0.3) : undefined;
}

function outlineOf(s: Spec, point?: string): Outline | undefined {
  return traced(s.id, point)
    ?? (s.category === 'screw' ? screwOutline(s) : s.category === 'nut' ? nutOutline(s) : s.category === 'pin' ? pinOutline(s) : ringOutline(s));
}

// ---- bags ----------------------------------------------------------------------------------------------------------
/** The bag a row's manual reference names: Associated "Bag 7.1, 7.2 - Step 5" -> "Bag 7"; Tamiya "MA7" -> "Steps MA". */
export function bagOf(step?: string): string | undefined {
  if (!step) return undefined;
  const bag = step.match(/\bBag\s+(\d+)/i);
  if (bag) return `Bag ${bag[1]}`;
  const code = step.match(/^([A-Z]{1,3})\d/);
  return code ? `Steps ${code[1]}` : undefined;
}

// ---- the sheet -----------------------------------------------------------------------------------------------------
/** The hardware of a release: the specs of its `kit` rows, with qty. Undefined when fewer than 3 sized items. */
export function hardwareSheet(release: Release): Sheet | undefined {
  const map = new Map<string, SheetItem>();
  const unsized = new Map<string, Part>();
  for (const row of release.contains ?? []) {
    if (row.role !== 'kit') continue;
    const p = db.part.get(row.part);
    if (!p) continue;
    let refs: { spec: string; qty: number; known: boolean }[] = [];
    if (p.includes?.length) {
      refs = p.includes.filter((i) => i.spec).map((i) => ({ spec: i.spec!, qty: (i.qty ?? 1) * (row.qty ?? 1), known: row.qty !== undefined }));
    } else {
      const e = (p.equivalent_to ?? []).find((x) => KINDS.includes(x.spec.split('/')[1] as Kind) && db.spec.get(x.spec));
      if (e) refs = [{ spec: e.spec, qty: row.qty ?? p.pack_qty ?? 1, known: row.qty !== undefined }];
    }
    const hw = refs.filter((r) => KINDS.includes(r.spec.split('/')[1] as Kind) && db.spec.get(r.spec));
    if (hw.length === 0) {
      if (p.category && (KINDS as string[]).includes(p.category)) unsized.set(p.id, p);
      continue;
    }
    const bag = bagOf(row.step);
    for (const r of hw) {
      const s = db.spec.get(r.spec)!;
      const l = label(s);
      if (!l) { unsized.set(p.id, p); continue; }
      const k = `${r.spec}|${bag ?? ''}`;
      const have = map.get(k);
      if (have) { have.qty += r.qty; have.qtyKnown &&= r.known; have.parts.push(p.id); continue; }
      map.set(k, { spec: r.spec, kind: s.category as Kind, ...l, qty: r.qty, qtyKnown: r.known, bag, outline: outlineOf(s, p.point), parts: [p.id] });
    }
  }
  const all = [...map.values()];
  const sized = new Set(all.map((i) => i.spec)).size;
  if (sized < 3) return undefined;
  const byBag = all.filter((i) => i.bag).length >= all.length / 2;
  const kindOrder = (i: SheetItem) => KINDS.indexOf(i.kind);
  const bySize = (a: SheetItem, b: SheetItem) => kindOrder(a) - kindOrder(b) || a.size.localeCompare(b.size, undefined, { numeric: true });
  const groups: Sheet['groups'] = [];
  if (byBag) {
    const names = [...new Set(all.map((i) => i.bag))].sort((a, b) => (a ? 0 : 1) - (b ? 0 : 1) || (a ?? '').localeCompare(b ?? '', undefined, { numeric: true }));
    for (const g of names) groups.push({ title: g ?? 'No bag stated', items: all.filter((i) => i.bag === g).sort(bySize) });
  } else {
    for (const k of KINDS) {
      const items = all.filter((i) => i.kind === k).sort(bySize);
      if (items.length) groups.push({ title: KIND_LABEL[k], items });
    }
  }
  return { groups, sized, noOutline: all.filter((i) => !i.outline).length, unsized: [...unsized.values()], byBag };
}
