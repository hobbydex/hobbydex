import { db, url, brandName, releasesByMake, bodiesByMake } from '../lib/data';

// Every platform as [title, brand, url], then every car make and brand as [title, sub, url, type], for
// /search/: their title matches are found in this short list rather than by a second, type-filtered pagefind
// search (see public/search-rank.js). Make and brand pages are long, so pagefind ranks them too low to be
// among the hits that get re-ranked.
export function GET() {
  const makes = [...new Set([...releasesByMake.keys(), ...bodiesByMake.keys()])];
  const rows = [...db.kits.map((k) => [`${brandName(k.brand)} ${k.name}`, brandName(k.brand), url.platform(k.id)]),
    ...makes.map((m) => [`${m} RC cars`, 'car make', url.make(m), 'make']),
    ...db.brands.map((b) => [b.name, 'brand', url.brand(b.id), 'brand'])];
  return new Response(JSON.stringify(rows), { headers: { 'Content-Type': 'application/json' } });
}
