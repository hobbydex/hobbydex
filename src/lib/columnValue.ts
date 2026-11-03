// The raw value of a category column (see categoryColumns.ts); no data import, so node tests can load it.

/** A column's raw value: from the column's own side first (the part, or its linked spec), else from the other side, so a part that states its own
 *  motor_type or shaft_mm without a linked spec still shows it. A motor's Can falls back to the 4-digit can code of its measured diameter and length. */
export function rawValue(f: { field: string; from?: string }, p: object, s?: object): unknown {
  const part = p as Record<string, unknown>;
  const spec = s as Record<string, unknown> | undefined;
  const blank = (v: unknown) => v === undefined || v === null || v === '';
  const [a, b] = f.from === 'spec' ? [spec, part] : [part, spec];
  const v = a?.[f.field];
  if (!blank(v)) return v;
  const w = b?.[f.field];
  if (!blank(w)) return w;
  if (f.field === 'can' && typeof part.diameter_mm === 'number' && typeof part.length_mm === 'number')
    return `${Math.round(part.diameter_mm)}${Math.round(part.length_mm)}`;
  return undefined;
}

