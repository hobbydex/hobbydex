// Which parts the Latest view (/rc/latest/) and the platform pages' "Newest parts" list. Owner (2026-10-29): show
// releases, bodies, and generic electronics and power parts that are not tied to one brand's cars; a spare part that
// fits one brand's cars (or one car) is left off. A part needs a real date: a stated release date, an announcement,
// or a seen_by bound from a maker's news or what's-new page. A seen_by bound from a shop or catalogue page is the day
// our import first saw the page, not news, so it does not date a part.

/** The part categories that count as generic electronics and power (the tabs Electronics and Power). */
export const GENERIC_CATEGORIES = new Set(['servo', 'radio', 'esc', 'motor', 'electronics', 'battery', 'charger']);

export type LatestPart = {
  category?: string;
  released?: string;
  announced?: string;
  seen_by?: string;
  seen_by_source?: string;
  fits?: { kit: string }[];
};

const NEWS_PAGE = /\/(news|blog|what-?s-?new|new-?products?|announcements?|press|articles?)(\/|\?|#|$)/i;
const FULL_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** A seen_by bound counts as a date only when it is a full day on a maker's news or what's-new page. */
export const isNewsSeen = (p: Pick<LatestPart, 'seen_by' | 'seen_by_source'>) =>
  !!p.seen_by && FULL_DAY.test(p.seen_by) && NEWS_PAGE.test(p.seen_by_source ?? '');

/** A stated release date (any precision), an announcement, or a maker news page's seen_by bound. */
export const hasRealPartDate = (p: LatestPart) => !!(p.released || p.announced || isNewsSeen(p));

/** A part that fits no kit at all, or whose fits rows name cars of more than one brand. Rows whose kit is not in
 * the data name no brand and count for neither side; a part whose every row is unresolved is not generic. */
export const isGenericPart = (p: LatestPart, brandOf: (kit: string) => string | undefined) => {
  const fits = p.fits ?? [];
  if (fits.length === 0) return true;
  const brands = new Set(fits.map((f) => brandOf(f.kit)).filter((b): b is string => !!b));
  return brands.size >= 2;
};

/** Whether a part is listed in the Latest view and the platform "Newest parts" block. Bodies always are (once dated);
 * electronics and power parts only when generic; every other category is left off. */
export const showPartInLatest = (p: LatestPart, brandOf: (kit: string) => string | undefined) => {
  if (!hasRealPartDate(p)) return false;
  if (p.category === 'body') return true;
  return GENERIC_CATEGORIES.has(p.category ?? '') && isGenericPart(p, brandOf);
};

/** The date a part is listed by: its release date, else its announcement, else its maker-news bound. Undefined when it
 * has no real date (see hasRealPartDate). */
export const realPartDate = (p: LatestPart) => p.released || p.announced || (isNewsSeen(p) ? p.seen_by : undefined);

/** The newest `n` parts with a real date, newest first; parts with the same date by name. Undated parts are never in
 * the list. */
export const newestDatedParts = <T extends LatestPart & { name: string }>(parts: T[], n: number): T[] =>
  parts
    .filter(hasRealPartDate)
    .sort((a, b) => (realPartDate(b) ?? '').localeCompare(realPartDate(a) ?? '') || a.name.localeCompare(b.name))
    .slice(0, Math.max(0, n));
