import type { Doc, Link } from './data';

// the facts rows for a record's files (a release's or a part's): the maker's page for each manual, parts list and
// exploded view, only documents with a maker page (`page`), so the prominent link is never the file itself
export const FILE_KINDS: Record<string, string> = { manual: 'Manual', part_list: 'Parts list', exploded_view: 'Exploded view' };
// More than three files of one kind on one maker page (a downloads page with a file per assembly) are one row: the
// page once, titled with how many files it lists, so a car with 50 exploded views does not get 50 links to one page.
const onePerPage = (ds: Doc[]) => {
  const byPage = new Map<string, Doc[]>();
  for (const d of ds) byPage.set(d.page!, [...(byPage.get(d.page!) ?? []), d]);
  return [...byPage.values()].flatMap((g) => g.length <= 3 ? g : [{ ...g[0], title: `${g.length} files on ${hostLabel(g[0].page!)}` }]);
};
export const fileRows = (docs: Doc[], kinds: Record<string, string> = FILE_KINDS) => Object.entries(kinds).map(([k, label]) => [label, onePerPage(docs.filter((d) => d.kind === k && d.page))] as const)
  .filter(([, ds]) => ds.length > 0);

// a maker page's host without "www.": the label of a single link
export const hostLabel = (u: string) => new URL(u).hostname.replace(/^www\./, '');

// a maker page's label among several: its language when the path names one, else its host
export const pageLabel = (u: string) => {
  const h = new URL(u);
  if (/\/(english|en)\//.test(h.pathname)) return 'English';
  if (/\/(japanese|jp|ja)\//.test(h.pathname) || /\.jp$/.test(h.hostname)) return 'Japanese';
  return hostLabel(u);
};

// the maker's own links of a record: not a fan site, a dealer or an archive capture, and not a page marked gone (hidden)
export const makerOwnLinks = (links: Link[] | undefined) => (links ?? []).filter((l) => l.kind !== 'fan-site' && l.kind !== 'dealer' && l.kind !== 'archive' && !l.gone);
// a Wayback capture of the maker's page, shown only when the record has no live maker link
export const archiveLinks = (links: Link[] | undefined) => makerOwnLinks(links).length > 0 ? [] : (links ?? []).filter((l) => l.kind === 'archive');

// the documents the facts rows already show (a file kind with a maker page); the rest are listed under Sources
export const listedBelow = (docs: Doc[]) => docs.filter((d) => !(FILE_KINDS[d.kind] && d.page));
