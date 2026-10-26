// Colourways: the releases of one kit that are the same car in other colours, one release per item number, e.g.
// Team Corally C-00230, C-00230-B and C-00230-R, Arrma ARA4302V3T1 and ARA4302V3T2, Axial AXI-1219T1 to T3, or
// Amewi RCX10B white and grey (item numbers that differ in digits). The site shows a group as one row (or one
// page's switch) with a swatch per colour. Two releases group when they share the brand, kit, kind and status, their
// names are equal once colour words are removed, their colours differ (the colour field, else the colour word of the
// name), they are the same version (no V2 vs V3 in the item number) and edition, and their years (when both known) are
// at most a year apart. A release without an item number does not group.
// Strict on purpose: a different edition or version, RTR vs kit, 3S vs 6S, or discontinued vs current never groups.
import type { Release } from './data.ts';
import { colourName, nameKey } from './colourSiblings.ts';
import { colourWordsOf } from './colourSwitch.ts';

// the colour a release is known by: its colour field, else the colour words of its name
const labelOf = (r: Release) => r.color ?? colourName(r);

// two releases are colourways when their colours differ and their years (when both known) are at most a year apart
// the version marker of an item number (ARA4302V3T1 -> 3, AXI00001V2T3 -> 2; none -> ''): a new version is a new edition
const versionOf = (number: string) => number.match(/V(\d+)/i)?.[1] ?? '';

function isColourPair(a: Release, b: Release): boolean {
  return labelOf(a) !== labelOf(b)
    && versionOf(a.number!) === versionOf(b.number!) && a.edition === b.edition
    && (a.year === undefined || b.year === undefined || Math.abs(a.year - b.year) <= 1);
}

const cache = new WeakMap<Release[], Map<string, Release[]>>();

// the groups of a pool of releases (a kit's, or any): each a list of releases in item-number order; a release in
// no group is a group of one. Groups keep the order of the pool's first release of each.
export function colourwayGroups(pool: Release[]): Release[][] {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    const p = parent.get(x)!;
    if (p === x) return x;
    const root = find(p);
    parent.set(x, root);
    return root;
  };
  const byId = new Map(pool.map((r) => [r.id, r]));
  const buckets = new Map<string, Release[]>();
  for (const r of pool) {
    parent.set(r.id, r.id);
    if (!r.number) continue;
    const name = nameKey(r);
    if (!name) continue;
    const k = `${r.brand}|${r.kit}|${r.kind}|${name}|${r.status === 'discontinued'}`;
    buckets.set(k, [...(buckets.get(k) ?? []), r]);
  }
  for (const members of buckets.values()) {
    for (let i = 0; i < members.length; i++) for (let j = i + 1; j < members.length; j++) {
      const a = members[i], b = members[j];
      if (isColourPair(a, b)) parent.set(find(a.id), find(b.id));
    }
  }
  const groups = new Map<string, Release[]>();
  for (const r of pool) {
    const root = find(r.id);
    groups.set(root, [...(groups.get(root) ?? []), byId.get(r.id)!]);
  }
  return [...groups.values()].map((g) => g.sort((a, b) => (a.number ?? '').localeCompare(b.number ?? '', undefined, { numeric: true })));
}

/** The colourway group a release is in, among the pool (its kit's releases); a group of one when it has none. */
export function colourwayOf(release: Release, pool: Release[]): Release[] {
  let idx = cache.get(pool);
  if (!idx) {
    idx = new Map();
    for (const g of colourwayGroups(pool)) for (const r of g) idx.set(r.id, g);
    cache.set(pool, idx);
  }
  return idx.get(release.id) ?? [release];
}

/** The colour of each release of a group, for its swatch: the colour field, else the colour word its name varies by. */
export function colourLabels(group: Release[]): (string | undefined)[] {
  const derived = colourWordsOf(group.map((r) => r.name));
  return group.map((r, i) => r.color ?? derived[i]);
}

const esc = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The name of a colourway group once: the plain release's name, else the name of one member with its colour words
 * taken out ("FURAGO XD, Blue" -> "FURAGO XD"). A single release keeps its own name. */
export function groupName(group: Release[]): string {
  if (group.length === 1) return group[0].name;
  const labels = colourLabels(group);
  const i = labels.findIndex((l) => l === undefined);
  const k = i >= 0 ? i : 0;
  const r = group[k];
  const words = (labels[k] ?? '').split('/').map((w) => w.trim()).filter(Boolean);
  let s = r.name;
  for (const w of words) s = s.replace(new RegExp(`\\b${esc(w)}\\b`, 'gi'), ' ');
  return s.replace(/\(\s*\)/g, ' ').replace(/\s+/g, ' ').replace(/(\s*[-,/]){2,}\s*/g, ' - ')
    .replace(/[\s,;:/-]+$/, '').replace(/\s+,/g, ',').trim();
}
