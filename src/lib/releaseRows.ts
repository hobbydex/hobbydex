// The release list in its default order, as /rc/releases/ shows it and the home page starts it: every release, newest
// date key first (an expected date of a coming release, an announced date and a seen_by bound sort among the real
// dates; a month without a day sorts below that month's days), ties by brand then name, a colourway group as one row
// (lib/colourways.ts) at its newest release. Nothing is left out; the pages only take more or less of its top.
import { db, dateKey, brandName, isComing } from './data';
import { dateRows } from './colourways';

export const releaseRows = () =>
  dateRows(db.releases, dateKey, (a, b) => brandName(a.brand).localeCompare(brandName(b.brand)) || a.name.localeCompare(b.name));

/** How far back the home page's what's-new table reaches. */
export const RECENT_DAYS = 30;

/** The top of releaseRows down to the last row dated within the last `days` days (by the build day), or further down to
 * the last row with a coming release, so every upcoming release shows: a coming "2026-11" sorts below 2026 Nov 30. It
 * is the top of the same list, so nothing between its first and last row is skipped. A release known only by its year
 * is not dated enough for this list: it neither extends it nor starts it (a "2027" sorts above every 2026 date, so
 * rows above the first dated one are left out). */
export function recentRows(days = RECENT_DAYS) {
  const rows = releaseRows();
  const now = new Date();
  const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - days)).toISOString().slice(0, 10);
  let end = 0;
  rows.forEach((x, i) => { if (x.key.length >= 7 && (x.key >= cutoff || x.group.some(isComing))) end = i + 1; });
  const start = rows.findIndex((x) => x.key.length >= 7);
  return start < 0 ? [] : rows.slice(start, end);
}
