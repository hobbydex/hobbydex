// Loads the dataset export produced by hobbydex-rc/tools/export.py.
// The site reads only this JSON (schema_version 0); it never touches TOML.
import { readFileSync } from 'node:fs';

export type Brand = { id: string; name: string; legal_name?: string; country?: string; website?: string; kind?: string; status: string; notes?: string };
export type Link = { site: string; url: string };
export type KitLink = { kit: string; parts?: 'interchangeable' | 'partly' | 'unknown'; source?: string; notes?: string };
export type Kit = { id: string; brand: string; name: string; category: string; scale?: string; drive?: string; power?: string; notes?: string; rebrand_of?: KitLink[]; same_platform_as?: KitLink[] };
export type Contains = { part: string; role: 'kit' | 'option' | 'listed'; source: string; qty?: number; step?: string; slot?: string };
export type Release = { id: string; kit: string; brand: string; number?: string; name: string; year?: number; kind: string; status: string; edition?: string; documents?: string[]; channels?: number; protocol?: string; torque_kgcm?: number; speed_s?: number; voltage?: number; gear_material?: string; motor?: string; contains?: Contains[]; links?: Link[] };
export type EquivalentTo = { spec: string; match: 'exact' | 'functional' | 'close'; source?: string; notes?: string };
export type Fits = { kit: string; type: 'direct' | 'replaces' | 'modification'; replaces?: string; source?: string; notes?: string };
export type Part = { id: string; brand: string; number: string; name: string; category?: string; pack_qty?: number; former_names?: string[]; applies_to?: string; material?: string; strength_class?: string; finish?: string; thread_type?: string; seal?: string; lubricant?: string; volume_ml?: number; viscosity_wt?: number; bore_mm?: number; released?: string; documents?: string[]; supersedes?: string; c_rating?: number; case?: string; dimensions_mm?: number[]; weight_g?: number; connector?: string; chemistry?: string; cells?: number; capacity_mah?: number; notes?: string; equivalent_to?: EquivalentTo[]; fits?: Fits[]; includes?: Includes[]; links?: Link[]; kv?: number; turns?: number; lipo_cells?: number[]; diameter_mm?: number; length_mm?: number; shaft_mm?: number; current_a?: number; peak_current_a?: number; rebrand_of?: { part: string; source?: string; notes?: string }[]; channels?: number; protocol?: string; torque_kgcm?: number; speed_s?: number; voltage?: number; gear_material?: string; motor?: string };
export type Includes = { part?: string; spec?: string; qty?: number; source?: string; notes?: string };
export type Spec = { id: string; category: string; name?: string; standards?: string[]; [k: string]: unknown };
export type Doc = { id: string; brand?: string; kind: string; title: string; version?: string; date?: string; url?: string; releases?: string[] };
export type Dataset = { schema_version: number; dataset: string; generated: string; brands: Brand[]; kits: Kit[]; releases: Release[]; parts: Part[]; documents: Doc[]; specs: Spec[] };

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
const partsBySpec = new Map<string, { part: Part; link: EquivalentTo }[]>();
for (const p of raw.parts) for (const e of p.equivalent_to ?? []) {
  if (!partsBySpec.has(e.spec)) partsBySpec.set(e.spec, []);
  partsBySpec.get(e.spec)!.push({ part: p, link: e });
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
  specs: raw.specs ?? [],
  spec: byId(raw.specs ?? []),
  partsBySpec,
  brand: byId(raw.brands),
  kit: byId(raw.kits),
  release: byId(raw.releases),
  part: byId(raw.parts),
  replacedBy,
  upgradesFor,
  rebrandsOf,
  setsBySpec,
  doc: byId(raw.documents),
  kitsByBrand: group(raw.kits, (k) => k.brand),
  releasesByKit: group(raw.releases, (r) => r.kit),
  partsByBrand: group(raw.parts, (p) => p.brand),
  usesByPart,
};

/** 'brand/xray' -> ['xray']; 'part/xray/303122' -> ['xray', '303122'] */
export const key = (id: string) => id.split('/').slice(1);
export const url = {
  brand: (id: string) => `/rc/brands/${key(id)[0]}/`,
  kit: (id: string) => `/rc/kits/${key(id).join('/')}/`,
  release: (id: string) => `/rc/releases/${key(id).join('/')}/`,
  part: (id: string) => `/rc/parts/${key(id).join('/')}/`,
  spec: (id: string) => `/rc/specs/${key(id).join('/')}/`,
};
// Releases with an unknown year sort as oldest and show as 'unknown'.
export const yearOf = (r: { year?: number }) => r.year ?? 0;
export const yearText = (r: { year?: number }) => (r.year ? String(r.year) : 'unknown');
export const brandName = (id: string) => db.brand.get(id)?.name ?? id;
