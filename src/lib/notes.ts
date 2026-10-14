// A fit or link note as the site shows it. The linkers end the notes they write with their own name,
// "Listed for the Blitzer Beetle XB (link_car_kits.py)", so a rerun can tell its rows from hand-written
// ones; that marker is bookkeeping, not something to print.
export function shownNote(note?: string): string | undefined {
  if (!note) return note;
  const s = note.replace(/\s*\([a-z0-9_]+\.py\)\s*$/, '').trim();
  return s || undefined;
}
