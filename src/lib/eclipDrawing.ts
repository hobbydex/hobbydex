// Drawing of an E-clip (DIN 6799) from its spec's DIN fields: the top view of the clip with its outline to scale (the
// Fasteners add-on's DIN 6799 solid, eclipOutlines.json), the groove, outer diameter, opening a and thickness. Drawn in
// currentColor like the other drawings. A spec without its DIN fields (non-standard thicknesses, bowed rings) has no
// drawing; a DIN size the add-on has no solid for (groove 0.8 and 1.2) keeps the older hand-drawn sketch.
import type { Spec } from './data';
import type { ScrewDrawing } from './screwDrawing';
import outlines from './eclipOutlines.json';

type Size = { groove_mm: number; shaft_min_mm: number; shaft_max_mm: number; outer_mm: number; thickness_mm: number; a_mm: number; loops: number[][][] };
const sizes = Object.values(outlines.sizes) as Size[];

const f = (v: number) => String(Math.round(v * 100) / 100);
const W = 300;

function hdim(x1: number, x2: number, y: number, label: string) {
  return `<path class="thin" d="M${f(x1)} ${f(y)}H${f(x2)}M${f(x1 + 5)} ${f(y - 3)}L${f(x1)} ${f(y)}L${f(x1 + 5)} ${f(y + 3)}M${f(x2 - 5)} ${f(y - 3)}L${f(x2)} ${f(y)}L${f(x2 - 5)} ${f(y + 3)}"/>`
    + `<text x="${f((x1 + x2) / 2)}" y="${f(y - 5)}" text-anchor="middle">${label}</text>`;
}
function vdim(x: number, y1: number, y2: number, label: string) {
  return `<path class="thin" d="M${f(x)} ${f(y1)}V${f(y2)}M${f(x - 3)} ${f(y1 + 5)}L${f(x)} ${f(y1)}L${f(x + 3)} ${f(y1 + 5)}M${f(x - 3)} ${f(y2 - 5)}L${f(x)} ${f(y2)}L${f(x + 3)} ${f(y2 - 5)}"/>`
    + `<text x="${f(x + 6)}" y="${f((y1 + y2) / 2 + 4)}">${label}</text>`;
}

export function eclipDrawing(spec: Spec): ScrewDrawing | undefined {
  const G = Number(spec.groove_mm), D = Number(spec.din_outer_mm), T = Number(spec.din_thickness_mm);
  if (!G || !D || !T || G >= D) return undefined;
  const size = sizes.find((z) => z.groove_mm === G);
  return size ? outlineDrawing(spec, size, G, T) : sketchDrawing(spec, G, D, T);
}

// The clip's top view from the add-on's solid: the outline in mm around the groove centre, drawn y-up as the solid is.
function outlineDrawing(spec: Spec, size: Size, G: number, T: number): ScrewDrawing {
  const D = size.outer_mm, a = size.a_mm;
  const s = Math.min(40, 140 / D);   // px per mm: the outer ring is about 140 px across; a small clip is drawn larger
  const R = (D / 2) * s, r = (G / 2) * s;
  const cx = W / 2, cy = 80 + R;
  const o: string[] = [];
  const pts = size.loops.map((loop) => loop.map(([x, y]) => `${f(cx + x * s)} ${f(cy - y * s)}`).join('L') + 'Z');
  const minY = Math.min(...size.loops.flat().map((p) => p[1]));   // the lowest point: the feet, at the mouth
  const Sh = Number(spec.shaft_mm);
  o.push(`<defs><pattern id="eclip-hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V4" style="stroke:currentColor;stroke-width:0.4px;stroke-opacity:.45"/></pattern></defs>`);
  // the shaft's cross-section, lightly hatched behind the clip; the clip's light fill; the groove circle dashed on top
  if (Sh > G) o.push(`<circle class="thin" cx="${f(cx)}" cy="${f(cy)}" r="${f((Sh / 2) * s)}" fill="url(#eclip-hatch)"/>`, hdim(cx - (Sh / 2) * s, cx + (Sh / 2) * s, cy - R - 30, `shaft ⌀${f(Sh)}`));
  o.push(`<path class="fill" d="${pts.map((d) => `M${d}`).join('')}"/>`);
  o.push(`<circle class="thin dash" cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="none"/>`);
  o.push(`<path class="thin dashdot" d="M${f(cx - R - 8)} ${f(cy)}H${f(cx + R + 8)}M${f(cx)} ${f(cy - R - 8)}V${f(cy + R + 8)}"/>`);
  o.push(hdim(cx - R, cx + R, cy - R - 12, `⌀${f(D)}`));
  o.push(hdim(cx - (a / 2) * s, cx + (a / 2) * s, cy - minY * s + 8, `a ${f(a)}`));   // the opening, just below the feet
  o.push(hdim(cx - r, cx + r, cy + R + 40, `groove ⌀${f(G)}`));
  o.push(`<text x="${f(cx)}" y="${f(cy + R + 66)}" text-anchor="middle" class="std">thickness ${f(T)}</text>`);
  const H = Math.ceil(cy + R + 76);
  return {
    svg: `<svg class="screwdrawing" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${f(G)} / ${f(D)} x ${f(T)} E-clip"><g class="s">${o.join('')}<text x="${W - 4}" y="12" text-anchor="end" class="std">dimensions in mm</text></g></svg>`,
    standard: 'DIN 6799', approximate: false,
    note: 'The outline is the DIN 6799 solid of the Fasteners add-on, to scale; the groove, outer diameter, opening a and thickness are to scale',
  };
}

// A DIN size with no solid in the add-on (groove 0.8 and 1.2 mm): the older hand-drawn sketch, not to scale in its outline.
function sketchDrawing(spec: Spec, G: number, D: number, T: number): ScrewDrawing {
  const s = Math.min(40, 140 / D);   // px per mm: the outer ring is about 140 px across; a small clip is drawn larger
  const R = (D / 2) * s, r = (G / 2) * s;
  const cx = W / 2, cy = 60 + R;
  // the DIN 6799 outline, mouth at the bottom: the outer ring; two feet whose inner edges bear on the groove, with the
  // mouth a (about 0.84 x the groove, as in the DIN table) between them; two kidney-shaped cut-outs; the lip at the
  // top that bears on the groove. Key points in units of the outer radius, smoothed with a Catmull-Rom spline.
  const k = r / R, h = 0.84 * k;   // h: half the mouth a, which DIN gives as about 0.84 x the groove
  const pol = (deg: number, rad: number): [number, number] => [rad * Math.cos((deg * Math.PI) / 180), rad * Math.sin((deg * Math.PI) / 180)];
  const band = () => 0.74;   // the ring keeps one width all round
  const key: [number, number][] = [];
  for (let a = 48; a >= -228; a -= 12) key.push(pol(a, 1));
  key.push([-0.56, 0.84], [-0.47, 0.89], [-h - 0.07, 0.82], [-h - 0.03, 0.64], [-h - 0.01, 0.45], pol(147, k), [-0.46, 0.18], pol(170, 0.74));
  for (let a = 186; a < 238; a += 10) key.push(pol(a, band()));
  key.push([-0.28, -0.67], [-0.19, -0.58], [-0.13, -0.47], [-0.06, -k - 0.01], [0.06, -k - 0.01], [0.13, -0.47], [0.19, -0.58], [0.28, -0.67]);   // the lip: a smooth inverted bell down to the groove
  for (let a = -58; a < -5; a += 10) key.push(pol(a, band()));
  key.push(pol(10, 0.74), [0.46, 0.18], pol(33, k), [h + 0.01, 0.45], [h + 0.03, 0.64], [h + 0.07, 0.82], [0.47, 0.89], [0.56, 0.84]);
  const pts: string[] = [];
  for (let i = 0; i < key.length; i++) {
    const p0 = key[(i - 1 + key.length) % key.length], p1 = key[i], p2 = key[(i + 1) % key.length], p3 = key[(i + 2) % key.length];
    for (let n = 0; n < 8; n++) {
      const t = n / 8, t2 = t * t, t3 = t2 * t;
      const c = (j: 0 | 1) => 0.5 * (2 * p1[j] + (p2[j] - p0[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (3 * p1[j] - p0[j] - 3 * p2[j] + p3[j]) * t3);
      pts.push(`${f(cx + c(0) * R)} ${f(cy + c(1) * R)}`);
    }
  }
  const d = `M${pts.join('L')}Z`;
  const o: string[] = [];
  // the shaft the clip sits on, cut at the groove: the groove section hatched, the shaft's own diameter dashed
  const Sh = Number(spec.shaft_mm);
  o.push(`<defs><pattern id="eclip-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path class="thin" d="M0 0V5"/></pattern></defs>`);
  o.push(`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="url(#eclip-hatch)" class="thin"/>`);
  o.push(`<path class="fill" d="${d}"/>`);
  if (Sh > G) o.push(`<circle class="thin dash" cx="${f(cx)}" cy="${f(cy)}" r="${f((Sh / 2) * s)}"/>`, hdim(cx - (Sh / 2) * s, cx + (Sh / 2) * s, cy - R - 14, `shaft ⌀${f(Sh)}`));
  o.push(`<path class="thin dashdot" d="M${f(cx - R - 8)} ${f(cy)}H${f(cx + R + 8)}M${f(cx)} ${f(cy - R - 8)}V${f(cy + R + 8)}"/>`);
  o.push(vdim(cx + R + 14, cy - R, cy + R, `⌀${f(D)}`));
  o.push(hdim(cx - r, cx + r, cy + R + 18, `groove ⌀${f(G)}`), hdim(cx - h * R, cx + h * R, cy + 0.98 * R, `a ${f(0.84 * G)}`));
  o.push(`<text x="${f(cx)}" y="${f(cy + R + 48)}" text-anchor="middle" class="std">thickness ${f(T)}</text>`);
  const H = Math.ceil(cy + R + 58);
  return {
    svg: `<svg class="screwdrawing" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${f(G)} / ${f(D)} x ${f(T)} E-clip"><g class="s">${o.join('')}<text x="${W - 4}" y="12" text-anchor="end" class="std">dimensions in mm</text></g></svg>`,
    standard: 'DIN 6799', approximate: false,
    note: 'No DIN 6799 solid for this size in the Fasteners add-on: the outline is a sketch, not to scale; the groove, outer diameter and thickness are to scale',
  };
}
