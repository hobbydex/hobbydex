// Search ranking for /search/ (lower comes first), shared with tests/search.test.mjs.
// An exact platform or release name, then platforms, releases and parts whose title holds every word
// (shortest title first; bodies, wings, decals and bumpers before generic parts), then pages
// that only mention the words. `datas` are pagefind result data in pagefind's own order.
export const CAR_PARTS = ['Body and covers', 'Wings', 'Decals', 'Bumpers and guards'];
export const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export function rankHits(text, datas) {
  const qn = norm(text), words = qn.split(' ').filter(Boolean);
  return datas.map((d, i) => {
    const t = d.meta.type || '', title = norm(d.meta.title), brand = norm((d.meta.sub || '').split('·')[0]);
    const bare = brand && title.startsWith(brand + ' ') ? title.slice(brand.length + 1) : title;
    const name = t === 'part' ? bare.replace(/^\S+\s/, '') : bare;   // a part title starts with its number
    const all = words.every((w) => title.includes(w));
    const cat = (d.filters && d.filters.category && d.filters.category[0]) || '';
    const tier = (t === 'platform' || t === 'release') && (name === qn || bare === qn) ? 0
      : t === 'platform' && all ? 1 : t === 'release' && all ? 2 : t === 'part' && all ? (CAR_PARTS.includes(cat) ? 3 : 4)
      : all ? 5 : t === 'part' ? 7 : 6;
    return { i, tier, len: name.length };
  }).sort((a, b) => a.tier - b.tier || (a.tier <= 4 ? a.len - b.len : 0) || a.i - b.i).map((x) => x.i);
}

// How many of pagefind's hits are re-ranked: each needs its fragment fetched (one request per page), so
// the candidates are kept few. Pagefind already weights titles, so title matches sit near its top.
export const PLATFORM_CANDIDATES = 10, OTHER_CANDIDATES = 60;
// Platforms are few and can sit far down pagefind's order behind hundreds of a chassis's releases and
// parts ("TT-02"): the platforms whose title holds every word (shortest first) always join the
// candidates. They come from `platforms`, the [title, brand, url] rows of /search-platforms.json.
export function platformHits(text, platforms) {
  const words = norm(text).split(' ').filter(Boolean);
  if (!words.length) return [];
  return platforms.filter(([title]) => { const t = norm(title); return words.every((w) => t.includes(w)); })
    .sort((a, b) => a[0].length - b[0].length).slice(0, PLATFORM_CANDIDATES)
    .map(([title, sub, url]) => { const d = { url, meta: { type: 'platform', title, sub }, filters: {} }; return { id: url, data: async () => d }; });
}
// A plain query (no filters): pagefind's hits re-ranked by rankHits, with the platform title matches
// joined in. Returns { hits, datas } (datas[i] belongs to hits[i] for the ranked head; the rest of
// pagefind's hits follow unranked), or null when `stale()` turns true meanwhile.
export async function rankedSearch(pagefind, text, platforms, stale = () => false) {
  const own = platformHits(text, platforms), seen = new Set(own.map((h) => h.id));
  const all = (await pagefind.search(text)).results;
  if (stale()) return null;
  const head = all.slice(0, OTHER_CANDIDATES), loaded = await Promise.all(head.map((h) => h.data()));
  if (stale()) return null;
  const keep = head.map((_, i) => i).filter((i) => !seen.has(loaded[i].url));
  const top = [...own, ...keep.map((i) => head[i])], datas = [...await Promise.all(own.map((h) => h.data())), ...keep.map((i) => loaded[i])];
  const order = rankHits(text, datas);
  return { hits: [...order.map((i) => top[i]), ...all.slice(OTHER_CANDIDATES)], datas: order.map((i) => datas[i]) };
}
