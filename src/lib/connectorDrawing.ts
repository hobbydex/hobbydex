// Drawings of connector specs, drawn in currentColor like the other spec drawings. Amass's dimensioned spec sheets
// give the EC plugs (EC2, EC3, EC5: mating face and side, to scale), their contacts (the bullets, to scale), and the
// AM-1015 T-plug (the Deans housing, to scale). Other plugs have no dimensioned drawing in our sources: they are drawn
// at their usual shape and marked not to scale.
import type { Spec } from './data';
import type { ScrewDrawing } from './screwDrawing';

const f = (v: number) => String(Math.round(v * 100) / 100);
const W = 300, cx = W / 2, top = 26;
const NOT_DIMENSIONED = 'the shape of the connector family; no dimensioned drawing of this plug is in our sources';
const rect = (x: number, y: number, w: number, h: number, cls = 'fill') => `<rect class="${cls}" x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}"/>`;
const circ = (x: number, y: number, r: number, cls: string) => `<circle class="${cls}" cx="${f(x)}" cy="${f(y)}" r="${f(r)}"/>`;
const label = (x: number, y: number, text: string) => `<text x="${f(x)}" y="${f(y)}" text-anchor="middle" class="std">${text}</text>`;
// a housing outline with its corners cut: c = [top-left, top-right, bottom-right, bottom-left] cuts in px, 0 = square
function housing(x: number, y: number, w: number, h: number, c: [number, number, number, number]) {
  const [tl, tr, br, bl] = c;
  return `<path class="fill" d="M${f(x + tl)} ${f(y)}H${f(x + w - tr)}L${f(x + w)} ${f(y + tr)}V${f(y + h - br)}L${f(x + w - br)} ${f(y + h)}H${f(x + bl)}L${f(x)} ${f(y + h - bl)}V${f(y + tl)}Z"/>`;
}
// the anti-spark contact: a hollow pin inside one contact
const sparkPin = (x: number, y: number, r: number) => circ(x, y, r * 0.45, 'ball');

// a dimension line with its value above it (horizontal) or beside it (vertical)
const hdim = (x1: number, x2: number, y: number, t: string) => `<path class="thin" d="M${f(x1)} ${f(y)}H${f(x2)}M${f(x1)} ${f(y - 3)}V${f(y + 3)}M${f(x2)} ${f(y - 3)}V${f(y + 3)}"/>${label((x1 + x2) / 2, y - 4, t)}`;
const vdim = (x: number, y1: number, y2: number, t: string) => `<path class="thin" d="M${f(x)} ${f(y1)}V${f(y2)}M${f(x - 3)} ${f(y1)}H${f(x + 3)}M${f(x - 3)} ${f(y2)}H${f(x + 3)}"/><text x="${f(x - 4)}" y="${f((y1 + y2) / 2 + 4)}" text-anchor="end" class="std">${t}</text>`;

// a drawn view with room for its dimensions (left and above) and its caption (below); the content is in its own
// coordinates, origin at its top left
const ML = 40, MR = 10, MT = 24, MB = 22;
type Part = { o: string; w: number; h: number; cap: string };
function part(content: string, w: number, h: number, cap: string): Part {
  return { o: `<g transform="translate(${ML} ${MT})">${content}</g>`, w: w + ML + MR, h: h + MT + MB, cap };
}
// parts side by side, centred on a common baseline, each with its caption
function row(parts: Part[], gap = 18): { o: string; w: number; h: number } {
  const total = parts.reduce((a, p) => a + p.w, 0) + gap * (parts.length - 1);
  const H = Math.max(...parts.map((p) => p.h));
  let x = Math.max(0, (W - total) / 2), o = '';
  for (const p of parts) {
    o += `<g transform="translate(${f(x)} 0)">${p.o}${label((p.w + ML - MR) / 2, H - 6, p.cap)}</g>`;
    x += p.w + gap;
  }
  return { o, w: Math.max(W, total + 12), h: H };
}
function svgOf(name: string, r: { o: string; w: number; h: number }) {
  const h = Math.ceil(r.h + 2);
  return `<svg class="screwdrawing" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(r.w)} ${h}" width="${f(r.w)}" height="${h}" role="img" aria-label="${name}"><g class="s">${r.o}</g></svg>`;
}

// XT family: the shell with its two bottom corners cut, two round contacts; XT150 and AS150 are single-pin pairs
function xtShell(w: number, h: number, r: number, dx: number, spark: boolean) {
  const x = cx - w / 2, y = top + 4, cut = Math.round(w * 0.14), cy = y + h / 2;
  let o = housing(x, y, w, h, [0, 0, cut, cut]);
  o += circ(cx - dx, cy, r, 'solid') + circ(cx + dx, cy, r, 'solid');
  if (spark) o += sparkPin(cx + dx, cy, r);
  return { o, bottom: y + h };
}
function xtPair(dx: number, r: number, spark: boolean) {
  const cy = top + 30;
  let o = circ(cx - dx, cy, r, 'solid') + circ(cx + dx, cy, r, 'solid');
  if (spark) o += sparkPin(cx + dx, cy, r);
  return { o, bottom: cy + r };
}

// EC and IC without a dimensioned drawing: a rectangular housing with one corner cut for the polarity
const EC_SIZE: Record<string, [number, number, number, number]> = { '2': [96, 62, 8, 19], '3': [112, 72, 9.5, 24], '5': [132, 84, 12, 30], '8': [160, 100, 15, 38] };
function ecShell(size: string) {
  const [w, h, r, dx] = EC_SIZE[size] ?? EC_SIZE['5'];
  const x = cx - w / 2, y = top + 4, cy = y + h / 2;
  let o = housing(x, y, w, h, [w * 0.16, 0, 0, 0]);
  o += circ(cx - dx, cy, r, 'ball') + circ(cx + dx, cy, r, 'ball');
  return { o, bottom: y + h };
}

// Amass EC plugs, from their dimensioned spec sheets (mm). Face: the housing outline, the two sockets (hole) at
// pitch, the waist on one side. Side: the ribbed rear of length ribL and the two contact shells, each as Amass draws
// them (shell heights read from the drawing); blueLeft puts the shells at the back.
type Ec = { w: number; h: number; hole: number; pitch: number; L: number; ribL: number; blueLeft: boolean; shells: [number, number][] };
const EC: Record<string, Ec> = {
  ec2: { w: 6.1, h: 12.5, hole: 3.5, pitch: 6.25, L: 13, ribL: 5.8, blueLeft: false, shells: [[0.9, 5.3], [7.1, 11.6]] },
  ec3: { w: 8, h: 16.6, hole: 5.2, pitch: 8.4, L: 17.5, ribL: 9.4, blueLeft: true, shells: [[0.7, 7], [9.5, 15.6]] },
  ec5: { w: 9.9, h: 19.6, hole: 7, pitch: 10.1, L: 24, ribL: 8, blueLeft: false, shells: [[0.4, 8], [11.6, 19.2]] },
};
const EC_NOTE = (n: string) => `dimensions from Amass's spec sheet for ${n} (V1.2), in mm`;
function ecDrawing(slug: string, e: Ec) {
  const s = Math.min(16, 180 / (e.w + e.L));
  const fw = e.w * s, fh = e.h * s, r = 0.8 * s, mid = fh / 2, wr = fh * 0.12, wd = fw * 0.12, dy = (e.pitch * s) / 2, hx = fw / 2;
  const outline = `M${f(r)} 0H${f(fw - r)}Q${f(fw)} 0 ${f(fw)} ${f(r)}V${f(mid - wr)}Q${f(fw - 2 * wd)} ${f(mid)} ${f(fw)} ${f(mid + wr)}V${f(fh - r)}Q${f(fw)} ${f(fh)} ${f(fw - r)} ${f(fh)}H${f(r)}Q0 ${f(fh)} 0 ${f(fh - r)}V${f(r)}Q0 0 ${f(r)} 0Z`;
  const face = `<path class="fill" d="${outline}"/>` + circ(hx, mid - dy, (e.hole / 2) * s, 'ball') + circ(hx, mid + dy, (e.hole / 2) * s, 'ball')
    + hdim(0, fw, -8, `${e.w.toFixed(2)}`) + vdim(-8, 0, fh, `${e.h.toFixed(2)}`);
  const L = e.L * s, ribW = e.ribL * s, shellW = L - ribW;
  const ribX = e.blueLeft ? shellW : 0, shellX = e.blueLeft ? 0 : ribW;
  let side = rect(ribX, 0, ribW, fh);
  for (let i = 1; i * 1.3 < e.ribL; i++) side += `<path class="thin" d="M${f(ribX + i * 1.3 * s)} 0V${f(fh)}"/>`;
  for (const [a, b] of e.shells) side += rect(shellX, a * s, shellW, (b - a) * s);
  side += hdim(0, L, -8, `${e.L.toFixed(2)} mm`) + vdim(-8, 0, fh, `${e.h.toFixed(2)}`);
  const name = slug.toUpperCase();
  return { face: part(face, fw, fh, 'Mating face'), side: part(side, L, fh, 'Side'), note: EC_NOTE(name) };
}

// Amass contacts (bullets): the length from the EC contact drawing, mm, keyed by diameter; other sizes are 4.2 times
// the diameter (the median of the three Amass contacts), as no dimensioned drawing of them is in our sources
const CONTACT: Record<string, { L: number; from: string }> = {
  '2': { L: 10.6, from: 'EC2' }, '3.5': { L: 12, from: 'EC3' }, '5': { L: 21, from: 'EC5' },
};
// a male contact from the side, to scale: the tip (left) with a spring slot, the solder cup at the rear (right)
function bulletPart(d: number, L: number, banana: boolean) {
  const s = Math.min(22, 250 / L);
  const Lp = L * s, D = d * s, r = D / 2, tip = Math.min(r * 0.5, 0.5 * s);
  let o = `<path class="fill" d="M${f(tip)} 0H${f(Lp)}V${f(D)}H${f(tip)}L0 ${f(D - tip)}V${f(tip)}Z"/>`;
  const sw = D * (banana ? 0.3 : 0.18);
  o += rect(0, r - sw / 2, Lp * (banana ? 0.5 : 0.42), sw, 'bg');     // spring slot, open at the tip
  o += rect(Lp * 0.68, r - D * 0.25, Lp * 0.32, D * 0.5, 'bg');       // solder cup bore, open at the rear
  o += hdim(0, Lp, -8, `${L.toFixed(1)} mm`) + vdim(-8, 0, D, `\u2300${d}`);
  return { w: Lp, h: D, o };
}

export function connectorDrawing(spec: Spec): ScrewDrawing | undefined {
  const slug = String(spec.id).split('/').pop() ?? '';
  const spark = !!spec.anti_spark;
  const size = slug.replace(/^(ec|ic)/, '');
  const name = String(spec.name ?? slug);

  if (slug.startsWith('bullet-') || slug === 'banana-4mm') {
    const d = Number(spec.contact_mm);
    if (!d) return undefined;
    const banana = slug === 'banana-4mm';
    const known = CONTACT[String(d)];
    const L = known ? known.L : 4.2 * d;
    const b = bulletPart(d, L, banana);
    const cap = banana ? 'Side, banana tip' : 'Side';
    const note = known
      ? `diameter and length from Amass's ${known.from} spec sheet (V1.2), in mm`
      : `the diameter is the contact size; the length is 4.2 times it, the median of Amass's contacts, as no dimensioned drawing of this size is in our sources`;
    return { svg: svgOf(name, row([part(b.o, b.w, b.h, cap)])), standard: undefined, approximate: false, note };
  }

  if (slug === 'deans') {
    // the housing from the AM-1015 spec sheet: a 6.30 mm lip, then 7.60 mm wide, 13.30 mm high
    const s = Math.min(13, 180 / 13.3), fw = 7.6 * s, fh = 13.3 * s, c = fw / 2, lip = 1.8 * s, lipW = 6.3 * s, rr = 1.6 * s;
    let o = `<path class="fill" d="M${f(c - lipW / 2)} 0H${f(c + lipW / 2)}V${f(lip)}H${f(fw)}V${f(fh - rr)}Q${f(fw)} ${f(fh)} ${f(fw - rr)} ${f(fh)}H${f(rr)}Q0 ${f(fh)} 0 ${f(fh - rr)}V${f(lip)}H${f(c - lipW / 2)}Z"/>`;
    // two flat blades at right angles: one across, one hanging from its middle (blade sizes are not dimensioned)
    const y0 = fh * 0.42, bt = 0.9 * s;
    o += rect(c - 2.4 * s, y0, 4.8 * s, bt, 'bg') + rect(c - bt / 2, y0 + bt, bt, 2.6 * s, 'bg');
    o += hdim(0, fw, -8, `7.60 mm`) + vdim(-8, 0, fh, `13.30`);
    return {
      svg: svgOf(name, row([part(o, fw, fh, 'Mating face')])), standard: undefined, approximate: false,
      note: `housing from Amass's AM-1015 spec sheet (V1.2), in mm; the blades are not dimensioned, so they are drawn at the usual size`,
    };
  }

  if (EC[slug]) {
    const e = ecDrawing(slug, EC[slug]);
    return { svg: svgOf(name, row([e.face, e.side])), standard: undefined, approximate: false, note: e.note };
  }

  let r: { o: string; bottom: number; extra?: string } | undefined;
  if (slug === 'xt30') r = xtShell(110, 70, 9, 22, spark);
  else if (slug === 'xt60' || slug === 'xt60h') r = xtShell(150, 96, 12.5, 32, spark);
  else if (slug === 'xt90' || slug === 'xt90s') r = xtShell(176, 110, 14, 42, spark);
  else if (slug === 'xt150') r = xtPair(34, 11, false);
  else if (slug === 'as150') r = xtPair(34, 11, true);
  else if (slug === 'qs8') r = xtShell(120, 74, 10, 26, true);
  else if (/^(ec|ic)\d+$/.test(slug)) r = ecShell(size);
  else if (slug === 'tamiya') r = tamiya(116, 62, 14, 26);
  else if (slug === 'tamiya-mini') r = tamiya(80, 46, 10, 18);
  else if (slug === 'traxxas-trx-id' || slug === 'traxxas-high-current') r = traxxas();
  else if (slug === 'jst-rcy') r = jstRcy();
  else if (slug === 'jst-xh') {
    const n = Number(spec.pins) > 2 ? Number(spec.pins) : 4;
    r = jstXh(n);
    r.extra = label(cx, r.bottom + 18, Number(spec.pins) > 2 ? `${n} pins` : `${n} pins drawn; the pin count is not in the spec`);
  } else if (slug === 'servo-jr-futaba') {
    const y = top + 10;
    r = { o: servoPlug(cx - 66, true, 'JR', y) + servoPlug(cx + 6, false, 'Futaba', y), bottom: y + 46 + 20 };
  }
  if (!r) return undefined;
  const sparkNote = spark ? label(cx, r.bottom + (r.extra ? 36 : 18), 'anti-spark contact') : '';
  const bottom = r.bottom + (r.extra ? 36 : 18) + (sparkNote ? 18 : 0);
  const h = Math.ceil(Math.max(bottom + 8, 110));
  const svg = `<svg class="screwdrawing" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${h}" width="${W}" height="${h}" role="img" aria-label="${name}"><g class="s">${r.o}${r.extra ?? ''}${sparkNote}</g></svg>`;
  return { svg, standard: undefined, approximate: true, note: NOT_DIMENSIONED };
}

// Tamiya: a rectangular housing, one round-cornered key (top right), two flat contacts
function tamiya(w: number, h: number, key: number, blade: number) {
  const x = cx - w / 2, y = top + 4, bw = 9;
  let o = `<path class="fill" d="M${f(x)} ${f(y)}H${f(x + w - key)}Q${f(x + w)} ${f(y)} ${f(x + w)} ${f(y + key)}V${f(y + h)}H${f(x)}Z"/>`;
  o += rect(cx - 0.3 * w - bw / 2, y + h / 2 - blade / 2, bw, blade, 'solid') + rect(cx + 0.3 * w - bw / 2, y + h / 2 - blade / 2, bw, blade, 'solid');
  return { o, bottom: y + h };
}

// Traxxas: a rectangular housing with two flat blades and no key
function traxxas() {
  const w = 120, h = 66, x = cx - w / 2, y = top + 4;
  let o = `<rect class="fill" x="${f(x)}" y="${f(y)}" width="${w}" height="${h}" rx="3"/>`;
  o += rect(cx - 30, y + 16, 9, 34, 'solid') + rect(cx + 21, y + 16, 9, 34, 'solid');
  return { o, bottom: y + h };
}

// JST-RCY: a small two-socket housing with a notch on top for its key
function jstRcy() {
  const w = 70, h = 40, x = cx - w / 2, y = top + 10, cy = y + h / 2 + 3;
  const o = `<path class="fill" d="M${f(x)} ${f(y)}H${f(cx - 8)}V${f(y + 6)}H${f(cx + 8)}V${f(y)}H${f(x + w)}V${f(y + h)}H${f(x)}Z"/>`
    + circ(cx - 14, cy, 5.5, 'ball') + circ(cx + 14, cy, 5.5, 'ball');
  return { o, bottom: y + h };
}

// JST-XH: a row of pins at 2.5 mm pitch (drawn at 16 px); the spec's pin count, else four
function jstXh(n: number) {
  const pitch = 16, w = 26 + n * pitch, h = 34, x = cx - w / 2, y = top + 10;
  let o = housing(x, y, w, h, [0, 0, 0, 0]);
  for (let i = 0; i < n; i++) o += rect(cx - ((n - 1) * pitch) / 2 + i * pitch - 3.5, y + 9, 7, 16, 'solid');
  return { o, bottom: y + h };
}

// JR and Futaba servo plugs side by side, three pins each: JR with the bevel on one side, Futaba with the key notch
function servoPlug(x: number, jr: boolean, name: string, y: number) {
  const w = 60, h = 46;
  let o = jr ? housing(x, y, w, h, [0, 0, 14, 0]) : rect(x, y, w, h);
  if (!jr) o += rect(x + w / 2 - 6, y + h - 6, 12, 6, 'bg');
  for (let i = 0; i < 3; i++) o += rect(x + 12 + i * 12 - 2.5, y + 12, 5, 16, 'solid');
  return o + label(x + w / 2, y + h + 16, name);
}
