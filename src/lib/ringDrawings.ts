// Dimensioned drawings of O-rings (the ring seen from above and its round cross-section) and circlips (DIN 471 external
// retaining rings: top view with the lug holes, the groove and the table dimensions). Drawn in currentColor like the other
// spec drawings. The circlip outline is built from the DIN 471 table values the same way as the bag drawing
// (tools/hardware/make_more_drawings.py, circlip_profile).
import type { Spec } from './data';
import type { ScrewDrawing } from './screwDrawing';

const f = (v: number) => String(Math.round(v * 100) / 100);
const W = 300;
const wrap = (h: number, label: string, body: string) =>
  `<svg class="screwdrawing" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${h}" width="${W}" height="${h}" role="img" aria-label="${label}"><g class="s">${body}<text x="${W - 4}" y="12" text-anchor="end" class="std">dimensions in mm</text></g></svg>`;
function hdim(x1: number, x2: number, y: number, label: string, under = false) {
  return `<path class="thin" d="M${f(x1)} ${f(y)}H${f(x2)}M${f(x1 + 5)} ${f(y - 3)}L${f(x1)} ${f(y)}L${f(x1 + 5)} ${f(y + 3)}M${f(x2 - 5)} ${f(y - 3)}L${f(x2)} ${f(y)}L${f(x2 - 5)} ${f(y + 3)}"/>`
    + `<text x="${f((x1 + x2) / 2)}" y="${f(under ? y + 14 : y - 5)}" text-anchor="middle">${label}</text>`;
}

/** An O-ring: the ring from above (inner and outer diameter) and its cross-section (a circle of the cross-section diameter). */
export function oringDrawing(spec: Spec): ScrewDrawing | undefined {
  const d1 = Number(spec.inner_mm), d2 = Number(spec.cross_mm);
  if (!(d1 > 0 && d2 > 0)) return undefined;
  const D = d1 + 2 * d2;
  const s = Math.min(40, 150 / D);   // px per mm
  const R = (D / 2) * s, r = (d1 / 2) * s, c = (d2 / 2) * s;
  const cx = W / 2, cy = 40 + R;
  const o: string[] = [];
  o.push(`<path class="fill" fill-rule="evenodd" d="M${f(cx - R)} ${f(cy)}a${f(R)} ${f(R)} 0 1 0 ${f(2 * R)} 0a${f(R)} ${f(R)} 0 1 0 ${f(-2 * R)} 0ZM${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 1 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 1 ${f(-2 * r)} 0Z"/>`);
  o.push(`<path class="thin dashdot" d="M${f(cx - R - 8)} ${f(cy)}H${f(cx + R + 8)}M${f(cx)} ${f(cy - R - 8)}V${f(cy + R + 8)}"/>`);
  o.push(hdim(cx - R, cx + R, cy - R - 12, `outer ⌀${f(D)}`));
  o.push(hdim(cx - r, cx + r, cy + 4, `inner ⌀${f(d1)}`, true));
  // the cross-section at the right of the ring: a circle of the cross-section diameter, drawn larger when it is small
  const ys = Math.min(30, 36 / d2), sy = cy + R + 50, cr = (d2 / 2) * ys;
  o.push(`<circle class="fill" cx="${f(cx)}" cy="${f(sy)}" r="${f(cr)}"/>`);
  o.push(hdim(cx - cr, cx + cr, sy + cr + 14, `cross-section ⌀${f(d2)}`));
  const H = Math.ceil(sy + cr + 30);
  return {
    svg: wrap(H, `${f(d1)} x ${f(d2)} O-ring`, o.join('')),
    standard: 'ISO 3601', approximate: false,
    note: 'Inner diameter and cross-section as the spec states them; the cross-section is drawn at a larger scale than the ring',
  };
}

// DIN 471 by shaft: thickness s, free inner diameter d3, lug reach a, width at the back b, lug hole d5, groove diameter
// (the table of the Fasteners add-on, FsData/din471def.csv)
const DIN471: Record<number, [number, number, number, number, number, number]> = {
  3: [0.4, 2.7, 2, 0.8, 1, 2.8], 4: [0.4, 3.7, 2.2, 0.9, 1, 3.8], 5: [0.6, 4.7, 2.5, 1.1, 1, 4.8], 6: [0.7, 5.6, 2.7, 1.3, 1.2, 5.7],
  7: [0.8, 6.5, 3.1, 1.4, 1.2, 6.7], 8: [0.8, 7.4, 3.2, 1.5, 1.2, 7.6], 9: [1, 8.4, 3.3, 1.7, 1.2, 8.6], 10: [1, 9.3, 3.3, 1.8, 1.5, 9.6],
  11: [1, 10.2, 3.3, 1.8, 1.5, 10.5], 12: [1, 11, 3.3, 1.8, 1.7, 11.5], 13: [1, 11.9, 3.4, 2, 1.7, 12.4], 14: [1, 12.9, 3.5, 2.1, 1.7, 13.4],
  15: [1, 13.8, 3.6, 2.2, 1.7, 14.3], 16: [1, 14.7, 3.7, 2.2, 1.7, 15.2],
};

/** A circlip (DIN 471 external retaining ring) by its shaft: top view with lug holes, the groove it sits in, d3, b, a, d5 and
 * thickness. A shaft below the DIN range (3 mm) is the 3 mm ring scaled down and marked approximate. */
export function circlipDrawing(spec: Spec): ScrewDrawing | undefined {
  const shaft = Number(spec.shaft_mm);
  if (!(shaft > 0)) return undefined;
  const row = DIN471[shaft];
  const k0 = row ? 1 : shaft < 3 ? shaft / 3 : 0;
  if (!k0) return undefined;
  const [t, d3, a, b, d5, groove] = (row ?? DIN471[3]).map((v) => v * k0) as [number, number, number, number, number, number];
  // the outline, gap towards -y (math y up): the outer circle sits s above the centre, the lugs end a below the inner circle
  const ri = d3 / 2, so = 0.3 * b, Ro = ri + b - so, hg = 0.75 * d5, rt = 0.85 * d5;
  const y0 = -Math.sqrt(ri * ri - hg * hg);
  const c2 = [hg + rt, y0 - a + rt];
  const dx = c2[0], dy = c2[1] - so, L = Math.hypot(dx, dy);
  const ang = Math.atan2(dy, dx) + Math.acos((Ro - rt) / L);
  const n = [Math.cos(ang), Math.sin(ang)];
  const P1 = [Ro * n[0], so + Ro * n[1]], P2 = [c2[0] + rt * n[0], c2[1] + rt * n[1]];
  const top = ri + b, bottom = c2[1] - rt, xmax = Math.max(P1[0], c2[0] + rt);
  const s = Math.min(40, 150 / Math.max(2 * xmax, top - bottom));   // px per mm
  const cx = W / 2, cy = 56 + top * s;
  const X = (x: number) => f(cx + x * s), Y = (y: number) => f(cy - y * s);
  const p = (x: number, y: number) => `${X(x)} ${Y(y)}`;
  const big = ang > 0 ? 1 : 0;
  const o: string[] = [];
  o.push(`<path class="fill" fill-rule="evenodd" d="M${p(-P1[0], P1[1])}A${f(Ro * s)} ${f(Ro * s)} 0 1 1 ${p(P1[0], P1[1])}L${p(P2[0], P2[1])}A${f(rt * s)} ${f(rt * s)} 0 ${big} 1 ${p(hg, c2[1])}L${p(hg, y0)}`
    + `A${f(ri * s)} ${f(ri * s)} 0 1 0 ${p(-hg, y0)}L${p(-hg, c2[1])}A${f(rt * s)} ${f(rt * s)} 0 ${big} 1 ${p(-P2[0], P2[1])}Z`
    + [1, -1].map((sx) => `M${f(cx + sx * c2[0] * s - (d5 / 2) * s)} ${Y(c2[1])}a${f((d5 / 2) * s)} ${f((d5 / 2) * s)} 0 1 0 ${f(d5 * s)} 0a${f((d5 / 2) * s)} ${f((d5 / 2) * s)} 0 1 0 ${f(-d5 * s)} 0Z`).join('') + '"/>');
  o.push(`<circle class="thin dash" cx="${f(cx)}" cy="${f(cy)}" r="${f((groove / 2) * s)}" fill="none"/>`);
  o.push(`<path class="thin dashdot" d="M${f(cx - xmax * s - 8)} ${f(cy)}H${f(cx + xmax * s + 8)}M${f(cx)} ${f(cy - top * s - 8)}V${f(cy - bottom * s + 8)}"/>`);
  o.push(hdim(cx - ri * s, cx + ri * s, cy - top * s - 14, `d3 ⌀${f(d3)}`));
  o.push(hdim(cx - (groove / 2) * s, cx + (groove / 2) * s, cy - bottom * s + 24, `groove ⌀${f(groove)}`));
  o.push(`<text x="${f(cx)}" y="${f(cy - bottom * s + 52)}" text-anchor="middle" class="std">b ${f(b)}, a ${f(a)}, lug hole ⌀${f(d5)}, thickness ${f(t)}</text>`);
  const H = Math.ceil(cy - bottom * s + 62);
  return {
    svg: wrap(H, `${f(shaft)} mm circlip`, o.join('')),
    standard: 'DIN 471', approximate: shaft < 3,
    note: shaft < 3
      ? 'Below the DIN 471 range (3 mm and up): the 3 mm ring scaled to the shaft'
      : 'The outline is built from the DIN 471 table values (d3, b, a, lug hole, groove) and is to scale; the lug and back shape are drawn as the standard shows them',
  };
}
