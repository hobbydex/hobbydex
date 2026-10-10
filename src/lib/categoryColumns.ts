// Key spec columns per part category, from the category definitions in the data
// (data/categories/<slug>.toml): each value comes from the part or its linked spec.
import { db, type Part, type Spec, type KeyField } from './data';

export type Column = { label: string; num?: boolean; field: KeyField; get: (p: Part, s?: Spec) => string | number | undefined };
const cat = new Map(db.categories.map((c) => [c.id.split('/')[1], c]));

function format(v: unknown, f: KeyField): string | number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  if (f.format === 'cells' && Array.isArray(v)) return v[0] === v[1] ? `${v[0]}S` : `${v[0]}-${v[1]}S`;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return v.replace(/-/g, ' ');
  return String(v);
}

// a column is numeric when every value the data has for it is a number (sorting, alignment)
function isNumeric(slug: string, f: KeyField) {
  const vals = f.from === 'spec' ? db.specs.filter((s) => s.category === cat.get(slug)?.spec_type).map((s) => s[f.field])
    : db.parts.filter((p) => p.category === slug).map((p) => (p as unknown as Record<string, unknown>)[f.field]);
  const present = vals.filter((v) => v !== undefined && v !== null && v !== '');
  return present.length > 0 && present.every((v) => typeof v === 'number');
}

export const columns: Record<string, Column[]> = Object.fromEntries([...cat.entries()].filter(([, c]) => c.key_fields?.length).map(([slug, c]) => [slug,
  c.key_fields!.map((f) => ({
    label: f.unit ? `${f.label} ${f.unit}` : f.label,
    num: f.format !== 'cells' && isNumeric(slug, f),
    field: f,
    get: (p: Part, s?: Spec) => format(f.from === 'spec' ? s?.[f.field] : (p as unknown as Record<string, unknown>)[f.field], f),
  }))]));

/** The generic spec of a part for its category's columns. */
export function specOf(p: Part): Spec | undefined {
  const st = p.category && cat.get(p.category)?.spec_type;
  const link = st && (p.equivalent_to ?? []).find((e) => e.spec.startsWith(`spec/${st}/`));
  return link ? db.spec.get(link.spec) : undefined;
}
