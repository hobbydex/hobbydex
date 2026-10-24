// Drawings of connector specs, drawn in currentColor like the other spec drawings. Amass's dimensioned drawings give
// the EC plugs (EC2, EC3, EC5), the XT plugs (XT30, XT60, XT60H, XT90, XT90S, XT150), the AS150, the AM-1015 T-plug
// (Deans), JST's XH catalogue the JST-XH balance plugs: these are to scale, each view in its own mm coordinates. The
// bullet drawings follow the dimensioned contacts of the EC plugs but are marked not to scale, as bullets differ by
// maker. Other plugs have no dimensioned drawing in our sources: they are drawn after the makers' photos and marked
// not to scale.
import type { Spec } from './data';
import type { ScrewDrawing } from './screwDrawing';

const f = (v: number) => String(Math.round(v * 100) / 100);
const W = 300;
const rect = (x: number, y: number, w: number, h: number, cls = 'fill') => `<rect class="${cls}" x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}"/>`;
const circ = (x: number, y: number, r: number, cls: string) => `<circle class="${cls}" cx="${f(x)}" cy="${f(y)}" r="${f(r)}"/>`;
const label = (x: number, y: number, text: string) => `<text x="${f(x)}" y="${f(y)}" text-anchor="middle" class="std">${text}</text>`;
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

// the AS150 pole from the side, its housing in class c (the red or the black pole)
function as150Side(p: Pen, c: string) {
  return p.shape(0, 0.81, 16.57, 11.97, [0.3, 0, 0, 0.3], c) + p.rect(16.57, 0, 3.01, 13.5, c) + p.rect(19.58, 0, 8.22, 13.5, c)
    + [19.7, 21, 22.8, 24.4, 25.9].map((x) => line(p, x, 0, x, 13.5)).join('')
    + p.poly([[27.8, 0.42], [30.06, 0.81], [34.2, 1.8], [35.1, 2.74], [35.1, 10.93], [34.2, 11.9], [30.06, 12.78], [27.8, 13.08]], c) + line(p, 30.06, 0.81, 30.06, 12.78);
}

// The XT, XT150 and AS150 plugs from the drawings on Amass's product pages: mating face (male) and side, in mm. The
// outline sizes are dimensioned there; contact positions and the other details are read off the drawing.
const READ_OFF = 'the contact positions and other details are read off the drawing';
const XT: Record<string, { note: string; views: View[] | View[][] }> = {
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
        + p.rect(12.21, 0, 1.22, 16.4) + p.poly([[13.43, 0], [16.57, 0], [23.9, 0.69], [23.9, 15.71], [16.57, 16.4], [13.43, 16.4]], 'cover')
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
    note: `Amass's XT90S drawing (the XT90S-F, female): the 21.50 x 31.20 front and 9.90 side are dimensioned, in mm, and the other details are read off it. Amass does not draw the mating face: it is approximate, about 19.4 x 8.4 as the front and side give it, with the XT90's 10.8 contact spacing, and its shape follows Amass's photo: both corners at one end bevelled, as on the XT90, the other end square. The anti-spark contact is the socket with the green sleeve in the photo, at the square end on the side of the round badge, the positive (+) pole; the plain socket is the negative (-)`,
    views: [
      { w: 10.6, h: 19.43, cap: 'Face, approx.', draw: (p) =>
        p.shape(0, 0, 8.39, 19.43, [0.4, 0.4, [2.7, 2.9], [2.7, 2.9]])
        // the anti-spark socket: the green sleeve between the housing and the contact
        + p.circ(4.2, 4.32, 5.5, 'inlay') + p.circ(4.2, 4.32, 5.5, 'thin') + p.circ(4.2, 4.32, 4.4, 'metal') + p.circ(4.2, 4.32, 3.4, 'ball')
        + p.circ(4.2, 15.12, 5.5, 'ball') + p.circ(4.2, 15.12, 4.4, 'metal') + p.circ(4.2, 15.12, 3.4, 'ball')
        + label(Number(p.n(9.6)), Number(p.n(4.32)) + 4, '+') + label(Number(p.n(9.6)), Number(p.n(15.12)) + 4, '-') },
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
    note: `Amass's AS150 drawing: the 13.50 diameter and 35.10 length are dimensioned, in mm, and the other details are read off it; the pair is a red and a black pole, as on Amass's photos. Amass does not draw the AS150 mating face, so it is not shown`,
    views: [
      [{ w: 35.1, h: 13.5, cap: 'Side, red pole', dw: '35.10 mm', dh: '⌀13.50', draw: (p) => as150Side(p, 'fill') }],
      [{ w: 35.1, h: 13.5, cap: 'Side, black pole', dh: '⌀13.50', draw: (p) => as150Side(p, 'blk') }],
    ],
  },
};

// Amass EC plugs, from their dimensioned spec sheets (mm). Face (the female's, as on the -F sheet): one end of the
// housing square, the other round, a waist on one side (EC2) or both (EC3, EC5), a cavity round each socket (hole) at
// pitch, the key slot between them. Side: the ribbed rear of length ribL around its label panel and the two contact
// shells, each as Amass draws them (shell heights read from the drawing); blueLeft puts the shells at the back.
type Ec = { w: number; h: number; hole: number; pitch: number; L: number; ribL: number; blueLeft: boolean; shells: [number, number][]; waists: 1 | 2 };
const EC: Record<string, Ec> = {
  ec2: { w: 6.1, h: 12.5, hole: 3.5, pitch: 6.25, L: 13, ribL: 5.8, blueLeft: false, shells: [[0.9, 5.3], [7.1, 11.6]], waists: 1 },
  ec3: { w: 8, h: 16.6, hole: 5.2, pitch: 8.4, L: 17.5, ribL: 9.4, blueLeft: true, shells: [[0.7, 7], [9.5, 15.6]], waists: 2 },
  ec5: { w: 9.9, h: 19.6, hole: 7, pitch: 10.1, L: 24, ribL: 8, blueLeft: false, shells: [[0.4, 8], [11.6, 19.2]], waists: 2 },
};
const EC_NOTE = (n: string) => `dimensions from Amass's spec sheets for ${n} (${n}-F and ${n}-M, V1.2), in mm; the face is the female's, its square and round ends, waists and key slot read off the drawing`;
// the EC mating face at s px per mm, the round end at the bottom; dims prints the sizes; extra is drawn on top
function ecFace(e: Ec, s: number, dims = true, cap = 'Mating face', extra = '') {
  const fw = e.w * s, fh = e.h * s, r = 0.6 * s, R = fw / 2, mid = fh / 2, wr = fh * 0.1, wd = fw * 0.11, dy = (e.pitch * s) / 2, hx = fw / 2;
  const left = e.waists === 2 ? `V${f(mid + wr)}Q${f(2 * wd)} ${f(mid)} 0 ${f(mid - wr)}` : '';
  const outline = `M${f(r)} 0H${f(fw - r)}Q${f(fw)} 0 ${f(fw)} ${f(r)}V${f(mid - wr)}Q${f(fw - 2 * wd)} ${f(mid)} ${f(fw)} ${f(mid + wr)}V${f(fh - R)}A${f(R)} ${f(R)} 0 0 1 0 ${f(fh - R)}${left}V${f(r)}Q0 0 ${f(r)} 0Z`;
  // the cavities: a D round the socket at the square end, a circle round the one at the round end
  const i = 0.55 * s, rc = R - i, y1 = mid - dy, y2 = mid + dy;
  const dCav = `M${f(i + r)} ${f(i)}H${f(fw - i - r)}Q${f(fw - i)} ${f(i)} ${f(fw - i)} ${f(i + r)}V${f(y1)}A${f(rc)} ${f(rc)} 0 0 1 ${f(i)} ${f(y1)}V${f(i + r)}Q${f(i)} ${f(i)} ${f(i + r)} ${f(i)}Z`;
  // the key slot between them, its ends drawn in
  const kx0 = fw * 0.27, kx1 = fw * 0.73, kh = Math.min(fh * 0.045, (dy - rc) * 0.9);
  const key = `M${f(kx0)} ${f(mid - kh)}H${f(kx1)}Q${f(kx1 - fw * 0.08)} ${f(mid)} ${f(kx1)} ${f(mid + kh)}H${f(kx0)}Q${f(kx0 + fw * 0.08)} ${f(mid)} ${f(kx0)} ${f(mid - kh)}Z`;
  return part(`<path class="fill" d="${outline}"/><path class="thin" d="${dCav}"/>` + circ(hx, y2, rc, 'thin') + `<path class="ball" d="${key}"/>`
    + circ(hx, y1, (e.hole / 2) * s, 'ball') + circ(hx, y2, (e.hole / 2) * s, 'ball') + extra
    + (dims ? hdim(0, fw, -8, `${e.w.toFixed(2)}`) + vdim(-8, 0, fh, `${e.h.toFixed(2)}`) : ''), fw, fh, cap);
}
function ecDrawing(slug: string, e: Ec) {
  const s = Math.min(16, 180 / (e.w + e.L));
  const fh = e.h * s;
  const L = e.L * s, ribW = e.ribL * s, shellW = L - ribW;
  const ribX = e.blueLeft ? shellW : 0, shellX = e.blueLeft ? 0 : ribW;
  // the ribs run over the top and bottom of the rear, round the label panel in the middle
  const p0 = fh * 0.33, p1 = fh * 0.67;
  let side = rect(ribX, 0, ribW, fh) + rect(ribX + ribW * 0.12, p0, ribW * 0.76, p1 - p0, 'thin');
  for (let i = 1; i * 1.3 < e.ribL; i++) side += `<path class="thin" d="M${f(ribX + i * 1.3 * s)} 0V${f(p0)}M${f(ribX + i * 1.3 * s)} ${f(p1)}V${f(fh)}"/>`;
  for (const [a, b] of e.shells) side += rect(shellX, a * s, shellW, (b - a) * s);
  side += hdim(0, L, -8, `${e.L.toFixed(2)} mm`) + vdim(-8, 0, fh, `${e.h.toFixed(2)}`);
  const name = slug.toUpperCase();
  return { face: ecFace(e, s), side: part(side, L, fh, 'Side'), note: EC_NOTE(name) };
}

// Bullet and banana contacts. Amass draws the contacts of its EC plugs on the EC2, EC3 and EC5 sheets (V1.2): the
// male is a sprung pin (lamellae that bulge out to the nominal diameter, a short round nose, a neck and a wider solder
// cup), the female a plain socket tube with a collar at its solder cup and a vent hole. Lengths and diameters below are
// dimensioned there; the lengths along the male (nose, lamellae, neck) are read off the drawings.
type Male = { L: number; cup: number; nose: number; lam: number; neck: number };
type Female = { L: number; od: number; collar: number };
const CONTACT: Record<string, { male: Male; female: Female; from: string }> = {
  '2': { male: { L: 10.5, cup: 3.2, nose: 0.15, lam: 0.49, neck: 0.03 }, female: { L: 10.6, od: 2.5, collar: 3.2 }, from: 'EC2' },
  '3.5': { male: { L: 12, cup: 4.8, nose: 0.12, lam: 0.34, neck: 0.25 }, female: { L: 12, od: 4.2, collar: 4.8 }, from: 'EC3' },
  '5': { male: { L: 22.6, cup: 6.3, nose: 0.08, lam: 0.45, neck: 0.22 }, female: { L: 21, od: 5.7, collar: 6.3 }, from: 'EC5' },
};
// a sprung (lamella) male from the side, nose at the left, d the diameter over the lamellae
function lamellaMale(p: Pen, d: number, m: Male, H: number) {
  const c = H / 2, L = m.L, xn = m.nose * L, xl = xn + m.lam * L, xk = xl + m.neck * L, xr = xk + 0.04 * L;
  const nr = d * 0.37, kr = d * 0.35, n = p.n;
  // the nose: a short cylinder with a round end
  let o = `<path class="metal" d="M${n(xn)} ${n(c - nr)}H${n(nr * 0.7)}Q0 ${n(c - nr)} 0 ${n(c)}Q0 ${n(c + nr)} ${n(nr * 0.7)} ${n(c + nr)}H${n(xn)}Z"/>`;
  // the lamellae: they bulge from the neck radius out to d/2 halfway along (a quadratic's middle is half its control)
  const bulge = (k: number) => 2 * k * (d / 2) - k * kr;
  o += `<path class="metal" d="M${n(xn)} ${n(c - kr)}Q${n((xn + xl) / 2)} ${n(c - bulge(1))} ${n(xl)} ${n(c - kr)}V${n(c + kr)}Q${n((xn + xl) / 2)} ${n(c + bulge(1))} ${n(xn)} ${n(c + kr)}Z"/>`;
  // the slits between the lamellae, seen from the side
  for (const k of [0.62, 0.22, -0.22, -0.62]) o += p.curve([xn, c - k * kr], [(xn + xl) / 2, c - k * bulge(1)], [xl, c - k * kr]);
  if (xk > xl) o += p.rect(xl, c - kr, xk - xl, 2 * kr, 'metal');
  o += p.rect(xk, c - m.cup * 0.47, xr - xk, m.cup * 0.94, 'metal') + p.rect(xr, c - m.cup / 2, L - xr, m.cup, 'metal');
  // the solder cup's bore, open at the rear
  o += p.poly([[L - (L - xr) * 0.85, c - d * 0.42], [L, c - d * 0.42]], 'thin dash', false) + p.poly([[L - (L - xr) * 0.85, c + d * 0.42], [L, c + d * 0.42]], 'thin dash', false);
  return o;
}
// a slotted male (a solid pin split by slots from its tip) from the side, tip at the left
function slottedMale(p: Pen, d: number, L: number, H: number) {
  const c = H / 2, ch = d * 0.12, cup = d * 1.12, xc = 0.55 * L;
  let o = p.poly([[ch, c - d / 2], [xc, c - d / 2], [xc, c + d / 2], [ch, c + d / 2], [0, c + d / 2 - ch], [0, c - d / 2 + ch]], 'metal');
  o += p.rect(0, c - d * 0.06, 0.42 * L, d * 0.12, 'bg') + p.rect(xc, c - d * 0.62, 0.06 * L, d * 1.24, 'metal') + p.rect(xc + 0.06 * L, c - cup / 2, L - xc - 0.06 * L, cup, 'metal');
  o += p.circ(0.8 * L, c, d * 0.42, 'ball');
  return o;
}
// a female socket from the side: the solder cup with its collar at the left, the vent hole, the mouth at the right
function female(p: Pen, d: number, fm: Female, H: number) {
  const c = H / 2, L = fm.L;
  let o = p.rect(0, c - fm.collar / 2, 0.17 * L, fm.collar, 'metal') + p.rect(0.17 * L, c - fm.od * 0.46, 0.07 * L, fm.od * 0.92, 'metal')
    + p.rect(0.24 * L, c - fm.collar * 0.47, 0.03 * L, fm.collar * 0.94, 'metal') + p.rect(0.27 * L, c - fm.od / 2, 0.73 * L, fm.od, 'metal');
  o += p.circ(0.4 * L, c, Math.min(d * 0.3, fm.od * 0.4), 'ball');
  o += p.poly([[0.55 * L, c - d / 2], [L, c - d / 2]], 'thin dash', false) + p.poly([[0.55 * L, c + d / 2], [L, c + d / 2]], 'thin dash', false);
  return o;
}
// the contact pair, female (mouth right) and male (nose left) facing each other; dims when the sizes are dimensioned
function contactViews(d: number, kind: 'lamella' | 'slotted', male: Male, fm: Female, dims: boolean): View[] {
  const H = Math.max(male.cup, fm.collar, d);
  return [
    { w: fm.L, h: H, cap: 'Female', dw: dims ? `${fm.L.toFixed(2)} mm` : undefined, draw: (p) => female(p, d, fm, H) },
    { w: male.L, h: H, cap: `Male ⌀${d}`, dw: dims ? `${male.L.toFixed(2)} mm` : undefined,
      draw: (p) => (kind === 'lamella' ? lamellaMale(p, d, male, H) : slottedMale(p, d, male.L, H)) },
  ];
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

// The servo plugs. No dimensioned drawing of either is in our sources. Futaba draws its J plug on the S3004 servo
// sheet (the broad side, contacts showing): that outline is traced here, scaled by the 2.54 mm contact pitch, with
// the lip on the short side beside the signal contact. The JR plug has no lip and two corners of one long side
// bevelled (the housings in the photo of Muchmore's JR set, MSC-SPJ); it is drawn at the Futaba plug's size, as both
// go into the same sockets. The thickness (2.6 mm) is typical, from no source.
const SERVO_W = 9.14, SERVO_T = 2.6, SERVO_L = 14.57, SERVO_LIP = 0.4;
const SERVO_WIN: [number, number][] = [[0.53, 2.46], [3.07, 5.05], [5.61, 7.54]];   // contact windows across the width, mm
// contacts seen in the face, 2.54 mm apart, where the windows are across the width (signal contact on the right)
const servoFace = (p: Pen) => SERVO_WIN.map(([a, b]) => p.rect((a + b) / 2 - 0.5, SERVO_T / 2 - 0.5, 1, 1, 'ball')).join('');
// the broad side from above, nose to the left: contact windows and their latches as Futaba draws them
const servoWindows = (p: Pen) => SERVO_WIN.map(([a, b]) => p.rect(4.76, a, 1.79, b - a, 'ball') + p.rect(6.55, a, 2.27, b - a, 'thin')).join('');
const SERVO_FUTABA: View[] = [
  { w: SERVO_W + SERVO_LIP, h: SERVO_T, cap: 'Face', draw: (p) =>
    p.rect(0, 0, SERVO_W, SERVO_T) + p.rect(SERVO_W, SERVO_T / 2 - 0.6, SERVO_LIP, 1.2) + servoFace(p) },
  { w: SERVO_L, h: SERVO_W + SERVO_LIP, cap: 'Top', draw: (p) =>
    p.poly([[0.53, 0], [SERVO_L, 0], [SERVO_L, 9.54], [12.83, 9.54], [12.83, 8.07], [9.22, 8.07], [8.15, 9.14], [1.2, 9.14], [0, 7.49], [0, 0.64]]) + servoWindows(p) },
];
const SERVO_JR: View[] = [
  { w: SERVO_W, h: SERVO_T, cap: 'Face', draw: (p) => p.shape(0, 0, SERVO_W, SERVO_T, [[0.7, 0.7], [0.7, 0.7], 0, 0]) + servoFace(p) },
  { w: SERVO_L, h: SERVO_W, cap: 'Top', draw: (p) =>
    p.poly([[0.53, 0], [SERVO_L, 0], [SERVO_L, SERVO_W], [1.2, SERVO_W], [0, 7.49], [0, 0.64]])
    + line(p, 0.53, 0.7, SERVO_L, 0.7) + line(p, 0.9, SERVO_W - 0.7, SERVO_L, SERVO_W - 0.7) + servoWindows(p) },
];
const SERVO: Record<string, { views: View[]; note: string }> = {
  'servo-futaba': { views: SERVO_FUTABA, note: "Futaba's own drawing on its S3004 servo sheet, traced and scaled by the 2.54 mm contact pitch: the lip on the short side beside the signal contact (right in the face, bottom from the top); the thickness is typical. No dimensioned drawing is in our sources" },
  'servo-jr': { views: SERVO_JR, note: "the two bevelled corners as on the housings of Muchmore's JR connector set (MSC-SPJ), at the size of the Futaba plug (Futaba's S3004 drawing scaled by the 2.54 mm pitch) without its lip; the thickness is typical. No dimensioned drawing is in our sources" },
};

// Plugs with no dimensioned drawing in our sources, drawn after the makers' photos at their usual proportions (in
// mm, approximate, so no dimensions are printed). Each note names the photos.
// Traxxas: the housing face from the 3070X connector photo, two wide flat terminals in their cavities, the bottom
// corners bevelled; on iD LiPo packs the balance taps are small contacts in the corners (Traxxas's 3S callout).
function traxxasFace(p: Pen, balance: boolean) {
  const W = 19, H = 10.5;
  let o = p.poly([[0.8, 0], [W - 0.8, 0], [W, 0.8], [W, 7.4], [W - 3.1, H], [3.1, H], [0, 7.4], [0, 0.8]]);
  for (const x0 of [2.4, 10.2]) {
    o += p.shape(x0, 2.7, 6.4, 5.4, [2, 2, 2, 2], 'ball') + p.rect(x0 + 0.9, 5.1, 4.6, 0.7, 'metal');
  }
  o += p.poly([[5.1, 1.35], [6.1, 1.35]], 'thin', false) + p.poly([[5.6, 0.85], [5.6, 1.85]], 'thin', false) + p.poly([[12.9, 1.35], [13.9, 1.35]], 'thin', false);
  if (balance) for (const x of [2.6, W - 2.6]) o += p.circ(x, 8.6, 1.3, 'ball') + p.circ(x, 8.6, 0.6, 'metal');
  return o;
}
// Tamiya: the male housing's two round sleeves with the latch arm over them, the female's box with two square cavities
// and the catch on top; k scales the mini plug
function tamiyaViews(k: number): View[] {
  const sl = (p: Pen) => {
    let o = p.rect(2.7 * k, 0, 7.6 * k, 1.1 * k) + p.shape(0, 1.1 * k, 13 * k, 6.2 * k, [3.1 * k, 3.1 * k, 3.1 * k, 3.1 * k]);
    o += p.poly([[6.5 * k, 1.1 * k], [6.5 * k, 7.3 * k]], 'thin', false);
    for (const x of [3.25, 9.75]) o += p.circ(x * k, 4.2 * k, 3.6 * k, 'ball') + p.circ(x * k, 4.2 * k, 1.5 * k, 'metal');
    return o;
  };
  const box = (p: Pen) => {
    let o = p.rect(5.2 * k, 0, 4.2 * k, 1 * k) + p.shape(0, 1 * k, 14.6 * k, 7.6 * k, [0.5 * k, 0.5 * k, 0.5 * k, 0.5 * k]);
    for (const x of [1.1, 7.6]) o += p.rect(x * k, 2.1 * k, 5.9 * k, 5.4 * k, 'ball') + p.circ((x + 2.95) * k, 4.8 * k, 1.8 * k, 'metal') + p.circ((x + 2.95) * k, 4.8 * k, 0.9 * k, 'ball');
    return o;
  };
  return [
    { w: 13 * k, h: 7.3 * k, cap: 'Male housing', draw: sl },
    { w: 14.6 * k, h: 8.6 * k, cap: 'Female housing', draw: box },
  ];
}
const TAMIYA_NOTE = (what: string) => `no dimensioned drawing of the ${what} is in our sources; drawn after Hobby Details' photo of its Tamiya plug pair (DTP01013): a male housing whose two round sleeves carry the latch arm, a female box with two square cavities and the catch, in natural nylon`;
const PHOTO: Record<string, { note: string; views: View[] }> = {
  'traxxas-trx-id': {
    note: 'no dimensioned drawing is in our sources; drawn after Traxxas\'s photos of the 3070X connectors and its iD LiPo connector callout: two wide flat terminals, and on LiPo packs the balance taps as small contacts in the bevelled corners ("Balance Wire Connection"); NiMH iD packs have none',
    views: [{ w: 19, h: 10.5, cap: 'Mating face, balance taps in the corners', draw: (p) => traxxasFace(p, true) }],
  },
  'traxxas-high-current': {
    note: 'no photo or drawing of the pre-iD plug is in our sources; drawn as the power contacts of the iD housing (Traxxas\'s 3070X photo), which Traxxas also calls its High-Current Connector, without the iD balance taps',
    views: [{ w: 19, h: 10.5, cap: 'Mating face', draw: (p) => traxxasFace(p, false) }],
  },
  tamiya: { note: TAMIYA_NOTE('Tamiya plug'), views: tamiyaViews(1) },
  'tamiya-mini': { note: TAMIYA_NOTE('mini Tamiya plug') + '; the mini plug is drawn as the same housings at about two thirds the size', views: tamiyaViews(0.68) },
  qs8: {
    note: 'no dimensioned drawing is in our sources; drawn after Gens Ace\'s photos of the QS8-S1 and QS8-S2 halves: a socket block with two 8 mm sockets, the anti-spark one marked red, and a plug half whose two round shrouds are joined by a web with a window',
    views: [
      { w: 26, h: 13, cap: 'Socket half', draw: (p) => p.shape(0, 0, 26, 13, [2.4, 2.4, 2.4, 2.4])
        + [6.5, 19.5].map((x) => p.circ(x, 6.5, 10.2, 'ball') + p.circ(x, 6.5, 8.8, 'metal') + p.circ(x, 6.5, 7.6, 'ball')).join('')
        + `<circle cx="${p.n(19.5)}" cy="${p.n(6.5)}" r="${p.n(3.3)}" fill="none" stroke="#d42a2a" stroke-width="2"/>` },
      { w: 23.4, h: 9.8, cap: 'Plug half', draw: (p) => p.rect(4.9, 2.4, 13.6, 5) + p.circ(4.9, 4.9, 9.8) + p.circ(18.5, 4.9, 9.8)
        + p.rect(10.2, 3.2, 3, 3.4, 'ball') + [4.9, 18.5].map((x) => p.circ(x, 4.9, 8, 'ball') + p.circ(x, 4.9, 6.6, 'metal')).join('') },
    ],
  },
  'jst-rcy': {
    note: 'no dimensioned drawing is in our sources; drawn after Gens Ace\'s photo of a JST-RCY battery plug: a slim red housing with two square sockets one above the other, about 2.5 mm apart, and a raised rear flange',
    views: [
      { w: 3.8, h: 7.4, cap: 'Mating face', draw: (p) => p.shape(0, 0, 3.8, 7.4, [0.3, 0.3, 0.3, 0.3]) + [2.45, 4.95].map((y) => p.rect(1.15, y - 0.75, 1.5, 1.5, 'ball')).join('') },
      { w: 13, h: 7.4, cap: 'Side', draw: (p) => p.rect(1.6, 0.5, 11.4, 6.9) + p.rect(0, 0, 1.6, 7.4) + p.rect(6.6, 3.4, 1.2, 0.6, 'thin') },
    ],
  },
};

// housing colours as sold, with the colour of any inlay: XT yellow (the XT90-S with green inlays, the XT60H cover grey; the XT150 comes in several colours and is left untinted), EC blue, IC orange, Deans dark
// red, AS150 red (its other pole black), JST battery plug red, Tamiya natural nylon; black plugs (servo, QS8, Traxxas)
// are drawn grey for contrast; JST-XH natural white (light grey, outlined dark in both themes: the third value)
const TINT: Record<string, [string, string?, string?]> = {
  xt30: ['#f2c230'], xt60: ['#f2c230'], xt60h: ['#f2c230'], xt90: ['#f2c230'], xt90s: ['#f2c230', '#5fd47a'],
  ec2: ['#2f6fd6'], ec3: ['#2f6fd6'], ec5: ['#2f6fd6'], ec8: ['#2f6fd6'], ic3: ['#f47b20'], ic5: ['#f47b20'],
  deans: ['#8b1e1e'], as150: ['#d42a2a'], 'jst-rcy': ['#d42a2a'], 'servo-jr': ['#6b6f76'], 'servo-futaba': ['#6b6f76'], 'jst-xh': ['#f5f3ee', undefined, '#33312d'],
  tamiya: ['#ece4cf'], 'tamiya-mini': ['#ece4cf'], qs8: ['#6b6f76'], 'traxxas-trx-id': ['#6b6f76'], 'traxxas-high-current': ['#6b6f76'],
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
  const name = String(spec.name ?? slug);

  if (slug.startsWith('bullet-') || slug === 'banana-4mm') {
    const d = Number(spec.contact_mm);
    if (!d) return undefined;
    if (slug === 'banana-4mm') {
      // proportions read off Hobby Details' and Power HD's photos of their 4 mm banana plugs: the lamellae run over
      // about half the length, the solder cup is a little wider than the pin
      const male: Male = { L: 18.5, cup: 4.6, nose: 0.08, lam: 0.55, neck: 0.04 };
      return { svg: views(name, contactViews(4, 'lamella', male, { L: 19, od: 4.8, collar: 5.2 }, false)), standard: undefined, approximate: true,
        note: 'no dimensioned drawing of a 4 mm banana plug is in our sources; drawn after the makers\' photos (Hobby Details DTP02003, Power HD): a pin whose sprung lamellae bulge out to 4 mm, and a plain socket' };
    }
    const known = CONTACT[String(d)];
    if (known) {
      return { svg: views(name, contactViews(d, 'lamella', known.male, known.female, true)), standard: undefined, approximate: true,
        note: `bullet lengths differ by maker and no standard exists; drawn after the ${d} mm contacts in Amass's ${known.from} plug, dimensioned on its ${known.from}-M and ${known.from}-F spec sheets (V1.2): a male with sprung lamellae and a socket` };
    }
    // other sizes: 4 mm as Amass's sprung contacts scaled; 6 and 8 mm as the slotted pins sold in those sizes
    const kind = d >= 6 ? 'slotted' : 'lamella';
    const L = 4.2 * d;
    const male: Male = { L, cup: d * 1.3, nose: 0.1, lam: 0.42, neck: 0.18 };
    return { svg: views(name, contactViews(d, kind, male, { L, od: d + 0.7, collar: d + 1.3 }, false)), standard: undefined, approximate: true,
      note: kind === 'slotted'
        ? `bullet lengths differ by maker and no standard exists; drawn after Maclan's photo of its ${d} mm bullets (a pin split by slots, a wider solder cup with a side hole), length about 4.2 x the diameter`
        : `bullet lengths differ by maker and no standard exists; drawn as Amass's sprung EC contacts scaled to ${d} mm, length about 4.2 x the diameter` };
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

  if (SERVO[slug]) return { svg: views(name, SERVO[slug].views), standard: undefined, approximate: true, note: SERVO[slug].note };

  if (EC[slug]) {
    const e = ecDrawing(slug, EC[slug]);
    return { svg: svgOf(name, row([e.face, e.side])), standard: undefined, approximate: false, note: e.note };
  }

  // IC3 and IC5 mate with EC3 and EC5 for power: their face is drawn as the EC plug's, with the Smart data contact
  // in the waist beside the sockets, where Spektrum's photos show it; EC8 as a larger EC5
  if (slug === 'ic3' || slug === 'ic5' || slug === 'ec8') {
    const e = EC[slug === 'ic3' ? 'ec3' : 'ec5'];
    const k = slug === 'ec8' ? 1.3 : 1;
    const g = { ...e, w: e.w * k, h: e.h * k, hole: slug === 'ec8' ? 8 : e.hole, pitch: e.pitch * k };
    const s = Math.min(16, 110 / g.h);
    if (slug === 'ec8') {
      return { svg: svgOf(name, row([ecFace(g, s, false)])), standard: undefined, approximate: true,
        note: 'drawn as a larger EC5 (Amass\'s EC5 sheets) with 8 mm contacts, as Hobby Details\' photo of its EC8 plugs shows it; no dimensioned EC8 drawing is in our sources' };
    }
    // the data contact: a small flat blade standing in the waist, seen end on
    const blade = rect(g.w * s * 0.86, (g.h / 2 - 1.1) * s, 0.5 * s, 2.2 * s, 'metal');
    const ec = slug === 'ic3' ? 'EC3' : 'EC5';
    return { svg: svgOf(name, row([ecFace(g, s, false, 'Mating face, data contact at the side', blade)])), standard: undefined, approximate: true,
      note: `drawn as the ${ec} it mates with for power (Amass's ${ec} sheets), with the Smart data contact beside the sockets as Spektrum's photos of its Smart batteries show it; its size is not dimensioned in our sources. Spektrum: IC3 and IC5 connectors are backwards compatible with EC3 and EC5 connectors` };
  }

  if (PHOTO[slug]) return { svg: views(name, PHOTO[slug].views), standard: undefined, approximate: true, note: PHOTO[slug].note };

  return undefined;
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
