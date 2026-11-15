// The date a record last changed in a way its pages show, for the sitemap's <lastmod> (lib/lastmod.ts).
//
// The export (hobbydex-rc tools/export.py) gives every record `modified`, the last commit that touched its file, and,
// where that commit changed only bookkeeping, `content_modified`: the last commit that changed what the record says.
// Bookkeeping is where a value came from (`sources`, `source` and `listed_in` on rows, any `*_source` or `*_basis`),
// `former_ids`, `reported_by`, `ocr_names` and the `seen_by` bound with its `seen_by_source`: an archive pass that
// lowers a bound or a linker that cites one more document is not a change a reader or a search engine would see.
export type Dated = { modified?: unknown; content_modified?: unknown };

/** The record's content date (YYYY-MM-DD), or undefined when the export has none (no git history). */
export const shownDate = (x: Dated | undefined): string | undefined => {
  if (!x) return undefined;
  if (typeof x.content_modified === 'string') return x.content_modified;
  return typeof x.modified === 'string' ? x.modified : undefined;
};
