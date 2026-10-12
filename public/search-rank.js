// Search ranking for /search/ (lower comes first), shared with tests/search.test.mjs.
// An exact kit or release name, then kits, releases and parts whose title holds every word
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
    const tier = (t === 'kit' || t === 'release') && (name === qn || bare === qn) ? 0
      : t === 'kit' && all ? 1 : t === 'release' && all ? 2 : t === 'part' && all ? (CAR_PARTS.includes(cat) ? 3 : 4)
      : all ? 5 : t === 'part' ? 7 : 6;
    return { i, tier, len: name.length };
  }).sort((a, b) => a.tier - b.tier || (a.tier <= 4 ? a.len - b.len : 0) || a.i - b.i).map((x) => x.i);
}
