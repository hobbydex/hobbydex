// Drawings of connector specs, drawn in currentColor like the other spec drawings. Amass's dimensioned drawings give
// the EC plugs (EC2, EC3, EC5), the XT plugs (XT30, XT60, XT60H, XT90, XT90S, XT150), the AS150, the AM-1015 T-plug
// (Deans) and the bullet contacts, JST's XH catalogue the JST-XH balance plugs: these are to scale, each view in its
// own mm coordinates. Other plugs have no dimensioned drawing in our sources: they are drawn at their usual shape and
// marked not to scale.
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

// a dimension line with its value above it (horizontal) or beside it (vertical)
const hdim = (x1: number, x2: number, y: number, t: string) => `<path class="thin" d="M${f(x1)} ${f(y)}H${f(x2)}M${f(x1)} ${f(y - 3)}V${f(y + 3)}M${f(x2)} ${f(y - 3)}V${f(y + 3)}"/>${label((x1 + x2) / 2, y - 4, t)}`;
const vdim = (x: number, y1: number, y2: number, t: string) => `<path class="thin" d="M${f(x)} ${f(y1)}V${f(y2)}M${f(x - 3)} ${f(y1)}H${f(x + 3)}M${f(x - 3)} ${f(y2)}H${f(x + 3)}"/><text x="${f(x - 4)}" y="${f((y1 + y2) / 2 + 4)}" text-anchor="end" class="std">${t}</text>`;

// a drawn view with room for its dimensions (left and above) and its caption (below); the content is in its own
// coordinates, origin at its top left
const ML = 40, MR = 10, MT = 24, MB = 22;
type Part = { o: string; w: number; h: number; cap: string; ml: number };
function part(content: string, w: number, h: number, cap: string, ml = ML): Part {
  return { o: `<g transform="translate(${ml} ${MT})">${content}</g>`, w: w + ml + MR, h: h + MT + MB, cap, ml };
}
// parts side by side, centred on a common baseline (in a drawing `within` px wide), each with its caption
const rowWidth = (parts: Part[], gap = 18) => parts.reduce((a, p) => a + p.w, 0) + gap * (parts.length - 1);
function row(parts: Part[], gap = 18, within = W): { o: string; w: number; h: number } {
  const total = rowWidth(parts, gap);
  const H = Math.max(...parts.map((p) => p.h));
  let x = Math.max(0, (within - total) / 2), o = '';
  for (const p of parts) {
    o += `<g transform="translate(${f(x)} 0)">${p.o}${label((p.w + p.ml - MR) / 2, H - 6, p.cap)}</g>`;
    x += p.w + gap;
  }
  return { o, w: Math.max(W, total + 12), h: H };
}
function svgOf(name: string, r: { o: string; w: number; h: number }) {
  const h = Math.ceil(r.h + 2);
  return `<svg class="screwdrawing" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(r.w)} ${h}" width="${f(r.w)}" height="${h}" role="img" aria-label="${name}"><g class="s">${r.o}</g></svg>`;
}

// A pen that draws in mm at s px per mm. A corner is a radius (number) or a chamfer [along x, along y].
type Pt = [number, number];
type Corner = number | Pt;
type Pen = ReturnType<typeof pen>;
function pen(s: number) {
  const n = (v: number) => f(v * s);
  const pt = ([x, y]: Pt) => `${n(x)} ${n(y)}`;
  return {
    n,
    rect: (x: number, y: number, w: number, h: number, cls = 'fill') => rect(x * s, y * s, w * s, h * s, cls),
    circ: (x: number, y: number, d: number, cls = 'fill') => circ(x * s, y * s, (d / 2) * s, cls),
    poly: (pts: Pt[], cls = 'fill', close = true) => `<path class="${cls}" d="M${pts.map(pt).join('L')}${close ? 'Z' : ''}"/>`,
    // a quadratic curve from a through the control point c to b
    curve: (a: Pt, c: Pt, b: Pt, cls = 'thin') => `<path class="${cls}" d="M${pt(a)}Q${pt(c)} ${pt(b)}"/>`,
    shape(x: number, y: number, w: number, h: number, c: [Corner, Corner, Corner, Corner], cls = 'fill') {
      const k = (v: Corner): [number, number, boolean] => (typeof v === 'number' ? [v, v, true] : [v[0], v[1], false]);
      const [tl, tr, br, bl] = c.map(k);
      const turn = (round: boolean, cx: number, cy: number, ex: number, ey: number) => (round ? `Q${n(cx)} ${n(cy)} ${n(ex)} ${n(ey)}` : `L${n(ex)} ${n(ey)}`);
      let d = `M${n(x + tl[0])} ${n(y)}H${n(x + w - tr[0])}` + turn(tr[2], x + w, y, x + w, y + tr[1]);
      d += `V${n(y + h - br[1])}` + turn(br[2], x + w, y + h, x + w - br[0], y + h);
      d += `H${n(x + bl[0])}` + turn(bl[2], x, y + h, x, y + h - bl[1]);
      d += `V${n(y + tl[1])}` + turn(tl[2], x, y, x + tl[0], y);
      return `<path class="${cls}" d="${d}Z"/>`;
    },
  };
}

// A drawing of views side by side (or rows of them, one under the other), all at one scale (px per mm) that keeps a
// row about 220 px wide and the views at most 150 px high. Each view is drawn in mm from its top left; dw and dh are
// the dimensions printed along its top and left edges.
type View = { w: number; h: number; cap: string; draw: (p: Pen) => string; dw?: string; dh?: string };
function views(name: string, vs: View[] | View[][], budget = 220) {
  const rows = (Array.isArray(vs[0]) ? vs : [vs]) as View[][];
  const s = Math.min(16, budget / Math.max(...rows.map((r) => r.reduce((a, v) => a + v.w, 0))), 150 / Math.max(...rows.flat().map((v) => v.h)));
  const p = pen(s);
  const parts = rows.map((r) => r.map((v) => part(v.draw(p) + (v.dw ? hdim(0, v.w * s, -8, v.dw) : '') + (v.dh ? vdim(-8, 0, v.h * s, v.dh) : ''), v.w * s, v.h * s, v.cap, v.dh ? ML : 12)));
  const within = Math.max(W, ...parts.map((r) => rowWidth(r) + 12));
  let o = '', y = 0;
  for (const r of parts.map((r) => row(r, 18, within))) { o += `<g transform="translate(0 ${f(y)})">${r.o}</g>`; y += r.h; }
  return svgOf(name, { o, w: within, h: y });
}
// a male contact seen end on: the cavity around it, the pin with its cross slot
function pin(p: Pen, x: number, y: number, cavity: number, d: number) {
  const sw = d * 0.14;
  return p.circ(x, y, cavity, 'ball') + p.circ(x, y, d, 'solid') + p.rect(x - d / 2, y - sw / 2, d, sw, 'bg') + p.rect(x - sw / 2, y - d / 2, sw, d, 'bg');
}
const line = (p: Pen, x1: number, y1: number, x2: number, y2: number) => p.poly([[x1, y1], [x2, y2]], 'thin', false);

// The XT, XT150 and AS150 plugs from the drawings on Amass's product pages: mating face (male) and side, in mm. The
// outline sizes are dimensioned there; contact positions and the other details are read off the drawing.
const READ_OFF = 'the contact positions and other details are read off the drawing';
const XT: Record<string, { note: string; views: View[] }> = {
  xt30: {
    note: `the XT30U drawing on Amass's XT30U page: the 5.60 x 10.20 face and 13.70 length are dimensioned, in mm; ${READ_OFF} (contacts 5.0 apart)`,
    views: [
      { w: 5.6, h: 10.2, cap: 'Mating face', dw: '5.60', dh: '10.20', draw: (p) =>
        p.shape(0, 0, 5.6, 10.2, [0.6, 0.6, [1.9, 1.55], [1.9, 1.55]]) + p.shape(0.45, 0.45, 4.7, 9.3, [0.3, 0.3, [1.6, 1.3], [1.6, 1.3]], 'thin')
        + p.curve([0.45, 3.9], [1.5, 5.1], [0.45, 6.3]) + p.curve([5.15, 3.9], [4.1, 5.1], [5.15, 6.3])
        + pin(p, 2.8, 2.6, 3.1, 2) + pin(p, 2.8, 7.6, 3.1, 2) },
      { w: 13.7, h: 10.2, cap: 'Side', dw: '13.70 mm', draw: (p) =>
        p.rect(0, 0, 7.74, 10.2) + p.rect(7.74, 0, 2.46, 10.2) + p.rect(10.2, 1.38, 0.97, 7.56)
        + p.rect(11.17, 2.52, 2.53, 1.29) + p.rect(11.17, 6.39, 2.53, 1.29) },
    ],
  },
  xt60: {
    note: `Amass's XT60 drawing: the 8.10 x 16.00 face and 20.50 length are dimensioned, in mm; ${READ_OFF} (contacts 7.2 apart)`,
    views: [
      { w: 8.1, h: 16, cap: 'Mating face', dw: '8.10', dh: '16.00', draw: (p) =>
        p.shape(0, 0, 8.1, 16, [[0.6, 0.6], [0.6, 0.6], [2.85, 3.24], [2.85, 3.24]]) + p.shape(0.68, 0.68, 6.74, 14.64, [[0.3, 0.3], [0.3, 0.3], [2.5, 2.85], [2.5, 2.85]], 'thin')
        + pin(p, 4.05, 4.3, 4.45, 3.5) + pin(p, 4.05, 11.5, 4.45, 3.5) + p.rect(0.92, 6.98, 5.31, 1.84) },
      { w: 20.5, h: 16, cap: 'Side', dw: '20.50 mm', draw: (p) =>
        p.rect(0, 0, 15.93, 16) + line(p, 0, 0.5, 15.93, 0.5) + line(p, 0, 12.83, 15.93, 12.83) + p.rect(9.39, 1.52, 5.55, 10.37, 'thin') + p.rect(11.6, -0.3, 2.2, 0.3)
        + p.poly([[15.93, 2.08], [17.53, 2.08], [17.53, 4.24], [20.5, 4.24], [20.5, 6.53], [15.93, 6.53]])
        + p.poly([[15.93, 9.4], [20.5, 9.4], [20.5, 11.76], [17.53, 11.76], [17.53, 14.02], [15.93, 14.02]]) },
    ],
  },
  xt60h: {
    note: `Amass's XT60H drawing: the 9.20 x 16.40 face and 23.90 length are dimensioned, in mm; ${READ_OFF} (contacts 7.2 apart)`,
    views: [
      { w: 9.2, h: 16.4, cap: 'Mating face', dw: '9.20', dh: '16.40', draw: (p) =>
        p.shape(0, 0, 9.2, 16.4, [1.75, 1.75, 1.75, 1.75]) + p.shape(0.56, 0.56, 8.08, 15.28, [1.3, 1.3, 1.3, 1.3], 'thin')
        + p.shape(1.08, 1.21, 7.07, 14.15, [[2.27, 2.43], [2.27, 2.43], 0.3, 0.3], 'ball')
        + pin(p, 4.57, 4.69, 4.54, 3.5) + pin(p, 4.57, 11.89, 4.54, 3.5) + p.rect(2.04, 7.38, 4.89, 1.73) + p.rect(6.93, 7.55, 0.93, 1.04, 'thin') },
      { w: 23.9, h: 16.4, cap: 'Side', dw: '23.90 mm', draw: (p) =>
        p.rect(0, 0.45, 12.21, 15.53) + line(p, 0, 1.04, 8.55, 1.04) + line(p, 0, 13.55, 8.55, 13.55) + p.rect(8.55, 1.74, 3.49, 11.29, 'thin')
        + p.rect(12.21, 0, 1.22, 16.4) + p.poly([[13.43, 0], [16.57, 0], [23.9, 0.69], [23.9, 15.71], [16.57, 16.4], [13.43, 16.4]])
        + line(p, 13.43, 4.5, 16.57, 4.5) + line(p, 13.43, 12, 16.57, 12)
        + p.shape(16.75, 3.47, 2.25, 9.39, [0.9, 0.9, 0.9, 0.9], 'thin') + p.shape(19, 3.47, 1.9, 9.39, [0.9, 0.9, 0.9, 0.9], 'thin') + p.shape(20.9, 3.47, 2.8, 9.39, [0.9, 0.9, 0.9, 0.9], 'thin') },
    ],
  },
  xt90: {
    note: `the XT90 drawing on Amass's XT90H page (the plug without its rear cover): the 10.90 x 20.80 face and 25.20 length are dimensioned, in mm; ${READ_OFF} (contacts 10.8 apart)`,
    views: [
      { w: 10.9, h: 20.8, cap: 'Mating face', dw: '10.90', dh: '20.80', draw: (p) =>
        p.shape(0, 0, 10.9, 20.8, [[0.7, 0.7], [0.7, 0.7], [3.6, 3.9], [3.6, 3.9]]) + p.shape(0.6, 0.6, 9.7, 19.6, [[0.4, 0.4], [0.4, 0.4], [3.3, 3.55], [3.3, 3.55]], 'thin')
        + [4.89, 15.69].map((y) => p.circ(5.45, y, 7.1, 'thin') + p.circ(5.45, y, 5.5, 'ball') + p.circ(5.45, y, 3.5, 'thin')).join('')
        + p.curve([1.92, 8.32], [5.45, 10.4], [8.98, 8.32]) + p.curve([1.92, 12.33], [5.45, 10.25], [8.98, 12.33]) + line(p, 1.92, 8.32, 1.92, 12.33) + line(p, 8.98, 8.32, 8.98, 12.33) },
      { w: 25.2, h: 20.8, cap: 'Side', dw: '25.20 mm', draw: (p) =>
        p.rect(0, 0.61, 11.73, 19.39) + line(p, 0, 1.83, 11.73, 1.83) + line(p, 0, 17.1, 11.73, 17.1)
        + p.rect(11.73, 0, 7.97, 20.8) + line(p, 11.73, 1.15, 19.7, 1.15) + line(p, 11.73, 17.4, 19.7, 17.4) + p.rect(15.2, -0.35, 2.5, 0.35) + p.rect(12.1, 2.48, 0.98, 12.9, 'thin')
        + p.rect(19.7, 2.1, 0.96, 5.65) + p.rect(19.7, 12.9, 0.96, 5.7) + p.rect(20.66, 4.1, 4.54, 3.65) + p.rect(20.66, 12.9, 4.54, 3.6)
        + [21.6, 22.6, 23.6, 24.6].map((x) => line(p, x, 4.1, x, 7.75) + line(p, x, 12.9, x, 16.5)).join('') },
    ],
  },
  xt90s: {
    note: `Amass's XT90S drawing: the 21.50 x 31.20 front and 9.90 side are dimensioned, in mm, and the other details are read off it; Amass does not draw the XT90S mating face, so it is not shown`,
    views: [
      { w: 21.5, h: 31.2, cap: 'Front', dw: '21.50', dh: '31.20', draw: (p) =>
        p.rect(1.07, 0, 19.43, 13.07) + line(p, 2.17, 0, 2.17, 13.07) + line(p, 17.67, 0, 17.67, 13.07)
        + p.rect(0.28, 13.07, 20.92, 8.13) + p.rect(0.47, 21.2, 20.56, 2.6) + p.poly([[0.67, 23.8], [20.83, 23.8], [19.84, 31.2], [1.66, 31.2]])
        + line(p, 4.7, 21.2, 4.7, 31.2) + line(p, 15.4, 21.2, 15.4, 31.2)
        // the green inlays on this face, as in Amass's photo and drawing: the round badge by the mating end and the
        // L of the 5.6 tab and the Amass band across the collar
        + p.circ(5.24, 3.17, 4.9, 'inlay') + p.poly([[3.2, 5.15], [7.3, 5.15], [8.0, 5.95], [2.5, 5.95]], 'inlay')
        + p.poly([[3.5, 7.94], [6.83, 7.94], [6.83, 13.5], [16.15, 13.5], [16.15, 17.26], [3.5, 17.26]], 'inlay') },
      { w: 9.9, h: 31.2, cap: 'Side', dw: '9.90', draw: (p) =>
        p.rect(0.71, 0, 8.39, 13.07) + line(p, 1.78, 0, 1.78, 13.07) + line(p, 8.12, 0, 8.12, 13.07)
        + p.rect(0, 13.07, 9.9, 8.13) + p.rect(0.12, 21.2, 9.66, 2.6) + p.poly([[0.2, 23.8], [9.7, 23.8], [8.6, 31.2], [1.3, 31.2]]) + line(p, 4.95, 23.8, 4.95, 31.2) },
    ],
  },
  xt150: {
    note: `Amass's XT150 drawing (male): the 10.00 x 11.00 face and 30.20 length are dimensioned, in mm; ${READ_OFF}; one housing holds one pole, two make the pair, and Amass makes the housing in red, black and blue, so it is drawn without a colour`,
    views: [
      { w: 10, h: 11, cap: 'Mating face', dw: '10.00', dh: '11.00', draw: (p) =>
        p.shape(0, 0, 10, 10.13, [2, 2, 2, 2]) + p.poly([[4.06, 10.13], [5.8, 10.13], [6.34, 11], [3.55, 11]]) + p.shape(0.45, 0.45, 9.1, 9.23, [1.6, 1.6, 1.6, 1.6], 'thin')
        + p.circ(5, 5, 8.2, 'thin') + p.circ(5, 5, 7, 'ball') },
      { w: 30.2, h: 11, cap: 'Side', dw: '30.20 mm', draw: (p) =>
        p.rect(0, 0, 19.44, 10.07) + p.rect(19.44, 0, 10.76, 10.07) + p.rect(22.1, 10.07, 8.1, 0.93)
        + line(p, 19.44, 2.95, 21.94, 2.95) + line(p, 28, 2.95, 30.2, 2.95) + line(p, 19.44, 7.12, 21.94, 7.12) + line(p, 28, 7.12, 30.2, 7.12) + p.rect(21.94, 1.98, 6.06, 6.08, 'thin') },
    ],
  },
  as150: {
    note: `Amass's AS150 drawing: the 13.50 diameter and 35.10 length are dimensioned, in mm, and the other details are read off it; one pole of the pair. Amass does not draw the AS150 mating face, so it is not shown`,
    views: [
      { w: 35.1, h: 13.5, cap: 'Side', dw: '35.10 mm', dh: '⌀13.50', draw: (p) =>
        p.shape(0, 0.81, 16.57, 11.97, [0.3, 0, 0, 0.3]) + p.rect(16.57, 0, 3.01, 13.5) + p.rect(19.58, 0, 8.22, 13.5)
        + [19.7, 21, 22.8, 24.4, 25.9].map((x) => line(p, x, 0, x, 13.5)).join('')
        + p.poly([[27.8, 0.42], [30.06, 0.81], [34.2, 1.8], [35.1, 2.74], [35.1, 10.93], [34.2, 11.9], [30.06, 12.78], [27.8, 13.08]]) + line(p, 30.06, 0.81, 30.06, 12.78) },
    ],
  },
};

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
// the EC mating face at s px per mm; dims prints the sizes
function ecFace(e: Ec, s: number, dims = true) {
  const fw = e.w * s, fh = e.h * s, r = 0.8 * s, mid = fh / 2, wr = fh * 0.12, wd = fw * 0.12, dy = (e.pitch * s) / 2, hx = fw / 2;
  const outline = `M${f(r)} 0H${f(fw - r)}Q${f(fw)} 0 ${f(fw)} ${f(r)}V${f(mid - wr)}Q${f(fw - 2 * wd)} ${f(mid)} ${f(fw)} ${f(mid + wr)}V${f(fh - r)}Q${f(fw)} ${f(fh)} ${f(fw - r)} ${f(fh)}H${f(r)}Q0 ${f(fh)} 0 ${f(fh - r)}V${f(r)}Q0 0 ${f(r)} 0Z`;
  return part(`<path class="fill" d="${outline}"/>` + circ(hx, mid - dy, (e.hole / 2) * s, 'ball') + circ(hx, mid + dy, (e.hole / 2) * s, 'ball')
    + (dims ? hdim(0, fw, -8, `${e.w.toFixed(2)}`) + vdim(-8, 0, fh, `${e.h.toFixed(2)}`) : ''), fw, fh, 'Mating face');
}
function ecDrawing(slug: string, e: Ec) {
  const s = Math.min(16, 180 / (e.w + e.L));
  const fh = e.h * s;
  const L = e.L * s, ribW = e.ribL * s, shellW = L - ribW;
  const ribX = e.blueLeft ? shellW : 0, shellX = e.blueLeft ? 0 : ribW;
  let side = rect(ribX, 0, ribW, fh);
  for (let i = 1; i * 1.3 < e.ribL; i++) side += `<path class="thin" d="M${f(ribX + i * 1.3 * s)} 0V${f(fh)}"/>`;
  for (const [a, b] of e.shells) side += rect(shellX, a * s, shellW, (b - a) * s);
  side += hdim(0, L, -8, `${e.L.toFixed(2)} mm`) + vdim(-8, 0, fh, `${e.h.toFixed(2)}`);
  const name = slug.toUpperCase();
  return { face: ecFace(e, s), side: part(side, L, fh, 'Side'), note: EC_NOTE(name) };
}

// Amass contacts (bullets): the length of the contact in Amass's EC plugs, mm, keyed by diameter. Loose bullets differ
// by maker and no standard exists, so every bullet drawing is approximate; other sizes are 4.2 times the diameter
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
  o += hdim(0, Lp, -8, `${L.toFixed(1)} mm`) + vdim(-8, 0, D, `⌀${d}`);
  return { w: Lp, h: D, o };
}

// The AM-1015-M (male T-plug) on Amass's spec sheet: the housing is dimensioned (6.30 lip, 7.60 x 13.30, 19.10 long
// with the 5.00 solder tabs); the blades are not, and are read off the drawing: both 4.2 x 1.4 mm, the one across the
// lip standing upright, the one in the wide part lying flat, each with its spring bow.
const DEANS: View[] = [
  { w: 7.6, h: 13.3, cap: 'Mating face', dw: '7.60', dh: '13.30', draw: (p) =>
    `<path class="fill" d="${deansFace(p)}"/>`
    + p.rect(2.65, 1.7, 1.4, 4.2, 'metal') + p.curve([2.65, 2.26], [0.87, 3.81], [2.65, 5.36]) + p.rect(4.05, 2.94, 0.3, 1.72, 'thin')
    + p.rect(1.7, 9.1, 4.2, 1.41, 'metal') + p.curve([2.24, 9.1], [3.81, 7.28], [5.38, 9.1]) + p.rect(2.94, 10.51, 1.7, 0.29, 'thin') },
  { w: 19.1, h: 13.3, cap: 'Side', dw: '19.10 mm', draw: (p) =>
    p.shape(0, 1.94, 5.1, 3.63, [0.25, 0, 0, 0.25], 'metal') + p.rect(3.29, 2.96, 1.59, 1.59, 'thin') + p.shape(0.1, 9.21, 5, 1.3, [0.25, 0, 0, 0.25], 'metal')
    + p.rect(5.1, 0, 6.3, 13.3) + [1, 6.6, 7.3, 12.3].map((y) => line(p, 5.1, y, 11.4, y)).join('')
    + p.shape(11.4, 1.7, 7.7, 4.11, [0, 0.25, 0.25, 0], 'metal') + p.shape(11.4, 2.2, 7.5, 3.1, [0, 0.2, 0.2, 0], 'thin')
    + p.shape(11.4, 9.21, 7.7, 1.3, [0, 0.25, 0.25, 0], 'metal') + p.curve([11.4, 8.95], [14.6, 7.45], [18.9, 9.21]) + p.curve([11.4, 9.21], [14.8, 7.95], [18.6, 9.21]) },
];
function deansFace(p: Pen) {
  // the outline: the 6.30 lip with round top corners, a short slope out to the 7.60 body, round bottom corners
  const n = p.n;
  return `M${n(1.55)} 0H${n(6.05)}Q${n(6.95)} 0 ${n(6.95)} ${n(0.9)}V${n(6.57)}L${n(7.6)} ${n(7.3)}V${n(12.4)}Q${n(7.6)} ${n(13.3)} ${n(6.7)} ${n(13.3)}H${n(0.9)}Q0 ${n(13.3)} 0 ${n(12.4)}V${n(7.3)}L${n(0.65)} ${n(6.57)}V${n(0.9)}Q${n(0.65)} 0 ${n(1.55)} 0Z`;
}

// JR and Futaba servo plugs: three sockets at 2.54 mm pitch in a slim face, JR with its two corners bevelled on one
// side, Futaba with its key, and the long body from the side. Typical sizes: no dimensioned servo-plug drawing is in
// our sources.
const SERVO: View[][] = (() => {
  const w = 7.6, h = 2.6, L = 14;
  const holes = (p: Pen, y = 0) => [-1, 0, 1].map((i) => p.rect(w / 2 + i * 2.54 - 0.5, y + h / 2 - 0.5, 1, 1, 'ball')).join('');
  return [[
    { w, h, cap: 'JR face', dw: '7.6', dh: '2.6', draw: (p) => p.shape(0, 0, w, h, [[0.7, 0.7], [0.7, 0.7], 0, 0]) + holes(p) },
    { w, h: h + 0.6, cap: 'Futaba face', draw: (p) => p.rect(w / 2 - 0.8, 0, 1.6, 0.6) + p.rect(0, 0.6, w, h) + holes(p, 0.6) },
  ], [
    { w: L + 4, h, cap: 'Side', dh: '2.6', draw: (p) => p.rect(0, 0, L, h) + line(p, 0.6, 0, 0.6, h) + p.rect(L, h / 2 - 0.45, 4, 0.9, 'thin') + hdim(0, Number(p.n(L)), -8, '14 mm') },
  ]];
})();

// housing colours as sold, with the colour of any inlay: XT yellow (the XT90-S with green inlays; the XT150 comes in several colours and is left untinted), EC blue, Deans dark red, JST battery plug red,
// servo plugs black (drawn grey for contrast), JST-XH natural white (light grey, outlined dark in both themes: the third value)
const TINT: Record<string, [string, string?, string?]> = {
  xt30: ['#f2c230'], xt60: ['#f2c230'], xt60h: ['#f2c230'], xt90: ['#f2c230'], xt90s: ['#f2c230', '#5fd47a'],
  ec2: ['#2f6fd6'], ec3: ['#2f6fd6'], ec5: ['#2f6fd6'], ec8: ['#2f6fd6'],
  deans: ['#8b1e1e'], 'jst-rcy': ['#d42a2a'], 'servo-jr-futaba': ['#6b6f76'], 'jst-xh': ['#f5f3ee', undefined, '#33312d'],
};

export function connectorDrawing(spec: Spec): ScrewDrawing | undefined {
  const d = draw(spec);
  const t = TINT[(String(spec.id).split('/').pop() ?? '').replace(/^jst-xh-\d+$/, 'jst-xh')];
  if (!d || !t) return d;
  const style = `--plug:${t[0]}` + (t[1] ? `;--plug-inlay:${t[1]}` : '') + (t[2] ? `;--plug-stroke:${t[2]}` : '');
  return { ...d, svg: d.svg.replace('<svg class="screwdrawing"', `<svg class="screwdrawing plug" style="${style}"`) };
}

function draw(spec: Spec): ScrewDrawing | undefined {
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
      ? `bullet lengths differ by maker and no standard exists; drawn after the ${d} mm contact in Amass's ${known.from} plug (${known.from} spec sheet V1.2)`
      : `bullet lengths differ by maker and no standard exists; length estimated as 4.2 x the diameter (median of Amass's EC contacts)`;
    return { svg: svgOf(name, row([part(b.o, b.w, b.h, cap)])), standard: undefined, approximate: true, note };
  }

  if (slug === 'jst-xh' || /^jst-xh-\d+$/.test(slug)) {   // the generic plug and the per-cell-count balance plugs
    const n = Number(spec.pins) >= 2 && Number(spec.pins) <= 16 ? Number(spec.pins) : 0;
    return { svg: jstXh(name, n || 4, !n), standard: undefined, approximate: false, note: jstXhNote(n || 4, !n) };
  }

  if (slug === 'deans') {
    return {
      svg: views(name, DEANS), standard: undefined, approximate: false,
      note: `Amass's AM-1015-M spec sheet (V1.2): the housing (6.30 and 7.60 wide, 13.30 high, 19.10 long) is dimensioned, in mm; the blade sizes (4.2 x 1.4) and positions are not, and are read off the drawing`,
    };
  }

  if (XT[slug]) return { svg: views(name, XT[slug].views), standard: undefined, approximate: false, note: XT[slug].note };

  if (slug === 'servo-jr-futaba') {
    return { svg: views(name, SERVO), standard: undefined, approximate: true, note: 'no dimensioned servo-plug drawing is in our sources; drawn at typical sizes: three contacts 2.54 mm apart, a face about 7.6 x 2.6 mm and a body about 14 mm long' };
  }

  if (EC[slug]) {
    const e = ecDrawing(slug, EC[slug]);
    return { svg: svgOf(name, row([e.face, e.side])), standard: undefined, approximate: false, note: e.note };
  }

  // IC3 and IC5 mate with EC3 and EC5: their face is drawn as the EC plug's; EC8 as a larger EC5
  if (slug === 'ic3' || slug === 'ic5' || slug === 'ec8') {
    const e = EC[slug === 'ic3' ? 'ec3' : 'ec5'];
    const k = slug === 'ec8' ? 1.3 : 1;
    const g = { ...e, w: e.w * k, h: e.h * k, hole: slug === 'ec8' ? 8 : e.hole, pitch: e.pitch * k };
    const note = slug === 'ec8'
      ? 'drawn as a larger EC5 (Amass\'s EC5 sheet) with 8 mm contacts; no dimensioned EC8 drawing is in our sources'
      : `drawn as the ${slug === 'ic3' ? 'EC3' : 'EC5'} it mates with (Amass's spec sheet); no dimensioned ${slug.toUpperCase()} drawing is in our sources`;
    return { svg: svgOf(name, row([ecFace(g, Math.min(16, 110 / g.h), false)])), standard: undefined, approximate: true, note };
  }

  let r: { o: string; bottom: number; extra?: string } | undefined;
  if (slug === 'qs8') r = qs8();
  else if (slug === 'tamiya') r = tamiya(116, 62, 14, 26);
  else if (slug === 'tamiya-mini') r = tamiya(80, 46, 10, 18);
  else if (slug === 'traxxas-trx-id' || slug === 'traxxas-high-current') r = traxxas();
  else if (slug === 'jst-rcy') r = jstRcy();
  if (!r) return undefined;
  const sparkNote = spark ? label(cx, r.bottom + (r.extra ? 36 : 18), 'anti-spark contact') : '';
  const bottom = r.bottom + (r.extra ? 36 : 18) + (sparkNote ? 18 : 0);
  const h = Math.ceil(Math.max(bottom + 8, 110));
  const svg = `<svg class="screwdrawing" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${h}" width="${W}" height="${h}" role="img" aria-label="${name}"><g class="s">${r.o}${r.extra ?? ''}${sparkNote}</g></svg>`;
  return { svg, standard: undefined, approximate: true, note: NOT_DIMENSIONED };
}

// QS8: a long housing with two 8 mm contacts, the anti-spark one marked by its inner sleeve
function qs8() {
  const w = 150, h = 72, x = cx - w / 2, y = top + 4, cy = y + h / 2, r = 22, dx = 38;
  let o = housing(x, y, w, h, [10, 10, 10, 10]);
  o += circ(cx - dx, cy, r, 'ball') + circ(cx - dx, cy, r * 0.62, 'solid') + circ(cx + dx, cy, r, 'ball') + circ(cx + dx, cy, r * 0.62, 'solid') + circ(cx + dx, cy, r * 0.3, 'ball');
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

// JST-XH: the XHP-n housing (the plug on a balance lead) from JST's XH catalogue, in mm. Dimensioned there: the
// 2.5 pitch, the width B = 2.5 (n - 1) + 4.8, the 5.7 depth and the 7.5 + 0.25 height. Read off the drawing: the
// rear flange with its two guide notches, the body, the square contact cavities and the windows under them, the two
// lock ribs on one long side with their latch ramps (they enter the slots in the header's wall, so the plug only goes
// in one way round) and the bar that marks circuit 1.
const XH_PITCH = 2.5, XH_D = 5.7, XH_RIB = 0.85, XH_H = 7.5, XH_STEP = 0.25;
const xhWidth = (n: number) => (n - 1) * XH_PITCH + 4.8;
const ink = (p: Pen, x1: number, y1: number, x2: number, y2: number) => p.poly([[x1, y1], [x2, y2]], 'thin ink', false);

// the mating face, as seen looking into the sockets: lock ribs on top, circuit 1 at the right
function xhFace(p: Pen, n: number) {
  const B = xhWidth(n), R = XH_RIB, D = XH_D, r = 0.4, n_ = p.n;
  const ny = R + 2.42, nx = 2.4 + XH_PITCH / 2;   // the notch in the right end, the one in the bottom edge between the last two circuits
  const flange = `M${n_(r)} ${n_(R)}H${n_(B - r)}Q${n_(B)} ${n_(R)} ${n_(B)} ${n_(R + r)}V${n_(ny - 0.6)}L${n_(B - 0.55)} ${n_(ny)}L${n_(B)} ${n_(ny + 0.6)}`
    + `V${n_(D - r)}Q${n_(B)} ${n_(D)} ${n_(B - r)} ${n_(D)}H${n_(nx + 0.6)}L${n_(nx)} ${n_(D - 0.65)}L${n_(nx - 0.6)} ${n_(D)}H${n_(r)}Q0 ${n_(D)} 0 ${n_(D - r)}V${n_(R + r)}Q0 ${n_(R)} ${n_(r)} ${n_(R)}Z`;
  let o = p.rect(1.88, 0, 1.35, R) + p.rect(B - 3.23, 0, 1.35, R) + ink(p, 2.69, 0, 2.69, R) + ink(p, B - 2.69, 0, B - 2.69, R)
    + `<path class="fill" d="${flange}"/>` + p.shape(0.78, R + 0.07, B - 1.56, 4.03, [0.25, 0.25, 0.25, 0.25], 'thin ink')
    + ink(p, 0.78, R + 0.27, B - 0.78, R + 0.27) + ink(p, 0.78, R + 2.22, B - 0.78, R + 2.22) + ink(p, 0.78, R + 2.46, B - 0.78, R + 2.46);
  for (let k = 0; k < n; k++) {
    const x = B - 2.4 - k * XH_PITCH;
    o += p.rect(x - 0.585, R + 0.9, 1.17, 1.17, 'ball ink') + p.rect(x - 0.4, R + 1.08, 0.8, 0.8, 'thin ink')
      + p.poly([[x - 0.5, R + 3.25], [x + 0.5, R + 3.25], [x + 0.675, R + 4.03], [x - 0.675, R + 4.03]], 'ball ink');
  }
  return o + p.rect(B - 2.4 - 0.9, R + 4.12, 1.8, 0.14, 'inkfill');
}
// the long side with the lock ribs: each a rib from the flange down, its latch ramp standing out at the bottom
function xhLockSide(p: Pen, n: number) {
  const B = xhWidth(n), L = XH_H + XH_STEP;
  const rib: Pt[] = [[2.69, 0], [2.42, 3.43], [1.88, 3.73], [1.88, 4.54], [2.73, 5.92], [3.19, 5.92], [3.19, 0.8]];
  return p.rect(0.8, 0.8, B - 1.6, L - 0.8) + p.shape(0, 0, B, 0.8, [0, 0, 0.2, 0.2]) + ink(p, 0.8, 7.2, B - 0.8, 7.2) + ink(p, 0.8, 7.47, B - 0.8, 7.47)
    + p.poly(rib) + p.poly(rib.map(([x, y]): Pt => [B - x, y]));
}
// the end: the flange on top, the lock rib (left) with its ramp, the stepped mating end at the bottom
function xhSide(p: Pen) {
  return p.shape(0, 0, XH_D, 0.8, [0, 0, 0.2, 0]) + [2.58, 3.19, 3.79].map((x) => ink(p, x, 0, x, 0.8)).join('')
    + p.rect(0, 0.8, 0.79, 5.1) + [3.38, 3.68, 4.54].map((y) => ink(p, 0, y, 0.79, y)).join('')
    + p.poly([[0.79, 0.8], [4.9, 0.8], [4.9, 7.75], [3.27, 7.75], [3.0, 7.47], [1.07, 7.47], [0.79, 7.17]]);
}
function jstXh(name: string, n: number, guessed: boolean) {
  const B = xhWidth(n), L = XH_H + XH_STEP;
  const s = Math.min(16, 220 / (B + XH_D), 150 / L);
  const p = pen(s);
  // the pitch between circuits 1 and 2, under the face
  const x1 = (B - 2.4) * s, x2 = x1 - XH_PITCH * s, y = XH_D * s + 7;
  const pitch = `<path class="thin" d="M${f(x2)} ${f(y)}H${f(x1)}M${f(x2)} ${f(y - 3)}V${f(y + 3)}M${f(x1)} ${f(y - 3)}V${f(y + 3)}"/>${label((x1 + x2) / 2, y + 13, '2.5')}`;
  const face = part(xhFace(p, n) + hdim(0, B * s, -8, `${B.toFixed(1)} mm`) + vdim(-8, 0, XH_D * s, '5.7') + pitch, B * s, XH_D * s + 18,
    guessed ? `Mating face, ${n} pins drawn` : 'Mating face');
  const front = part(xhLockSide(p, n) + vdim(-8, 0, XH_H * s, '7.5'), B * s, L * s, 'Lock side');
  const side = part(xhSide(p) + hdim(0, XH_D * s, -8, '5.7'), XH_D * s, L * s, 'Side', 12);
  const rowsOf = [[face], [front, side]];
  const within = Math.max(W, ...rowsOf.map((r) => rowWidth(r) + 12));
  let o = '', h = 0;
  for (const r of rowsOf.map((r) => row(r, 18, within))) { o += `<g transform="translate(0 ${f(h)})">${r.o}</g>`; h += r.h; }
  return svgOf(name, { o, w: within, h });
}
function jstXhNote(n: number, guessed: boolean) {
  return `JST's XH connector catalogue (eXH.pdf), housing XHP-${n}: ${xhWidth(n).toFixed(1)} wide (2.5 x ${n - 1} + 4.8), 5.7 deep, 7.5 high plus a 0.25 step, contacts at 2.5 pitch, in mm; `
    + `the guide notches, cavities and lock ribs are read off the drawing. The two lock ribs on one long side fit the slots in the header's wall, so the plug goes in one way round; the bar marks circuit 1`
    + (guessed ? `. The pin count is not in this spec: ${n} pins are drawn` : '');
}
