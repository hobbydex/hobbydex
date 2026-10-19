import type { Doc, Link } from './data';

// the facts rows for a record's files (a release's or a part's): the maker's page for each manual, parts list and
// exploded view, only documents with a maker page (`page`), so the prominent link is never the file itself
export const FILE_KINDS: Record<string, string> = { manual: 'Manual', part_list: 'Parts list', exploded_view: 'Exploded view' };
export const fileRows = (docs: Doc[]) => Object.entries(FILE_KINDS).map(([k, label]) => [label, docs.filter((d) => d.kind === k && d.page)] as const)
  .filter(([, ds]) => ds.length > 0);

// a maker page's label: its language when the path names one, else its host
export const pageLabel = (u: string) => {
  const h = new URL(u);
  if (/\/(english|en)\//.test(h.pathname)) return 'English';
  if (/\/(japanese|jp|ja)\//.test(h.pathname) || /\.jp$/.test(h.hostname)) return 'Japanese';
  return h.hostname.replace(/^www\./, '');
};

// the maker's own links of a record: not a fan site, not a dealer
export const makerOwnLinks = (links: Link[] | undefined) => (links ?? []).filter((l) => l.kind !== 'fan-site' && l.kind !== 'dealer');

// the documents the facts rows already show (a file kind with a maker page); the rest are listed under Sources
export const listedBelow = (docs: Doc[]) => docs.filter((d) => !(FILE_KINDS[d.kind] && d.page));
