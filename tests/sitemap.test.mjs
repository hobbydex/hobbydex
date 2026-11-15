// Sitemap lastmod tests: `npm test` after `npm run build`. Skipped without a build. The comparison with git needs
// the data repo with its history (data-repo/ as in CI, or HOBBYDEX_DATA_REPO) and its export (HOBBYDEX_DATA); that test is
// skipped without them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { shownDate } from '../src/lib/shownDate.ts';

const built = existsSync('dist/sitemap-index.xml');
const entries = built ? readdirSync('dist').filter((f) => /^sitemap-\d+\.xml$/.test(f)).flatMap((f) =>
  [...readFileSync(`dist/${f}`, 'utf8').matchAll(/<url><loc>([^<]+)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?<\/url>/g)].map((m) => ({ loc: m[1].replace('https://hobbydex.com', ''), lastmod: m[2] }))) : [];
const lastmod = new Map(entries.map((e) => [e.loc, e.lastmod]));
const dataRepo = process.env.HOBBYDEX_DATA_REPO ?? 'data-repo';
const dataFile = process.env.HOBBYDEX_DATA ?? 'data/hobbydex-rc.json';
const gitDate = (cwd, file) => execFileSync('git', ['-c', 'log.showSignature=false', 'log', '-1', '--follow', '--diff-filter=AM', '--format=%ct', '--', file], { cwd, encoding: 'utf8' }).trim();
const utcDay = (ct) => new Date(Number(ct) * 1000).toISOString().slice(0, 10);

test('every page has a W3C date lastmod, never in the future, and the index carries one per sitemap', { skip: !built }, () => {
  assert.ok(entries.length > 1000);
  const today = new Date().toISOString().slice(0, 10);
  const dated = entries.filter((e) => e.lastmod);
  assert.ok(dated.length > entries.length * 0.95, 'nearly every page has a lastmod');
  for (const e of dated) { assert.match(e.lastmod, /^\d{4}-\d\d-\d\d$/); assert.ok(e.lastmod <= today, e.loc); }
  assert.match(readFileSync('dist/sitemap-index.xml', 'utf8'), /<sitemap><loc>[^<]+<\/loc><lastmod>\d{4}-\d\d-\d\d<\/lastmod><\/sitemap>/);
});

test('the lastmod is not one build-wide date', { skip: !built }, () => {
  assert.ok(new Set(entries.map((e) => e.lastmod)).size > 5);
});

test('pages match the content date of their record, and that date is never after the last commit of its file', { skip: !built || !existsSync(`${dataRepo}/.git`) || !existsSync(dataFile) }, () => {
  const records = new Map();
  for (const kind of ['parts', 'releases']) for (const r of JSON.parse(readFileSync(dataFile, 'utf8'))[kind]) records.set(r.id, r);
  let checked = 0, seen = 0;
  for (const [loc, got] of lastmod) {
    const m = loc.match(/^\/rc\/(parts|releases)\/([^/]+)\/([^/]+)\/$/);
    if (!m || checked >= 40 || seen++ % 250) continue;
    const file = m[1] === 'parts' ? `data/parts/${m[2]}/${m[3].slice(0, 2).toUpperCase()}/${m[3]}.toml` : `data/releases/${m[2]}/${m[3]}.toml`;
    const rec = records.get(`${m[1].slice(0, -1)}/${m[2]}/${m[3]}`);
    if (!existsSync(`${dataRepo}/${file}`) || !rec) continue;
    const own = utcDay(gitDate(dataRepo, file)), shown = shownDate(rec);
    // a pure move is no change (--diff-filter=AM skips it); a bookkeeping-only commit (a source, a seen_by bound) leaves the content date older
    assert.ok(shown <= own, `${loc}: content date ${shown} after its file's last commit (${own})`);
    // the page also shows its kit, parts, specs and documents, so it can be newer than its record but never older
    assert.ok(got >= shown, `${loc}: lastmod ${got} older than its record's content date (${shown})`);
    checked++;
  }
  assert.ok(checked >= 10, `only ${checked} pages checked`);
});

test('faq: the last commit of its source file', { skip: !built || !existsSync('.git') }, () => {
  if (execFileSync('git', ['rev-parse', '--is-shallow-repository'], { encoding: 'utf8' }).trim() !== 'false') return;
  assert.equal(lastmod.get('/faq/'), utcDay(gitDate('.', 'src/pages/faq.astro')));
});

test('the footer says the same date as the sitemap', { skip: !built }, () => {
  let checked = 0;
  for (const [loc, got] of lastmod) {
    if (!got || checked >= 30 || (checked + loc.length) % 5) continue;
    const file = `dist${loc}index.html`;
    if (!existsSync(file)) continue;
    assert.ok(readFileSync(file, 'utf8').includes(`Last updated on ${got}.`), `${loc}: footer differs from lastmod ${got}`);
    checked++;
  }
  assert.ok(checked >= 10);
});
