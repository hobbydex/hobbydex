// byPartNo orders parts by item number with one shared collator; the order must match the per-call
// localeCompare it replaced, including the tricky numbers below.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { byPartNo } from '../src/lib/partSort.ts';

// the comparator as it was before: a collator built for every comparison
const before = (a, b) => (a.number ? 0 : 1) - (b.number ? 0 : 1) || (a.number ?? '').localeCompare(b.number ?? '', undefined, { numeric: true }) || a.name.localeCompare(b.name);

const numbers = ['PS-2', 'PS-10', 'PS-02', 'ps-2', 'PS-1', '1/10', '10', '9', '10-1', '10 1', '10.5', '000123', '123',
  '12A', '12a', '12-A', 'A1', 'a1', 'B', '', 'TT-02', 'TT-02B', 'TT-02 TYPE-S', '22023', '22023-B', 'ÄB1', 'AB2', 'Æ5', '٣'];
const parts = [];
numbers.forEach((n, i) => {
  parts.push({ number: n || undefined, name: `part ${i}` });
  parts.push({ number: n || undefined, name: `Alpha ${numbers.length - i}` });   // equal numbers, names decide
});
parts.push({ name: 'Zeta spare' }, { name: 'alpha spare' }, { name: 'Bearing kit' }, { number: '', name: 'Empty number' });

// a fixed shuffle, so the input order differs from the sorted one
const shuffled = parts.map((p, i) => [(i * 7919) % parts.length, p]).sort((a, b) => a[0] - b[0]).map(([, p]) => p);

test('the order matches the per-call localeCompare comparator', () => {
  const now = shuffled.slice().sort(byPartNo).map((p) => `${p.number ?? ''}|${p.name}`);
  const old = shuffled.slice().sort(before).map((p) => `${p.number ?? ''}|${p.name}`);
  assert.deepEqual(now, old);
});

test('natural order: PS-2 before PS-10, parts without a number last, by name', () => {
  const sorted = [{ name: 'b' }, { number: 'PS-10', name: 'x' }, { number: 'PS-2', name: 'y' }, { name: 'a' }]
    .sort(byPartNo).map((p) => p.number ?? p.name);
  assert.deepEqual(sorted, ['PS-2', 'PS-10', 'a', 'b']);
});

test('a numbered part comes before an unnumbered one whatever their names', () => {
  assert.ok(byPartNo({ number: 'Z9', name: 'z' }, { name: 'a' }) < 0);
  assert.ok(byPartNo({ name: 'a' }, { number: 'Z9', name: 'z' }) > 0);
});
