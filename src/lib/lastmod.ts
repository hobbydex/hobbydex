// The sitemap's <lastmod>: the last time a page's own data changed, never the build date.
//
// Every record of the export carries `modified` (hobbydex-rc tools/export.py: the date of the last commit that
// touched its file). A page's lastmod is the newest `modified` of the records the page shows; pages that list
// many records take the newest of what they list. Pages whose content is not data (faq) use the last commit of
// their source file; pages nothing is known about get no lastmod at all (a wrong one makes Google ignore them).
import { execFileSync } from 'node:child_process';
import { db, makeSlug, vehicles, listYear, type Doc } from './data';
import { releaseType } from './releaseTypes';

type Dated = { modified?: string };
const modifiedOf = (x: { modified?: unknown }) => (typeof x.modified === 'string' ? x.modified : undefined);
const newest = (...xs: (string | undefined)[]) => xs.reduce<string | undefined>((a, b) => (b && (!a || b > a) ? b : a), undefined);
const maxOf = (xs: Iterable<Dated | undefined>) => { let m: string | undefined; for (const x of xs) if (x?.modified && (!m || x.modified > m)) m = x.modified; return m; };
const add = (m: Map<string, string>, k: string, v: string | undefined) => { if (v && (!m.has(k) || v > m.get(k)!)) m.set(k, v); };

// documents by what they are about (a release, a kit, a part)
const docsBy = (f: (d: Doc) => string[] | undefined) => {
  const m = new Map<string, Doc[]>();
  for (const d of db.documents) for (const x of f(d) ?? []) { if (!m.has(x)) m.set(x, []); m.get(x)!.push(d); }
  return m;
};
const docsByRelease = docsBy((d) => d.releases), docsByKit = docsBy((d) => d.kits), docsByPart = docsBy((d) => d.parts);
const ofIds = <T extends Dated>(ids: Iterable<string | undefined>, get: (id: string) => T | undefined) => [...ids].flatMap((id) => (id ? [get(id)] : []));

const specsOfPart = (p: (typeof db.parts)[number]) => [...(p.equivalent_to ?? []).map((e) => e.spec), ...(p.includes ?? []).map((i) => i.spec)];

const recordLastmod = {
  part(id: string) {
    const p = db.part.get(id);
    if (!p) return undefined;
    return newest(p.modified, maxOf(ofIds(specsOfPart(p), (s) => db.spec.get(s))), maxOf(ofIds([p.source, ...(p.documents ?? [])], (d) => db.doc.get(d))),
      maxOf(docsByPart.get(id) ?? []), maxOf(ofIds((p.includes ?? []).map((i) => i.part), (x) => db.part.get(x))));
  },
  release(id: string) {
    const r = db.release.get(id);
    if (!r) return undefined;
    return newest(r.modified, db.kit.get(r.kit)?.modified, maxOf(ofIds((r.contains ?? []).map((c) => c.part), (x) => db.part.get(x))),
      maxOf(ofIds((r.needs ?? []).map((n) => n.part), (x) => db.part.get(x))),
      maxOf(ofIds(r.documents ?? [], (d) => db.doc.get(d))), maxOf(docsByRelease.get(id) ?? []));
  },
  kit(id: string) {
    const k = db.kit.get(id);
    if (!k) return undefined;
    return newest(k.modified, maxOf(db.releasesByKit.get(id) ?? []), maxOf(docsByKit.get(id) ?? []));
  },
};

// Indexes for the pages that list many records: one pass over the data, then every page is a lookup.
const byBrand = new Map<string, string>(), byCategory = new Map<string, string>(), byCategoryBrand = new Map<string, string>();
const releasesByBrand = new Map<string, string>(), byYear = new Map<string, string>(), byType = new Map<string, string>(), byTypeBrand = new Map<string, string>();
const kitsByType = new Map<string, string>(), bySpecCategory = new Map<string, string>(), bySpec = new Map<string, string>(), byMake = new Map<string, string>();
for (const b of db.brands) add(byBrand, b.id, b.modified);
for (const k of db.kits) { add(byBrand, k.brand, k.modified); add(kitsByType, k.category || 'car', k.modified); }
for (const r of db.releases) {
  add(byBrand, r.brand, r.modified); add(releasesByBrand, r.brand, r.modified);
  const y = listYear(r); if (y !== undefined) add(byYear, String(y), r.modified);
  const t = releaseType(r); add(byType, t, r.modified); add(byTypeBrand, `${t}|${r.brand}`, r.modified);
  if (r.category) add(kitsByType, r.category, r.modified);
  if (r.depicts?.make) add(byMake, makeSlug(r.depicts.make), r.modified);
}
for (const p of db.parts) {
  add(byBrand, p.brand, p.modified);
  const cat = p.category ?? 'uncategorised';   // the page of the parts no rule has categorised yet
  add(byCategory, cat, p.modified); add(byCategoryBrand, `${cat}|${p.brand}`, p.modified);
  for (const s of specsOfPart(p)) if (s) add(bySpec, s, p.modified);
  if (p.depicts?.make && p.category === 'body') add(byMake, makeSlug(p.depicts.make), p.modified);
}
for (const s of db.specs) { add(bySpecCategory, s.category, modifiedOf(s)); add(bySpec, s.id, modifiedOf(s)); }
for (const d of db.documents) if (d.brand) add(byBrand, d.brand.includes('/') ? d.brand : `brand/${d.brand}`, d.modified);

// pages that list (nearly) everything take the newest record of the whole dataset
let everything: string | undefined;
for (const set of [db.brands, db.kits, db.releases, db.parts, db.specs, db.documents, db.categories, db.standards]) everything = newest(everything, maxOf(set as Dated[]));
const releaseLists = newest(maxOf(db.releases), maxOf(db.kits));

/** The source file's last commit date in this repo, or undefined (no git, shallow clone, file never committed). */
const sourceDates = new Map<string, string | undefined>();
const sourceDate = (file: string) => {
  if (!sourceDates.has(file)) sourceDates.set(file, sourceDateOf(file));
  return sourceDates.get(file);
};
const sourceDateOf = (file: string) => {
  try {
    if (execFileSync('git', ['rev-parse', '--is-shallow-repository'], { encoding: 'utf8' }).trim() !== 'false') return undefined;
    const out = execFileSync('git', ['log', '-1', '--format=%cI', '--', file], { encoding: 'utf8' }).trim();
    return out ? new Date(out).toISOString().slice(0, 10) : undefined;
  } catch { return undefined; }
};
const staticSources: Record<string, string> = { '/faq/': 'src/pages/faq.astro', '/rc/compare/': 'src/pages/rc/compare.astro', '/rc/scan/': 'src/pages/rc/scan.astro', '/search/': 'src/pages/search.astro' };

/** lastmod (YYYY-MM-DD) of the page at `pathname` ("/rc/parts/xray/303122/"), or undefined when it has no data-backed date. */
export function lastmodFor(pathname: string): string | undefined {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (staticSources[path]) return sourceDate(staticSources[path]);
  const seg = path.split('/').filter(Boolean);
  if (path === '/' || (seg[0] === 'stats' || seg[0] === 'audit') && seg.length === 1) return everything;
  if (seg[0] !== 'rc') return undefined;
  const [, kind, a, b, c] = seg;
  switch (kind) {
    case undefined: return everything;
    case 'parts': return a && b ? recordLastmod.part(`part/${a}/${b}`) : undefined;
    case 'releases':
      if (!a) return releaseLists;
      if (a === 'by-year') return b ? byYear.get(b) : maxOf(db.releases);
      if (a === 'types') return !b ? maxOf(db.releases) : c ? byTypeBrand.get(`${b}|brand/${c}`) : byType.get(b);
      return b ? recordLastmod.release(`release/${a}/${b}`) : releasesByBrand.get(`brand/${a}`);
    case 'platforms':
      if (!a || a === 'by-date') return releaseLists;
      if (a === 'types') return b ? newest(kitsByType.get(b), byType.get(b)) : releaseLists;
      return recordLastmod.kit(`kit/${a}/${b}`);   // also /parts/<category>/ of a big platform
    case 'brands': return a ? byBrand.get(`brand/${a}`) : maxOf(db.brands);
    case 'categories':
      if (!a) return maxOf(db.categories);
      return b ? byCategoryBrand.get(`${a}|brand/${b}`) : newest(byCategory.get(a), maxOf([db.categories.find((x) => x.id === `category/${a}`)]));
    case 'servos': return byCategory.get('servo');
    case 'motors': return byCategory.get('motor');
    case 'escs': return byCategory.get('esc');
    case 'latest': return maxOf(db.releases);
    case 'specs':
      if (!a) return maxOf(db.specs as Dated[]);
      return b ? newest(bySpec.get(`spec/${a}/${b}`)) : bySpecCategory.get(a);
    case 'standards': {
      if (!a) return newest(maxOf(db.standards), maxOf(db.specs as Dated[]));
      const std = db.standard.get(`standard/${a}`);
      return std && newest(modifiedOf(std), maxOf(db.specs.filter((s) => s.standards?.includes(std.code)) as Dated[]));
    }
    case 'makes': {
      if (!a) return newest(maxOf(db.makes ?? []), ...byMake.values());
      const make = (db.makes ?? []).find((m) => makeSlug(m.name) === a);
      if (!b) return newest(make?.modified, byMake.get(a));
      const v = vehicles.find((x) => x.make && makeSlug(x.make) === a && x.slug === b);
      return v && newest(maxOf(v.releases), maxOf(v.bodies));
    }
    case 'vehicles': {
      const v = vehicles.find((x) => !x.make && x.slug === a);
      return v && newest(maxOf(v.releases), maxOf(v.bodies));
    }
    case 'types': return releaseLists;
    default: return undefined;
  }
}

/** The date shown in the footer ("Last updated on"): the page's lastmod, so footer and sitemap agree; the export's date
 *  only where no page date is known (a 404, a build without git history). */
export const pageUpdated = (pathname: string) => lastmodFor(pathname) ?? db.generated;
