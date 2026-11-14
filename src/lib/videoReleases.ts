// The releases a video lists, as links: colour variants (colourways, the same car in other colours) collapse to one
// link to the group's first release, labelled with the group's name and how many of its colours the video shows
// ("FURAGO XD (4 colours)"). A release the video shows alone links to itself under its own name.
import type { Release } from './data.ts';
import { colourwayOf, groupName } from './colourways.ts';

export type VideoRelease = { href: string; label: string };

export function videoReleaseLinks(listed: Release[], pool: Release[], hrefOf: (id: string) => string): VideoRelease[] {
  const groups = new Map<string, { group: Release[]; shown: Release[] }>();
  for (const r of listed) {
    const group = colourwayOf(r, pool);
    const key = group[0].id;
    const g = groups.get(key) ?? { group, shown: [] };
    if (!g.shown.some((x) => x.id === r.id)) g.shown.push(r);
    groups.set(key, g);
  }
  return [...groups.values()].map(({ group, shown }) => shown.length === 1
    ? { href: hrefOf(shown[0].id), label: shown[0].name }
    : { href: hrefOf(group[0].id), label: `${groupName(group)} (${shown.length} colours)` });
}
