// A part's spec table from its category's `spec_fields` (hobbydex-rc docs/schema.md "Spec fields"): the fields the
// category defines once, in its order, each with the part's value and the page it comes from (`sources`).
import { db, type Part, type SpecField } from './data';
import { protocolSpecs } from './protocols';

export type SpecCell = { text: string; part?: string; spec?: string };
export type SpecRow = { field: string; label: string; cells: SpecCell[]; source?: string };

const cat = new Map(db.categories.map((c) => [c.id.split('/')[1], c]));

const num = (v: number) => String(v);
const withUnit = (s: string, unit?: string) => (unit ? `${s} ${unit}` : s);

/** The fields of the part's category that apply to it (`when`), whatever their value. */
export function specFieldsOf(p: Part): SpecField[] {
  const fields = (p.category && cat.get(p.category)?.spec_fields) || [];
  const rec = p as unknown as Record<string, unknown>;
  return fields.filter((f) => Object.entries(f.when ?? {}).every(([k, vals]) => vals.includes(rec[k] as string)));
}

/** One row per field the part has a value for. */
export function specRows(p: Part): SpecRow[] {
  const rec = p as unknown as Record<string, unknown>;
  const rows: SpecRow[] = [];
  for (const f of specFieldsOf(p)) {
    const v = rec[f.field];
    if (v === undefined || v === null || v === '') continue;
    let cells: SpecCell[];
    switch (f.type) {
      case 'bool': cells = [{ text: v ? 'yes' : 'no' }]; break;
      case 'range': cells = [{ text: withUnit(Array.isArray(v) ? `${num(v[0])}-${num(v[1])}` : num(v as number), f.unit) }]; break;
      case 'numbers': cells = [{ text: withUnit((v as number[]).map(num).join(', '), f.unit) }]; break;
      case 'dims': cells = [{ text: withUnit((v as number[]).join(' x '), f.unit) }]; break;
      case 'enums': cells = [{ text: (v as string[]).map((x) => x.replace(/-/g, ' ')).join(', ') }]; break;
      case 'parts': cells = (v as string[]).map((x) => {
        const q = x.startsWith('part/') ? db.part.get(x) : undefined;
        return q ? { text: q.number ?? q.name, part: q.id } : { text: x };
      }); break;
      case 'string':
        // the protocol links its protocol specs where the part names them (docs/schema.md "Protocol specs")
        if (f.field === 'protocol' && protocolSpecs(p).length) { cells = protocolSpecs(p).map((s) => ({ text: s.name ?? s.id, spec: s.id })); break; }
        cells = [{ text: String(v) }]; break;
      default: cells = [{ text: withUnit(typeof v === 'number' ? num(v) : String(v), f.unit) }];
    }
    rows.push({ field: f.field, label: f.label, cells, source: p.sources?.[f.field] });
  }
  return rows;
}
