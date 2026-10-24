// Loads the dataset export produced by hobbydex-rc/tools/export.py.
// The site reads only this JSON (schema_version 0); it never touches TOML.
import { readFileSync } from 'node:fs';
import { balanceSpecId, plugSpecId } from './plugs';

export type Brand = { id: string; name: string; legal_name?: string; country?: string; website?: string; youtube?: string[]; kind?: string; status: string; launched?: string; launched_source?: string; launched_doubt?: string; ended?: string; ended_source?: string; ended_doubt?: string; item_numbers?: boolean; notes?: string; owner?: string; owner_source?: string; owner_since?: number };
// A company that owns brands (hobbydex-rc docs/schema.md "company"); brand: the brand that carries its own range, when it has one.
export type Make = { id: string; name: string; country: string; notes: string; toml_path?: string };   // a real vehicle make (data/makes); name as the make spells itself
export type Company = { id: string; name: string; legal_name?: string; country?: string; website?: string; status?: string; brand?: string; parent?: string; notes?: string };
export type Link = { site: string; url: string; kind?: 'fan-site' | 'press' | 'dealer' };   // dealer: a shop's product page, never the maker's
export type KitLink = { kit: string; parts?: 'interchangeable' | 'partly' | 'unknown'; source?: string; notes?: string };
export type Kit = { id: string; sources?: Record<string, string>; placeholder?: boolean; toml_path?: string; former_ids?: string[]; brand: string; name: string; category: string; surface?: string[]; scale?: string; drive?: string; power?: string; notes?: string; art?: string; rebrand_of?: KitLink[]; same_platform_as?: KitLink[]; supersedes?: string; links?: Link[] };
export type Contains = { part: string; role: 'kit' | 'option' | 'listed'; source: string; qty?: number; step?: string; slot?: string };
// What a buyer must get separately to complete a release (hobbydex-rc docs/schema.md "release", needs): a part, or a generic item
export type Need = { part?: string; item?: string; source: string; qty?: number; note?: string };
export type Depicts = { make?: string; model: string; year?: number; licensed?: boolean };   // the real vehicle a release or body shell replicates; no make when several makers built it (a Sherman)
export type Release = { id: string; sources?: Record<string, string>; depicts?: Depicts; toml_path?: string; announced_source?: string; series?: string; requires?: string[]; gtin?: string; former_ids?: string[]; kit: string; scale?: string; brand: string; number?: string; name: string; color?: string; year?: number; year_doubt?: string; released?: string; released_doubt?: string; announced?: string; seen_by?: string; seen_by_source?: string; kind: string; status: string; edition?: string; surface?: string[]; model_year?: number; category?: string; art?: string; supersedes?: string; related?: { release: string; relation: string; source: string }[]; documents?: string[]; channels?: number; protocol?: string; torque_kgcm?: number; speed_s?: number; voltage?: number; gear_material?: string; motor?: string; contains?: Contains[]; needs?: Need[]; links?: Link[] };
export type EquivalentTo = { spec: string; match: 'exact' | 'functional' | 'close'; source?: string; notes?: string };
export type Fits = { kit: string; releases?: string[]; car?: string; type: 'direct' | 'replaces' | 'modification'; replaces?: string; source?: string; notes?: string };   // releases: the cars of the kit the maker lists the part for; car: a car that is none of them; neither: every release
export type MountHoles = { thread: string; count?: number; circle_mm: number };   // count left out: the maker gives thread and spacing only
export type Part = { id: string; wire_awg?: number | number[]; insulation?: 'silicone' | 'pvc' | 'teflon'; strands?: number; shrink_ratio?: number; flat_width_mm?: number; sources?: Record<string, string>; status?: string; depicts?: Depicts; toml_path?: string; gtin?: string; former_ids?: string[]; brand: string; number?: string; numbers?: string[]; name: string; category?: string; art?: string; teeth?: number; module?: number; pitch_dp?: number; mounting?: string; wheel_size?: string; compound?: string; offset_mm?: number; beadlock?: boolean; color?: string; wheel_color?: string; material_grade?: string; rate?: string; rate_n_mm?: number; rate_lb_in?: number; wire_mm?: number; free_length_mm?: number | string; pack_qty?: number; pack_qty_basis?: 'name' | 'page' | 'includes' | 'photo' | 'photos' | 'owner'; former_names?: string[]; applies_to?: string; material?: string; strength_class?: string; finish?: string; swatch?: string; application?: string | string[]; paint_type?: string; thread_type?: string; point?: string; seal?: string; lubricant?: string; volume_ml?: number; viscosity_wt?: number; bore_mm?: number; released?: string; released_doubt?: string; documents?: string[]; supersedes?: string; c_rating?: number; case?: string; dimensions_mm?: number[]; weight_g?: number; connector?: string; balance_connector?: string; connectors?: string[]; chemistry?: string; cells?: number; capacity_mah?: number; notes?: string; equivalent_to?: EquivalentTo[]; fits?: Fits[]; includes?: Includes[]; links?: Link[]; kv?: number; turns?: number; sensored?: boolean; mount_holes?: MountHoles[]; motor_can_mm?: number; lipo_cells?: number[]; diameter_mm?: number; length_mm?: number; shaft_mm?: number; current_a?: number; peak_current_a?: number; rotation_deg?: number; rebrand_of?: { part: string; source?: string; notes?: string }[]; related?: { part: string; relation: string; notes?: string }[]; channels?: number; protocol?: string; radio_unit?: 'transmitter' | 'receiver' | 'set' | 'gyro'; torque_kgcm?: number; speed_s?: number; bearings?: number; bearing_kind?: 'ball' | 'bushing'; dead_band_us?: number; frequency_hz?: number | [number, number]; voltage?: number; gear_material?: string; motor?: string; range?: string; displacement_cc?: number; engine_class?: string; stroke_mm?: number; output_hp?: number; output_rpm?: number; rpm_range?: number[]; fuel?: string; motor_type?: 'brushed' | 'brushless' | 'both'; bec_v?: number | number[]; bec_a?: number; waterproof?: boolean; motor_limit_t?: number; motor_limit_kv?: number; nimh_cells?: number[]; programming?: string[]; resistance_mohm?: number };
export type Includes = { part?: string; spec?: string; qty?: number; source?: string; notes?: string };
export type Spec = { id: string; category: string; name?: string; standards?: string[]; [k: string]: unknown };
export type Doc = { id: string; brand?: string; kind: string; title: string; version?: string; date?: string; url?: string; page?: string; releases?: string[]; kits?: string[]; parts?: string[]; channel?: string; duration_s?: number };
export type KeyField = { field: string; label: string; from: 'part' | 'spec'; unit?: string; format?: string; compare_only?: boolean };
export type Standard = { id: string; code: string; title: string; url?: string; replaced_by?: string; notes?: string };
export type Category = { id: string; name: string; summary?: string; description?: string; spec_type?: string; former_ids?: string[]; key_fields?: KeyField[]; terms?: { term: string; text: string }[] };
export type Dataset = { schema_version: number; dataset: string; generated: string; brands: Brand[]; kits: Kit[]; releases: Release[]; parts: Part[]; documents: Doc[]; specs: Spec[]; categories?: Category[]; standards?: Standard[]; companies?: Company[]; makes?: Make[] };

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
// Releases that replace a release (supersedes, set on the newer one): the newer releases that replace each one.
const releaseReplacedBy = new Map<string, Release[]>();
// Re-releases of a release (related, relation rerelease-of, set on the re-release): the re-releases of each original.
const reReleasedAs = new Map<string, Release[]>();
for (const r of raw.releases) for (const x of r.related ?? []) if (x.relation === 'rerelease-of') {
  if (!reReleasedAs.has(x.release)) reReleasedAs.set(x.release, []);
  reReleasedAs.get(x.release)!.push(r);
}
for (const r of raw.releases) if (r.supersedes) {
  if (!releaseReplacedBy.has(r.supersedes)) releaseReplacedBy.set(r.supersedes, []);
  releaseReplacedBy.get(r.supersedes)!.push(r);
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
// Leads, adapters and harnesses by each connector spec they list (`connectors`); a part lists a plug once.
const leadsBySpec = new Map<string, Part[]>();
for (const p of raw.parts) for (const name of new Set(p.connectors ?? [])) {
  const id = plugSpecId(name);
  if (!id) continue;
  if (!leadsBySpec.has(id)) leadsBySpec.set(id, []);
  leadsBySpec.get(id)!.push(p);
}

// Parts by the connector spec their `connector` names (batteries, ESCs, servos) and batteries by their balance lead.
const plugsBySpec = new Map<string, Part[]>();
const balanceBySpec = new Map<string, Part[]>();
for (const p of raw.parts) {
  const id = plugSpecId(p.connector), bid = balanceSpecId(p);
  if (id) { if (!plugsBySpec.has(id)) plugsBySpec.set(id, []); plugsBySpec.get(id)!.push(p); }
  if (bid) { if (!balanceBySpec.has(bid)) balanceBySpec.set(bid, []); balanceBySpec.get(bid)!.push(p); }
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

// the makers' own videos (documents of kind video) by what they show: a release, a whole kit, a part; newest first
const videos = raw.documents.filter((d) => d.kind === 'video');
const videosBy = (f: (d: Doc) => string[] | undefined) => {
  const m = new Map<string, Doc[]>();
  for (const d of videos) for (const x of f(d) ?? []) { if (!m.has(x)) m.set(x, []); m.get(x)!.push(d); }
  for (const ds of m.values()) ds.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || a.title.localeCompare(b.title));
  return m;
};
const videosByRelease = videosBy((d) => d.releases), videosByKit = videosBy((d) => d.kits), videosByPart = videosBy((d) => d.parts);

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

// Platforms that replace a platform (supersedes, set on the newer kit): the newer kits that replace each one.
const kitReplacedBy = new Map<string, Kit[]>();
for (const k of raw.kits) if (k.supersedes) {
  if (!kitReplacedBy.has(k.supersedes)) kitReplacedBy.set(k.supersedes, []);
  kitReplacedBy.get(k.supersedes)!.push(k);
}

export const db = {
  ...raw,
  // platforms: a placeholder kit (releases whose chassis no source names yet) is in no platform list, count or sitemap
  kits: raw.kits.filter((k) => !k.placeholder),
  kitRelations,
  kitReplacedBy,
  fitsByKit,
  categories: raw.categories ?? [],
  standards: raw.standards ?? [],
  standardByCode: new Map((raw.standards ?? []).map((s) => [s.code, s])),
  standard: byId(raw.standards ?? []),
  specs: raw.specs ?? [],
  spec: byId(raw.specs ?? []),
  partsBySpec,
  leadsBySpec,
  plugsBySpec,
  balanceBySpec,
  brand: byId(raw.brands),
  company: byId(raw.companies ?? []),
  makeByName: new Map((raw.makes ?? []).map((m) => [m.name, m])),
  brandsByOwner: group(raw.brands.filter((b) => b.owner), (b) => b.owner!),
  kit: byId(raw.kits),
  release: byId(raw.releases),
  part: byId(raw.parts),
  replacedBy,
  releaseReplacedBy,
  reReleasedAs,
  upgradesFor,
  rebrandsOf,
  relatedTo,
  setsBySpec,
  doc: byId(raw.documents),
  videosByRelease,
  videosByKit,
  videosByPart,
  kitsByBrand: group(raw.kits.filter((k) => !k.placeholder), (k) => k.brand),
  releasesByKit: group(raw.releases, (r) => r.kit),
  releasesBySeries: group(raw.releases.filter((r) => r.series), (r) => `${r.brand}|${r.series}`),
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
  platform: (id: string) => `/rc/platforms/${key(id).join('/')}/`,
  release: (id: string) => `/rc/releases/${key(id).join('/')}/`,
  part: (id: string) => `/rc/parts/${key(id).join('/')}/`,
  spec: (id: string) => `/rc/specs/${key(id).join('/')}/`,
  standard: (id: string) => `/rc/standards/${key(id)[0]}/`,
  make: (make: string) => `/rc/makes/${makeSlug(make)}/`,
};
// Real vehicle makes (release and body shell `depicts`): "Mercedes-Benz" -> "mercedes-benz", "Land Rover" -> "land-rover"
export const makeSlug = (make: string) => make.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// ISO 3166 alpha-2 code -> English country name ("DE" -> "Germany"); the code itself when the runtime has no name for it
export const countryName = (code: string) => new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code;
/** "Porsche 911 Carrera RSR 2.8 (1973)" */
// one key per model however a maker spells it: case, spaces and hyphens do not count ("4x4 Pick Up" = "4x4 Pick-Up")
export const modelKey = (model: string) => model.toLowerCase().replace(/[^a-z0-9]+/g, '');
export const depictsModel = (d: Depicts) => `${d.model}${d.year ? ` (${d.year})` : ''}`;
// releases and body shells with a make only: the make pages; a vehicle with no make is listed on its releases and bodies alone
export const releasesByMake = group(raw.releases.filter((r) => r.depicts?.make), (r) => r.depicts!.make!);
export const bodiesByMake = group(raw.parts.filter((p) => p.depicts?.make && p.category === 'body'), (p) => p.depicts!.make!);
// A real vehicle: the releases and body shells that depict one model of a make (or of no make, a model several makers
// built), one entry per model however it is spelled; the spelling most of them use names it. Its page is
// /rc/makes/<make>/<slug>/, or /rc/vehicles/<slug>/ without a make.
export type Vehicle = { make?: string; model: string; slug: string; href: string; releases: Release[]; bodies: Part[] };
const vehicleKey = (d: { make?: string; model: string }) => `${d.make ?? ''}|${modelKey(d.model)}`;
const vehicleRels = group(raw.releases.filter((r) => r.depicts), (r) => vehicleKey(r.depicts!));
const vehicleBodies = group(raw.parts.filter((p) => p.depicts && p.category === 'body'), (p) => vehicleKey(p.depicts!));
export const vehicles: Vehicle[] = [...new Set([...vehicleRels.keys(), ...vehicleBodies.keys()])].map((key) => {
  const releases = vehicleRels.get(key) ?? [], bodies = vehicleBodies.get(key) ?? [];
  const spellings = [...releases, ...bodies].map((x) => x.depicts!);
  const counts = new Map<string, number>();
  for (const d of spellings) counts.set(d.model, (counts.get(d.model) ?? 0) + 1);
  const model = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
  const make = spellings[0].make, slug = makeSlug(model);
  return { make, model, slug, href: make ? `/rc/makes/${makeSlug(make)}/${slug}/` : `/rc/vehicles/${slug}/`, releases, bodies };
}).sort((a, b) => (a.make ?? '').localeCompare(b.make ?? '') || a.model.localeCompare(b.model, undefined, { numeric: true, sensitivity: 'base' }));
const vehicleIndex = new Map(vehicles.map((v) => [vehicleKey(v), v]));
/** The vehicle a release's or body shell's depicts names. */
export const vehicleOf = (d: Depicts) => vehicleIndex.get(vehicleKey(d));
// Releases with an unknown year sort as oldest and show as 'unknown'.
export const yearOf = (r: { year?: number; model_year?: number }) => r.year ?? r.model_year ?? 0;   // a model year sorts in place of an unknown release year
// Dates are ISO 8601 at the precision the source gives: "2012", "2012-05", "2012-05-01". A release's
// date is released (or year, until released carries every year), then announced (the maker's
// announcement, a real date), then seen_by: the first archived capture of the maker's page, an upper
// bound that is not the release date and is marked with a *. The helpers below are the only place
// that orders or words these.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const isoText = (iso: string) => {
  const m = iso.match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/);
  if (!m) return iso;
  return [m[1], m[2] && MONTHS[Number(m[2]) - 1], m[3] && String(Number(m[3]))].filter(Boolean).join(' ');
};
/** The release date a source states: released, else the year. */
export const releasedOf = (r: { year?: number; released?: string }) => r.released ?? (r.year ? String(r.year) : undefined);
/** Any date at all, the seen_by upper bound included. */
export const hasDate = (r: { year?: number; released?: string; announced?: string; seen_by?: string }) => !!(releasedOf(r) || r.announced || r.seen_by);
/** Only the seen_by bound: no date a source states. */
export const seenOnly = (r: { year?: number; released?: string; announced?: string; seen_by?: string }) => !releasedOf(r) && !r.announced && !!r.seen_by;
// Sort key: '2025-03-22' > '2025-03' > '2025'; an announced date and a seen_by bound sort among the real dates.
export const dateKey = (r: { year?: number; released?: string; announced?: string; seen_by?: string }) =>
  releasedOf(r) ?? r.announced ?? r.seen_by ?? '';
/** The year a release is listed under by year: its own, else the year of its announcement or seen_by bound. */
export const listYear = (r: { year?: number; released?: string; announced?: string; seen_by?: string }) => {
  const k = dateKey(r);
  return k ? Number(k.slice(0, 4)) : undefined;
};
/** The date column: "2012", "2012 May", "2012 May 1"; "announced 2012 May"; "2012 May" for seen_by alone. */
export const dateTextPlain = (r: { year?: number; released?: string; announced?: string; seen_by?: string }) => {
  const real = releasedOf(r);
  if (real) return isoText(real);
  if (r.announced) return `announced ${isoText(r.announced)}`;
  if (r.seen_by) return isoText(r.seen_by);
  return 'unknown';
};
/** dateTextPlain with the "*" for seen_by alone (see SEEN_NOTE), for a plain-text context. */
export const dateText = (r: { year?: number; released?: string; announced?: string; seen_by?: string }) =>
  dateTextPlain(r) + (seenOnly(r) ? '*' : '');
export const SEEN_NOTE = "* not the release date: the first time the maker's page for it was archived, so it was on sale by then.";
// The reason the date dateText shows is doubtful (released_doubt, or year_doubt when only the year is shown); undefined when it is sure.
export const dateDoubt = (r: { year?: number; released?: string; year_doubt?: string; released_doubt?: string }) =>
  r.released ? r.released_doubt : r.year ? r.year_doubt : undefined;
// The year yearText shows is doubtful (year_doubt); undefined when it is sure or when only a model year is shown.
export const yearDoubt = (r: { year?: number; year_doubt?: string }) => (r.year ? r.year_doubt : undefined);
// The page a source names: a doc/ id's document page (or its URL), else the URL itself.
export const sourceHref = (s?: string) => {
  if (!s) return undefined;
  if (!s.startsWith('doc/')) return s;
  const d = db.doc.get(s);
  return d ? docPage(d) ?? d.url : undefined;
};
// A brand that is gone: its releases and parts are marked "(brand defunct)" and its rows are discontinued in lists.
export const brandGone = (id: string) => db.brand.get(id)?.status === 'gone';
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
  const ka = dateKey(a) || (yearOf(a) ? String(yearOf(a)) : ''), kb = dateKey(b) || (yearOf(b) ? String(yearOf(b)) : '');
  return (ka ? 0 : 1) - (kb ? 0 : 1) || ka.localeCompare(kb)
    || (a.number ? 0 : 1) - (b.number ? 0 : 1) || (a.number ?? '').localeCompare(b.number ?? '', undefined, { numeric: true }) || a.name.localeCompare(b.name);
};
export const yearTextPlain = (r: { year?: number; released?: string; announced?: string; seen_by?: string; model_year?: number }) =>
  hasDate(r) ? dateTextPlain(r) : r.model_year ? `${r.model_year} model` : 'unknown';
/** yearTextPlain with the "*" for seen_by alone, for a plain-text context. */
export const yearText = (r: { year?: number; released?: string; announced?: string; seen_by?: string; model_year?: number }) =>
  yearTextPlain(r) + (seenOnly(r) ? '*' : '');
export const brandName = (id: string) => db.brand.get(id)?.name ?? id;
// The short name of the page an announced date comes from, for the release page: the brand's video, Big Squid RC,
// the maker's press release (a PDF) or, else, the maker's news.
export const announcedSourceLabel = (url: string, brand: string) => {
  const u = new URL(url);
  if (u.hostname.endsWith('bigsquidrc.com')) return 'Big Squid RC';
  if (u.hostname.endsWith('youtube.com') || u.hostname === 'youtu.be') return `${brand} video`;
  if (u.pathname.toLowerCase().endsWith('.pdf')) return 'press release';
  return 'maker news';
};

// Conversion kits: a release whose `requires` names a kit or release (the car it needs). For a kit, the
// conversion kits made for it or for any of its releases; for a release, those made for it or for its kit.
const requiredBy = new Map<string, Release[]>();
for (const r of raw.releases) for (const id of r.requires ?? []) { if (!requiredBy.has(id)) requiredBy.set(id, []); requiredBy.get(id)!.push(r); }
const uniq = (rs: Release[]) => [...new Map(rs.map((r) => [r.id, r])).values()].sort((a, b) => a.name.localeCompare(b.name));
export const conversionsForKit = (kitId: string) => uniq([...(requiredBy.get(kitId) ?? []), ...(db.releasesByKit.get(kitId) ?? []).flatMap((r) => requiredBy.get(r.id) ?? [])]);
/** The other releases of the same brand and series (the maker's car line), oldest first; none for a release without a series. */
export const seriesMates = (r: Release) => r.series ? (db.releasesBySeries.get(`${r.brand}|${r.series}`) ?? []).filter((x) => x.id !== r.id).sort(byReleaseDate) : [];
export const conversionsForRelease = (r: Release) => uniq([...(requiredBy.get(r.id) ?? []), ...(requiredBy.get(r.kit) ?? [])]);
// what a required id is called: "Traxxas Slash 2WD" for a kit, "1RC Racing 1/18 Sprint Car (1RC1095)" for a release
export function requiredName(id: string): { name: string; href: string } | undefined {
  const k = db.kit.get(id);
  if (k) return { name: `${brandName(k.brand)} ${k.name}`, href: url.platform(id) };
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
