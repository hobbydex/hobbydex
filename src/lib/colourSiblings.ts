// Colour siblings: the same release in another body colour, e.g. Kyosho 34118T1S and 34118T2S, Losi LOS-1056T1
// and LOS-1056T2, Arrma ARA4302V3T1 and ARA4302V3T2, or the letter-coded 30615C. Two releases pair when they share
// the brand, kit and kind, their item numbers share a stem and differ only in the colour code, their names are
// equal once colour words and set words (readyset, a trailing "w/ ..." clause) are removed, their colours differ,
// and their years (when both known) are at most a year apart. Strict on purpose: no pairing without an item number,
// a colour on both sides, or a name that is the same.
import type { Release } from './data';

const COLOURS = ['red', 'blue', 'green', 'yellow', 'orange', 'white', 'black', 'grey', 'gray', 'silver', 'purple', 'pink',
  'gold', 'clear', 'smoke', 'olive', 'tan', 'brown', 'teal', 'turquoise', 'navy', 'violet', 'lime', 'chrome', 'bronze',
  'copper', 'khaki', 'cyan', 'magenta', 'gun metal', 'gunmetal', 'champagne', 'titanium', 'aluminum', 'aluminium'];
const SHADES = 'light|dark|bright|matte|matt|neon|fluorescent';

// the colour words of a release's name: the common colours, plus the words of its colour field ("army green")
function colourRe(color?: string): string {
  const words = [...COLOURS, ...(color ? color.toLowerCase().split('/').map((s) => s.trim()).filter(Boolean) : [])]
    .sort((a, b) => b.length - a.length).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return `\\b(?:(?:${SHADES})\\s+)?(?:${words.join('|')})\\b`;
}

// the release name with the colour words, "color type N", set words and colour-only brackets removed; "" when
// nothing is left to compare
function nameKey(r: Release): string {
  const src = colourRe(r.color);
  const has = new RegExp(src, 'i');
  const s = r.name.toLowerCase()
    .replace(/\([^)]*\)|\[[^\]]*\]/g, (m) => (has.test(m) ? ' ' : m))
    .replace(/\bcolou?r\s+type\s+\d+\b/g, ' ')
    .replace(/\bw\/\s*\S+/g, ' ')
    .replace(/\bready\s*set\b/g, ' ')
    .replace(new RegExp(src, 'g'), ' ');
  return s.split(/[^\p{L}\p{N}]+/u).filter((t) => t && !/^t\d+$/.test(t)).join(' ');
}

// the item number split into its stem and colour code: "34118T1S" -> 34118, T1 (the S is a set, not a colour);
// "30615C" -> 30615, C. Undefined for numbers with no such code.
function numberParts(number?: string): { stem: string; code: string; pattern: 'type' | 'letter' } | undefined {
  if (!number) return undefined;
  const n = number.replace(/\s+/g, '').toUpperCase();
  let m = /^(.*\d)T(\d)S?$/.exec(n);
  if (m) return { stem: m[1], code: `t${m[2]}`, pattern: 'type' };
  m = /^(.*\d)([A-Z]{1,2})$/.exec(n);
  if (m) return { stem: m[1], code: m[2].toLowerCase(), pattern: 'letter' };
  return undefined;
}

// the colour name as the data gives it: the colour field, else a colour word in the name
export function colourName(r: Release): string | undefined {
  if (r.color) return r.color;
  const found = r.name.toLowerCase().match(new RegExp(colourRe(), 'g'));
  return found ? [...new Set(found.map((w) => w.trim()))].join('/') : undefined;
}

// what differs between siblings: the colour field, else the colour code of the item number, else a colour word.
// A letter code (MST's R, GR) is a colour only when the data names the colour too; "T1" and "T2" always are.
function colourKey(r: Release, p: NonNullable<ReturnType<typeof numberParts>>): string | undefined {
  if (r.color) return r.color.toLowerCase().split('/').map((s) => s.trim()).join('/');
  if (p.pattern === 'type') return p.code;
  return colourName(r)?.toLowerCase() ? p.code : undefined;
}

type Entry = { r: Release; p: NonNullable<ReturnType<typeof numberParts>>; name: string; key?: string };
const indexes = new WeakMap<Release[], Map<string, Entry[]>>();

function indexOf(pool: Release[]): Map<string, Entry[]> {
  let idx = indexes.get(pool);
  if (idx) return idx;
  idx = new Map();
  for (const r of pool) {
    const p = numberParts(r.number);
    const name = nameKey(r);
    if (!p || !name) continue;
    const k = `${r.brand}|${r.kit}|${r.kind}|${p.pattern}|${p.stem}|${name}`;
    idx.set(k, [...(idx.get(k) ?? []), { r, p, name, key: colourKey(r, p) }]);
  }
  indexes.set(pool, idx);
  return idx;
}

/** The colour siblings of a release among the pool, by item number. Empty when none pair with it. */
export function colourSiblings(release: Release, pool: Release[] = []): Release[] {
  const p = numberParts(release.number);
  const name = nameKey(release);
  if (!p || !name) return [];
  const key = colourKey(release, p);
  if (!key) return [];
  const candidates = indexOf(pool).get(`${release.brand}|${release.kit}|${release.kind}|${p.pattern}|${p.stem}|${name}`) ?? [];
  return candidates
    .filter(({ r, key: k }) => r.id !== release.id && r.number !== release.number && !!k && k !== key
      && (release.year === undefined || r.year === undefined || Math.abs(release.year - r.year) <= 1))
    .map((e) => e.r)
    .sort((a, b) => (a.number ?? '').localeCompare(b.number ?? '', undefined, { numeric: true }));
}
