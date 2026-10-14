// A small dot for a part's colour as named in the data (`color`, `wheel_color`: "blue", "gun metal",
// "black/red"). The names are words, not measured colours, so each maps to a fixed palette value;
// metals get a sheen, clear and smoke a checker behind them. "black/red" is a dot split in two halves.
// A word the palette does not know gets no dot. Paints keep their sampled swatch (paintSwatch.ts).

type Shade = { c: string; metal?: boolean; see?: boolean };   // see: see-through, drawn over a checker

const PALETTE: Record<string, Shade> = {
  black: { c: '#1b1b1d' }, white: { c: '#ffffff' }, red: { c: '#d32f2f' }, blue: { c: '#1f5fd6' },
  green: { c: '#2e9d3a' }, orange: { c: '#f57c00' }, yellow: { c: '#fdd835' }, pink: { c: '#ec5f9e' },
  purple: { c: '#7b3fb0' }, violet: { c: '#8f5fd8' }, magenta: { c: '#c2187a' }, gray: { c: '#8a8f96' },
  brown: { c: '#7a4a25' }, tan: { c: '#d2b48c' }, khaki: { c: '#b8a46a' }, sand: { c: '#d8c391' },
  olive: { c: '#6b6f2a' }, turquoise: { c: '#2ab7b0' }, teal: { c: '#148a8a' }, cyan: { c: '#22c3e6' },
  flesh: { c: '#f1c6a7' }, 'navy blue': { c: '#1f2f6b' }, 'lime green': { c: '#8bc34a' }, 'lime yellow': { c: '#d4e034' },
  'yellow green': { c: '#a5c33a' }, 'olive green': { c: '#5e6b2a' }, 'army green': { c: '#4b5a2a' }, 'military green': { c: '#4b5a2a' }, 'red brown': { c: '#8a3324' },
  // anodized shades
  'light blue': { c: '#4fa8e8' }, 'dark blue': { c: '#173d8f' }, 'charcoal gray': { c: '#4a4e54' }, 'light gray': { c: '#c3c7cc' },
  'dark gray': { c: '#55595f' }, 'light green': { c: '#7fcf6a' }, 'dark green': { c: '#1f5e2c' },
  // metals, with a sheen
  silver: { c: '#bfc3c8', metal: true }, aluminum: { c: '#c4c8cc', metal: true }, chrome: { c: '#d9dde1', metal: true },
  'gun metal': { c: '#4f565c', metal: true }, gold: { c: '#c9a23a', metal: true }, 'champagne gold': { c: '#d7c08a', metal: true },
  bronze: { c: '#a0703a', metal: true }, copper: { c: '#b8683d', metal: true }, titanium: { c: '#8c8f93', metal: true },
  platinum: { c: '#d5d3cc', metal: true }, 'black chrome': { c: '#2d3034', metal: true }, 'black metal chrome': { c: '#2d3034', metal: true },
  // see-through
  clear: { c: 'rgba(255,255,255,0)', see: true }, smoke: { c: 'rgba(40,40,44,0.6)', see: true },
};
const ALIAS: Record<string, string> = { grey: 'gray', gunmetal: 'gun metal', chromed: 'chrome', golden: 'gold', aluminium: 'aluminum',
  transparent: 'clear', navy: 'navy blue', lime: 'lime green' };
// words before a colour that only change its finish, or how light it is
const FINISH = new Set(['matte', 'matt', 'flat', 'satin', 'gloss', 'glossy', 'high', 'metallic', 'pearl', 'anodized', 'titanium']);
const FLUO: Record<string, string> = { yellow: '#e8ff1a', green: '#39ff3a', pink: '#ff3fa8', orange: '#ff6a13', red: '#ff2b2b', blue: '#1f8bff' };

function mix(hex: string, to: number, t: number) {
  return '#' + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - t) + to * t).toString(16).padStart(2, '0')).join('');
}

function shade(word: string): Shade | undefined {
  let w = word.trim().toLowerCase().replace(/[\s-]+/g, ' ').replace(/ anodi[sz]ed$/, '');
  w = ALIAS[w] ?? w;
  if (PALETTE[w]) return PALETTE[w];
  const [first, ...rest] = w.split(' '), base = rest.join(' ');
  if (!base) return undefined;
  if (FINISH.has(first)) return shade(base);
  const b = PALETTE[ALIAS[base] ?? base];
  if (!b || b.see) return first === 'translucent' && b ? b : undefined;
  if (first === 'light' && !b.metal) return { c: mix(b.c, 255, 0.45) };
  if (first === 'dark' && !b.metal) return { c: mix(b.c, 0, 0.4) };
  if (first === 'fluorescent' || first === 'fluo' || first === 'neon') return FLUO[base] ? { c: FLUO[base] } : undefined;
  if (first === 'translucent') return { c: b.c + '99', see: true };
  return undefined;
}

const SHEEN = 'linear-gradient(135deg, rgba(0,0,0,0.15) 0%, rgba(255,255,255,0.85) 35%, rgba(255,255,255,0.1) 55%, rgba(0,0,0,0.3) 100%)';
const CHECKER = 'repeating-conic-gradient(#bbb 0 25%, #fff 0 50%) 0 0 / 50% 50%';

/** The CSS background of the dot for a colour name, or undefined when a word is not in the palette. */
export function colourDotStyle(color: string | undefined): string | undefined {
  if (!color) return undefined;
  const parts = color.split('/').map((s) => s.trim()).filter(Boolean);
  if (parts.length < 1 || parts.length > 3) return undefined;
  const shades = parts.map(shade);
  if (shades.some((s) => !s)) return undefined;
  const ss = shades as Shade[], n = ss.length, w = 100 / n;
  const layers: string[] = [];
  if (ss.every((s) => s.metal)) layers.push(SHEEN);
  else ss.forEach((s, i) => { if (s.metal) layers.push(`${SHEEN} ${i * w}% 0 / ${w}% 100% no-repeat`); });
  // one colour fills the dot; two or three stand side by side as vertical bands
  layers.push(n === 1 ? `linear-gradient(${ss[0].c}, ${ss[0].c})`
    : `linear-gradient(90deg, ${ss.map((s, i) => `${s.c} ${i * w}% ${(i + 1) * w}%`).join(', ')})`);
  if (ss.some((s) => s.see)) layers.push(CHECKER);
  return `background: ${layers.join(', ')}`;
}

/** The palette shades for a colour name ("red", "black/red"), or undefined when a word is unknown. */
export function colourShades(color: string | undefined): { c: string; metal?: boolean; see?: boolean }[] | undefined {
  if (!color) return undefined;
  const parts = color.split('/').map((s) => s.trim()).filter(Boolean);
  if (parts.length < 1 || parts.length > 3) return undefined;
  const shades = parts.map(shade);
  return shades.some((s) => !s) ? undefined : (shades as Shade[]);
}

/** An inline dot (HTML) for a colour name with the name as its title and label, or '' for an unknown colour. */
export function colourDot(color: string | undefined): string {
  const style = colourDotStyle(color);
  if (!style) return '';
  const label = color!.replace(/"/g, '');
  return `<span class="cdot" role="img" aria-label="${label}" title="${label}" style="${style}"></span>`;
}
