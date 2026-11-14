// Natural order of parts by item number ("PS-2" before "PS-10"), shared by every parts listing (data.ts re-exports it).
// The collators are built once: a sort makes hundreds of thousands of comparisons, and localeCompare with options
// builds a collator for each one. Same locale and options as before, so the order is unchanged.
const byNumber = new Intl.Collator(undefined, { numeric: true });
const byName = new Intl.Collator();

/** Parts with a number first, in natural number order; parts without one after them, by name. */
export const byPartNo = (a: { number?: string; name: string }, b: { number?: string; name: string }) =>
  (a.number ? 0 : 1) - (b.number ? 0 : 1) || byNumber.compare(a.number ?? '', b.number ?? '') || byName.compare(a.name, b.name);
