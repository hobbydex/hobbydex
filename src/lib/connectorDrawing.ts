// Drawings of connector specs: the mating face (the view you see as you plug in), drawn in currentColor like the
// other spec drawings. Plugs are not to scale (the spec gives no housing sizes); bullets and banana plugs are to
// scale from their contact diameter, which the spec states.
import type { Spec } from './data';
import type { ScrewDrawing } from './screwDrawing';

const f = (v: number) => String(Math.round(v * 100) / 100);
const W = 300, cx = W / 2, top = 26;
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

// EC and IC: a rectangular housing with one corner cut for the polarity, two round bullet sockets (holes)
const EC_SIZE: Record<string, [number, number, number, number]> = { '2': [96, 62, 8, 19], '3': [112, 72, 9.5, 24], '5': [132, 84, 12, 30], '8': [160, 100, 15, 38] };
function ecShell(size: string) {
  const [w, h, r, dx] = EC_SIZE[size] ?? EC_SIZE['5'];
  const x = cx - w / 2, y = top + 4, cy = y + h / 2;
  let o = housing(x, y, w, h, [w * 0.16, 0, 0, 0]);
  o += circ(cx - dx, cy, r, 'ball') + circ(cx + dx, cy, r, 'ball');
  return { o, bottom: y + h };
}

// Deans T-plug: two flat blades at right angles, one horizontal, one vertical, in a rounded housing
function deans() {
  const w = 124, h = 92, x = cx - w / 2, y = top + 4;
  let o = `<rect class="thin" x="${f(x)}" y="${f(y)}" width="${w}" height="${h}" rx="10"/>`;
  o += rect(cx - 36, y + 22, 72, 9, 'solid') + rect(cx - 4.5, y + 31, 9, 48, 'solid');
  return { o, bottom: y + h };
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

// Bullet or banana: the male plug from the side, to scale from its contact diameter (1 mm = 12 px); the diameter
// is dimensioned under the plug. A banana's tip is split.
function bullet(d: number, banana: boolean) {
  const s = 12, r = (d / 2) * s, L = 96, x0 = 84, x1 = x0 + L, cy = top + 40, tip = Math.min(r * 0.9, 12);
  let o = `<path class="fill" d="M${f(x0)} ${f(cy - r)}H${f(x1 - tip)}Q${f(x1)} ${f(cy - r)} ${f(x1)} ${f(cy)}Q${f(x1)} ${f(cy + r)} ${f(x1 - tip)} ${f(cy + r)}H${f(x0)}Z"/>`;
  if (banana) o += `<path class="thin" d="M${f(x1 - 2)} ${f(cy)}H${f(x0 + 26)}"/>`;
  const dx = x0 - 16, top2 = cy - r, bot = cy + r;
  o += `<path class="thin" d="M${f(dx - 4)} ${f(top2)}H${f(x0 - 2)}M${f(dx - 4)} ${f(bot)}H${f(x0 - 2)}M${f(dx)} ${f(top2)}V${f(bot)}"/>`;
  o += `<path class="thin" d="M${f(dx - 3)} ${f(top2 + 5)}L${f(dx)} ${f(top2)}L${f(dx + 3)} ${f(top2 + 5)}M${f(dx - 3)} ${f(bot - 5)}L${f(dx)} ${f(bot)}L${f(dx + 3)} ${f(bot - 5)}"/>`;
  o += `<text x="${f(dx - 6)}" y="${f(cy + 4)}" text-anchor="end">\u2300${f(d)} mm</text>`;
  return { o, bottom: bot + 16 };
}

export function connectorDrawing(spec: Spec): ScrewDrawing | undefined {
  const slug = String(spec.id).split('/').pop() ?? '';
  const spark = !!spec.anti_spark;
  const size = slug.replace(/^(ec|ic)/, '');
  let r: { o: string; bottom: number; extra?: string } | undefined;
  let scaled = false;
  if (slug.startsWith('bullet-') || slug === 'banana-4mm') {
    const d = Number(spec.contact_mm);
    if (!d) return undefined;
    r = bullet(d, slug === 'banana-4mm');
    scaled = true;
  } else if (slug === 'xt30') r = xtShell(110, 70, 9, 22, spark);
  else if (slug === 'xt60' || slug === 'xt60h') r = xtShell(150, 96, 12.5, 32, spark);
  else if (slug === 'xt90' || slug === 'xt90s') r = xtShell(176, 110, 14, 42, spark);
  else if (slug === 'xt150') r = xtPair(34, 11, false);
  else if (slug === 'as150') r = xtPair(34, 11, true);
  else if (slug === 'qs8') r = xtShell(120, 74, 10, 26, true);
  else if (/^(ec|ic)\d+$/.test(slug)) r = ecShell(size);
  else if (slug === 'deans') r = deans();
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
  const sparkNote = spark && !scaled ? label(cx, r.bottom + (r.extra ? 36 : 18), 'anti-spark contact') : '';
  const bottom = r.bottom + (r.extra ? 36 : 18) + (sparkNote ? 18 : 0);
  const h = Math.ceil(Math.max(bottom + 8, 110));
  const svg = `<svg class="screwdrawing" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${h}" width="${W}" height="${h}" role="img" aria-label="${spec.name ?? slug}"><g class="s">${r.o}${r.extra ?? ''}${sparkNote}</g></svg>`;
  return { svg, standard: undefined, approximate: !scaled };
}
