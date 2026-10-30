// The option parts listed as fitting a platform, shared by the platform page and its per-category parts pages.
import { db, byPartNo, type Kit } from './data';
import { catName } from './categories';

// above this many fitting parts the platform page lists only the categories; each category's table is its own page
export const SPLIT_ABOVE = 150;
export const partsUrl = (platformUrl: string, cat: string) => `${platformUrl}parts/${cat || 'other'}/`;

// rows grouped by part category, named categories alphabetically, uncategorised last
export const byCat = <T,>(rows: T[], cat: (r: T) => string | undefined) => [...new Set(rows.map((r) => cat(r) ?? ''))]
  .sort((g, h) => (g ? 0 : 1) - (h ? 0 : 1) || catName(g).localeCompare(catName(h))).map((g) => ({ g, rows: rows.filter((r) => (cat(r) ?? '') === g) }));

export function optionFits(kit: Kit) {
  // current parts before discontinued ones, each group in part-number order
  const allFits = [...(db.fitsByKit.get(kit.id) ?? [])].sort((a, b) => (a.part.status === 'discontinued' ? 1 : 0) - (b.part.status === 'discontinued' ? 1 : 0) || byPartNo(a.part, b.part));
  // other makers' per-car bearing and screw sets (Fast Eddy, RCScrewZ...) would crowd out the option parts:
  // they get one collapsed line each; single bearings and the kit maker's own sets stay in the list
  const bearingSets = allFits.filter(({ part: p }) => p.brand !== kit.brand && p.category === 'bearing'
    && ((p.includes ?? []).some((i) => i.spec?.startsWith('spec/bearing/')) || /\b(kit|set)\b|bearings\b/i.test(p.name)));
  const screwSets = allFits.filter(({ part: p }) => p.brand !== kit.brand && p.category === 'screw' && /\b(screw|hardware|fastener|bolt)s?\s+(kit|set)\b/i.test(p.name));
  const fits = allFits.filter((x) => !bearingSets.includes(x) && !screwSets.includes(x));
  return { allFits, bearingSets, screwSets, fits };
}
