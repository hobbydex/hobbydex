// Incremental build (tools/incremental.mjs): which records' closures change, the page path of a skipped entry,
// the copy of skipped pages from the previous dist, and the dist comparison used by the CI check.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { closures, compare, pathFor, restoreSkipped } from '../tools/incremental.mjs';

const fixture = (over = {}) => ({
  brands: [{ id: 'brand/x', name: 'X' }, { id: 'brand/y', name: 'Y' }],
  kits: [{ id: 'kit/x/k1', brand: 'brand/x', name: 'K1' }, { id: 'kit/x/k2', brand: 'brand/x', name: 'K2' }],
  releases: [{ id: 'release/x/r1', brand: 'brand/x', kit: 'kit/x/k1', name: 'R1' }],
  parts: [{ id: 'part/x/1', brand: 'brand/x', number: '1', name: 'P1', connectors: ['spec/plug/a'] }, { id: 'part/x/2', brand: 'brand/x', number: '2', name: 'P2', connectors: ['spec/plug/a'] }, { id: 'part/x/3', brand: 'brand/x', number: '3', name: 'P3', connectors: ['spec/plug/b'] }],
  specs: [{ id: 'spec/plug/a', category: 'plug', name: 'A' }, { id: 'spec/plug/b', category: 'plug', name: 'B' }],
  ...over,
});

test('a record changes the closures of the records that reference it and of its siblings only', () => {
  const a = closures(fixture());
  const edited = fixture();
  edited.parts[0].name = 'P1 changed';
  const b = closures(edited);
  assert.notEqual(a['part/x/1'], b['part/x/1'], 'the edited part');
  assert.notEqual(a['part/x/2'], b['part/x/2'], 'a part sharing its connector spec (a sibling through the spec)');
  assert.equal(a['kit/x/k2'], b['kit/x/k2'], 'a kit with no link to the part');
  assert.equal(a['part/x/3'], b['part/x/3'], 'a part of the same brand with another connector (the brand link is not a sibling link)');
  assert.equal(a['brand/y'], b['brand/y'], 'another brand');
});

test('a record that references a kit changes that kit page (its releases are listed there)', () => {
  const a = closures(fixture());
  const edited = fixture();
  edited.releases[0].name = 'R1 changed';
  const b = closures(edited);
  assert.notEqual(a['kit/x/k1'], b['kit/x/k1']);
  assert.equal(a['kit/x/k2'], b['kit/x/k2']);
});

test('an announced record is volatile, and so is a page that shows it; other pages are not', () => {
  const data = fixture();
  data.releases[0].status = 'announced';
  const c = closures(data);
  assert.equal(c['release/x/r1'], 'volatile');
  assert.equal(c['kit/x/k1'], 'volatile', 'the kit lists the announced release');
  assert.notEqual(c['part/x/1'], 'volatile');
});

test('a new id has a closure and a removed one is gone', () => {
  const a = closures(fixture());
  const data = fixture();
  data.parts.push({ id: 'part/x/4', brand: 'brand/x', number: '4', name: 'P4' });
  data.parts.splice(data.parts.findIndex((p) => p.id === 'part/x/3'), 1);
  const b = closures(data);
  assert.ok(b['part/x/4']);
  assert.equal(b['part/x/3'], undefined);
  assert.equal(a['part/x/3'] !== undefined, true);
});

test('a duplicate id is an error, never a silent overwrite', () => {
  const data = fixture();
  data.parts.push({ id: 'part/x/1', brand: 'brand/x', name: 'again' });
  assert.throws(() => closures(data), /duplicate id part\/x\/1/);
});

test('pathFor fills the route pattern from the params', () => {
  assert.equal(pathFor('/rc/parts/[brand]/[number]/', { brand: 'xray', number: '303122' }), '/rc/parts/xray/303122/');
  assert.equal(pathFor('/rc/kits/[...path]/', { path: ['a', 'b'] }), '/rc/kits/a/b/');
});

test('restoreSkipped copies the logged pages from the previous dist, and fails when one is missing', () => {
  const root = mkdtempSync(join(tmpdir(), 'incremental-test-'));
  try {
    const prev = join(root, 'prev'), dist = join(root, 'dist'), log = join(root, 'skipped.jsonl');
    mkdirSync(join(prev, 'rc/parts/x/1'), { recursive: true });
    writeFileSync(join(prev, 'rc/parts/x/1/index.html'), 'old page');
    mkdirSync(dist, { recursive: true });
    writeFileSync(log, JSON.stringify({ path: '/rc/parts/x/1/', id: 'part/x/1' }) + '\n');
    const env = { HOBBYDEX_INCREMENTAL: '1', HOBBYDEX_PREV_DIST: prev };
    assert.deepEqual(restoreSkipped({ dir: dist, logPath: log, env }), ['rc/parts/x/1/']);
    assert.equal(readFileSync(join(dist, 'rc/parts/x/1/index.html'), 'utf8'), 'old page');
    assert.deepEqual(restoreSkipped({ dir: dist, logPath: log, env: { HOBBYDEX_INCREMENTAL: '0' } }), [], 'a full build copies nothing');
    writeFileSync(log, JSON.stringify({ path: '/rc/parts/x/2/', id: 'part/x/2' }) + '\n');
    assert.throws(() => restoreSkipped({ dir: dist, logPath: log, env }), /previous build has no/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('compare reports files on one side only and changed bytes', () => {
  const root = mkdtempSync(join(tmpdir(), 'incremental-cmp-'));
  try {
    const a = join(root, 'a'), b = join(root, 'b');
    mkdirSync(join(a, 'x'), { recursive: true }); mkdirSync(join(b, 'x'), { recursive: true });
    writeFileSync(join(a, 'x/same.html'), 'one'); writeFileSync(join(b, 'x/same.html'), 'one');
    writeFileSync(join(a, 'x/diff.html'), 'one'); writeFileSync(join(b, 'x/diff.html'), 'two');
    writeFileSync(join(a, 'only-a.html'), 'a');
    mkdirSync(join(a, 'pagefind'), { recursive: true }); mkdirSync(join(b, 'pagefind'), { recursive: true });
    writeFileSync(join(a, 'pagefind/x.pf'), '1'); writeFileSync(join(b, 'pagefind/x.pf'), '2');
    writeFileSync(join(b, 'only-b.html'), 'b');
    const r = compare(a, b);
    assert.equal(r.onlyA, 1);
    assert.equal(r.onlyB, 1);
    assert.deepEqual(r.samples.onlyA, ['only-a.html']);
    assert.deepEqual(r.samples.onlyB, ['only-b.html']);
    assert.equal(r.changed, 1);
    assert.equal(r.ignored, 1, 'pagefind files are counted, not compared');
    assert.deepEqual(r.samples.changed, ['x/diff.html']);
    assert.equal(existsSync(join(a, 'x/same.html')), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
