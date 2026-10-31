// A hardware drawing made from a spec's sizes, for a spec with no traced drawing (src/assets/hardware): the same SVG
// shape as a traced file (viewBox in mm, data-pitch-x/y, a filled `sil` path and a `lines` group), so the bag lays
// it out like any other. Screws and pins are a side view (a screw with the top view of its head beside it); washers,
// bearings, O-rings, nuts, e-clips and ball ends are a face view with their thickness as an edge below.
// Pure: no imports from the data, tested in tests/drawnHardware.test.mjs.
import { boxCentre, circlePath, hexPts, poly, topView, type Pt } from './screwTop.ts';

type Spec = Record<string, unknown>;
const fx = (v: number) => String(Math.round(v * 100) / 100);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0);
const M = 0.3, GAP = 1;   // margin round the drawing, gap between two views, mm

// a drawing: sil (filled areas, drawn even-odd), lines (stroked paths), cut (filled in the ink colour: a drive recess)
type Drawn = { sil: string[]; lines: string[]; cut: string[]; box: [number, number, number, number] };

/** The SVG text of a drawing, or undefined. */
function svgOf(d: Drawn): string {
  const [x0, y0, x1, y1] = d.box;
  const w = x1 - x0 + 2 * M, h = y1 - y0 + 2 * M;
  const stroke = 'fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter"';
  const lines = d.lines.length ? `<path d="${d.lines.join('')}" vector-effect="non-scaling-stroke"/>` : '';
  const cut = d.cut.map((c) => `<path d="${c}" fill="currentColor" stroke="none"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${fx(x0 - M)} ${fx(y0 - M)} ${fx(w)} ${fx(h)}" data-pitch-x="${fx(w - 0.2)}" data-pitch-y="${fx(h - 0.2)}" data-drawn="size">`
    + `<path class="sil" d="${d.sil.join('')}" fill-rule="evenodd"/><g class="lines" ${stroke}>${lines}${cut}</g></svg>`;
}

const rect = (x: number, y: number, w: number, h: number) => `M${fx(x)} ${fx(y)}h${fx(w)}v${fx(h)}h${fx(-w)}Z`;

/** A face view of a ring (outer radius R, bore r) centred on 0,0, with a thickness edge t below (when known). */
function ringDrawing(R: number, r: number, t: number, extraLines: string[] = []): Drawn {
  const sil = [circlePath(0, 0, R) + (r > 0 ? circlePath(0, 0, r) : '')];
  const lines = [circlePath(0, 0, R), ...(r > 0 ? [circlePath(0, 0, r)] : []), ...extraLines];
  let bottom = R;
  if (t > 0) {
    const y0 = R + GAP, h = Math.max(t, 0.12);
    sil.push(rect(-R, y0, 2 * R, h));
    lines.push(rect(-R, y0, 2 * R, h));
    if (r > 0 && h >= 1.5) lines.push(`M${fx(-r)} ${fx(y0)}v${fx(h)}M${fx(r)} ${fx(y0)}v${fx(h)}`);
    bottom = y0 + h;
  }
  return { sil, lines, cut: [], box: [-R, -R, R, bottom] };
}

function washer(s: Spec): Drawn | undefined {
  const bore = num(s.bore_mm), out = num(s.outer_mm);
  return bore > 0 && out > bore ? ringDrawing(out / 2, bore / 2, num(s.thickness_mm)) : undefined;
}

function bearing(s: Spec): Drawn | undefined {
  const bore = num(s.bore_mm), out = num(s.outer_mm);
  if (!(bore > 0 && out > bore)) return undefined;
  const w = (out - bore) * 0.22;   // the races
  return ringDrawing(out / 2, bore / 2, num(s.width_mm), [circlePath(0, 0, bore / 2 + w), circlePath(0, 0, out / 2 - w)]);
}

function oring(s: Spec): Drawn | undefined {
  const inner = num(s.inner_mm), cross = num(s.cross_mm);
  return inner > 0 && cross > 0 ? ringDrawing(inner / 2 + cross, inner / 2, cross) : undefined;
}

// hex nut width across flats by thread diameter (ISO 4032 for the small RC sizes), height by type
const AF: Record<string, number> = { 1.4: 3, 1.6: 3.2, 2: 4, 2.5: 5, 3: 5.5, 4: 7, 5: 8, 6: 10, 8: 13, 10: 16 };
function nut(s: Spec): Drawn | undefined {
  const d = num(String(s.thread).replace(/^M/, ''));
  const type = String(s.type);
  if (!(d > 0) || !/^(hex|lock|nylon-lock|metal-lock|flanged(-lock|-nylon-lock)?|serrated-flange(-nylon-lock)?|square)$/.test(type)) return undefined;
  const af = num(s.across_flats_mm) || AF[String(d)] || 1.8 * d;
  const flanged = /flange/.test(type);
  const nylon = /nylon/.test(type);
  const h = num(s.height_mm) || (nylon ? 1.2 * d : /lock/.test(type) ? 0.8 * d : 0.8 * d);
  const sq = type === 'square';
  const body: Pt[] = sq ? [[-af / 2, -af / 2], [af / 2, -af / 2], [af / 2, af / 2], [-af / 2, af / 2]]
    : hexPts(af / Math.sqrt(3)).map(([x, y]): Pt => [y, x]);   // a corner up
  const reach = flanged ? Math.max(af * 0.65, af / Math.sqrt(3)) : Math.max(...body.map(([x, y]) => Math.hypot(x, y)));
  const faceR = flanged ? af * 0.65 : 0;
  const sil = [poly(body) + circlePath(0, 0, d / 2)];
  const lines = [poly(body), circlePath(0, 0, d / 2)];
  if (flanged) { sil[0] = circlePath(0, 0, faceR) + circlePath(0, 0, d / 2); lines.unshift(circlePath(0, 0, faceR)); }
  // the side view: the width across corners (hex seen from a corner), or the flange
  const half = flanged ? faceR : sq ? af / 2 : Math.max(...body.map(([x]) => Math.abs(x)));
  const y0 = reach + GAP;
  sil.push(rect(-half, y0, 2 * half, h));
  lines.push(rect(-half, y0, 2 * half, h));
  return { sil, lines, cut: [], box: [-reach, -reach, reach, y0 + h] };
}

function eclip(s: Spec): Drawn | undefined {
  const shaft = num(s.shaft_mm), out = num(s.din_outer_mm ?? s.outer_mm), g = num(s.groove_mm ?? s.shaft_mm);
  if (!(out > 0 && g > 0)) return undefined;
  void shaft;
  const R = out / 2, r = g / 2, a = (35 * Math.PI) / 180;   // the opening: 70 degrees on the right
  const p = (rad: number, t: number) => `${fx(rad * Math.cos(t))} ${fx(rad * Math.sin(t))}`;
  const d = `M${p(R, a)}A${fx(R)} ${fx(R)} 0 1 0 ${p(R, -a)}L${p(r, -a)}A${fx(r)} ${fx(r)} 0 1 1 ${p(r, a)}Z`;
  return { sil: [d], lines: [d], cut: [], box: [-R, -R, R, R] };
}

function ballEnd(s: Spec): Drawn | undefined {
  const b = num(s.ball_mm);
  return b > 0 ? { sil: [circlePath(0, 0, b / 2)], lines: [circlePath(0, 0, b / 2)], cut: [], box: [-b / 2, -b / 2, b / 2, b / 2] } : undefined;
}

function pin(s: Spec): Drawn | undefined {
  const d = num(s.diameter_mm), L = num(s.length_mm);
  return d > 0 && L > 0 ? { sil: [rect(-d / 2, 0, d, L)], lines: [rect(-d / 2, 0, d, L)], cut: [], box: [-d / 2, 0, d / 2, L] } : undefined;
}

// head diameter and height of a screw by head type and thread, mm (the usual ISO proportions)
export function headSize(head: string, d: number): { dk: number; k: number } {
  const cap: Record<string, [number, number]> = { 1.6: [3, 1.6], 2: [3.8, 2], 2.5: [4.5, 2.5], 3: [5.5, 3], 4: [7, 4], 5: [8.5, 5], 6: [10, 6] };
  const btn: Record<string, [number, number]> = { 2: [3.5, 1.1], 2.5: [4.6, 1.4], 3: [5.7, 1.65], 4: [7.6, 2.2], 5: [9.5, 2.75], 6: [10.5, 3.3] };
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

// hex key (across flats) by thread for a socket cap (ISO 4762), a button or countersunk (ISO 7380, 10642) and a set screw (ISO 4029), mm
const CAPKEY: Record<string, number> = { 1.6: 1.5, 2: 1.5, 2.5: 2, 3: 2.5, 4: 3, 5: 4, 6: 5 };
const BTNKEY: Record<string, number> = { 1.4: 0.9, 1.6: 0.9, 2: 1.3, 2.5: 1.5, 3: 2, 4: 2.5, 5: 3, 6: 4 };
const SETKEY: Record<string, number> = { 2: 0.9, 2.5: 1.3, 3: 1.5, 4: 2, 5: 2.5, 6: 3 };
const PITCH: Record<string, number> = { 1.4: 0.3, 1.6: 0.35, 2: 0.4, 2.5: 0.45, 3: 0.5, 4: 0.7, 5: 0.8, 6: 1 };

function screw(s: Spec): Drawn | undefined {
  const d = num(String(s.thread).replace(/^M/, '')), L = num(s.length_mm);
  if (!(d > 0 && L > 0)) return undefined;
  const head = String(s.head ?? 'pan'), base = head.replace(/^flanged-/, '');
  const drive = String(s.drive ?? '');
  const tapping = s.thread_type === 'self-tapping';
  const set = base === 'set', csk = base === 'countersunk' || base === 'flat';
  const r = d / 2;
  const { dk, k } = set ? { dk: d, k: 0 } : headSize(head, d);
  const top = set ? 0 : k, end = csk ? L : top + L;
  const tip = tapping ? Math.min(1.2 * d, L / 2) : 0;
  const pitch = tapping ? 0.42 * d : PITCH[String(d)] ?? 0.2 * d;
  const shank = `M${fx(-r)} ${fx(top)}V${fx(end - tip)}${tapping ? `L${fx(-r * 0.45)} ${fx(end)}H${fx(r * 0.45)}L${fx(r)} ${fx(end - tip)}` : `V${fx(end)}H${fx(r)}`}V${fx(top)}Z`;
  let h = '';
  if (csk) h = `M${fx(-dk / 2)} 0H${fx(dk / 2)}L${fx(r)} ${fx(k)}H${fx(-r)}Z`;
  else if (base === 'button' || base === 'pan' || base === 'truss') h = `M${fx(-dk / 2)} ${fx(k)}Q${fx(-dk / 2)} 0 ${fx(-dk / 4)} 0H${fx(dk / 4)}Q${fx(dk / 2)} 0 ${fx(dk / 2)} ${fx(k)}Z`;
  else if (!set) h = `M${fx(-dk / 2)} 0H${fx(dk / 2)}V${fx(k)}H${fx(-dk / 2)}Z`;
  const marks: string[] = [];
  for (let y = top + (csk ? 0.2 : 0.1) * Math.min(L, 4) + pitch; y < end - tip - 0.05; y += pitch) marks.push(`M${fx(-r)} ${fx(y)}L${fx(r)} ${fx(y - pitch * 0.6)}`);
  const t = String(d);
  const key = drive === 'hex' ? (base === 'socket-cap' ? CAPKEY[t] : set ? SETKEY[t] : base === 'button' || csk ? BTNKEY[t] : undefined) : undefined;
  // the top view of the head to the right of the side view, its top level with the head
  const sw = Math.max(dk, d), tr = (set ? d : dk) / 2 / (base === 'hex' ? Math.cos(Math.PI / 6) : 1);
  const cx = sw / 2 + GAP + tr, cy = tr;
  const tv = topView({ head, drive, d, dk, key }, [cx, cy]);
  const sil = [shank, ...(h ? [h] : []), tv.head];
  const lines = [shank, ...(h ? [h] : []), ...marks, tv.head, ...(tv.flange ? [tv.flange] : [])];
  const cut = tv.drive ? [tv.drive] : [];
  return { sil, lines, cut, box: [-sw / 2, 0, cx + tr, Math.max(end, 2 * tr)] };
}

/** The drawing of a spec made from its sizes, as SVG text, or undefined when the spec has no size to draw from. */
export function drawnSvg(spec: Spec): string | undefined {
  const fn = ({ washer, bearing, 'o-ring': oring, nut, eclip, 'ball-end': ballEnd, pin, screw } as Record<string, (s: Spec) => Drawn | undefined>)[String(spec.category)];
  const d = fn?.(spec);
  return d ? svgOf(d) : undefined;
}
export { boxCentre };
