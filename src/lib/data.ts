// Loads the dataset export produced by hobbydex-rc/tools/export.py.
// The site reads only this JSON (schema_version 0); it never touches TOML.
import { readFileSync } from 'node:fs';

export type Brand = { id: string; name: string; legal_name?: string; country?: string; website?: string; kind?: string; status: string; item_numbers?: boolean; notes?: string; owner?: string; owner_source?: string; owner_since?: number };
// A company that owns brands (hobbydex-rc docs/schema.md "company"); brand: the brand that carries its own range, when it has one.
export type Company = { id: string; name: string; legal_name?: string; country?: string; website?: string; status?: string; brand?: string; parent?: string; notes?: string };
export type Link = { site: string; url: string; kind?: 'fan-site' };
export type KitLink = { kit: string; parts?: 'interchangeable' | 'partly' | 'unknown'; source?: string; notes?: string };
export type Kit = { id: string; toml_path?: string; former_ids?: string[]; brand: string; name: string; category: string; surface?: string[]; scale?: string; drive?: string; power?: string; notes?: string; art?: string; rebrand_of?: KitLink[]; same_platform_as?: KitLink[]; links?: Link[] };
export type Contains = { part: string; role: 'kit' | 'option' | 'listed'; source: string; qty?: number; step?: string; slot?: string };
export type Depicts = { make: string; model: string; year?: number; licensed?: boolean };   // the real vehicle a release or body shell replicates
export type Release = { id: string; depicts?: Depicts; toml_path?: string; requires?: string[]; gtin?: string; former_ids?: string[]; kit: string; brand: string; number?: string; name: string; color?: string; year?: number; released?: string; kind: string; status: string; edition?: string; surface?: string[]; model_year?: number; category?: string; art?: string; documents?: string[]; channels?: number; protocol?: string; torque_kgcm?: number; speed_s?: number; voltage?: number; gear_material?: string; motor?: string; contains?: Contains[]; links?: Link[] };
export type EquivalentTo = { spec: string; match: 'exact' | 'functional' | 'close'; source?: string; notes?: string };
export type Fits = { kit: string; releases?: string[]; car?: string; type: 'direct' | 'replaces' | 'modification'; replaces?: string; source?: string; notes?: string };   // releases: the cars of the kit the maker lists the part for; car: a car that is none of them; neither: every release
export type MountHoles = { thread: string; count?: number; circle_mm: number };   // count left out: the maker gives thread and spacing only
export type Part = { id: string; depicts?: Depicts; toml_path?: string; gtin?: string; former_ids?: string[]; brand: string; number?: string; name: string; category?: string; teeth?: number; module?: number; pitch_dp?: number; mounting?: string; wheel_size?: string; compound?: string; offset_mm?: number; beadlock?: boolean; color?: string; wheel_color?: string; material_grade?: string; rate?: string; rate_n_mm?: number; rate_lb_in?: number; wire_mm?: number; free_length_mm?: number | string; pack_qty?: number; former_names?: string[]; applies_to?: string; material?: string; strength_class?: string; finish?: string; swatch?: string; application?: string | string[]; paint_type?: string; thread_type?: string; seal?: string; lubricant?: string; volume_ml?: number; viscosity_wt?: number; bore_mm?: number; released?: string; documents?: string[]; supersedes?: string; c_rating?: number; case?: string; dimensions_mm?: number[]; weight_g?: number; connector?: string; chemistry?: string; cells?: number; capacity_mah?: number; notes?: string; equivalent_to?: EquivalentTo[]; fits?: Fits[]; includes?: Includes[]; links?: Link[]; kv?: number; turns?: number; sensored?: boolean; mount_holes?: MountHoles[]; motor_can_mm?: number; lipo_cells?: number[]; diameter_mm?: number; length_mm?: number; shaft_mm?: number; current_a?: number; peak_current_a?: number; rotation_deg?: number; rebrand_of?: { part: string; source?: string; notes?: string }[]; related?: { part: string; relation: string; notes?: string }[]; channels?: number; protocol?: string; radio_unit?: 'transmitter' | 'receiver' | 'set'; torque_kgcm?: number; speed_s?: number; voltage?: number; gear_material?: string; motor?: string; range?: string; displacement_cc?: number; engine_class?: string; stroke_mm?: number; output_hp?: number; output_rpm?: number; rpm_range?: number[]; fuel?: string };
export type Includes = { part?: string; spec?: string; qty?: number; source?: string; notes?: string };
export type Spec = { id: string; category: string; name?: string; standards?: string[]; [k: string]: unknown };
export type Doc = { id: string; brand?: string; kind: string; title: string; version?: string; date?: string; url?: string; page?: string; releases?: string[] };
export type KeyField = { field: string; label: string; from: 'part' | 'spec'; unit?: string; format?: string; compare_only?: boolean };
export type Standard = { id: string; code: string; title: string; url?: string; replaced_by?: string; notes?: string };
export type Category = { id: string; name: string; summary?: string; description?: string; spec_type?: string; key_fields?: KeyField[] };
export type Dataset = { schema_version: number; dataset: string; generated: string; brands: Brand[]; kits: Kit[]; releases: Release[]; parts: Part[]; documents: Doc[]; specs: Spec[]; categories?: Category[]; standards?: Standard[]; companies?: Company[] };

const path = process.env.HOBBYDEX_DATA ?? 'data/hobbydex-rc.json';
const raw: Dataset = JSON.parse(readFileSync(path, 'utf8'));
if (raw.schema_version !== 0) throw new Error(`unsupported export schema_version ${raw.schema_version}`);

const byId = <T extends { id: string }>(xs: T[]) => new Map(xs.map((x) => [x.id, x]));
function group<T>(xs: T[], key: (x: T) => string) {
  const m = new Map<string, T[]>();
  for (const x of xs) {
    const k = key(x);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(x);
  }
  return m;
}

const usesByPart = new Map<string, { release: Release; role: Contains['role'] }[]>();
for (const r of raw.releases) for (const c of r.contains ?? []) {
  if (!usesByPart.has(c.part)) usesByPart.set(c.part, []);
  usesByPart.get(c.part)!.push({ release: r, role: c.role });
}

const setsBySpec = new Map<string, { part: Part; qty?: number; notes?: string }[]>();
for (const p of raw.parts) for (const i of p.includes ?? []) if (i.spec) {
  if (!setsBySpec.has(i.spec)) setsBySpec.set(i.spec, []);
  setsBySpec.get(i.spec)!.push({ part: p, qty: i.qty, notes: i.notes });
}
const replacedBy = new Map<string, Part[]>();
for (const p of raw.parts) if (p.supersedes) {
  if (!replacedBy.has(p.supersedes)) replacedBy.set(p.supersedes, []);
  replacedBy.get(p.supersedes)!.push(p);
}
// Option parts that replace a stock part (fits rows with type "replaces" and a `replaces` part).
const upgradesFor = new Map<string, Part[]>();
for (const p of raw.parts) for (const r of new Set((p.fits ?? []).map((f) => f.replaces).filter((x): x is string => !!x))) {
  if (!upgradesFor.has(r)) upgradesFor.set(r, []);
  upgradesFor.get(r)!.push(p);
}
// Parts sold under another brand: rebranded part -> original, and original -> rebrands.
const rebrandsOf = new Map<string, Part[]>();
for (const p of raw.parts) for (const r of p.rebrand_of ?? []) {
  if (!rebrandsOf.has(r.part)) rebrandsOf.set(r.part, []);
  rebrandsOf.get(r.part)!.push(p);
}
// Parts a part's name cites (requires, fits, use-with, for, replaces), seen from the cited part.
const relatedTo = new Map<string, { part: Part; relation: string }[]>();
for (const p of raw.parts) for (const r of p.related ?? []) {
  if (!relatedTo.has(r.part)) relatedTo.set(r.part, []);
  relatedTo.get(r.part)!.push({ part: p, relation: r.relation });
}
const partsBySpec = new Map<string, { part: Part; link: EquivalentTo }[]>();
for (const p of raw.parts) for (const e of p.equivalent_to ?? []) {
  if (!partsBySpec.has(e.spec)) partsBySpec.set(e.spec, []);
  partsBySpec.get(e.spec)!.push({ part: p, link: e });
}

// Parts sold for a release's kit, split by the cars a per-car set is listed for: `here` fit this release (the fit
// names it, or names neither releases nor a car and so fits the whole kit), `other` are sets made for other cars
// of the kit (releases of it, or a car not in the data). Each part once, in the order given.
export function fitsForRelease(kitId: string, releaseId: string, keep: (p: Part) => boolean) {
  const here = new Map<string, Part>(), other = new Map<string, { part: Part; releases: string[]; cars: string[] }>();
  for (const { part, fit } of fitsByKit.get(kitId) ?? []) {
    if (!keep(part)) continue;
    if (fit.releases ? fit.releases.includes(releaseId) : !fit.car) { here.set(part.id, part); continue; }
    const o = other.get(part.id) ?? { part, releases: [], cars: [] };
    for (const r of fit.releases ?? []) if (!o.releases.includes(r)) o.releases.push(r);
    if (fit.car && !o.cars.includes(fit.car)) o.cars.push(fit.car);
    other.set(part.id, o);
  }
  for (const id of here.keys()) other.delete(id);
  return { here: [...here.values()], other: [...other.values()] };
}

const fitsByKit = new Map<string, { part: Part; fit: Fits }[]>();
for (const p of raw.parts) for (const f of p.fits ?? []) {
  if (!fitsByKit.has(f.kit)) fitsByKit.set(f.kit, []);
  fitsByKit.get(f.kit)!.push({ part: p, fit: f });
}

// kit relations seen from both sides: kit id -> [{ other kit, relation, link, direction }]
const kitRelations = new Map<string, { other: string; relation: 'rebrand' | 'platform'; link: KitLink; reverse: boolean }[]>();
const addRel = (a: string, b: string, relation: 'rebrand' | 'platform', link: KitLink, reverse: boolean) => {
  if (!kitRelations.has(a)) kitRelations.set(a, []);
  kitRelations.get(a)!.push({ other: b, relation, link, reverse });
};
for (const k of raw.kits) {
  for (const l of k.rebrand_of ?? []) { addRel(k.id, l.kit, 'rebrand', l, false); addRel(l.kit, k.id, 'rebrand', l, true); }
  for (const l of k.same_platform_as ?? []) { addRel(k.id, l.kit, 'platform', l, false); addRel(l.kit, k.id, 'platform', l, true); }
}

export const db = {
  ...raw,
  kitRelations,
  fitsByKit,
  categories: raw.categories ?? [],
  standards: raw.standards ?? [],
  standardByCode: new Map((raw.standards ?? []).map((s) => [s.code, s])),
  standard: byId(raw.standards ?? []),
  specs: raw.specs ?? [],
  spec: byId(raw.specs ?? []),
  partsBySpec,
  brand: byId(raw.brands),
  company: byId(raw.companies ?? []),
  brandsByOwner: group(raw.brands.filter((b) => b.owner), (b) => b.owner!),
  kit: byId(raw.kits),
  release: byId(raw.releases),
  part: byId(raw.parts),
  replacedBy,
  upgradesFor,
  rebrandsOf,
  relatedTo,
  setsBySpec,
  doc: byId(raw.documents),
  kitsByBrand: group(raw.kits, (k) => k.brand),
  releasesByKit: group(raw.releases, (r) => r.kit),
  partsByBrand: group(raw.parts, (p) => p.brand),
  usesByPart,
  partsByRange: group(raw.parts.filter((p) => p.range), (p) => p.range!),
};

// A part's item number. Parts of a brand that prints none (item_numbers = false, Acer Racing) have no number:
// their page URL still comes from the id's slug (url.part), their Number cell stays empty and their name is the link.
export const partNo = (p: Part) => p.number ?? '';
/** Link text for a part: its number, or its name when it has none. */
export const partLabel = (p: Part) => p.number ?? p.name;
/** What follows partLabel: the name without its number in front ("SB-2290SG SB-2290SG Standard ..."), empty when partLabel is the name. */
export const partRest = (p: Part) => (!p.number ? '' : p.name.startsWith(p.number) ? p.name.slice(p.number.length).trim() : p.name);
/** Natural order by part number (PS-2 before PS-10), parts without a number by name after them. */
export const byPartNo = (a: Part, b: Part) => (a.number ? 0 : 1) - (b.number ? 0 : 1) || partNo(a).localeCompare(partNo(b), undefined, { numeric: true }) || a.name.localeCompare(b.name);

/** 'brand/xray' -> ['xray']; 'part/xray/303122' -> ['xray', '303122'] */
export const key = (id: string) => id.split('/').slice(1);
export const url = {
  brand: (id: string) => `/rc/brands/${key(id)[0]}/`,
  kit: (id: string) => `/rc/kits/${key(id).join('/')}/`,
  release: (id: string) => `/rc/releases/${key(id).join('/')}/`,
  part: (id: string) => `/rc/parts/${key(id).join('/')}/`,
  spec: (id: string) => `/rc/specs/${key(id).join('/')}/`,
  standard: (id: string) => `/rc/standards/${key(id)[0]}/`,
  make: (make: string) => `/rc/makes/${makeSlug(make)}/`,
};
// Real vehicle makes (release and body shell `depicts`): "Mercedes-Benz" -> "mercedes-benz", "Land Rover" -> "land-rover"
export const makeSlug = (make: string) => make.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
/** "Porsche 911 Carrera RSR 2.8 (1973)" */
export const depictsText = (d: Depicts) => `${d.make} ${d.model}${d.year ? ` (${d.year})` : ''}`;
export const releasesByMake = group(raw.releases.filter((r) => r.depicts), (r) => r.depicts!.make);
export const bodiesByMake = group(raw.parts.filter((p) => p.depicts && p.category === 'body'), (p) => p.depicts!.make);
// Releases with an unknown year sort as oldest and show as 'unknown'.
export const yearOf = (r: { year?: number; model_year?: number }) => r.year ?? r.model_year ?? 0;   // a model year sorts in place of an unknown release year
// Sort key and label for a release date: '2025-03-22' > '2025-03' > '2025'.
export const dateKey = (r: { year?: number; released?: string }) => r.released ?? (r.year ? String(r.year) : '');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const dateText = (r: { year?: number; released?: string }) => {
  const m = r.released?.match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/);
  if (!m) return r.year ? String(r.year) : 'unknown';
  return [m[3] && String(Number(m[3])), m[2] && MONTHS[Number(m[2]) - 1], m[1]].filter(Boolean).join(' ');
};
// A document's web page as linked from a dated record. A catalogue paged by month (Tamiya's monthly new
// items, `current=YYYYMM` in its page URL) is recorded with one month's page; a release or part dated by it
// links the page of its own month, the one that lists it.
const MONTH_PAGE = /([?&]current=)\d{6}(?=&|$)/;
export const docPage = (d: { page?: string; url?: string; kind?: string }, released?: string) => {
  const w = d.page ?? (d.kind === 'product_page' ? d.url : undefined);
  const m = released?.match(/^(\d{4})-(\d{2})/);
  return w && m && MONTH_PAGE.test(w) ? w.replace(MONTH_PAGE, `$1${m[1]}${m[2]}`) : w;
};
/** The month-paged catalogue among a record's documents that dates it (see docPage), with the link to its month. */
export const dateSource = (r: { released?: string; documents?: string[] }) => {
  if (!r.released || !/^\d{4}-\d{2}/.test(r.released)) return undefined;
  for (const id of r.documents ?? []) {
    const d = db.doc.get(id);
    if (d?.page && MONTH_PAGE.test(d.page)) return { doc: d, href: docPage(d, r.released)! };
  }
  return undefined;
};
/** Oldest release first, by its date (or model year); undated releases last, in item-number order, then by name. */
export const byReleaseDate = (a: Release, b: Release) => {
  const ka = a.released ?? (yearOf(a) ? String(yearOf(a)) : ''), kb = b.released ?? (yearOf(b) ? String(yearOf(b)) : '');
  return (ka ? 0 : 1) - (kb ? 0 : 1) || ka.localeCompare(kb)
    || (a.number ? 0 : 1) - (b.number ? 0 : 1) || (a.number ?? '').localeCompare(b.number ?? '', undefined, { numeric: true }) || a.name.localeCompare(b.name);
};
export const yearText = (r: { year?: number; model_year?: number }) =>(r.year ? String(r.year) : r.model_year ? `${r.model_year} model` : 'unknown');
export const brandName = (id: string) => db.brand.get(id)?.name ?? id;

// Conversion kits: a release whose `requires` names a kit or release (the car it needs). For a kit, the
// conversion kits made for it or for any of its releases; for a release, those made for it or for its kit.
const requiredBy = new Map<string, Release[]>();
for (const r of raw.releases) for (const id of r.requires ?? []) { if (!requiredBy.has(id)) requiredBy.set(id, []); requiredBy.get(id)!.push(r); }
const uniq = (rs: Release[]) => [...new Map(rs.map((r) => [r.id, r])).values()].sort((a, b) => a.name.localeCompare(b.name));
export const conversionsForKit = (kitId: string) => uniq([...(requiredBy.get(kitId) ?? []), ...(db.releasesByKit.get(kitId) ?? []).flatMap((r) => requiredBy.get(r.id) ?? [])]);
export const conversionsForRelease = (r: Release) => uniq([...(requiredBy.get(r.id) ?? []), ...(requiredBy.get(r.kit) ?? [])]);
// what a required id is called: "Traxxas Slash 2WD" for a kit, "1RC Racing 1/18 Sprint Car (1RC1095)" for a release
export function requiredName(id: string): { name: string; href: string } | undefined {
  const k = db.kit.get(id);
  if (k) return { name: `${brandName(k.brand)} ${k.name}`, href: url.kit(id) };
  const r = db.release.get(id);
  if (r) return { name: `${brandName(r.brand)} ${r.name}${r.number ? ` (${r.number})` : ''}`, href: url.release(id) };
  return undefined;
}

// Clamp-on motor heat sinks and fan mounts by the can diameter they take (part.motor_can_mm), and a motor's can
// diameter: its own, else its spec's; a brushed spec names only a can code (540: 36 mm, 380: 28 mm).
const CAN_DIA: Record<string, number> = { '380': 28, '540': 36, '550': 36, '555': 36 };
export const heatsinksByCan = (() => {
  const m = new Map<number, Part[]>();
  for (const p of raw.parts) if (p.motor_can_mm) { const k = Math.round(p.motor_can_mm); if (!m.has(k)) m.set(k, []); m.get(k)!.push(p); }
  for (const v of m.values()) v.sort((a, b) => brandName(a.brand).localeCompare(brandName(b.brand)) || (a.number ?? '').localeCompare(b.number ?? ''));
  return m;
})();
export function canDiameter(x: { diameter_mm?: number; can?: unknown; equivalent_to?: { spec: string }[] }): number | undefined {
  if (x.diameter_mm) return Math.round(x.diameter_mm);
  if (x.can && CAN_DIA[String(x.can)]) return CAN_DIA[String(x.can)];
  for (const e of x.equivalent_to ?? []) { const s = db.spec.get(e.spec); if (s?.category === 'motor') return canDiameter(s as { diameter_mm?: number; can?: unknown }); }
  return undefined;
}
