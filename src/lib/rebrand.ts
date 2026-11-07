// Rebrand wording: a row with certainty "likely" rests on matching specs or looks only (docs/schema.md "rebrand_of"),
// so the site words it apart from a confirmed rebrand.
export function rebrandLabel(reverse: boolean, likely: boolean): string {
  if (likely) return reverse ? 'Likely rebranded as' : 'Likely rebrand of';
  return reverse ? 'Also sold as' : 'Rebrand of';
}

// the source document of a rebrand row: its title, linked where the document has an address
export function rebrandSource<D extends { title: string; url?: string; page?: string }>(source: string | undefined, get: (id: string) => D | undefined): { title: string; href?: string } | undefined {
  const d = source ? get(source) : undefined;
  return d ? { title: d.title, href: d.page ?? d.url } : undefined;
}
