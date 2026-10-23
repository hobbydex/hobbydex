import type { Part, Spec } from './data';
// The fact rows of a generic spec (the spec page's table) and of a part that inherits them from its equivalent spec.
// One label table and one formatter serve both pages.

// a field name as a label: "din_outer_mm" -> "Outer, DIN (mm)", "shaft_mm" -> "Shaft (mm)"
export function fieldLabel(k: string): string {
  const WIRE: Record<string, string> = { awg: 'Gauge (AWG)', conductor_mm: 'Diameter (mm)', conductor_in: 'Diameter (in)', cross_section_mm2: 'Cross-section (mm²)' };
  if (WIRE[k]) return WIRE[k];
  let t = k.replace(/_/g, ' '), unit = '';
  const u = t.match(/ (mm|g|kg|v|mah|cst|kv|t|deg|a)$/i);
  if (u) { unit = ` (${u[1] === 'v' ? 'V' : u[1] === 'a' ? 'A' : u[1] === 'mah' ? 'mAh' : u[1] === 'cst' ? 'cSt' : u[1] === 'kv' ? 'kV' : u[1]})`; t = t.slice(0, -u[0].length); }
  if (/^(din|iso|jis) /.test(t)) t = `${t.slice(4)}, ${t.slice(0, 3).toUpperCase()}`;
  return t.charAt(0).toUpperCase() + t.slice(1) + unit;
}

export type Fact = { key: string; label: string; text: string; source?: string };
const SKIP = new Set(['id', 'category', 'name', 'standards', 'toml_path']);
const isField = (k: string, v: unknown) => !SKIP.has(k) && !k.endsWith('_source') && (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean');

// the spec's own fields, in the record's order; `${field}_source` is the page the value was read from
export function specFacts(spec: Record<string, unknown>): Fact[] {
  return Object.entries(spec).filter(([k, v]) => isField(k, v)).map(([k, v]) => {
    const src = spec[`${k}_source`];
    return { key: k, label: fieldLabel(k), text: typeof v === 'boolean' ? (v ? 'yes' : 'no') : String(v), source: typeof src === 'string' ? src : undefined };
  });
}

// a thread's size and type are one row: "Thread: M3, self-tapping". threadType: the type when the caller has it
// (a part's own thread type), else the thread_type row's value
export function threadRows(rows: Fact[], threadType?: string): Fact[] {
  const i = rows.findIndex((f) => f.key === 'thread');
  if (i < 0) return rows;
  const type = rows.find((f) => f.key === 'thread_type')?.text ?? threadType;
  if (!type) return rows;
  return rows.filter((f) => f.key !== 'thread_type').map((f) => (f.key === 'thread' ? { ...f, text: `${f.text}, ${type}` } : f));
}

// the part page's own rows that already state a spec field's fact: that spec field is not repeated under them
const OWN_ROW: Record<string, (p: Part) => boolean> = {
  bore_mm: (p) => p.bore_mm !== undefined,
  capacity_mah: (p) => p.capacity_mah !== undefined,
  chemistry: (p) => p.capacity_mah !== undefined && p.chemistry !== undefined,
  cells: (p) => p.lipo_cells !== undefined || p.nimh_cells !== undefined || (p.capacity_mah !== undefined && p.cells !== undefined),
  current_a: (p) => p.current_a !== undefined,
  motor_type: (p) => p.motor_type !== undefined,
  can: (p) => p.motor_can_mm !== undefined,
  shaft_mm: (p) => !!(p.kv || p.turns) && p.shaft_mm !== undefined,
  diameter_mm: (p) => (p.category === 'wire' && p.diameter_mm !== undefined) || (!!(p.kv || p.turns) && p.diameter_mm !== undefined && p.length_mm !== undefined),
  length_mm: (p) => (p.category === 'wire' && p.length_mm !== undefined) || (!!(p.kv || p.turns) && p.diameter_mm !== undefined && p.length_mm !== undefined),
  conductor_mm: (p) => p.category === 'wire' && p.diameter_mm !== undefined,
  awg: (p) => p.category === 'wire' && p.wire_awg !== undefined,
  teeth: (p) => p.category === 'spur-gear' && p.teeth !== undefined,
  pitch_dp: (p) => p.category === 'spur-gear' && p.teeth !== undefined && p.pitch_dp !== undefined,
  module: (p) => p.category === 'spur-gear' && p.teeth !== undefined && p.pitch_dp === undefined && p.module !== undefined,
  thread_type: (p) => p.thread_type !== undefined,
  notes: (p) => p.notes !== undefined,
};

// the facts a part inherits from its equivalent spec. One spec: all its fields. Several of one category: the
// fields they agree on. The part's own field, when it sets one, replaces the spec's value; `point` is the part's.
export function partSpecFacts(part: Part, specs: Spec[]): { specs: Spec[]; facts: Fact[]; threadInFacts: boolean } {
  if (specs.length === 0 || specs.some((s) => s.category !== specs[0].category)) return { specs: [], facts: [], threadInFacts: false };
  const base: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(specs[0])) {
    if (!isField(k, v)) continue;
    const agree = specs.every((s) => s[k] === v);
    if (!agree) continue;
    base[k] = v;
    const src = specs[0][`${k}_source`];
    if (typeof src === 'string' && specs.every((s) => s[`${k}_source`] === src)) base[`${k}_source`] = src;
  }
  const merged: Record<string, unknown> = {};
  const own = part as unknown as Record<string, unknown>;
  for (const [k, v] of Object.entries(base)) {
    if (k.endsWith('_source') || OWN_ROW[k]?.(part)) continue;
    const pv = own[k];
    if (typeof pv === 'string' || typeof pv === 'number' || typeof pv === 'boolean') merged[k] = pv;
    else { merged[k] = v; if (base[`${k}_source`] !== undefined) merged[`${k}_source`] = base[`${k}_source`]; }
  }
  if (part.point !== undefined && merged.point === undefined && base.point === undefined) merged.point = part.point;
  const facts = threadRows(specFacts(merged), part.thread_type);
  // the part's own Thread row is left out when the thread is in the facts above
  return facts.length > 0 ? { specs, facts, threadInFacts: facts.some((f) => f.key === 'thread') } : { specs: [], facts: [], threadInFacts: false };
}
