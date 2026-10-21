// Drawing of an E-clip (DIN 6799) from its spec's DIN fields: the front view with the outer diameter, the opening
// at the groove diameter, the three inner lugs and the thickness. Drawn in currentColor like the other drawings.
// A spec without its DIN fields (non-standard thicknesses, bowed rings) has no drawing.
import type { Spec } from './data';
import type { ScrewDrawing } from './screwDrawing';

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
  const s = Math.min(40, 140 / D);   // px per mm: the outer ring is about 140 px across; a small clip is drawn larger
  const R = (D / 2) * s, r = (G / 2) * s;
  const cx = W / 2, cy = 50 + R;
  const h = Math.sqrt(R * R - r * r);   // height above the centre of the mouth's outer corners
  const lugDepth = 0.35 * r;
  const at = (deg: number, rad: number) => `${f(cx + rad * Math.cos((deg * Math.PI) / 180))} ${f(cy + rad * Math.sin((deg * Math.PI) / 180))}`;
  // the body: the outer arc from the top-right corner round the bottom to the top-left corner (the mouth is the gap
  // at the top, its width the groove diameter); the left mouth edge down to the groove circle; the groove arc through
  // the bottom half, with three lugs pointing inwards at 150, 90 and 30 degrees; the right mouth edge back up
  let d = `M${f(cx + r)} ${f(cy - h)}A${f(R)} ${f(R)} 0 1 1 ${f(cx - r)} ${f(cy - h)}L${f(cx - r)} ${f(cy)}`;
  for (const a of [150, 90, 30]) {
    d += `A${f(r)} ${f(r)} 0 0 0 ${at(a + 12, r)}L${at(a, r - lugDepth)}L${at(a - 12, r)}`;
  }
  d += `A${f(r)} ${f(r)} 0 0 0 ${at(0, r)}L${f(cx + r)} ${f(cy - h)}Z`;
  const o: string[] = [`<path class="fill" d="${d}"/>`];
  o.push(`<path class="thin dashdot" d="M${f(cx - R - 8)} ${f(cy)}H${f(cx + R + 8)}M${f(cx)} ${f(cy - R - 8)}V${f(cy + R + 8)}"/>`);
  o.push(`<circle class="thin dash" cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}"/>`);
  o.push(vdim(cx + R + 14, cy - R, cy + R, `⌀${f(D)}`));
  o.push(hdim(cx - r, cx + r, cy - R - 14, `⌀${f(G)}`));
  o.push(`<text x="${f(cx)}" y="${f(cy + R + 30)}" text-anchor="middle" class="std">thickness ${f(T)}</text>`);
  const H = Math.ceil(cy + R + 40);
  return {
    svg: `<svg class="screwdrawing" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${f(G)} / ${f(D)} x ${f(T)} E-clip"><g class="s">${o.join('')}<text x="${W - 4}" y="12" text-anchor="end" class="std">dimensions in mm</text></g></svg>`,
    standard: 'DIN 6799', approximate: false,
    note: 'The three lugs are drawn schematically: the spec gives no lug size',
  };
}
