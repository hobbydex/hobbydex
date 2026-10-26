// The colour switch of a part whose range is one part in several colours (range "...-colours"): one swatch per
// version of the range, the page's own part marked. A version whose colour is not in the palette has no swatch
// and shows its number instead.
import type { Part } from './data';
import { colourDotStyle } from './colourDot.ts';

export type SwitchItem = { id: string; number?: string; colour?: string; current: boolean; href?: string };

// the palette colour words (one or two words) in a name, longer phrases first: "light blue" keeps "blue" out
function nameColourWords(name: string): string[] {
  const t = name.toLowerCase().split(/[^\p{L}]+/u).filter(Boolean);
  const found = new Set<string>();
  for (let i = 0; i < t.length; i++) for (const n of [1, 2]) {
    const g = t.slice(i, i + n);
    if (g.length === n && colourDotStyle(g.join(' '))) found.add(g.join(' '));
  }
  const all = [...found];
  return all.filter((w) => !all.some((o) => o !== w && ` ${o} `.includes(` ${w} `)));
}

/** For names of a set of versions that differ only in a colour word ("... - Green - 1 pc", "... - Red - 1 pc"):
 * the colour word that varies in each name, or undefined when a name has no single varying colour word. */
export function colourWordsOf(names: string[]): (string | undefined)[] {
  if (names.length === 0) return [];
  const cands = names.map(nameColourWords);
  const common = cands.reduce((a, b) => a.filter((w) => b.includes(w)));
  return cands.map((c) => {
    const varying = c.filter((w) => !common.includes(w));
    return varying.length === 1 ? varying[0] : undefined;
  });
}

export function colourSwitchItems(part: Part, others: Part[]): SwitchItem[] {
  const all = [part, ...others.filter((o) => o.id !== part.id)];
  // a version without a colour field takes the colour word its name varies by (the parts whose two colour words differ per version)
  const derived = colourWordsOf(all.map((o) => o.name));
  return all
    .map((o, i) => ({ o, colour: o.color ?? derived[i] }))
    .sort((a, b) => (a.o.number ?? a.o.id).localeCompare(b.o.number ?? b.o.id, undefined, { numeric: true }))
    .map(({ o, colour }) => ({
      id: o.id,
      number: o.number,
      colour,
      current: o.id === part.id,
    }));
}
