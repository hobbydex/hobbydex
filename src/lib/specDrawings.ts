// Dimensioned drawings for bearing, pinion and wheel hex specs, drawn in currentColor (light and dark).
// Screws have their own module (screwDrawing.ts); specDrawing() picks the right one for a spec.
import type { Spec } from './data';
import { screwDrawing, type ScrewDrawing } from './screwDrawing';

const f = (v: number) => String(Math.round(v * 100) / 100);
const svgWrap = (w: number, h: number, label: string, body: string) =>
  `<svg class="screwdrawing" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}"><g class="s">${body}</g></svg>`;
function hdim(x1: number, x2: number, y: number, label: string) {
  return `<path class="thin" d="M${f(x1)} ${f(y)}H${f(x2)}M${f(x1 + 5)} ${f(y - 3)}L${f(x1)} ${f(y)}L${f(x1 + 5)} ${f(y + 3)}M${f(x2 - 5)} ${f(y - 3)}L${f(x2)} ${f(y)}L${f(x2 - 5)} ${f(y + 3)}"/>`
    + `<text x="${f((x1 + x2) / 2)}" y="${f(y - 5)}" text-anchor="middle">${label}</text>`;
}
function vdim(x: number, y1: number, y2: number, label: string, left = false) {
  return `<path class="thin" d="M${f(x)} ${f(y1)}V${f(y2)}M${f(x - 3)} ${f(y1 + 5)}L${f(x)} ${f(y1)}L${f(x + 3)} ${f(y1 + 5)}M${f(x - 3)} ${f(y2 - 5)}L${f(x)} ${f(y2)}L${f(x + 3)} ${f(y2 - 5)}"/>`
    + `<text x="${f(left ? x - 6 : x + 6)}" y="${f((y1 + y2) / 2 + 4)}" text-anchor="${left ? 'end' : 'start'}">${label}</text>`;
}

// Ball bearing: face view (outer ring, shield, inner ring, bore) and a section with the width, and the flange when flanged.
function bearing(spec: Spec): ScrewDrawing | undefined {
  const D = Number(spec.outer_mm), d = Number(spec.bore_mm), B = Number(spec.width_mm);
  if (!D || !d || !B) return undefined;
  const flanged = spec.type === 'flanged', thrust = spec.type === 'thrust';
  const s = Math.min(9, 110 / D), cx = 80, cy = 72, R = (D / 2) * s, r = (d / 2) * s;
  const o: string[] = [];
  o.push(`<circle cx="${cx}" cy="${cy}" r="${f(R)}"/><circle cx="${cx}" cy="${cy}" r="${f(r)}"/>`);
  const ri = r + (R - r) * 0.28, ro = R - (R - r) * 0.28;   // inner ring outer edge, outer ring inner edge
  o.push(`<circle class="thin" cx="${cx}" cy="${cy}" r="${f(ri)}"/><circle class="thin" cx="${cx}" cy="${cy}" r="${f(ro)}"/>`);
  o.push(hdim(cx - R, cx + R, cy + R + 18, `⌀${f(D)}`), `<path class="thin" d="M${f(cx - R)} ${cy}V${f(cy + R + 22)}M${f(cx + R)} ${cy}V${f(cy + R + 22)}"/>`);
  o.push(hdim(cx - r, cx + r, cy, `⌀${f(d)}`));
  // section: width B, outer diameter, the bore as hidden lines; flange as a step at one face
  const sx = 210, w = B * s, flD = D + Math.max(1, D * 0.12), flW = Math.max(0.5, B * 0.15), F = (flD / 2) * s;
  let sec = `M${sx} ${f(cy - R)}H${f(sx + w)}V${f(cy + R)}H${sx}Z`;
  if (flanged) sec += `M${sx} ${f(cy - F)}H${f(sx + flW * s)}V${f(cy + F)}H${sx}Z`;
  o.push(`<path d="${sec}"/>`, `<path class="thin dash" d="M${sx} ${f(cy - r)}H${f(sx + w)}M${sx} ${f(cy + r)}H${f(sx + w)}"/>`);
  if (!thrust) o.push(`<circle class="thin" cx="${f(sx + w / 2)}" cy="${f(cy - (r + R) / 2)}" r="${f(Math.min(w, R - r) * 0.28)}"/><circle class="thin" cx="${f(sx + w / 2)}" cy="${f(cy + (r + R) / 2)}" r="${f(Math.min(w, R - r) * 0.28)}"/>`);
  o.push(hdim(sx, sx + w, cy + Math.max(R, F) + 18, `${f(B)}`));
  if (flanged) o.push(vdim(sx + w + 14, cy - F, cy + F, `⌀${f(flD)}*`));
  const label = `${f(d)}x${f(D)}x${f(B)}${flanged ? ' flanged' : thrust ? ' thrust' : ''} bearing`;
  return { svg: svgWrap(320, 170, label, o.join('')), standard: undefined, approximate: flanged, note: flanged ? '* flange diameter drawn at the usual size; check the part' : undefined };
}

// Pinion: the gear outline with its tooth count, the pitch circle dashed, outside diameter from the module.
function pinion(spec: Spec): ScrewDrawing | undefined {
  const z = Number(spec.teeth); const m = spec.module ? Number(spec.module) : spec.pitch_dp ? 25.4 / Number(spec.pitch_dp) : 0;
  if (!z || !m) return undefined;
  const Dp = z * m, Da = Dp + 2 * m, Df = Dp - 2.5 * m;
  const s = 120 / Da, cx = 90, cy = 75, ra = (Da / 2) * s, rf = (Df / 2) * s, rp = (Dp / 2) * s;
  const pts: string[] = [];
  for (let i = 0; i < z; i++) {   // trapezoid teeth: root, flank up, tip, flank down
    const a = (2 * Math.PI * i) / z, t = Math.PI / z;
    for (const [ang, rr] of [[a - t * 0.95, rf], [a - t * 0.4, ra], [a + t * 0.4, ra], [a + t * 0.95, rf]] as [number, number][])
      pts.push(`${f(cx + rr * Math.sin(ang))} ${f(cy - rr * Math.cos(ang))}`);
  }
  const o = [`<path d="M${pts.join('L')}Z"/>`, `<circle class="thin dash" cx="${cx}" cy="${cy}" r="${f(rp)}"/>`, `<circle class="thin" cx="${cx}" cy="${cy}" r="2"/>`];
  o.push(hdim(cx - ra, cx + ra, cy + ra + 18, `⌀${f(Da)}`));
  const pitch = spec.pitch_dp ? `${spec.pitch_dp} pitch (module ${f(m)})` : `module ${f(m)}`;
  o.push(`<text x="225" y="${cy - 8}">${z} teeth</text><text x="225" y="${cy + 10}">${pitch}</text><text x="225" y="${cy + 28}" class="std">pitch circle ⌀${f(Dp)}</text>`);
  return { svg: svgWrap(380, 180, `${z}T pinion, ${pitch}`, o.join('')), standard: undefined, approximate: false };
}

// Wheel hex: the hex seen from the wheel side with its size across the flats, and the drive pin through the axle.
function wheelHex(spec: Spec): ScrewDrawing | undefined {
  const af = Number(spec.hex_mm);
  if (!af) return undefined;
  const s = 110 / (af / Math.cos(Math.PI / 6)), cx = 90, cy = 75, R = ((af / 2) / Math.cos(Math.PI / 6)) * s;
  const hex = [0, 1, 2, 3, 4, 5].map((i) => `${f(cx + R * Math.cos((i * Math.PI) / 3))} ${f(cy + R * Math.sin((i * Math.PI) / 3))}`).join('L');
  const flat = (af / 2) * s;
  const o = [`<path d="M${hex}Z"/>`, `<circle class="thin" cx="${cx}" cy="${cy}" r="${f(flat * 0.42)}"/>`];
  o.push(vdim(cx + R + 16, cy - flat, cy + flat, `${f(af)} mm`));
  o.push(`<path class="thin" d="M${f(cx + R * 0.5)} ${f(cy - flat)}H${f(cx + R + 20)}M${f(cx + R * 0.5)} ${f(cy + flat)}H${f(cx + R + 20)}"/>`);
  o.push(`<text x="${cx}" y="${f(cy + R + 22)}" text-anchor="middle" class="std">across the flats</text>`);
  return { svg: svgWrap(300, 180, `${f(af)} mm wheel hex`, o.join('')), standard: undefined, approximate: false };
}

export function specDrawing(spec: Spec): (ScrewDrawing & { note?: string }) | undefined {
  if (spec.category === 'screw') return screwDrawing(spec);
  if (spec.category === 'bearing') return bearing(spec);
  if (spec.category === 'pinion') return pinion(spec);
  if (spec.category === 'wheel-hex') return wheelHex(spec);
  return undefined;
}
