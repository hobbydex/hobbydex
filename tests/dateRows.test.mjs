// Dated rows (home's latest releases, the releases page's newest): a colourway group is one row (lib/colourways.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dateRows } from '../src/lib/colourways.ts';

const rel = (id, number, name, extra = {}) => ({ id: `release/x/${id}`, brand: 'brand/team-corally', kit: 'kit/team-corally/punisher', kind: 'rtr', number, name, status: 'released', ...extra });
const dateOf = (r) => r.released ?? '';
const tie = (a, b) => a.name.localeCompare(b.name);
const rows = (pool) => dateRows(pool, dateOf, tie).map((x) => ({ names: x.group.map((r) => r.number), head: x.head.number, key: x.key }));

test('a four-colour group is one row, dated by its newest colour', () => {
  const base = rel('c', 'C-00230', 'PUNISHER XD', { released: '2025-03-01' });
  const b = rel('b', 'C-00230-B', 'PUNISHER XD, Blue', { color: 'blue', released: '2025-05-01' });
  const g = rel('g', 'C-00230-G', 'PUNISHER XD, Green', { color: 'green', released: '2025-04-01' });
  const r = rel('r', 'C-00230-R', 'PUNISHER XD, Red', { color: 'red', released: '2025-02-01' });
  assert.deepEqual(rows([base, b, g, r]), [{ names: ['C-00230', 'C-00230-B', 'C-00230-G', 'C-00230-R'], head: 'C-00230-B', key: '2025-05-01' }]);
});

test('releases that are not colourways keep one row each, newest first', () => {
  const a = rel('a', 'AAA1', 'FIRST RTR', { released: '2024-01-01' });
  const b = rel('b', 'BBB2', 'SECOND RTR', { released: '2025-01-01' });
  const undated = rel('u', 'UUU3', 'NO DATE RTR');
  assert.deepEqual(rows([a, b, undated]).map((x) => x.head), ['BBB2', 'AAA1']);
});

test('a group with no dated member is left out', () => {
  const x = rel('x', 'X1', 'SOLO', {});
  assert.deepEqual(rows([x]), []);
});
