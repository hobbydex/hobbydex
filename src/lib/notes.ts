// A fit or link note as the site shows it. The linkers end the notes they write with their own name,
// "Listed for the Blitzer Beetle XB (link_car_kits.py)", so a rerun can tell its rows from hand-written
// ones; that marker is bookkeeping, not something to print.
export function shownNote(note?: string): string | undefined {
  if (!note) return note;
  const s = note.replace(/\s*\([a-z0-9_]+\.py\)\s*$/, '').trim();
  return s || undefined;
}

// Notes that say where a fact was read ("Yokomo's store lists it for BD10", "Car taken from 3Racing's part
// number prefix", "Chassis column in Tamiya's matching list: TT-02") are provenance, not part of the fact:
// the site shows them as a small source note (SourceNote.astro) instead of in the running text.
const SOURCE = /store lists it for|part number prefix|named in .*product name|^Listed for the |^Listed on |column in .*list|shop's category|^Chassis named in |as the reseller|not stated by the reseller|set by hand|^(Category|Type)\b[^;]* from |^From [a-z0-9-]+\.[a-z.]+:/i;
export const isSourceNote = (note?: string) => !!note && SOURCE.test(note);
