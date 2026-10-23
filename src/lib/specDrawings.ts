// Dimensioned drawings for bearing, washer, pinion, pin and wheel hex specs, drawn in currentColor (light and dark).
// Screws and nuts have their own modules (screwDrawing.ts, nutDrawing.ts); specDrawing() picks the right one for a spec.
import { db, type Part, type Spec, type MountHoles } from './data';
import { screwDrawing, type ScrewDrawing } from './screwDrawing';
import { nutDrawing } from './nutDrawing';
import { eclipDrawing } from './eclipDrawing';

const f = (v: number) => String(Math.round(v * 100) / 100);
export const svgWrap = (w: number, h: number, label: string, body: string, units = true) =>
  `<svg class="screwdrawing" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${label}"><g class="s">${body}${units ? UNITS(w) : ''}</g></svg>`;
export const UNITS = (w: number) => `<text x="${w - 4}" y="12" text-anchor="end" class="std">dimensions in mm</text>`;
// a horizontal dimension line with arrows and its label above (below when the span is too short for it)
function hdim(x1: number, x2: number, y: number, label: string, under = false) {
  return `<path class="thin" d="M${f(x1)} ${f(y)}H${f(x2)}M${f(x1 + 5)} ${f(y - 3)}L${f(x1)} ${f(y)}L${f(x1 + 5)} ${f(y + 3)}M${f(x2 - 5)} ${f(y - 3)}L${f(x2)} ${f(y)}L${f(x2 - 5)} ${f(y + 3)}"/>`
    + `<text x="${f((x1 + x2) / 2)}" y="${f(under ? y + 14 : y - 5)}" text-anchor="middle">${label}</text>`;
}
function vdim(x: number, y1: number, y2: number, label: string, left = false) {
  return `<path class="thin" d="M${f(x)} ${f(y1)}V${f(y2)}M${f(x - 3)} ${f(y1 + 5)}L${f(x)} ${f(y1)}L${f(x + 3)} ${f(y1 + 5)}M${f(x - 3)} ${f(y2 - 5)}L${f(x)} ${f(y2)}L${f(x + 3)} ${f(y2 - 5)}"/>`
    + `<text x="${f(left ? x - 6 : x + 6)}" y="${f((y1 + y2) / 2 + 4)}" text-anchor="${left ? 'end' : 'start'}">${label}</text>`;
}

// Ball bearing to scale: a face view (balls, or the shield that hides them) and a cross-section through the
// axis: outer ring, inner ring and a ball in its raceways above and below the bore, the shields or seals when
// the part states them, the flange when flanged. Thrust bearings: two washers with the ball between.
export type Seal = 'open' | 'metal' | 'rubber' | 'rubber-metal';
export function bearingDrawing(spec: Spec, seal?: string): ScrewDrawing | undefined {
  const D = Number(spec.outer_mm), d = Number(spec.bore_mm), B = Number(spec.width_mm);
  if (!D || !d || !B || d >= D) return undefined;
  const flanged = spec.type === 'flanged', thrust = spec.type === 'thrust';
  // the flange's size is the spec's flange_mm and flange_width_mm; without them it is drawn at the usual size
  const sized = flanged && !!spec.flange_mm && !!spec.flange_width_mm, estimated = flanged && !sized;
  const flD = sized ? Number(spec.flange_mm) : D + Math.max(1, D * 0.12), flW = sized ? Number(spec.flange_width_mm) : Math.max(0.5, B * 0.15);
  const Dmax = flanged ? flD : D;
  const s = Math.min(16, 120 / Dmax);   // px per mm
  const Rm = (Dmax / 2) * s, cy = 26 + Rm, fx = 14 + Rm;   // face view centre
  const R = (D / 2) * s, r = (d / 2) * s, F = (flD / 2) * s, w = B * s;
  const t = (D - d) / 2, rm = (D + d) / 4;   // ring section, pitch radius (mm)
  const o: string[] = [];
  // face view
  const Dw = thrust ? Math.min(0.4 * B, 0.6 * t) : Math.min(0.55 * t, 0.7 * B);   // ball diameter (mm)
  const ro = (rm + 0.3 * Dw) * s, ri = (rm - 0.3 * Dw) * s;   // outer ring bore, inner ring outside (px)
  if (flanged) o.push(`<circle class="thin" cx="${f(fx)}" cy="${f(cy)}" r="${f(F)}"/>`);
  o.push(`<circle class="fill" cx="${f(fx)}" cy="${f(cy)}" r="${f(R)}"/><circle class="bg" cx="${f(fx)}" cy="${f(cy)}" r="${f(ro)}"/>`);
  o.push(`<circle class="fill" cx="${f(fx)}" cy="${f(cy)}" r="${f(ri)}"/><circle class="bg" cx="${f(fx)}" cy="${f(cy)}" r="${f(r)}"/>`);
  const shielded = !thrust && (seal === 'metal' || seal === 'rubber' || seal === 'rubber-metal');
  if (shielded) o.push(`<path class="${seal === 'metal' ? 'shield' : 'seal'}" fill-rule="evenodd" d="${ring(fx, cy, ro, ri)}"/>`);
  else {
    const n = Math.max(5, Math.min(14, Math.floor((2 * Math.PI * rm) / (Dw * 1.45))));
    for (let i = 0; i < n; i++) { const a = (2 * Math.PI * i) / n - Math.PI / 2; o.push(`<circle class="ball" cx="${f(fx + rm * s * Math.cos(a))}" cy="${f(cy + rm * s * Math.sin(a))}" r="${f((Dw / 2) * s)}"/>`); }
  }
  // cross-section: x along the axis, the upper half mirrored below the centre line
  const sx = fx + Rm + 56, xc = sx + w / 2;
  const half = (sg: number) => {
    const Y = (mm: number) => cy - sg * mm * s;   // radius (mm) to screen y
    const sw = sg > 0 ? 0 : 1;
    if (thrust) {
      const ww = Math.max(0.3 * B, 0.4), gap = B - 2 * ww;
      return `<path class="fill" d="M${f(sx)} ${f(Y(D / 2))}h${f(ww * s)}V${f(Y(d / 2))}h${f(-ww * s)}Z M${f(sx + (ww + gap) * s)} ${f(Y(D / 2))}h${f(ww * s)}V${f(Y(d / 2))}h${f(-ww * s)}Z"/>`
        + `<circle class="ball" cx="${f(xc)}" cy="${f(Y(rm))}" r="${f(Math.min(gap / 2 + 0.1 * ww, Dw / 2) * s)}"/>`;
    }
    const g = 0.52 * Dw, c = 0.3 * Dw, a = Math.sqrt(g * g - c * c) * s;
    // outer ring, with the flange at the left face; the raceway is an arc around the ball
    let outer = flanged ? `M${f(sx)} ${f(Y(flD / 2))}H${f(sx + flW * s)}V${f(Y(D / 2))}` : `M${f(sx)} ${f(Y(D / 2))}`;
    outer += `H${f(sx + w)}V${f(Y(rm + c))}H${f(xc + a)}A${f(g * s)} ${f(g * s)} 0 0 ${sw} ${f(xc - a)} ${f(Y(rm + c))}H${f(sx)}Z`;
    const inner = `M${f(sx)} ${f(Y(d / 2))}H${f(sx + w)}V${f(Y(rm - c))}H${f(xc + a)}A${f(g * s)} ${f(g * s)} 0 0 ${1 - sw} ${f(xc - a)} ${f(Y(rm - c))}H${f(sx)}Z`;
    let out = `<path class="fill" d="${outer}"/><path class="fill" d="${inner}"/><circle class="ball" cx="${f(xc)}" cy="${f(Y(rm))}" r="${f((Dw / 2) * s)}"/>`;
    if (shielded) {
      const st = Math.max(0.15 * B, 1.6 / s);   // shield thickness, at least visible
      const side = (x: number, kind: string) => `<rect class="${kind === 'metal' ? 'shield' : 'seal'}" x="${f(x)}" y="${f(Math.min(Y(rm + c), Y(rm - c)))}" width="${f(st * s)}" height="${f((2 * c) * s)}"/>`;
      const left = seal === 'rubber-metal' ? 'rubber' : seal!, right = seal === 'rubber-metal' ? 'metal' : seal!;
      out += side(sx + 0.04 * w, left) + side(sx + w - 0.04 * w - st * s, right);
    }
    return out;
  };
  o.push(half(1), half(-1));
  o.push(`<path class="thin dashdot" d="M${f(sx - 8)} ${f(cy)}H${f(sx + w + 8)}M${f(fx - Rm - 6)} ${f(cy)}H${f(fx + Rm + 6)}M${f(fx)} ${f(cy - Rm - 6)}V${f(cy + Rm + 6)}"/>`);
  // dimensions on the section: bore at the left, outside diameter at the right, width below
  o.push(vdim(sx - 10, cy - r, cy + r, `⌀${f(d)}`, true));
  o.push(`<path class="thin" d="M${f(sx + w + 2)} ${f(cy - R)}H${f(sx + w + 18)}M${f(sx + w + 2)} ${f(cy + R)}H${f(sx + w + 18)}"/>`);
  o.push(vdim(sx + w + 14, cy - R, cy + R, `⌀${f(D)}`));
  const by = cy + Math.max(R, flanged ? F : 0) + 16;
  o.push(`<path class="thin" d="M${f(sx)} ${f(cy + (flanged ? F : R) + 2)}V${f(by + 4)}M${f(sx + w)} ${f(cy + R + 2)}V${f(by + 4)}"/>`);
  const under = w < 34;   // too narrow for the label above the line
  o.push(hdim(sx, sx + w, by, `${f(B)}`, under));
  if (flanged) o.push(`<text x="${f(sx - 4)}" y="${f(cy - F + 4)}" text-anchor="end" class="std">flange ⌀${f(flD)}${estimated ? '*' : ''}</text>`);
  const W = Math.max(300, Math.ceil(sx + w + 64)), H = Math.ceil(Math.max(cy + Rm + 14, by + (under ? 20 : 8)));
  const sealTxt = shielded ? ({ metal: ', shielded (ZZ)', rubber: ', sealed (2RS)', 'rubber-metal': ', one seal, one shield' } as Record<string, string>)[seal!] : '';
  const label = `${f(d)}x${f(D)}x${f(B)}${flanged ? ' flanged' : thrust ? ' thrust' : ''} bearing${sealTxt}`;
  return { svg: svgWrap(W, H, label, o.join('')), standard: undefined, approximate: estimated, note: estimated ? '* flange diameter drawn at the usual size; check the part' : undefined };
}
const circlePath = (cx: number, cy: number, r: number) => `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;
const ring = (cx: number, cy: number, R: number, r: number) => circlePath(cx, cy, R) + circlePath(cx, cy, r);

// Involute gear outline (20 degree pressure angle) as a path: z teeth, module m (mm), s px per mm, centred at
// cx, cy; rot turns it (radians, clockwise from a tooth pointing up).
export function gearPath(cx: number, cy: number, z: number, m: number, s: number, rot = 0) {
  const rp = (z * m / 2) * s, ra = rp + m * s, rf = Math.max(rp - 1.25 * m * s, rp * 0.3);
  const rb = rp * Math.cos((20 * Math.PI) / 180);
  const inv = (r: number) => { const al = Math.acos(Math.min(1, rb / r)); return Math.tan(al) - al; };
  const half = Math.PI / (2 * z) + inv(rp);   // half tooth angle at the base circle, measured from the tooth centre
  const flank: [number, number][] = [];      // [radius, angle from the tooth centre] from root to tip
  const r0 = Math.max(rf, rb);
  for (let j = 0; j <= 8; j++) { const r = r0 + ((ra - r0) * j) / 8; flank.push([r, half - inv(r)]); }
  const pts: string[] = [];
  const at = (r: number, a: number) => `${f(cx + r * Math.sin(a + rot))} ${f(cy - r * Math.cos(a + rot))}`;
  const hr = (half * rb) / rf;               // below the base circle the flank runs parallel: same width at the root
  const tip = Math.max(0, flank[8][1]);
  for (let i = 0; i < z; i++) {
    const c = (2 * Math.PI * i) / z;
    if (rf < rb) pts.push(at(rf, c - hr));
    for (const [r, a] of flank) pts.push(at(r, c - a));
    for (let j = 1; j <= 3; j++) pts.push(at(ra, c - tip + (2 * tip * j) / 4));   // tip land, a short arc
    for (const [r, a] of [...flank].reverse()) pts.push(at(r, c + a));
    if (rf < rb) pts.push(at(rf, c + hr));
    const next = c + (2 * Math.PI) / z;        // root arc to the next tooth
    for (let j = 1; j <= 3; j++) pts.push(at(rf, c + hr + ((next - hr - (c + hr)) * j) / 4));
  }
  return `M${pts.join('L')}Z`;
}

// module of a gear from its module or diametral pitch
export const moduleOf = (x: { module?: unknown; pitch_dp?: unknown }) => (x.module ? Number(x.module) : x.pitch_dp ? 25.4 / Number(x.pitch_dp) : 0);
export const pitchText = (x: { module?: unknown; pitch_dp?: unknown }) => (x.pitch_dp ? `${x.pitch_dp} pitch` : x.module ? `module ${f(Number(x.module))}` : '');

// Pinion or spur gear: the outline with its tooth count, the pitch circle dashed, the bore when known. To scale
// when the module or pitch is known; otherwise only the tooth count is drawn (module 1, no sizes).
export function gearDrawing(g: { teeth?: unknown; module?: unknown; pitch_dp?: unknown; bore_mm?: unknown }, kind = 'pinion'): ScrewDrawing | undefined {
  const z = Number(g.teeth); const known = moduleOf(g); const m = known || 1;
  if (!z || z < 6 || z > 200) return undefined;
  const Dp = z * m, Da = Dp + 2 * m, bore = Number(g.bore_mm) || 0;
  const s = 130 / Da, cx = 82, cy = 80, ra = (Da / 2) * s, rp = (Dp / 2) * s;
  const o = [`<path class="fill" fill-rule="evenodd" d="${gearPath(cx, cy, z, m, s)}${known && bore && bore < Dp * 0.8 ? circlePath(cx, cy, (bore / 2) * s) : ''}"/>`,
    `<circle class="thin dash" cx="${cx}" cy="${cy}" r="${f(rp)}"/>`, `<path class="thin dashdot" d="M${f(cx - ra - 6)} ${cy}H${f(cx + ra + 6)}M${cx} ${f(cy - ra - 6)}V${f(cy + ra + 6)}"/>`];
  if (known) o.push(hdim(cx - ra, cx + ra, cy + ra + 22, `⌀${f(Da)}`), `<path class="thin" d="M${f(cx - ra)} ${cy}V${f(cy + ra + 26)}M${f(cx + ra)} ${cy}V${f(cy + ra + 26)}"/>`);
  const pitch = pitchText(g);
  const lines = [`<tspan class="big">${z}T</tspan> ${kind}`, known ? `${pitch}${g.pitch_dp ? ` (module ${f(m)})` : ''}` : 'pitch not known', known ? `pitch circle ⌀${f(Dp)}` : 'drawn by tooth count only', known && bore ? `bore ⌀${f(bore)}` : ''].filter(Boolean);
  o.push(lines.map((t, i) => `<text x="${f(cx + ra + 22)}" y="${f(cy - 14 + i * 18)}"${i > 1 ? ' class="std"' : ''}>${t}</text>`).join(''));
  const svg = known ? svgWrap(330, Math.ceil(cy + ra + 32), `${z}T ${kind}, ${pitch}`, o.join(''))
    : svgWrap(330, Math.ceil(cy + ra + 10), `${z}T ${kind}`, o.join(''), false);
  return { svg, standard: undefined, approximate: !known };
}

// Washer, shim or spacer to scale: a face view (the ring) and a cross-section through the axis, the ring's
// section above and below the bore. Countersunk: the bore chamfered on one face; conical: the section sloped
// like a dish. Very thin shims are drawn at least a hairline thick.
export function washerDrawing(spec: Spec): ScrewDrawing | undefined {
  const D = Number(spec.outer_mm), d = Number(spec.bore_mm), T = Number(spec.thickness_mm);
  if (!D || !d || !T || d >= D) return undefined;
  const s = Math.min(16, 120 / D, 160 / T);   // px per mm
  const R = (D / 2) * s, r = (d / 2) * s, w = Math.max(T * s, 1.5);
  const cy = 26 + R, fx = 14 + R;
  const o: string[] = [`<path class="fill" fill-rule="evenodd" d="${ring(fx, cy, R, r)}"/>`];
  const sx = fx + R + 56;
  const conical = spec.shape === 'conical', csk = spec.shape === 'countersunk';
  const rise = conical ? Math.min(0.25 * (D - d) / 2 * s, 2.5 * w) : 0;   // dish height of a conical washer (drawn)
  const c = csk ? Math.min(0.8 * w, 0.6 * (R - r)) : 0;   // countersink depth and width (drawn at 90 degrees)
  const half = (sg: number) => {
    const Y = (px: number) => cy - sg * px;   // distance from the axis (px) to screen y
    // outer edge at sx + rise, inner edge at sx: the cone rises towards the bore
    return `<path class="fill" d="M${f(sx + rise)} ${f(Y(R))}H${f(sx + rise + w)}L${f(sx + w)} ${f(Y(r))}H${f(sx + c)}L${f(sx)} ${f(Y(r + c))}Z"/>`;
  };
  o.push(half(1), half(-1));
  const xr = sx + rise + w;
  o.push(`<path class="thin dashdot" d="M${f(sx - 8)} ${f(cy)}H${f(xr + 8)}M${f(fx - R - 6)} ${f(cy)}H${f(fx + R + 6)}M${f(fx)} ${f(cy - R - 6)}V${f(cy + R + 6)}"/>`);
  o.push(vdim(sx - 10, cy - r, cy + r, `⌀${f(d)}`, true));
  o.push(`<path class="thin" d="M${f(xr + 2)} ${f(cy - R)}H${f(xr + 18)}M${f(xr + 2)} ${f(cy + R)}H${f(xr + 18)}"/>`);
  o.push(vdim(xr + 14, cy - R, cy + R, `⌀${f(D)}`));
  const by = cy + R + 16, x1 = sx + rise;
  o.push(`<path class="thin" d="M${f(x1)} ${f(cy + R + 2)}V${f(by + 4)}M${f(x1 + w)} ${f(cy + R + 2)}V${f(by + 4)}"/>`);
  o.push(hdim(x1 - (w < 14 ? 14 : 0), x1 + w + (w < 14 ? 14 : 0), by, `${f(T)}`, true));
  const W = Math.max(300, Math.ceil(xr + 70)), H = Math.ceil(Math.max(cy + R + 14, by + 20));
  const word = T < 1 ? 'shim' : T < 3 ? 'washer' : 'spacer';
  const label = `${f(d)}x${f(D)}x${f(T)} ${csk ? 'countersunk ' : conical ? 'conical ' : ''}${word}`;
  return { svg: svgWrap(W, H, label, o.join('')), standard: undefined, approximate: conical || csk,
    note: conical ? 'The dish height is not part of the spec and is drawn at a usual size' : csk ? 'The countersink is drawn at the usual 90 degrees' : T * s < 1.5 ? 'The thickness is drawn wider than to scale' : undefined };
}

// Wheel hex: the hex seen from the wheel side with its size across the flats. The axle is dashed: its size is not part of the spec.
function wheelHex(spec: Spec): ScrewDrawing | undefined {
  const af = Number(spec.hex_mm);
  if (!af) return undefined;
  const s = 110 / (af / Math.cos(Math.PI / 6)), cx = 90, cy = 75, R = ((af / 2) / Math.cos(Math.PI / 6)) * s;
  const hex = [0, 1, 2, 3, 4, 5].map((i) => `${f(cx + R * Math.cos((i * Math.PI) / 3))} ${f(cy + R * Math.sin((i * Math.PI) / 3))}`).join('L');
  const flat = (af / 2) * s;
  const o = [`<path d="M${hex}Z"/>`, `<circle class="thin dash" cx="${cx}" cy="${cy}" r="${f(flat * 0.42)}"/>`];
  o.push(vdim(cx + R + 16, cy - flat, cy + flat, `${f(af)}`));
  o.push(`<path class="thin" d="M${f(cx + R * 0.5)} ${f(cy - flat)}H${f(cx + R + 20)}M${f(cx + R * 0.5)} ${f(cy + flat)}H${f(cx + R + 20)}"/>`);
  o.push(`<text x="${cx}" y="${f(cy + R + 22)}" text-anchor="middle" class="std">across the flats</text>`);
  return { svg: svgWrap(300, 180, `${f(af)} mm wheel hex`, o.join('')), standard: undefined, approximate: false };
}

// Parallel pin: side view to scale with its chamfered ends, the diameter and the length.
function pin(spec: Spec): ScrewDrawing | undefined {
  const d = Number(spec.diameter_mm), L = Number(spec.length_mm);
  if (!d || !L) return undefined;
  const s = Math.min(14, 220 / L, 60 / d), x0 = 50, cy = 60, w = L * s, r = (d / 2) * s, c = Math.min(r * 0.35, 4);
  const o = [`<path d="M${f(x0 + c)} ${f(cy - r)}H${f(x0 + w - c)}L${f(x0 + w)} ${f(cy - r + c)}V${f(cy + r - c)}L${f(x0 + w - c)} ${f(cy + r)}H${f(x0 + c)}L${x0} ${f(cy + r - c)}V${f(cy - r + c)}Z"/>`];
  o.push(hdim(x0, x0 + w, cy + r + 18, `${f(L)}`), `<path class="thin" d="M${x0} ${f(cy + r + 3)}V${f(cy + r + 22)}M${f(x0 + w)} ${f(cy + r + 3)}V${f(cy + r + 22)}"/>`);
  o.push(vdim(x0 + w + 16, cy - r, cy + r, `⌀${f(d)}`));
  const std = (spec.standards ?? []).join(' / ');
  return { svg: svgWrap(Math.max(300, x0 + w + 70), Math.max(120, cy + r + 40), `${f(d)}x${f(L)} parallel pin`, o.join('')), standard: std || undefined, approximate: false };
}

// Electric motor: side view (can, front bearing cap line, shaft with its flat) and the end view from the shaft
// side, with the can diameter, length and shaft diameter. Brushed specs give only a can code, so their sizes
// are the usual ones for that can; the shaft length is never part of the spec. Mounting holes: the patterns
// the maker states (a motor's own `mount_holes`, or on a spec page every pattern its branded motors state) are
// drawn solid, each on its bolt circle and listed below the end view (most common first); with none stated, a 36 mm or larger can
// (a 540-size can) shows the usual 2 x M3 on 25 mm dotted, marked as not stated; larger cans show none. Patterns are drawn evenly around the shaft,
// a second pattern turned against the first: makers rarely give the angle between them.
const CAN_SIZE: Record<string, [number, number]> = { '380': [28, 38], '540': [36, 50], '550': [36, 57], '555': [36, 57] };
type Pattern = MountHoles & { parts?: number };
const holeKey = (h: MountHoles) => `${h.count ?? '?'}x${h.thread}@${h.circle_mm}`;
let mountsBySpec: Map<string, Pattern[]> | undefined;
// every hole pattern the branded motors of a spec state, with how many motors state it
function specMounts(id: string): Pattern[] {
  if (!mountsBySpec) {
    const m = new Map<string, Map<string, Pattern>>();
    for (const p of db.parts) {
      if (p.category !== 'motor' || !p.mount_holes?.length) continue;
      for (const e of p.equivalent_to ?? []) {
        if (!m.has(e.spec)) m.set(e.spec, new Map());
        const by = m.get(e.spec)!;
        for (const h of p.mount_holes) { const k = holeKey(h); const x = by.get(k) ?? { ...h, parts: 0 }; x.parts!++; by.set(k, x); }
      }
    }
    mountsBySpec = new Map([...m].map(([k, v]) => [k, [...v.values()].sort((a, b) => b.parts! - a.parts! || a.circle_mm - b.circle_mm)]));
  }
  return mountsBySpec.get(id) ?? [];
}
export function motorDrawing(spec: Spec, own?: MountHoles[]): (ScrewDrawing & { note?: string }) | undefined {
  const shaft = Number(spec.shaft_mm);
  let D = Number(spec.diameter_mm), L = Number(spec.length_mm), approx = false;
  if (!D || !L) { const u = CAN_SIZE[String(spec.can)]; if (!u) return undefined; [D, L] = u; approx = true; }
  if (!shaft) return undefined;
  const ls = shaft < 2.5 ? 8 : shaft < 4 ? 14 : 18;   // the usual exposed shaft length (mm), not a spec figure
  const s = Math.min(3.2, 230 / (L + ls), 100 / D);
  const x0 = 50, R = (D / 2) * s, cy = 28 + R, w = L * s, r = (shaft / 2) * s, sw = ls * s;
  const o: string[] = [];
  o.push(`<rect class="fill" x="${f(x0)}" y="${f(cy - R)}" width="${f(w)}" height="${f(2 * R)}" rx="2"/>`);
  o.push(`<path class="thin" d="M${f(x0 + w - 1.6 * s)} ${f(cy - R)}V${f(cy + R)}"/>`);
  o.push(`<rect class="fill" x="${f(x0 + w)}" y="${f(cy - r)}" width="${f(sw)}" height="${f(2 * r)}"/>`);
  o.push(`<path class="thin" d="M${f(x0 + w + sw * 0.35)} ${f(cy - r + 0.9)}H${f(x0 + w + sw)}"/>`);
  o.push(hdim(x0, x0 + w, cy + R + 18, `${f(L)}`), `<path class="thin" d="M${f(x0)} ${f(cy + R + 3)}V${f(cy + R + 22)}M${f(x0 + w)} ${f(cy + R + 3)}V${f(cy + R + 22)}"/>`);
  o.push(vdim(x0 - 12, cy - R, cy + R, `⌀${f(D)}`, true));
  o.push(vdim(x0 + w + sw + 12, cy - r, cy + r, `⌀${f(shaft)}`));
  const ex = x0 + w + sw + 64 + R, ey = cy;
  o.push(`<circle class="fill" cx="${f(ex)}" cy="${f(ey)}" r="${f(R)}"/><circle cx="${f(ex)}" cy="${f(ey)}" r="${f(r)}"/>`);
  const stated: Pattern[] = own?.length ? own : specMounts(spec.id);
  const usual = !stated.length && D >= 34 && D <= 37;   // the 540-size layout; larger cans (1/8) vary too much to guess
  // a pattern whose hole count the maker does not give is drawn as a dotted pair at its spacing
  const pats: (Pattern & { dashed?: boolean })[] = usual ? [{ thread: 'M3', count: 2, circle_mm: 25, dashed: true }]
    : stated.filter((h) => h.circle_mm < D + 6).map((h) => (h.count ? h : { ...h, count: 2, dashed: true }));
  const lines: string[] = [];
  pats.forEach((h, i) => {
    const n = h.count ?? 2;
    const rot = (i * (360 / n)) / pats.length;   // a second pattern turned against the first
    const rc = (h.circle_mm / 2) * s, rh = Math.max(1.2, (parseFloat(h.thread.slice(1)) / 2) * s);
    o.push(`<circle class="thin dash" cx="${f(ex)}" cy="${f(ey)}" r="${f(rc)}" opacity="0.5"/>`);
    for (let k = 0; k < n; k++) {
      const a = ((rot + (k * 360) / n) * Math.PI) / 180;
      o.push(h.dashed ? `<circle class="thin" cx="${f(ex + rc * Math.cos(a))}" cy="${f(ey + rc * Math.sin(a))}" r="${f(rh)}" fill="none" stroke-dasharray="1.2 1.2"/>`
        : `<circle class="solid" cx="${f(ex + rc * Math.cos(a))}" cy="${f(ey + rc * Math.sin(a))}" r="${f(rh)}"/>`);
    }
    lines.push(usual ? `${h.count} x ${h.thread} on ⌀${f(h.circle_mm)} (usual, not stated)` : h.dashed ? `${h.thread} on ⌀${f(h.circle_mm)}, number of holes not stated` : `${h.count} x ${h.thread} on ⌀${f(h.circle_mm)}`);
  });
  // the first pattern's bolt circle dimensioned below the end view: centre to centre of two opposite holes
  let ty = ey + R + 16;
  if (pats.length) {
    const rc0 = (pats[0].circle_mm / 2) * s, dy = ey + R + 12;
    o.push(`<path class="thin" d="M${f(ex - rc0)} ${f(ey + 2)}V${f(dy + 4)}M${f(ex + rc0)} ${f(ey + 2)}V${f(dy + 4)}"/>`, hdim(ex - rc0, ex + rc0, dy, `⌀${f(pats[0].circle_mm)}`, true));
    ty = dy + 30;
  }
  lines.forEach((t, i) => o.push(`<text x="${f(ex)}" y="${f(ty + i * 14)}" text-anchor="middle" class="std">${t}</text>`));
  const noShaft = 'The shaft length is not part of the spec';
  const holeNote = usual ? '; dotted: the usual 2 x M3 holes 25 mm apart, which no maker states for this size; hole sizes are bolt circles (⌀), centre to centre across the shaft' : !stated.length && D > 37 ? '; no maker states the mounting holes for this size yet'
    : stated.length ? (own?.length ? '; mounting holes as the maker states them' : '; mounting holes as the makers of these motors state them') + (pats.some((h) => h.dashed) ? ', dotted where the number of holes is not stated' : '') + (pats.length > 1 ? ', the angle between the patterns is not stated' : '') + '; ⌀ is the bolt circle, centre to centre across the shaft' : '';
  const note = (approx ? `Can sizes as usual for a ${spec.can} can, the spec gives only the can code and the shaft; the shaft length is not part of the spec` : noShaft) + holeNote;
  return { svg: svgWrap(Math.max(300, ex + R + 90), Math.max(140, ty + lines.length * 14 + 10), String(spec.name ?? 'motor'), o.join('')), standard: undefined, approximate: approx, note };
}

export function specDrawing(spec: Spec): (ScrewDrawing & { note?: string }) | undefined {
  if (spec.category === 'screw') return screwDrawing(spec);
  if (spec.category === 'bearing') return bearingDrawing(spec);
  if (spec.category === 'pinion') return gearDrawing({ teeth: spec.teeth, module: spec.module, pitch_dp: spec.pitch_dp });
  if (spec.category === 'wheel-hex') return wheelHex(spec);
  if (spec.category === 'pin') return pin(spec);
  if (spec.category === 'nut') return nutDrawing(spec);
  if (spec.category === 'washer') return washerDrawing(spec);
  if (spec.category === 'eclip') return eclipDrawing(spec);
  if (spec.category === 'motor') return motorDrawing(spec);
  return undefined;
}

// The drawing for a branded part: a bearing, screw, nut or washer through the spec it is equivalent to (with the part's
// own seal or thread), a pinion or spur gear from its tooth count and pitch (the part's, else its spec's).
export function partDrawing(part: Part): (ScrewDrawing & { note?: string; spec?: Spec }) | undefined {
  const eq = (part.equivalent_to ?? []).map((e) => db.spec.get(e.spec)).filter((x): x is Spec => !!x);
  if (part.category === 'pinion' || part.category === 'spur-gear') {
    const sp = eq.find((x) => x.category === 'pinion');
    const g = { teeth: part.teeth ?? sp?.teeth, module: part.module ?? (part.pitch_dp ? undefined : sp?.module), pitch_dp: part.pitch_dp ?? (part.module ? undefined : sp?.pitch_dp), bore_mm: part.bore_mm };
    return gearDrawing(g, part.category === 'spur-gear' ? 'spur gear' : 'pinion');
  }
  const bs = eq.find((x) => x.category === 'bearing');
  if (bs && part.category === 'bearing') { const dr = bearingDrawing(bs, part.seal); return dr && { ...dr, spec: bs }; }
  const ss = eq.find((x) => x.category === 'screw');
  if (ss && part.category === 'screw') { const dr = screwDrawing({ ...ss, thread_type: part.thread_type ?? ss.thread_type }); return dr && { ...dr, spec: ss }; }
  const ns = eq.find((x) => x.category === 'nut');
  if (ns && part.category === 'nut') { const dr = nutDrawing(ns); return dr && { ...dr, spec: ns }; }
  const es = eq.find((x) => x.category === 'eclip');
  if (es && part.category === 'clip') {
    const dr = eclipDrawing(es);
    const close = part.equivalent_to?.some((e) => e.spec === es.id && e.match === 'close');   // a thin or HD clip: drawn at the standard size
    return dr && { ...dr, spec: es, approximate: dr.approximate || !!close, note: close ? 'A thin or HD clip: drawn at the standard size of its shaft' : dr.note };
  }
  const ws = eq.find((x) => x.category === 'washer');
  if (ws && part.category === 'washer-shim') { const dr = washerDrawing(ws); return dr && { ...dr, spec: ws }; }
  const ms = eq.find((x) => x.category === 'motor');
  if (ms && part.category === 'motor') { const dr = motorDrawing(ms, part.mount_holes); return dr && { ...dr, spec: ms }; }
  return undefined;
}
