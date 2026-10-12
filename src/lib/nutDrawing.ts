// Drawing of a nut spec: a side view and a view from above, in currentColor so it follows the light and dark
// themes. The hex across flats and the height come from the spec when its standard fixes them; otherwise the
// usual proportions for the type are drawn and the drawing says so. A nylon insert lock nut shows its collar
// and the nylon ring (side and top), an all-metal lock nut its deformed top, a serrated flange its teeth.
import type { Spec } from './data';
import type { ScrewDrawing } from './screwDrawing';

const f = (v: number) => String(Math.round(v * 100) / 100);
// ISO 272 hex sizes, used for the drawing when a spec has none
const AF: Record<string, number> = { '1.6': 3.2, '2': 4, '2.2': 4.5, '2.5': 5, '2.6': 5, '3': 5.5, '4': 7, '5': 8, '6': 10, '8': 13 };

const TYPE_TEXT: Record<string, string> = {
  hex: 'hex nut', 'nylon-lock': 'nylon insert lock nut', 'metal-lock': 'all-metal lock nut', lock: 'lock nut (kind not stated)',
  flanged: 'flange nut', 'flanged-lock': 'flanged lock nut (kind not stated)', 'flanged-nylon-lock': 'flanged nylon insert lock nut',
  'serrated-flange': 'serrated flange nut', 'serrated-flange-nylon-lock': 'serrated flange nylon lock nut',
  dome: 'dome nut', 'flanged-dome': 'flanged dome nut', square: 'square nut', knurled: 'knurled nut', wing: 'wing nut', wheel: 'wheel nut',
};

function hdim(x1: number, x2: number, y: number, label: string) {
  return `<path class="thin" d="M${f(x1)} ${f(y)}H${f(x2)}M${f(x1 + 5)} ${f(y - 3)}L${f(x1)} ${f(y)}L${f(x1 + 5)} ${f(y + 3)}M${f(x2 - 5)} ${f(y - 3)}L${f(x2)} ${f(y)}L${f(x2 - 5)} ${f(y + 3)}"/>`
    + `<text x="${f((x1 + x2) / 2)}" y="${f(y + 14)}" text-anchor="middle">${label}</text>`;
}
function vdim(x: number, y1: number, y2: number, label: string) {
  return `<path class="thin" d="M${f(x)} ${f(y1)}V${f(y2)}M${f(x - 3)} ${f(y1 + 5)}L${f(x)} ${f(y1)}L${f(x + 3)} ${f(y1 + 5)}M${f(x - 3)} ${f(y2 - 5)}L${f(x)} ${f(y2)}L${f(x + 3)} ${f(y2 - 5)}"/>`
    + `<text x="${f(x + 6)}" y="${f((y1 + y2) / 2 + 4)}">${label}</text>`;
}
const hexPts = (cx: number, cy: number, R: number) => [0, 1, 2, 3, 4, 5].map((i) => `${f(cx + R * Math.cos((i * Math.PI) / 3))} ${f(cy + R * Math.sin((i * Math.PI) / 3))}`).join('L');
const circle = (cx: number, cy: number, r: number, cls = '') => `<circle${cls ? ` class="${cls}"` : ''} cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}"/>`;

export function nutDrawing(spec: Spec): ScrewDrawing | undefined {
  const thread = String(spec.thread ?? '');
  const dTxt = thread.replace(/^M/, '').split('x')[0];
  const d = Number(dTxt);
  const type = String(spec.type ?? '');
  if (!d || !TYPE_TEXT[type]) return undefined;
  const flanged = type.startsWith('flanged') || type.startsWith('serrated') || type === 'wheel';
  const serrated = type.startsWith('serrated');
  const nylon = type.includes('nylon');
  const dome = type.endsWith('dome');
  const thin = spec.profile === 'thin';
  // sizes in mm: the spec's, else the usual proportions
  const afSpec = Number(spec.across_flats_mm) || 0, hSpec = Number(spec.height_mm) || 0;
  const af = afSpec || (type === 'knurled' ? 2.2 * d : AF[dTxt] ?? 1.75 * d);
  const usual: Record<string, number> = {
    hex: thin ? 0.5 * d : 0.8 * d, 'nylon-lock': thin ? 1.3 * d : spec.profile === 'regular' ? 1.6 * d : 1.3 * d, 'metal-lock': 1.1 * d, lock: thin ? 0.7 * d : 1.2 * d,
    flanged: 0.9 * d, 'flanged-lock': 1.2 * d, 'flanged-nylon-lock': 1.4 * d, 'serrated-flange': 1.1 * d, 'serrated-flange-nylon-lock': 1.4 * d,
    dome: 1.8 * d, 'flanged-dome': 1.9 * d, square: 0.6 * d, knurled: 0.9 * d, wing: 1.3 * d, wheel: 1.2 * d,
  };
  const h = hSpec || usual[type];
  const approximate = !afSpec || !hSpec;
  const label = `${spec.thread} ${spec.profile ? `${spec.profile} ` : ''}${TYPE_TEXT[type]}`;
  const square = type === 'square', round = type === 'knurled', wing = type === 'wing';
  const e = square || round ? af : af / Math.cos(Math.PI / 6);   // width across the corners (side view)
  const fd = flanged ? af * 1.45 : 0;                             // flange diameter, drawn at the usual size
  const ft = flanged ? Math.max(0.5, 0.18 * d) : 0;
  const span = Math.max(e, fd, wing ? af * 2.4 : 0);
  const s = Math.min(16, 118 / span, 96 / h);                     // px per mm
  const o: string[] = [];

  // side view: base on the line y0, the nut upwards; x centred on sx
  const sx = 24 + (span / 2) * s, y0 = 26 + 96 + (dome ? 0 : 0), top = y0 - h * s;
  const hw = (e / 2) * s;
  const collar = nylon ? 0.32 * h : dome ? 0 : 0;                 // nylon collar height
  const domeH = dome ? Math.min(0.55 * h, af / 2) : 0;
  const bodyTop = top + (collar + domeH) * s;                    // top of the hex part
  const bodyBot = y0 - ft * s;
  if (flanged) {
    const fr = (fd / 2) * s;
    if (serrated) {
      // the flange with its teeth along the bearing face
      const n = 9, step = (2 * fr) / n;
      let teeth = `M${f(sx - fr)} ${f(bodyBot)}L${f(sx - fr)} ${f(y0 - 1.5)}`;
      for (let i = 0; i < n; i++) teeth += `L${f(sx - fr + (i + 0.5) * step)} ${f(y0 + 1.5)}L${f(sx - fr + (i + 1) * step)} ${f(y0 - 1.5)}`;
      o.push(`<path d="${teeth}L${f(sx + fr)} ${f(bodyBot)}Z"/>`);
    } else {
      o.push(`<path d="M${f(sx - fr)} ${f(bodyBot)}L${f(sx - fr + 2)} ${f(y0)}H${f(sx + fr - 2)}L${f(sx + fr)} ${f(bodyBot)}Z"/>`);
    }
  }
  if (wing) {
    const ww = af * 1.2 * s;
    o.push(`<path d="M${f(sx - hw)} ${f(y0 - 0.25 * h * s)}Q${f(sx - ww)} ${f(y0 - 0.3 * h * s)} ${f(sx - ww)} ${f(top)}Q${f(sx - hw * 1.2)} ${f(top + 0.1 * h * s)} ${f(sx - hw * 0.8)} ${f(top + 0.5 * h * s)}`
      + `M${f(sx + hw)} ${f(y0 - 0.25 * h * s)}Q${f(sx + ww)} ${f(y0 - 0.3 * h * s)} ${f(sx + ww)} ${f(top)}Q${f(sx + hw * 1.2)} ${f(top + 0.1 * h * s)} ${f(sx + hw * 0.8)} ${f(top + 0.5 * h * s)}"/>`);
  }
  // the body: a hex shows three faces from the side, a square or knurled nut one
  const metalTop = type === 'metal-lock';
  const ch = Math.min(2, (bodyBot - bodyTop) * 0.15);
  const pinch = metalTop ? hw * 0.12 : 0;                         // deformed (oval) top of an all-metal lock nut
  o.push(`<path d="M${f(sx - hw)} ${f(bodyBot)}V${f(bodyTop + ch)}L${f(sx - hw + ch + pinch)} ${f(bodyTop)}H${f(sx + hw - ch - pinch)}L${f(sx + hw)} ${f(bodyTop + ch)}V${f(bodyBot)}Z"/>`);
  if (!square && !round && !wing) o.push(`<path class="thin" d="M${f(sx - hw / 2)} ${f(bodyTop)}V${f(bodyBot)}M${f(sx + hw / 2)} ${f(bodyTop)}V${f(bodyBot)}"/>`);
  if (round) {
    let k = '';
    for (let i = 1; i < 12; i++) { const x = sx - hw + (i * 2 * hw) / 12; k += `M${f(x)} ${f(bodyTop + 1)}V${f(bodyBot - 1)}`; }
    o.push(`<path class="thin" d="${k}"/>`);
  }
  if (metalTop) o.push(`<path class="thin" d="M${f(sx - hw * 0.6)} ${f(bodyTop + 2)}Q${f(sx)} ${f(bodyTop + 5)} ${f(sx + hw * 0.6)} ${f(bodyTop + 2)}"/>`);
  if (nylon) {
    // the collar on top, with the nylon ring inside it (hidden lines show the ring)
    const cw = hw * 0.86, cTop = top;
    o.push(`<path d="M${f(sx - cw)} ${f(bodyTop)}V${f(cTop + 2)}Q${f(sx - cw)} ${f(cTop)} ${f(sx - cw + 2)} ${f(cTop)}H${f(sx + cw - 2)}Q${f(sx + cw)} ${f(cTop)} ${f(sx + cw)} ${f(cTop + 2)}V${f(bodyTop)}"/>`);
    const rr = (d / 2) * s, ro = cw * 0.86;
    o.push(`<path class="nylon" d="M${f(sx - ro)} ${f(cTop + 1.6)}H${f(sx - rr)}V${f(bodyTop - 1)}H${f(sx - ro)}ZM${f(sx + rr)} ${f(cTop + 1.6)}H${f(sx + ro)}V${f(bodyTop - 1)}H${f(sx + rr)}Z"/>`);
  }
  if (dome) {
    const rw = hw * 0.8;
    o.push(`<path d="M${f(sx - rw)} ${f(bodyTop)}V${f(top + domeH * s * 0.6)}A${f(rw)} ${f(domeH * s * 0.6)} 0 0 1 ${f(sx + rw)} ${f(top + domeH * s * 0.6)}V${f(bodyTop)}"/>`);
  }
  // the thread as hidden lines, through the nut or up to the dome
  const r = (d / 2) * s;
  const tTop = dome ? bodyTop : nylon ? top + 1.6 : bodyTop;
  o.push(`<path class="thin dash" d="M${f(sx - r)} ${f(tTop)}V${f(y0)}M${f(sx + r)} ${f(tTop)}V${f(y0)}"/>`);
  o.push(`<path class="thin dashdot" d="M${f(sx)} ${f(top - 6)}V${f(y0 + 6)}"/>`);
  // height at the right of the side view
  const right = sx + Math.max(hw, (fd / 2) * s, wing ? af * 1.2 * s : 0);
  o.push(`<path class="thin" d="M${f(right + 2)} ${f(top)}H${f(right + 16)}M${f(right + 2)} ${f(y0)}H${f(right + 16)}"/>`);
  o.push(vdim(right + 12, top, y0, `${f(h)}${hSpec ? '' : '*'}`));

  // view from above
  const tx = right + 62 + (span / 2) * s, ty = 26 + 48, R = (e / 2) * s;
  if (flanged) o.push(circle(tx, ty, (fd / 2) * s, 'thin'));
  if (flanged && serrated) {
    let t = '';
    const fr = (fd / 2) * s;
    for (let i = 0; i < 36; i++) { const a = (i * Math.PI) / 18; t += `M${f(tx + fr * 0.9 * Math.cos(a))} ${f(ty + fr * 0.9 * Math.sin(a))}L${f(tx + fr * Math.cos(a))} ${f(ty + fr * Math.sin(a))}`; }
    o.push(`<path class="thin" d="${t}"/>`);
  }
  if (wing) {
    const ww = af * 1.2 * s;
    o.push(`<path d="M${f(tx - R * 0.7)} ${f(ty - 3)}H${f(tx - ww)}V${f(ty + 3)}H${f(tx - R * 0.7)}M${f(tx + R * 0.7)} ${f(ty - 3)}H${f(tx + ww)}V${f(ty + 3)}H${f(tx + R * 0.7)}"/>`);
  }
  if (square) o.push(`<rect x="${f(tx - R)}" y="${f(ty - R)}" width="${f(2 * R)}" height="${f(2 * R)}"/>`);
  else if (round || wing) o.push(circle(tx, ty, R));
  else o.push(`<path d="M${hexPts(tx, ty, R)}Z"/>`);
  if (!square && !round && !wing) o.push(circle(tx, ty, (af / 2) * s * 0.95, 'thin'));   // the chamfer circle
  if (nylon) o.push(`<path class="nylon" fill-rule="evenodd" d="M${f(tx - R * 0.74)} ${f(ty)}a${f(R * 0.74)} ${f(R * 0.74)} 0 1 0 ${f(R * 1.48)} 0a${f(R * 0.74)} ${f(R * 0.74)} 0 1 0 ${f(-R * 1.48)} 0ZM${f(tx - r)} ${f(ty)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z"/>`);
  if (dome) o.push(circle(tx, ty, R * 0.75 * 0.86), circle(tx, ty, r, 'thin dash'));
  else o.push(circle(tx, ty, r), circle(tx, ty, r * 0.84, 'thin'));
  if (metalTop) for (const a of [0, 2, 4]) { const an = (a * Math.PI) / 3 + Math.PI / 6; o.push(circle(tx + R * 0.62 * Math.cos(an), ty + R * 0.62 * Math.sin(an), 1.6, 'solid')); }
  // across the flats (hex) or the side (square), below the top view
  const fl = (af / 2) * s;
  const by = ty + Math.max(R, (fd / 2) * s) + 14;
  if (!round && !wing) {
    o.push(`<path class="thin" d="M${f(tx - fl)} ${f(ty)}V${f(by + 4)}M${f(tx + fl)} ${f(ty)}V${f(by + 4)}"/>`);
    o.push(hdim(tx - fl, tx + fl, by, `${f(af)}${afSpec ? '' : '*'}`));
  }
  o.push(`<text x="${f(tx)}" y="${f(Math.max(by + 34, y0 + 30))}" text-anchor="middle" class="std">${label}</text>`);
  const labelHalf = (label.length * 5.6) / 2;   // the caption under the top view, 11px text
  const W = Math.ceil(Math.max(tx + Math.max(R, (fd / 2) * s, wing ? af * 1.2 * s : 0) + 24, tx + labelHalf + 6));
  const H = Math.ceil(Math.max(by + 40, y0 + 36));
  const svg = `<svg class="screwdrawing" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${label}, from the side and from above"><g class="s">${o.join('')}<text x="${W - 4}" y="12" text-anchor="end" class="std">dimensions in mm</text></g></svg>`;
  const note = approximate ? '* not fixed by the spec: drawn with the usual proportions for this type' : undefined;
  const std = (spec.standards as string[] | undefined)?.[0];
  return { svg, standard: std, approximate, note };
}
