import { db, url, brandName } from '../lib/data';

// Every platform as [title, brand, url] for /search/: platform title matches are found in this short
// list rather than by a second, type-filtered pagefind search (see public/search-rank.js).
export function GET() {
  const rows = db.kits.map((k) => [`${brandName(k.brand)} ${k.name}`, brandName(k.brand), url.platform(k.id)]);
  return new Response(JSON.stringify(rows), { headers: { 'Content-Type': 'application/json' } });
}
