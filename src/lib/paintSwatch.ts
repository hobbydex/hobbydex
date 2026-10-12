// A paint's approximate colour (part.swatch, sampled from the maker's colour chart) drawn as a small
// spray can (application spray-can) or a paint bottle (everything else), outlined in currentColor
// (light and dark). The finish shows as a sheen (metallic, pearl, chrome), a brighter tint
// (fluorescent) or a checker under a see-through fill (translucent, clear).
import type { Part } from './data';

const HEX = /^#[0-9a-f]{6}$/;

// Fluorescent paints glow: push the sampled colour towards full saturation and a little lighter.
function brighter(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  let h = 0;
  if (d) h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  const s2 = d ? 1 : 0, l2 = Math.min(0.62, l * 1.08 + 0.04);
  const c = (1 - Math.abs(2 * l2 - 1)) * s2, x = c * (1 - Math.abs((h % 2) - 1)), m = l2 - c / 2;
  const [R, G, B] = h < 1 ? [c, x, 0] : h < 2 ? [x, c, 0] : h < 3 ? [0, c, x] : h < 4 ? [0, x, c] : h < 5 ? [x, 0, c] : [c, 0, x];
  return '#' + [R, G, B].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('');
}

/** Inline SVG of the paint's container in its swatch colour, or undefined when the part has no swatch. */
export function paintSwatch(p: Part, size: 'small' | 'large' = 'small'): string | undefined {
  if (!p.swatch || !HEX.test(p.swatch)) return undefined;
  const id = 'sw' + p.id.replace(/[^a-z0-9]/gi, '');
  const finish = p.finish ?? '';
  const can = p.application === 'spray-can';
  const fill = finish === 'fluorescent' ? brighter(p.swatch) : p.swatch;
  const see = finish === 'translucent' ? 0.6 : finish === 'clear' ? 0.25 : 1;
  const sheen = finish === 'metallic' || finish === 'pearl' || finish === 'chrome';
  const W = 24, H = can ? 44 : 30;
  // the painted body: a can with a rounded shoulder, or a squat jar under its cap
  const body = can ? `M4 14Q4 10 8 9H16Q20 10 20 14V41Q20 42 19 42H5Q4 42 4 41Z` : `M3 12Q3 11 4 11H20Q21 11 21 12V27Q21 28 20 28H4Q3 28 3 27Z`;
  const cap = can ? `<path class="o" d="M8 9V5H16V9"/><path class="o" d="M10.5 5V2.5H13.5V5"/>` : `<rect class="o" x="5" y="3" width="14" height="8" rx="1"/>`;
  const defs: string[] = [];
  const layers: string[] = [];
  if (see < 1) {
    defs.push(`<pattern id="${id}c" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="#fff"/><rect width="2" height="2" fill="#bbb"/><rect x="2" y="2" width="2" height="2" fill="#bbb"/></pattern>`);
    layers.push(`<path d="${body}" fill="url(#${id}c)"/>`);
  }
  layers.push(`<path d="${body}" fill="${fill}" fill-opacity="${see}"/>`);
  if (sheen) {
    const hi = finish === 'chrome' ? 0.85 : 0.6, tint = finish === 'pearl' ? '#f4e8ff' : '#fff';
    defs.push(`<linearGradient id="${id}s" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#000" stop-opacity="0.25"/><stop offset="0.3" stop-color="${tint}" stop-opacity="${hi}"/><stop offset="0.45" stop-color="${tint}" stop-opacity="0.1"/><stop offset="0.8" stop-color="#000" stop-opacity="0.1"/><stop offset="1" stop-color="#000" stop-opacity="0.35"/></linearGradient>`);
    layers.push(`<path d="${body}" fill="url(#${id}s)"/>`);
  }
  if (finish === 'fluorescent') layers.push(`<path d="${body}" fill="none" stroke="${fill}" stroke-opacity="0.45" stroke-width="3"/>`);
  layers.push(`<path class="o" d="${body}"/>`);
  if (can) layers.push(`<path class="o thin" d="M4 16H20"/>`);   // the label band's top edge
  const scale = size === 'large' ? 1.6 : 0.55;
  const label = `approximate colour ${p.swatch}${finish ? `, ${finish}` : ''}`;
  return `<svg class="paintswatch" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${Math.round(W * scale)}" height="${Math.round(H * scale)}" role="img" aria-label="${label}">`
    + (defs.length ? `<defs>${defs.join('')}</defs>` : '') + layers.join('') + cap + `</svg>`;
}

/** A plain colour chip (a rounded square, or a circle for tables) in the swatch colour, with the same finish effects. */
export function paintChip(p: Part, px = 120, shape: 'square' | 'circle' = 'square'): string | undefined {
  if (!p.swatch || !HEX.test(p.swatch)) return undefined;
  const id = 'ch' + px + p.id.replace(/[^a-z0-9]/gi, '');
  const finish = p.finish ?? '';
  const fill = finish === 'fluorescent' ? brighter(p.swatch) : p.swatch;
  const see = finish === 'translucent' ? 0.6 : finish === 'clear' ? 0.25 : 1;
  const sheen = finish === 'metallic' || finish === 'pearl' || finish === 'chrome';
  const shapeEl = (attrs: string) => shape === 'circle' ? `<circle cx="50" cy="50" r="48" ${attrs}/>` : `<rect x="2" y="2" width="96" height="96" rx="10" ${attrs}/>`;
  const defs: string[] = [], layers: string[] = [];
  if (see < 1) {
    defs.push(`<pattern id="${id}c" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#fff"/><rect width="5" height="5" fill="#bbb"/><rect x="5" y="5" width="5" height="5" fill="#bbb"/></pattern>`);
    layers.push(shapeEl(`fill="url(#${id}c)"`));
  }
  layers.push(shapeEl(`fill="${fill}" fill-opacity="${see}"`));
  if (sheen) {
    const hi = finish === 'chrome' ? 0.85 : 0.6, tint = finish === 'pearl' ? '#f4e8ff' : '#fff';
    defs.push(`<linearGradient id="${id}s" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0.2"/><stop offset="0.35" stop-color="${tint}" stop-opacity="${hi}"/><stop offset="0.5" stop-color="${tint}" stop-opacity="0.1"/><stop offset="1" stop-color="#000" stop-opacity="0.3"/></linearGradient>`);
    layers.push(shapeEl(`fill="url(#${id}s)"`));
  }
  layers.push(shapeEl(`fill="none" stroke="currentColor" stroke-opacity="0.35" stroke-width="2"`));   // an edge, so white paints still show
  const label = `approximate colour ${p.swatch}${finish ? `, ${finish}` : ''}`;
  return `<svg class="paintchip" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${px}" height="${px}" role="img" aria-label="${label}">`
    + (defs.length ? `<defs>${defs.join('')}</defs>` : '') + layers.join('') + `</svg>`;
}
