// Radio protocol specs (hobbydex-rc docs/schema.md "Protocol specs"): names, links and the groups of radio parts on a protocol page.
import { db, brandName, type Part, type Spec } from './data';

/** "Sanwa FH5": the maker's name before the protocol's own, as the part pages and the protocol page say it. */
export function protocolTitle(spec: Spec): string {
  const maker = typeof spec.brand === 'string' ? brandName(spec.brand) : '';
  return maker ? `${maker} ${spec.name}` : String(spec.name ?? spec.id);
}

/** The protocol specs a radio part lists, in the order the maker gives them. */
export function protocolSpecs(p: Part): Spec[] {
  return (p.protocols ?? []).map((id) => db.spec.get(id)).filter((s): s is Spec => !!s);
}

type Row = { spec: string; via?: string[]; url?: string };
/** The protocols a device of this one also runs (`compatible`), and the protocols whose devices also run this one. */
export function compatibleWith(spec: Spec) {
  const out = ((spec.compatible as Row[] | undefined) ?? []);
  const into: (Row & { from: Spec })[] = [];
  for (const o of db.specs) if (o.category === 'protocol' && o.id !== spec.id)
    for (const r of (o.compatible as Row[] | undefined) ?? []) if (r.spec === spec.id) into.push({ ...r, spec: o.id, from: o });
  return { out, into };
}
