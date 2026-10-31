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

// The line tools/link_kit_sources.py writes on a platform with no release: the platform page shows it as a label
// with the count of parts instead, so the line (the part ids and their source) is left out of the running text.
const KNOWN_FROM_PARTS = 'Known from spare parts only';
export function withoutKnownFromParts(note?: string): string | undefined {
  if (!note) return note;
  const at = note.indexOf(KNOWN_FROM_PARTS);
  if (at < 0) return note;
  return note.slice(0, at).replace(/[\s;]+$/, '') || undefined;
}

// A note that names the document it was read from ("... from a scanned Tamiya manual; verify ...") links the word
// "manual" (or "parts list") to that document's page: [before, word, after], or undefined when the note has no such word.
export function splitAtDocWord(note: string | undefined): [string, string, string] | undefined {
  const m = note?.match(/\b(manual|parts list)\b/);
  if (!note || !m || m.index === undefined) return undefined;
  return [note.slice(0, m.index), m[0], note.slice(m.index + m[0].length)];
}

// The document a part's name or note was read from: its own documents and source first, else the sources of the
// releases that list it (a box content before an option). Only a manual, parts list or exploded view with a page counts.
export function readFromDoc<D extends { kind: string }>(ids: (string | undefined)[], get: (id: string) => D | undefined, page: (d: D) => string | undefined): { doc: D; page: string } | undefined {
  for (const id of ids) {
    const d = id ? get(id) : undefined;
    const pg = d && ['manual', 'part_list', 'exploded_view'].includes(d.kind) ? page(d) : undefined;
    if (d && pg) return { doc: d, page: pg };
  }
  return undefined;
}
