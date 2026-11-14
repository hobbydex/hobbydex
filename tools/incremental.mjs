// Incremental site build. A page of a per-record route (parts, releases, platforms, brands, standards, specs) is
// skipped when its record closure is unchanged since the previous build; the previous dist supplies its file.
//
// Closure of a record r (what its page can render from the export):
//   r's own hash, the digest of the records that reference r, and for every record f that r references:
//   f's hash and the digest of the records that reference f (its siblings, e.g. the other releases of a kit; not
//   through a brand, see siblingsOf).
// A record with status "announced" is volatile (statusOf() flips it by date, not by data), and so is any record whose
// closure holds one: those pages are always built.
//
// Usage:
//   node tools/incremental.mjs fingerprint --data FILE --out MANIFEST   code fingerprint + closures; truncates the skip log
//   node tools/incremental.mjs mutate --data FILE --out FILE            copy of FILE with one small change (CI check)
//   node tools/incremental.mjs compare --a DIR --b DIR [--out FILE]     file-by-file diff of two dist trees (exit 1 on any)
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SCHEMA = 1;
export const DEFAULT_SKIP_LOG = '.incremental/skipped.jsonl';
// the export's arrays of records (hobbydex-rc docs/schema.md); every record has an id
export const COLLECTIONS = ['brands', 'kits', 'releases', 'parts', 'documents', 'specs', 'categories', 'standards', 'companies', 'makes', 'retired'];
// what the build reads besides the export; any change to these is a full build
const CODE_DIRS = ['src', 'public', 'tools'];
const CODE_FILES = ['astro.config.mjs', 'package.json', 'package-lock.json', 'tsconfig.json'];

const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 32);
// JSON with sorted keys: the same record always hashes the same
const canon = (v) => Array.isArray(v) ? `[${v.map(canon).join(',')}]`
  : v && typeof v === 'object' ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(',')}}`
  : JSON.stringify(v);

function walkFiles(dir, rel, out) {
  for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const p = join(dir, e.name), r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) walkFiles(p, r, out);
    else if (e.isFile()) out.push([r, p]);
  }
  return out;
}

// one hash over the build's code: src/, public/, tools/ and the config and lock files
export function codeFingerprint(root) {
  const files = [];
  for (const d of CODE_DIRS) if (existsSync(join(root, d))) walkFiles(join(root, d), d, files);
  for (const f of CODE_FILES) if (existsSync(join(root, f))) files.push([f, join(root, f)]);
  files.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const h = createHash('sha256');
  for (const [rel, abs] of files) h.update(`${rel}\0${createHash('sha256').update(readFileSync(abs)).digest('hex')}\n`);
  return h.digest('hex');
}

// every string value of a record that is another record's id: the records it references
function walkStrings(v, f) {
  if (typeof v === 'string') f(v);
  else if (Array.isArray(v)) for (const x of v) walkStrings(x, f);
  else if (v && typeof v === 'object') for (const k of Object.keys(v)) walkStrings(v[k], f);
}

const typeOf = (id) => id.split('/')[0];
// closures[id] for every record of the export; 'volatile' when the page must always be built
export function closures(data) {
  const recs = new Map();
  for (const key of COLLECTIONS) for (const r of data[key] ?? []) {
    if (typeof r?.id !== 'string') throw new Error(`incremental: a record in ${key} has no id`);
    if (recs.has(r.id)) throw new Error(`incremental: duplicate id ${r.id}`);
    recs.set(r.id, r);
  }
  const hash = new Map(), fwd = new Map(), rev = new Map(), ann = new Set();
  for (const [id, r] of recs) {
    hash.set(id, sha(canon(r)));
    if (r.status === 'announced') ann.add(id);
    const refs = new Set();
    walkStrings(r, (s) => { if (s !== id && recs.has(s)) refs.add(s); });
    fwd.set(id, [...refs].sort());
    for (const f of refs) { if (!rev.has(f)) rev.set(f, []); rev.get(f).push(id); }
  }
  const revDigest = (id) => sha([...(rev.get(id) ?? [])].sort().map((y) => `${y}\t${hash.get(y)}`).join('\n'));
  // siblings of a forward ref f: the records that reference f, except through a brand (a page never lists its brand's
  // other records through the brand link; those pages are the brand's own page, which lists them by revDigest(brand))
  const siblingsOf = (x) => (typeOf(x) === 'brand' ? [] : rev.get(x) ?? []);
  const annS = (x) => siblingsOf(x).some((y) => ann.has(y));
  const out = {};
  for (const id of recs.keys()) {
    const f = fwd.get(id);
    if (ann.has(id) || (rev.get(id) ?? []).some((y) => ann.has(y)) || f.some((x) => ann.has(x) || annS(x))) { out[id] = 'volatile'; continue; }
    out[id] = sha([`${id}\t${hash.get(id)}\t${revDigest(id)}`, ...f.map((x) => `${x}\t${hash.get(x)}\t${sha([...siblingsOf(x)].sort().map((y) => `${y}\t${hash.get(y)}`).join('\n'))}`)].join('\n'));
  }
  return out;
}

export function fingerprint(dataPath, root, outPath, logPath = DEFAULT_SKIP_LOG) {
  const data = JSON.parse(readFileSync(dataPath, 'utf8'));
  const manifest = { schema: SCHEMA, code: codeFingerprint(root), closures: closures(data) };
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(manifest));
  mkdirSync(dirname(logPath), { recursive: true });
  writeFileSync(logPath, '');   // this build's skip log starts empty
  return { records: Object.keys(manifest.closures).length, volatile: Object.values(manifest.closures).filter((c) => c === 'volatile').length, code: manifest.code };
}

// a small, deterministic change for the CI check: the first numbered part gets a longer name
export function mutate(dataPath, outPath) {
  const data = JSON.parse(readFileSync(dataPath, 'utf8'));
  const p = data.parts.find((x) => x.number && x.name);
  if (!p) throw new Error('incremental: no numbered part to change');
  p.name = `${p.name} (incremental check)`;
  writeFileSync(outPath, JSON.stringify(data));
  return p.id;
}

// the page path of a route pattern: '/rc/parts/[brand]/[number]/' with params -> '/rc/parts/xray/303122/'
export function pathFor(route, params) {
  const p = route.replace(/\[\.\.\.(\w+)\]|\[(\w+)\]/g, (_, rest, name) => {
    const v = params[rest ?? name];
    return Array.isArray(v) ? v.join('/') : String(v);
  });
  return p.endsWith('/') ? p : `${p}/`;
}

// astro:build:done: copies every page the skip log names from the previous dist into the new one. Returns the paths.
// Pages not in the log are built fresh; a page whose record is gone is not in the log and so is not copied.
export function restoreSkipped({ dir, env = process.env, logPath = env.HOBBYDEX_SKIP_LOG ?? DEFAULT_SKIP_LOG }) {
  if (env.HOBBYDEX_INCREMENTAL !== '1' || !env.HOBBYDEX_PREV_DIST || !existsSync(logPath)) return [];
  // Astro's pathnames have no leading slash; the skip log has one
  const paths = [...new Set(readFileSync(logPath, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l).path.replace(/^\/+/, '')))];
  for (const p of paths) {
    const src = join(env.HOBBYDEX_PREV_DIST, p, 'index.html');
    if (!existsSync(src)) throw new Error(`incremental: the previous build has no ${src}`);
    const dst = join(dir, p, 'index.html');
    mkdirSync(dirname(dst), { recursive: true });
    copyFileSync(src, dst);
  }
  return paths;
}

// file-by-file comparison of two trees: files on one side only, and files whose bytes differ. Pagefind's index is
// not byte-stable between runs on the same HTML, so its files are counted apart (ignored) and never fail the check.
export function compare(a, b, ignore = ['pagefind/']) {
  const list = (root) => new Map(walkFiles(root, '', []).map(([r, abs]) => [r, abs]));
  const A = list(a), B = list(b);
  const ign = (k) => ignore.some((p) => k.startsWith(p));
  const onlyA = [...A.keys()].filter((k) => !B.has(k) && !ign(k)).sort(), onlyB = [...B.keys()].filter((k) => !A.has(k) && !ign(k)).sort();
  const changed = [];
  let ignored = 0;
  for (const [k, pa] of A) {
    const pb = B.get(k);
    if (!pb) continue;
    if (statSync(pa).size === statSync(pb).size && readFileSync(pa).equals(readFileSync(pb))) continue;
    if (ign(k)) ignored++; else changed.push(k);
  }
  changed.sort();
  const top = (xs) => xs.reduce((m, x) => { const t = x.split('/')[0]; m[t] = (m[t] ?? 0) + 1; return m; }, {});
  return { files: { a: A.size, b: B.size }, onlyA: onlyA.length, onlyB: onlyB.length, changed: changed.length, ignored,
    changedByTopDir: top(changed), samples: { onlyA: onlyA.slice(0, 50), onlyB: onlyB.slice(0, 50), changed: changed.slice(0, 200) } };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : undefined; };
  const cmd = process.argv[2];
  if (cmd === 'fingerprint') {
    const info = fingerprint(arg('--data'), resolve(arg('--root') ?? '.'), arg('--out'), arg('--log') ?? process.env.HOBBYDEX_SKIP_LOG ?? DEFAULT_SKIP_LOG);
    console.log(JSON.stringify({ msg: 'fingerprint written', ...info }));
  } else if (cmd === 'mutate') {
    console.log(JSON.stringify({ msg: 'mutated', id: mutate(arg('--data'), arg('--out')) }));
  } else if (cmd === 'compare') {
    const r = compare(arg('--a'), arg('--b'));
    const out = arg('--out');
    if (out) writeFileSync(out, JSON.stringify(r, null, 2));
    console.log(JSON.stringify({ msg: 'compared', onlyA: r.onlyA, onlyB: r.onlyB, changed: r.changed, ignored: r.ignored, changedByTopDir: r.changedByTopDir, files: r.files }));
    if (r.onlyA || r.onlyB || r.changed) process.exit(1);
  } else {
    console.error('usage: incremental.mjs fingerprint|mutate|compare ...');
    process.exit(2);
  }
}
