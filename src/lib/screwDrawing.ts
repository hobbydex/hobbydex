// Dimensioned drawing of a screw spec: a side view to scale and an end view of the head with its drive.
// Drawn in currentColor, so it follows the light and dark themes. Head sizes come from the standard the head
// type follows; sizes outside a standard's table use the usual proportions and are reported as approximate.
import type { Spec } from './data';

type Head = { dk: number; k: number };
// head diameter dk and height k by thread, mm
const CAP: Record<string, Head> = { '1.6': { dk: 3, k: 1.6 }, '2': { dk: 3.8, k: 2 }, '2.5': { dk: 4.5, k: 2.5 }, '3': { dk: 5.5, k: 3 }, '4': { dk: 7, k: 4 }, '5': { dk: 8.5, k: 5 }, '6': { dk: 10, k: 6 } };
const BUTTON: Record<string, Head> = { '3': { dk: 5.7, k: 1.65 }, '4': { dk: 7.6, k: 2.2 }, '5': { dk: 9.5, k: 2.75 }, '6': { dk: 10.5, k: 3.3 } };
const CSK: Record<string, number> = { '3': 6.72, '4': 8.96, '5': 11.2, '6': 13.44 };   // ISO 10642, 90 degree head
const KEY: Record<string, number> = { '1.4': 0.9, '1.6': 0.9, '2': 1.3, '2.5': 1.5, '3': 2, '4': 2.5, '5': 3, '6': 4 };   // countersunk/button key
const CAPKEY: Record<string, number> = { '1.6': 1.5, '2': 1.5, '2.5': 2, '3': 2.5, '4': 3, '5': 4, '6': 5 };
const SETKEY: Record<string, number> = { '2': 0.9, '2.5': 1.3, '3': 1.5, '4': 2, '5': 2.5, '6': 3 };   // ISO 4029
// set screws (ISO 4026/4027/4029): hex socket depth t (the longer lengths' minimum), and the flat point's or
// the cup's end diameter, by thread (mm)
const SETDEPTH: Record<string, number> = { '1.6': 0.8, '2': 1.2, '2.5': 1.5, '3': 2, '4': 2.5, '5': 3, '6': 3.5 };
const SETFLAT: Record<string, number> = { '1.6': 0.8, '2': 1, '2.5': 1.5, '3': 2, '4': 2.5, '5': 3.5, '6': 4 };
const SETCUP: Record<string, number> = { '1.6': 0.8, '2': 1, '2.5': 1.2, '3': 1.4, '4': 2, '5': 2.5, '6': 3 };
const PITCH: Record<string, number> = { '1.4': 0.3, '1.6': 0.35, '1.7': 0.35, '2': 0.4, '2.2': 0.45, '2.3': 0.4, '2.5': 0.45, '2.6': 0.45, '3': 0.5, '3.5': 0.6, '4': 0.7, '5': 0.8, '6': 1 };

export type ScrewDrawing = { svg: string; standard?: string; approximate: boolean; note?: string };

const f = (v: number) => String(Math.round(v * 100) / 100);

export function screwDrawing(spec: Spec): ScrewDrawing | undefined {
  const d = Number(String(spec.thread ?? '').replace(/^M/, ''));
  const L = Number(spec.length_mm);
  const head = spec.head === 'flat' ? 'countersunk' : String(spec.head ?? '');   // a flat head is a countersunk head
  const drive = String(spec.drive ?? 'hex');
  const tapping = spec.thread_type === 'self-tapping';
  if (!d || !L || !['socket-cap', 'low-head', 'button', 'pan', 'countersunk', 'set'].includes(head)) return undefined;
  const key = String(d);
  let dk = 0, k = 0, approximate = false, standard: string | undefined;
  if (head === 'socket-cap') { const h = CAP[key]; standard = 'ISO 4762'; if (h) ({ dk, k } = h); else { dk = 1.75 * d; k = d; approximate = true; } }
  if (head === 'low-head') { const h = CAP[key]; dk = h?.dk ?? 1.75 * d; k = 0.6 * d; standard = 'DIN 7984'; approximate = !h; }
  if (head === 'button') { const h = BUTTON[key]; standard = 'ISO 7380-1'; if (h) ({ dk, k } = h); else { dk = 1.9 * d; k = 0.55 * d; approximate = true; } }
  if (head === 'pan') { dk = 1.9 * d; k = 0.7 * d; approximate = true; }
  if (head === 'countersunk') { standard = 'ISO 10642'; dk = CSK[key] ?? 2 * d; approximate = !CSK[key]; k = (dk - d) / 2; }
  // a set screw's end: the spec's point if it names one, else the standard it follows, else a flat point
  const stds = (spec.standards ?? []).map(String).join(' ');
  const named = String((spec as Record<string, unknown>).point ?? (spec as Record<string, unknown>).end ?? '');
  const point = head !== 'set' ? '' : /cup/.test(named) ? 'cup' : /cone/.test(named) ? 'cone' : /flat/.test(named) ? 'flat'
    : /4029|916/.test(stds) ? 'cup' : /4027|914/.test(stds) ? 'cone' : 'flat';
  if (head === 'set') standard = point === 'cup' ? 'ISO 4029' : point === 'cone' ? 'ISO 4027' : 'ISO 4026';
  if (drive !== 'hex') standard = undefined;   // the ISO tables are for hex socket screws
  const p = PITCH[key] ?? 0.2 * d;

  const W = 360, H = 150, ox = 70, cy = 70;
  const s = Math.min(12, 120 / Math.max(L + (head === 'countersunk' || head === 'set' ? 0 : k), (dk || d) * 1.6));   // px per mm; short set screws stay small
  const X = (mm: number) => ox + mm * s;
  const r = (d / 2) * s, rk = (dk / 2) * s;
  const o: string[] = [];
  // side view: head
  let start = 0, end = 0;
  if (head === 'countersunk') {
    o.push(`<path d="M${f(X(0))} ${f(cy - rk)}L${f(X(k))} ${f(cy - r)}L${f(X(k))} ${f(cy + r)}L${f(X(0))} ${f(cy + rk)}Z"/>`);
    start = k; end = L;
  } else if (head === 'button') {
    o.push(`<path d="M${f(X(k))} ${f(cy - rk)}A${f(k * s)} ${f(rk)} 0 0 0 ${f(X(k))} ${f(cy + rk)}Z"/>`);
    start = k; end = k + L;
  } else if (head === 'pan') {
    const c = Math.min(k * s * 0.6, rk * 0.5);
    o.push(`<path d="M${f(X(k))} ${f(cy - rk)}H${f(X(0) + c)}Q${f(X(0))} ${f(cy - rk)} ${f(X(0))} ${f(cy - rk + c)}V${f(cy + rk - c)}Q${f(X(0))} ${f(cy + rk)} ${f(X(0) + c)} ${f(cy + rk)}H${f(X(k))}Z"/>`);
    start = k; end = k + L;
  } else if (head === 'set') {
    start = 0; end = L;
  } else {
    o.push(`<rect x="${f(X(0))}" y="${f(cy - rk)}" width="${f(k * s)}" height="${f(2 * rk)}" rx="1"/>`);
    start = k; end = k + L;
  }
  // shank: a self-tapping screw has a flat end with a small chamfer, its ISO 1478 thread starts under the head
  // and the last turn runs out to the core; a set screw ends straight (cup point not drawn)
  const tap = tapping ? tapThread(d) : undefined;
  const pitch = tap ? tap.pitch : p;
  let teeth = '';
  if (tap) {
    const rc = (tap.core / 2) * s, ch = tap.chamfer;   // core radius (px), end chamfer (mm)
    const e = end - ch, ro = end - pitch / 2;   // chamfer start, runout start (mm): the last half pitch fades
    const crest = (mm: number) => (mm <= ro ? r : Math.max(rc, r - ((r - rc) * (mm - ro)) / (e - ro)));   // px
    // the thread is the outline: a sharp crest every pitch and a sharp root half a pitch later at the core. The
    // helix crosses the shank, so the far side's crests sit half a pitch on from the near side's
    const side = (from: number) => {
      const pts: [number, number][] = [];   // [mm, crest or root height (px)] from the head to the chamfer
      for (let a = from; a < e; a += pitch) {
        if (a >= start) pts.push([a, crest(a)]);
        if (a + pitch / 2 < e && a + pitch / 2 >= start) pts.push([a + pitch / 2, rc]);
      }
      return pts;
    };
    const P = (mm: number, h: number, sg: number) => `${f(X(mm))} ${f(cy + sg * h)}`;
    const upper = side(start), lower = side(start - pitch / 2);
    const top = upper.map(([mm, h]) => `L${P(mm, h, -1)}`).join('');
    const bottom = lower.slice().reverse().map(([mm, h]) => `L${P(mm, h, 1)}`).join('');
    o.push(`<path stroke-linejoin="miter" d="M${f(X(start))} ${f(cy - r)}${top}L${f(X(e))} ${f(cy - rc)}L${f(X(end))} ${f(cy - rc + ch * s)}V${f(cy + rc - ch * s)}L${f(X(e))} ${f(cy + rc)}${bottom}"/>`);
    // thread lines, as manuals draw them: the near half of each turn, from a crest on top to the next crest below
    for (let a = start; a + pitch / 2 < e; a += pitch) {
      teeth += `M${P(a, crest(a), -1)}L${P(a + pitch / 2, crest(a + pitch / 2), 1)}`;
    }
  } else if (head === 'set') {
    // a headless body: the drive end chamfered to the core, the thread as on the tapping screws (a saw-tooth
    // outline, the near half of each turn across the shank), the point at the far end, and the hex socket hidden
    const rc = r * 0.8, c0 = (r - rc) / s;   // core radius (px), drive end chamfer (mm)
    let e: number, re: number;   // the point starts at e (mm); the end's half height (px)
    if (point === 'cone') {
      const pl = Math.min(rc / s, L * 0.4);   // a 90 degree cone from the core
      e = L - pl; re = Math.max(0.6, rc - pl * s);
    } else {
      re = ((point === 'cup' ? SETCUP[key] : SETFLAT[key]) ?? (point === 'cup' ? 0.5 : 0.65) * d) / 2 * s;
      e = L - (rc - re) / s;   // a 45 degree chamfer from the core to the end diameter
      if (point === 'cup') {
        // the cup: a hidden cone into the end, its sharp ring the end diameter
        const cd = Math.min(re * 0.7, (L / 4) * s);
        o.push(`<path class="thin dash" d="M${f(X(L))} ${f(cy - re * 0.85)}L${f(X(L) - cd)} ${f(cy)}L${f(X(L))} ${f(cy + re * 0.85)}"/>`);
      }
    }
    const side = (from: number) => {
      const pts: [number, number][] = [];
      for (let a = from; a < e; a += p) {
        if (a > c0) pts.push([a, r]);
        if (a + p / 2 < e && a + p / 2 > c0) pts.push([a + p / 2, rc]);
      }
      return pts;
    };
    const P = (mm: number, h: number, sg: number) => `${f(X(mm))} ${f(cy + sg * h)}`;
    const top = side(c0).map(([mm, h]) => `L${P(mm, h, -1)}`).join('');
    const bottom = side(c0 - p / 2).reverse().map(([mm, h]) => `L${P(mm, h, 1)}`).join('');
    o.push(`<path stroke-linejoin="miter" d="M${f(X(0))} ${f(cy - rc)}L${P(c0, r, -1)}${top}L${P(e, rc, -1)}L${P(L, re, -1)}V${f(cy + re)}L${P(e, rc, 1)}${bottom}L${P(c0, r, 1)}L${f(X(0))} ${f(cy + rc)}Z"/>`);
    for (let a = c0 + p; a + p / 2 < e; a += p) teeth += `M${P(a, r, -1)}L${P(a + p / 2, r, 1)}`;
    // the hex socket from the drive end, hidden: across corners e = s / cos 30, depth t, then the drill point
    const kk = SETKEY[key] ?? 0.5 * d, t = Math.min(SETDEPTH[key] ?? 0.6 * d, L * 0.6);
    const hc = (kk / Math.cos(Math.PI / 6) / 2) * s, tx = X(t);
    o.push(`<path class="thin dash" d="M${f(X(0))} ${f(cy - hc)}H${f(tx)}L${f(tx + hc * 0.6)} ${f(cy)}L${f(tx)} ${f(cy + hc)}H${f(X(0))}M${f(X(0))} ${f(cy - hc / 2)}H${f(tx)}M${f(X(0))} ${f(cy + hc / 2)}H${f(tx)}M${f(tx)} ${f(cy - hc)}V${f(cy + hc)}"/>`);
    // its depth, above the screw
    const ty = cy - r - 12;
    o.push(`<path class="thin" d="M${f(X(0))} ${f(cy - r - 3)}V${f(ty - 4)}M${f(tx)} ${f(cy - hc - 2)}V${f(ty - 4)}M${f(X(0))} ${f(ty)}H${f(tx)}M${f(tx - 4)} ${f(ty - 2.5)}L${f(tx)} ${f(ty)}L${f(tx - 4)} ${f(ty + 2.5)}M${f(X(0) + 4)} ${f(ty - 2.5)}L${f(X(0))} ${f(ty)}L${f(X(0) + 4)} ${f(ty + 2.5)}"/>`);
    o.push(`<text x="${f(tx + 6)}" y="${f(ty + 4)}">t ${f(t)}</text>`);
  } else {
    o.push(`<path d="M${f(X(start))} ${f(cy - r)}H${f(X(end))}V${f(cy + r)}H${f(X(start))}"/>`);
    const n = Math.floor((end - start) / pitch);
    for (let i = 0; i < n; i++) {
      const a = X(start + i * pitch), b = X(start + (i + 0.5) * pitch);
      teeth += `M${f(a)} ${f(cy - r)}L${f(b)} ${f(cy - r * 0.78)}M${f(a)} ${f(cy + r)}L${f(b)} ${f(cy + r * 0.78)}`;
    }
  }
  o.push(`<path class="thin" d="${teeth}"/>`);
  // dimensions: L under the screw, thread at the end, head diameter at the head
  const y = cy + Math.max(rk, r) + 18;
  const l0 = head === 'countersunk' || head === 'set' ? 0 : k;
  o.push(hdim(X(l0), X(end), y, `L ${f(L)}`));
  o.push(`<path class="thin" d="M${f(X(l0))} ${f(cy + (head === 'countersunk' ? rk : r) + 3)}V${f(y + 4)}M${f(X(end))} ${f(cy + r + 3)}V${f(y + 4)}"/>`);
  o.push(vdim(X(end) + 16, cy - r, cy + r, `M${f(d)}`));
  if (dk) o.push(vdim(X(0) - 14, cy - rk, cy + rk, `⌀${f(dk)}`, true));
  // end view of the drive
  const ex = 300, er = 34;
  o.push(`<circle cx="${ex}" cy="${cy}" r="${er}"/>`);
  if (head === 'set') o.push(`<circle class="thin" cx="${ex}" cy="${cy}" r="${f(er * 0.8)}"/>`);   // the drive end's chamfer
  if (drive === 'hex') {
    const kk = (head === 'set' ? SETKEY[key] : head === 'socket-cap' || head === 'low-head' ? CAPKEY[key] : KEY[key]) ?? 0.5 * d;
    const hk = ((kk / (dk || d)) * er) / Math.cos(Math.PI / 6);
    o.push(`<path class="solid" d="M${[0, 1, 2, 3, 4, 5].map((i) => `${f(ex + hk * Math.cos((i * Math.PI) / 3))} ${f(cy + hk * Math.sin((i * Math.PI) / 3))}`).join('L')}Z"/>`);
    o.push(`<text x="${ex}" y="${cy + er + 16}" text-anchor="middle">hex ${f(kk)}</text>`);
  } else if (drive === 'torx') {
    // six lobes; the size of the matching hex key, a common stand-in for the Torx size
    const kk = (head === 'set' ? SETKEY[key] : head === 'socket-cap' || head === 'low-head' ? CAPKEY[key] : KEY[key]) ?? 0.5 * d;
    const hk = ((kk / (dk || d)) * er) * 0.62;
    const pts = Array.from({ length: 72 }, (_, i) => { const a = (i * Math.PI) / 36, rr = hk * (1 + 0.28 * Math.cos(6 * a)); return `${f(ex + rr * Math.cos(a))} ${f(cy + rr * Math.sin(a))}`; });
    o.push(`<path class="solid" d="M${pts.join('L')}Z"/>`);
    o.push(`<text x="${ex}" y="${cy + er + 16}" text-anchor="middle">Torx</text>`);
  } else {
    const a = er * 0.55, w = er * 0.14;
    o.push(`<path class="solid" d="M${f(ex - w)} ${f(cy - a)}H${f(ex + w)}V${f(cy - w)}H${f(ex + a)}V${f(cy + w)}H${f(ex + w)}V${f(cy + a)}H${f(ex - w)}V${f(cy + w)}H${f(ex - a)}V${f(cy - w)}H${f(ex - w)}Z"/>`);
    o.push(`<text x="${ex}" y="${cy + er + 16}" text-anchor="middle">${drive === 'jis' ? 'JIS cross' : 'Phillips'}</text>`);
  }
  const label = `${spec.thread}x${f(L)} ${head.replace('-', ' ')}${tapping ? ', self-tapping' : ''}`;
  const svg = `<svg class="screwdrawing" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${label}"><g class="s">${o.join('')}<text x="${W - 4}" y="12" text-anchor="end" class="std">dimensions in mm</text></g></svg>`;
  return { svg, standard, approximate };
}

// ISO 1478 tapping thread by outer diameter: pitch (M2 is ST2.2, M2.6 and M3 ST2.9, M3.5 ST3.5, M4 ST4.2),
// core 0.75 x outer (mm), and the flat end's chamfer (mm). Drawn with the outer diameter of the spec.
function tapThread(d: number) {
  const pitch = d < 2.5 ? 0.8 : d < 3.25 ? 1.1 : d < 3.75 ? 1.3 : 1.4;
  return { pitch, core: 0.75 * d, chamfer: 0.1 * d };
}

function hdim(x1: number, x2: number, y: number, label: string) {
  return `<path class="thin" d="M${f(x1)} ${f(y)}H${f(x2)}M${f(x1 + 5)} ${f(y - 3)}L${f(x1)} ${f(y)}L${f(x1 + 5)} ${f(y + 3)}M${f(x2 - 5)} ${f(y - 3)}L${f(x2)} ${f(y)}L${f(x2 - 5)} ${f(y + 3)}"/>`
    + `<text x="${f((x1 + x2) / 2)}" y="${f(y - 5)}" text-anchor="middle">${label}</text>`;
}
function vdim(x: number, y1: number, y2: number, label: string, left = false) {
  return `<path class="thin" d="M${f(x)} ${f(y1)}V${f(y2)}M${f(x - 3)} ${f(y1 + 5)}L${f(x)} ${f(y1)}L${f(x + 3)} ${f(y1 + 5)}M${f(x - 3)} ${f(y2 - 5)}L${f(x)} ${f(y2)}L${f(x + 3)} ${f(y2 - 5)}"/>`
    + `<text x="${f(left ? x - 6 : x + 6)}" y="${f((y1 + y2) / 2 + 4)}" text-anchor="${left ? 'end' : 'start'}">${label}</text>`;
}
