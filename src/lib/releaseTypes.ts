import { db, key, type Release } from './data';

// A release's type: its own category, else its kit's category, else 'car' (the platform type pages' default).
export const releaseType = (r: Release) => r.category || db.kit.get(r.kit)?.category || 'car';

// Releases of each type, in data order.
export const releasesByType = (() => {
  const m = new Map<string, Release[]>();
  for (const r of db.releases) {
    const t = releaseType(r);
    if (!m.has(t)) m.set(t, []);
    m.get(t)!.push(r);
  }
  return m;
})();

// A type with more releases than this gets an index of brands and one sub-page per brand.
export const SPLIT_AT = 300;

// The brand's segment in /rc/brands/<slug>/ and /rc/releases/types/<type>/<slug>/.
export const brandSlug = (brand: string) => key(brand)[0];

export const releaseScale = (r: Release) => r.scale ?? db.kit.get(r.kit)?.scale ?? '';

// Largest scale first (1/5 before 1/10), scales left out last, then by name.
export const releaseByScaleName = (a: Release, b: Release) => {
  const sk = (r: Release) => { const s = releaseScale(r); return s ? Number(s.split('/')[1]) : 999; };
  return sk(a) - sk(b) || a.name.localeCompare(b.name);
};
