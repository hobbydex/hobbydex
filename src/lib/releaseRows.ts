// The release list in its default order, as /rc/releases/ shows it and the home page starts it: every release, newest
// date key first (an expected date of a coming release, an announced date and a seen_by bound sort among the real
// dates; a month without a day sorts below that month's days), ties by brand then name, a colourway group as one row
// (lib/colourways.ts) at its newest release. Nothing is left out; the pages only take more or less of its top.
import { db, dateKey, brandName } from './data';
import { dateRows } from './colourways';

export const releaseRows = () =>
  dateRows(db.releases, dateKey, (a, b) => brandName(a.brand).localeCompare(brandName(b.brand)) || a.name.localeCompare(b.name));

/** How many rows of releaseRows the home page shows: simply its top, nothing skipped (owner, 2026-11-23). */
export const HOME_ROWS = 15;
