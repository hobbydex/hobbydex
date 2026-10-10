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
const PITCH: Record<string, number> = { '1.4': 0.3, '1.6': 0.35, '1.7': 0.35, '2': 0.4, '2.2': 0.45, '2.3': 0.4, '2.5': 0.45, '2.6': 0.45, '3': 0.5, '3.5': 0.6, '4': 0.7, '5': 0.8, '6': 1 };

export type ScrewDrawing = { svg: string; standard?: string; approximate: boolean; note?: string };

const f = (v: number) => String(Math.round(v * 100) / 100);

export function screwDrawing(spec: Spec): ScrewDrawing | undefined {
  const d = Number(String(spec.thread ?? '').replace(/^M/, ''));
  const L = Number(spec.length_mm);
  const head = String(spec.head ?? '');
  const drive = String(spec.drive ?? 'hex');
  const tapping = spec.thread_type === 'self-tapping';
  if (!d || !L || !['socket-cap', 'low-head', 'button', 'countersunk', 'set'].includes(head)) return undefined;
  const key = String(d);
  let dk = 0, k = 0, approximate = false, standard: string | undefined;
  if (head === 'socket-cap') { const h = CAP[key]; standard = 'ISO 4762'; if (h) ({ dk, k } = h); else { dk = 1.75 * d; k = d; approximate = true; } }
  if (head === 'low-head') { const h = CAP[key]; dk = h?.dk ?? 1.75 * d; k = 0.6 * d; standard = 'DIN 7984'; approximate = !h; }
  if (head === 'button') { const h = BUTTON[key]; standard = 'ISO 7380-1'; if (h) ({ dk, k } = h); else { dk = 1.9 * d; k = 0.55 * d; approximate = true; } }
  if (head === 'countersunk') { standard = 'ISO 10642'; dk = CSK[key] ?? 2 * d; approximate = !CSK[key]; k = (dk - d) / 2; }
  if (head === 'set') { standard = 'ISO 4029'; }
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
  } else if (head === 'set') {
    start = 0; end = L;
  } else {
    o.push(`<rect x="${f(X(0))}" y="${f(cy - rk)}" width="${f(k * s)}" height="${f(2 * rk)}" rx="1"/>`);
    start = k; end = k + L;
  }
  // shank: straight end, pointed for self-tapping, a cup point for set screws
  const tip = tapping ? Math.min(d, (end - start) / 3) : 0;
  o.push(`<path d="M${f(X(start))} ${f(cy - r)}H${f(X(end - tip))}${tapping ? `L${f(X(end))} ${cy}L${f(X(end - tip))} ${f(cy + r)}` : `V${f(cy + r)}`}H${f(X(start))}${head === 'set' ? 'Z' : ''}"/>`);
  const pitch = tapping ? Math.max(p * 2, d * 0.45) : p;
  const n = Math.floor((end - start - tip) / pitch);
  let teeth = '';
  for (let i = 0; i < n; i++) {
    const a = X(start + i * pitch), b = X(start + (i + 0.5) * pitch);
    teeth += `M${f(a)} ${f(cy - r)}L${f(b)} ${f(cy - r * 0.78)}M${f(a)} ${f(cy + r)}L${f(b)} ${f(cy + r * 0.78)}`;
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
  if (drive === 'hex') {
    const kk = (head === 'set' ? SETKEY[key] : head === 'socket-cap' || head === 'low-head' ? CAPKEY[key] : KEY[key]) ?? 0.5 * d;
    const hk = ((kk / (dk || d)) * er) / Math.cos(Math.PI / 6);
    o.push(`<path class="solid" d="M${[0, 1, 2, 3, 4, 5].map((i) => `${f(ex + hk * Math.cos((i * Math.PI) / 3))} ${f(cy + hk * Math.sin((i * Math.PI) / 3))}`).join('L')}Z"/>`);
    o.push(`<text x="${ex}" y="${cy + er + 16}" text-anchor="middle">hex ${f(kk)}</text>`);
  } else {
    const a = er * 0.55, w = er * 0.14;
    o.push(`<path class="solid" d="M${f(ex - w)} ${f(cy - a)}H${f(ex + w)}V${f(cy - w)}H${f(ex + a)}V${f(cy + w)}H${f(ex + w)}V${f(cy + a)}H${f(ex - w)}V${f(cy + w)}H${f(ex - a)}V${f(cy - w)}H${f(ex - w)}Z"/>`);
    o.push(`<text x="${ex}" y="${cy + er + 16}" text-anchor="middle">${drive === 'jis' ? 'JIS cross' : 'Phillips'}</text>`);
  }
  const label = `${spec.thread}x${f(L)} ${head.replace('-', ' ')}${tapping ? ', self-tapping' : ''}`;
  const svg = `<svg class="screwdrawing" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}"><g class="s">${o.join('')}</g></svg>`;
  return { svg, standard, approximate };
}

function hdim(x1: number, x2: number, y: number, label: string) {
  return `<path class="thin" d="M${f(x1)} ${f(y)}H${f(x2)}M${f(x1 + 5)} ${f(y - 3)}L${f(x1)} ${f(y)}L${f(x1 + 5)} ${f(y + 3)}M${f(x2 - 5)} ${f(y - 3)}L${f(x2)} ${f(y)}L${f(x2 - 5)} ${f(y + 3)}"/>`
    + `<text x="${f((x1 + x2) / 2)}" y="${f(y - 5)}" text-anchor="middle">${label}</text>`;
}
function vdim(x: number, y1: number, y2: number, label: string, left = false) {
  return `<path class="thin" d="M${f(x)} ${f(y1)}V${f(y2)}M${f(x - 3)} ${f(y1 + 5)}L${f(x)} ${f(y1)}L${f(x + 3)} ${f(y1 + 5)}M${f(x - 3)} ${f(y2 - 5)}L${f(x)} ${f(y2)}L${f(x + 3)} ${f(y2 - 5)}"/>`
    + `<text x="${f(left ? x - 6 : x + 6)}" y="${f((y1 + y2) / 2 + 4)}" text-anchor="${left ? 'end' : 'start'}">${label}</text>`;
}
