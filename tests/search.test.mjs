// Search regression tests: `npm test` (after `npm run build` for the index tests).
// Unit tests check the ranking rules on hand-made results; index tests run real searches
// against the built pagefind index in dist/ and are skipped when there is no build.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
import { rankHits } from '../public/search-rank.js';

const d = (type, title, sub = '', category) => ({ meta: { type, title, sub }, filters: category ? { category: [category] } : {} });
const order = (text, datas) => rankHits(text, datas).map((i) => datas[i].meta.title);

test('an exact kit name comes first, then longer kit names, then releases, then parts', () => {
  const datas = [
    d('release', 'Tamiya Lamborghini Countach 5000S (TT-02)', 'Tamiya · 2026'),
    d('part', '22023 · TT-02 Chassis Cover Set', 'Tamiya', 'Chassis and mounts'),
    d('kit', 'Tamiya TT-02 TYPE-S', 'Tamiya'),
    d('kit', 'Tamiya TT-02B', 'Tamiya'),
    d('kit', 'Tamiya TT-02', 'Tamiya'),
  ];
  assert.deepEqual(order('TT-02', datas), [
    'Tamiya TT-02', 'Tamiya TT-02B', 'Tamiya TT-02 TYPE-S',
    'Tamiya Lamborghini Countach 5000S (TT-02)', '22023 · TT-02 Chassis Cover Set',
  ]);
});

test('bodies come before generic parts such as bearing kits', () => {
  const datas = [
    d('part', 'TFE857 · Tamiya Lancia Delta Sealed Bearing Kit', 'Fast Eddy Bearings', 'Bearings and bushings'),
    d('part', '51401 · 1/10 Scale R/C Lancia Delta Integrale Body Parts Set', 'Tamiya', 'Body and covers'),
  ];
  assert.equal(order('lancia delta', datas)[0], '51401 · 1/10 Scale R/C Lancia Delta Integrale Body Parts Set');
});

test('a page that only mentions the words comes after every title match', () => {
  const datas = [
    d('kit', 'Tamiya XV-01', 'Tamiya'),   // mentions "lancia delta" only in its body list
    d('part', 'TFE857 · Tamiya Lancia Delta Sealed Bearing Kit', 'Fast Eddy Bearings', 'Bearings and bushings'),
  ];
  assert.deepEqual(order('lancia delta', datas), ['TFE857 · Tamiya Lancia Delta Sealed Bearing Kit', 'Tamiya XV-01']);
});

test('a release whose name holds the words comes before parts', () => {
  const datas = [
    d('part', 'KZ-14-2-BU · Body Holder For Mini-Z Car Body (Ferrari 360 GTC)', '3Racing', 'Body and covers'),
    d('release', 'Tamiya Ferrari F40', 'Tamiya'),
  ];
  assert.equal(order('ferrari', datas)[0], 'Tamiya Ferrari F40');
});

// ---- the built index ----
const DIST = resolve('dist');
const built = existsSync(join(DIST, 'pagefind', 'pagefind.js'));
const TYPES = new Set(['kit', 'release', 'part', 'spec', 'brand']);

let server, search;
before(async () => {
  if (!built) return;
  const MIME = { '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css' };
  server = createServer(async (req, res) => {
    try { const body = await readFile(join(DIST, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
      res.writeHead(200, { 'content-type': MIME[extname(req.url)] || 'application/octet-stream' }); res.end(body);
    } catch { res.writeHead(404); res.end(); }
  });
  server.keepAliveTimeout = 120000; server.headersTimeout = 125000;   // pagefind reuses sockets between its chunk fetches: an idle close mid-run is 'fetch failed'
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  const pf = await import(join(DIST, 'pagefind', 'pagefind.js'));
  await pf.options({ basePath: `http://127.0.0.1:${server.address().port}/pagefind/` });
  await pf.init();
  search = async (text) => {
    const r = await pf.search(text), kits = (await pf.search(text, { filters: { type: 'kit' } })).results.slice(0, 50);
    const seen = new Set(kits.map((h) => h.id));   // as /search/ does: kits always join the ranked candidates
    const top = [...kits, ...r.results.filter((h) => !seen.has(h.id)).slice(0, 300)], datas = [];
    for (let k = 0; k < top.length; k += 50) datas.push(...await Promise.all(top.slice(k, k + 50).map((h) => h.data())));
    return rankHits(text, datas).map((i) => datas[i]);
  };
});
after(() => server && server.close());
const withIndex = (fn) => fn(search);

test('index: "TT-02" finds the Tamiya TT-02 kit first', { skip: !built && 'no build' }, () => withIndex(async (search) => {
  const r = await search('TT-02');
  assert.equal(r[0].meta.type, 'kit');
  assert.equal(r[0].meta.title, 'Tamiya TT-02');
}));

test('index: a Lancia Delta body ranks above every bearing kit', { skip: !built && 'no build' }, () => withIndex(async (search) => {
  const r = await search('lancia delta');
  const body = r.findIndex((x) => (x.filters.category || [])[0] === 'Body and covers');
  const bearing = r.findIndex((x) => (x.filters.category || [])[0] === 'Bearings and bushings');
  assert.ok(body >= 0, 'a Lancia Delta body is found');
  assert.ok(bearing < 0 || body < bearing, 'the body comes before the bearing kits');
}));

test('index: only kits, releases, parts, specs and brands are searchable', { skip: !built && 'no build' }, () => withIndex(async (search) => {
  for (const text of ['comic', 'buggy', 'bearing']) {
    const r = await search(text);
    assert.ok(r.length > 0, `${text}: some results`);
    for (const x of r.slice(0, 50)) assert.ok(TYPES.has(x.meta.type), `${text}: ${x.url} has no type`);
  }
}));
