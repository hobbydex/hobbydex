import { createHash } from 'node:crypto';
import { db, key, brandName, dateKey, dateDoubt, releasedOf, seenOnly, seenKind } from './data';
import { releaseType, releaseScale } from './releaseTypes';
import { kitTypeLabel, kitTypeIcon, kitTypeOrder } from './kitTypes';
import { wideIcons } from './wideIcons';
import { buildLabel, powerLabel } from './build';
import { colourShades } from './colourDot';
import { releaseColour, colourwayGroups, colourLabels, groupName } from './colourways';
import { colourDotStyle } from './colourDot';

// The release list for the filterable table on /rc/releases/ (list.json). Each row is an array:
// [id tail, name, brand, type, scale, build, status, date, flags, art, colour, doubt, group, power], trailing nulls left out.
// Brand, type, scale, build and status index the lists beside the rows; colour and doubt index `colours` and
// `doubts`. The release URL is /rc/releases/<brand slug>/<id tail>/. The date is the release's date key ("2026-11",
// "2012-05-01" or "" when undated). art is the file name of the release's outline in /art/ (see releaseArts).
// flags: 1 = a seen_by bound only (the date reads "by ..." with an asterisk), 4 = that bound is an archive capture,
// 8 = a video upload (neither: a page we saw), 2 = an announced date (the date reads "announced ...").
// The 14th column is the power system: an index into `powers` ([value, label]; "unpowered" is a release with no motor or engine), null when no source states it.
// A row with a doubt index has a date we are not sure of (the "?" with that reason).
// The 13th column is the row's colourway group (lib/colourways.ts): an index into `groups`, or null. A group is
// [name, [[id tail, swatch style, swatch name, livery flag], ...]]; the table shows its releases as one row with a swatch per colour.
export function releaseList() {
  const ids = (xs: string[]) => new Map(xs.map((x, i) => [x, i]));
  const brandIds = [...new Set(db.releases.map((r) => r.brand))].sort((a, b) => brandName(a).localeCompare(brandName(b)));
  const types = [...new Set(db.releases.map(releaseType))].sort((a, b) => (kitTypeOrder.indexOf(a) + 1 || 99) - (kitTypeOrder.indexOf(b) + 1 || 99));
  const scales = [...new Set(db.releases.map(releaseScale))].sort((a, b) => (a ? Number(a.split('/')[1]) : 999) - (b ? Number(b.split('/')[1]) : 999));
  const builds = ['kit', 'rtr', 'arr', 'roller', 'print', ''].filter((b) => db.releases.some((r) => (r.kind ?? '') === b));
  // the power filter: the systems that occur, then "unpowered" (a release sold without motor or engine); a release that states none has no index
  const powers = ['brushless', 'brushed', 'nitro', 'gas', 'none'].filter((x) => db.releases.some((r) => r.power === x));
  const powerValue = (x: string) => (x === 'none' ? 'unpowered' : x);
  const statuses = ['released', 'announced', 'discontinued'].filter((s) => db.releases.some((r) => r.status === s));
  const colours: string[] = [], doubts: string[] = [];
  const index = (xs: string[], x: string) => { let i = xs.indexOf(x); if (i < 0) i = xs.push(x) - 1; return i; };
  const bi = ids(brandIds), ti = ids(types), si = ids(scales), ui = ids(builds), sti = ids(statuses), pi = ids(powers);
  const groups: unknown[] = [];
  const groupOf = new Map<string, number>();
  for (const g of colourwayGroups(db.releases)) {
    if (g.length < 2) continue;
    const labels = colourLabels(g);
    const gi = groups.push([groupName(g), g.map((x, i) => [key(x.id).slice(1).join('/'), colourDotStyle(labels[i]) ?? '', [x.livery, labels[i], x.number].filter(Boolean).join(', ') || 'this release', x.livery ? 1 : 0])]) - 1;
    for (const x of g) groupOf.set(x.id, gi);
  }
  const rows = db.releases.map((r) => {
    const [brand, ...tail] = key(r.id);
    if (brand !== key(r.brand)[0]) throw new Error(`release ${r.id} is not under brand ${r.brand}`);
    const type = releaseType(r);
    const flags = (seenOnly(r) ? 1 | { archive: 4, video: 8, page: 0 }[seenKind(r)] : 0) | (!releasedOf(r) && r.announced ? 2 : 0);
    // the main colour of the row's icon: its outline, or its type icon (a default icon takes the colour too)
    const main = colourShades(releaseColour(r))?.[0];
    const colour = main ? index(colours, tableColour(main)) : null;
    const doubt = dateDoubt(r) ? index(doubts, dateDoubt(r)!) : null;
    const row = [tail.join('/'), r.name, bi.get(r.brand), ti.get(type), si.get(releaseScale(r)), ui.get(r.kind ?? ''), sti.get(r.status), dateKey(r), flags,
      r.art ? artFile(r.art) : null, colour, doubt, groupOf.get(r.id) ?? null, r.power ? pi.get(r.power) ?? null : null];
    while (row.length && row[row.length - 1] === null) row.pop();
    return row;
  });
  return {
    brands: brandIds.map((b) => [key(b)[0], brandName(b)]),
    types: types.map((t) => [t, kitTypeLabel[t] ?? t, kitTypeIcon(t), wideIcons.has(kitTypeIcon(t)) ? 1 : 0]),
    scales,
    builds: builds.map((b) => [b, buildLabel(b)]),
    statuses,
    powers: powers.map((x) => [powerValue(x), x === 'none' ? 'No motor or engine' : powerLabel(x)]),
    colours,
    doubts,
    groups,
    rows,
  };
}

// The file name of an outline in /art/: a hash of its path data, so a release shares the file of every release drawn alike.
export const artFile = (d: string) => `${createHash('sha256').update(d).digest('hex').slice(0, 10)}.svg`;

// Every distinct release outline, by file name: the static SVGs under /art/ (src/pages/art/[file].ts).
export function releaseArts() {
  const out = new Map<string, string>();
  for (const r of db.releases) if (r.art) out.set(artFile(r.art), r.art);
  return out;
}

// The fill of a release's outline in the release table: its main colour, as a CSS colour. Dark colours fill with
// the text colour (black would vanish on a dark page), white with the muted colour, see-through with a grey wash.
function tableColour(s: { c: string; see?: boolean }) {
  if (s.see) return 'rgba(150,150,160,0.35)';
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(s.c.slice(i, i + 2), 16) / 255);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // a very dark or very light colour is kept and marked with a leading '!': the table draws it with a thin outline
  // in the text colour, as ReleaseArt does, so black reads on a dark page and white on a light one
  return lum < 0.15 || lum > 0.85 ? '!' + s.c : s.c;
}
