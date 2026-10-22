// Meta descriptions from a page's own facts: a title, a first sentence of its lead clauses, then short sentences.
// Clauses are dropped from the end until the text fits the limit, so a long title keeps only what fits.
export function describe(head: string, lead: string[], tail: string[] = [], limit = 155): string {
  const first = (xs: string[]) => (xs.length ? `${head}: ${xs.join(', ')}.` : `${head}.`);
  const clauses = lead.filter(Boolean);
  let out = first(clauses);
  while (clauses.length && out.length > limit) { clauses.pop(); out = first(clauses); }
  for (const t of tail) if (out.length + 1 + t.length <= limit) out += ` ${t}`;
  return out;
}

// the plural of a count: "1 platform", "3 platforms"
export const count = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
