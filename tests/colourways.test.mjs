// Colourway groups (src/lib/colourways.ts): the releases of one kit that are the same car in other colours.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { colourwayGroups, groupName, colourLabels } from '../src/lib/colourways.ts';

const rel = (id, number, name, extra = {}) => ({ id: `release/x/${id}`, brand: 'brand/arrma', kit: 'kit/arrma/granite', kind: 'rtr', number, name, status: 'released', ...extra });
// the numbers of the groups, each group's numbers in item-number order
const groups = (pool) => colourwayGroups(pool).map((g) => g.map((r) => r.number));

test('colour-only differences group: the plain release and its colour codes', () => {
  const plain = rel('c', 'C-00230', 'FURAGO XD');
  const b = rel('b', 'C-00230-B', 'FURAGO XD, Blue', { color: 'blue' });
  const r = rel('r', 'C-00230-R', 'FURAGO XD, Red', { color: 'red' });
  assert.deepEqual(groups([plain, b, r]), [['C-00230', 'C-00230-B', 'C-00230-R']]);
});

test('a T-code pair with a colour field each groups; colour fields are compared, not the code alone', () => {
  const t1 = rel('t1', 'ARA102714T1', 'Granite 4X4 RTR Brushed Monster Truck, green/black', { color: 'green/black' });
  const t2 = rel('t2', 'ARA102714T2', 'Granite 4X4 RTR Brushed Monster Truck, red/black', { color: 'red/black' });
  const t3 = rel('t3', 'ARA102714T3', 'Granite 4X4 RTR Brushed Monster Truck, red/black', { color: 'red/black' });
  assert.deepEqual(groups([t1, t2]), [['ARA102714T1', 'ARA102714T2']]);
  assert.deepEqual(groups([t2, t3]), [['ARA102714T2'], ['ARA102714T3']]);
});

test('a kit and an RTR of the same name are not one colourway group', () => {
  const kit = rel('k', 'L1T1', 'Test Buggy', { kind: 'kit', color: 'red' });
  const rtr = rel('r', 'L1T2', 'Test Buggy', { kind: 'rtr', color: 'blue' });
  assert.deepEqual(groups([kit, rtr]), [['L1T1'], ['L1T2']]);
});

test('3S and 6S versions, and different editions, are not colourways of each other', () => {
  const s3 = rel('a', 'ARA4302V3T1', 'Granite 3S 4X4 RTR Brushless Monster Truck, green', { color: 'green' });
  const s6 = rel('b', 'ARA8608V5T2', 'Granite 6S 4X4 RTR Brushless Monster Truck, blue', { color: 'blue' });
  const v4 = rel('c', 'ARA4302V4T2', 'Granite 3S 4X4 RTR Brushless Monster Truck, blue', { color: 'blue' });
  assert.deepEqual(groups([s3, s6]), [['ARA4302V3T1'], ['ARA8608V5T2']]);
  assert.deepEqual(groups([s3, v4]), [['ARA4302V3T1'], ['ARA4302V4T2']]);
});

test('a discontinued and a current colour do not share a group', () => {
  const old = rel('a', 'ARA102727T1', 'Granite Voltage, red', { color: 'red', status: 'discontinued' });
  const now = rel('b', 'ARA102727T2', 'Granite Voltage, blue', { color: 'blue' });
  assert.deepEqual(groups([old, now]), [['ARA102727T1'], ['ARA102727T2']]);
});

test('Team Corally C-00181-0216-1 colours group by the colour word of the name', () => {
  const body = (c) => `Polycarbonate Body - Syncro 4 - Clear - Cut - Window Mask - ${c} - 1 pc`;
  const pool = ['G', 'O', 'P', 'R'].map((c) => rel(c, `C-00181-0216-1${c}`, body({ G: 'Green', O: 'Orange', P: 'Pink', R: 'Red' }[c]), { brand: 'brand/team-corally', kit: 'kit/team-corally/syncro-4' }));
  assert.deepEqual(groups(pool), [['C-00181-0216-1G', 'C-00181-0216-1O', 'C-00181-0216-1P', 'C-00181-0216-1R']]);
  assert.deepEqual(colourLabels(colourwayGroups(pool)[0]), ['green', 'orange', 'pink', 'red']);
  assert.equal(groupName(colourwayGroups(pool)[0]), 'Polycarbonate Body - Syncro 4 - Clear - Cut - Window Mask - 1 pc');
});

test('the group name drops the colour words; a single release keeps its name', () => {
  const plain = rel('c', 'C-00230', 'FURAGO XD');
  const b = rel('b', 'C-00230-B', 'FURAGO XD, Blue', { color: 'blue' });
  assert.equal(groupName([plain, b]), 'FURAGO XD');
  assert.equal(groupName([b]), 'FURAGO XD, Blue');
});

test('a release without an item number stays alone', () => {
  const a = rel('a', undefined, 'Thing', { color: 'red' });
  const b = rel('b', 'X1T1', 'Thing', { color: 'blue' });
  assert.deepEqual(groups([a, b]), [[undefined], ['X1T1']]);
});
