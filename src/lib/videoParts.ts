// The parts a video lists, as links, and the choice of what a video card links. Colour versions of one part (a
// range "...-colours") collapse to one link to the version with the lowest number, labelled with the name the
// versions share and how many of them the video shows ("IR80-30 Pickup Hard Body (4 colours)"). A part the video
// shows alone links to itself under its own name.
import type { Part } from './data.ts';
import type { VideoRelease } from './videoReleases.ts';

const byNumber = (a: Part, b: Part) => (a.number ?? a.id).localeCompare(b.number ?? b.id, undefined, { numeric: true });

// the start the names share, cut back to a whole word and stripped of a trailing separator or open bracket
function sharedName(names: string[]): string {
  let s = names.reduce((a, b) => { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return a.slice(0, i); });
  if (names.some((n) => n.length > s.length && /[\p{L}\p{N}]/u.test(n[s.length]))) s = s.replace(/[\p{L}\p{N}]+$/u, '');
  return s.replace(/[\s([{,;:/-]+$/u, '').trim();
}

export function videoPartLinks(listed: Part[], hrefOf: (id: string) => string): VideoRelease[] {
  const groups = new Map<string, Part[]>();
  for (const p of listed) {
    const key = p.range?.endsWith('-colours') ? `range:${p.range}` : p.id;
    const g = groups.get(key) ?? [];
    if (!g.some((x) => x.id === p.id)) g.push(p);
    groups.set(key, g);
  }
  return [...groups.values()].map((shown) => {
    if (shown.length === 1) return { href: hrefOf(shown[0].id), label: shown[0].name };
    const sorted = [...shown].sort(byNumber);
    const name = sharedName(sorted.map((p) => p.name));
    return { href: hrefOf(sorted[0].id), label: `${name.length >= 3 ? name : sorted[0].name} (${shown.length} colours)` };
  });
}

/** What a video card links: its releases; when it has none, its parts; when it has neither, its platforms. */
export function videoLinks(releases: VideoRelease[], parts: () => VideoRelease[], platforms: () => VideoRelease[]): VideoRelease[] {
  if (releases.length > 0) return releases;
  const p = parts();
  return p.length > 0 ? p : platforms();
}
