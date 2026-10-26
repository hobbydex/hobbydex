// Colourways: the releases of one kit that are the same car in other colours, one release per item number, e.g.
// Team Corally C-00230, C-00230-B and C-00230-R, Arrma ARA4302V3T1 and ARA4302V3T2, Axial AXI-1219T1 to T3. The site
// shows a group as one row (or one page's switch) with a swatch per colour. Two releases group when they share the
// brand, kit and kind, their item numbers share a stem and differ only in the colour code (a dash code, a T code,
// a letter code, or none for the plain release), their names are equal once colour words are removed, their colours
// differ, they are both current or both discontinued, and their years (when both known) are at most a year apart.
// Strict on purpose: a different edition, RTR vs kit, or a different number stem never groups.
import type { Release } from './data.ts';
import { colourName, nameKey } from './colourSiblings.ts';
import { colourWordsOf } from './colourSwitch.ts';

// the item number split into its stem and colour code: "C-00230-R" -> C-00230, r; "C-00230" -> C-00230, '' (plain);
// "ARA4302V3T2" -> ARA4302V3, t2; "34118T1S" -> 34118, t1 (the S is a set); "30615C" -> 30615, c
function codeOf(number: string): { stem: string; code: string } {
  const n = number.replace(/\s+/g, '').toUpperCase();
  let m = /^(.*[A-Z0-9])-([A-Z]{1,3})$/.exec(n);
  if (m) return { stem: m[1], code: m[2].toLowerCase() };
  m = /^(.*\d)T(\d)S?$/.exec(n);
  if (m) return { stem: m[1], code: `t${m[2]}` };
  m = /^(.*\d)([A-Z]{1,2})$/.exec(n);
  if (m) return { stem: m[1], code: m[2].toLowerCase() };
  return { stem: n, code: '' };
}

// the colour a release is known by: its colour field, else the colour words of its name
const labelOf = (r: Release) => r.color ?? colourName(r);

function isColourPair(a: Release, b: Release, ca: { stem: string; code: string }, cb: { stem: string; code: string }): boolean {
  return ca.code !== cb.code && labelOf(a) !== labelOf(b)
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
  const codes = new Map<string, { stem: string; code: string }>();
  const buckets = new Map<string, Release[]>();
  for (const r of pool) {
    parent.set(r.id, r.id);
    if (!r.number) continue;
    const c = codeOf(r.number);
    const name = nameKey(r);
    if (!name) continue;
    codes.set(r.id, c);
    const k = `${r.brand}|${r.kit}|${r.kind}|${c.stem}|${name}|${r.status === 'discontinued'}`;
    buckets.set(k, [...(buckets.get(k) ?? []), r]);
  }
  for (const members of buckets.values()) {
    for (let i = 0; i < members.length; i++) for (let j = i + 1; j < members.length; j++) {
      const a = members[i], b = members[j];
      if (isColourPair(a, b, codes.get(a.id)!, codes.get(b.id)!)) parent.set(find(a.id), find(b.id));
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
