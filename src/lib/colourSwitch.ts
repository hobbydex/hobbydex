// The colour switch of a part whose range is one part in several colours (range "...-colours"): one swatch per
// version of the range, the page's own part marked. A version whose colour is not in the palette has no swatch
// and shows its number instead.
import type { Part } from './data';

export type SwitchItem = { id: string; number?: string; colour?: string; current: boolean };

export function colourSwitchItems(part: Part, others: Part[]): SwitchItem[] {
  const all = [part, ...others.filter((o) => o.id !== part.id)];
  return all
    .slice()
    .sort((a, b) => (a.number ?? a.id).localeCompare(b.number ?? b.id, undefined, { numeric: true }))
    .map((o) => ({
      id: o.id,
      number: o.number,
      colour: o.color,
      current: o.id === part.id,
    }));
}
