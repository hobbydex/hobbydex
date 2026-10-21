import { db, key, brandName, dateKey, seenOnly, dateDoubt } from './data';
import { releaseType, releaseScale } from './releaseTypes';
import { kitTypeLabel, kitTypeIcon, kitTypeOrder } from './kitTypes';
import { wideIcons } from './wideIcons';
import { buildLabel } from './build';

// The release list for the filterable table on /rc/releases/ (list.json). Each row is an array:
// [id tail, name, brand, type, scale, build, status, date, flags, outline]. Brand, type, scale, build and status
// index the lists beside the rows; the release URL is /rc/releases/<brand slug>/<id tail>/. The date is the
// release's date key ("2026-11", "2012-05-01" or "" when undated); its year is the first four characters.
// flags: 1 = a seen_by bound only (the date column's asterisk), 2 = a date we are not sure of (the "?").
export function releaseList() {
  const ids = (xs: string[]) => new Map(xs.map((x, i) => [x, i]));
  const brandIds = [...new Set(db.releases.map((r) => r.brand))].sort((a, b) => brandName(a).localeCompare(brandName(b)));
  const types = [...new Set(db.releases.map(releaseType))].sort((a, b) => (kitTypeOrder.indexOf(a) + 1 || 99) - (kitTypeOrder.indexOf(b) + 1 || 99));
  const scales = [...new Set(db.releases.map(releaseScale))].sort((a, b) => (a ? Number(a.split('/')[1]) : 999) - (b ? Number(b.split('/')[1]) : 999));
  const builds = ['kit', 'rtr', 'arr', ''].filter((b) => db.releases.some((r) => (r.kind ?? '') === b));
  const statuses = ['released', 'announced', 'discontinued'].filter((s) => db.releases.some((r) => r.status === s));
  const bi = ids(brandIds), ti = ids(types), si = ids(scales), ui = ids(builds), sti = ids(statuses);
  const rows = db.releases.map((r) => {
    const [brand, ...tail] = key(r.id);
    if (brand !== key(r.brand)[0]) throw new Error(`release ${r.id} is not under brand ${r.brand}`);
    const type = releaseType(r);
    const flags = (seenOnly(r) ? 1 : 0) | (dateDoubt(r) ? 2 : 0);
    return [tail.join('/'), r.name, bi.get(r.brand), ti.get(type), si.get(releaseScale(r)), ui.get(r.kind ?? ''), sti.get(r.status), dateKey(r), flags, r.art ?? null];
  });
  return {
    brands: brandIds.map((b) => [key(b)[0], brandName(b)]),
    types: types.map((t) => [t, kitTypeLabel[t] ?? t, kitTypeIcon(t), wideIcons.has(kitTypeIcon(t)) ? 1 : 0]),
    scales,
    builds: builds.map((b) => [b, buildLabel(b)]),
    statuses,
    rows,
  };
}
