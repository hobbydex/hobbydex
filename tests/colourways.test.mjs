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

test('same name in colours, item numbers differing in digits: a group (1RC sprint car, Amewi crawler, Absima buggy)', () => {
  const sprint = (n, c) => rel(`s${n}`, `1RC${n}`, `1/18 Sprint Car 4.0, ${c}, RTR`, { brand: 'brand/1rc-racing', kit: 'kit/1rc-racing/1-18-sprint-car', color: c.toLowerCase() });
  assert.deepEqual(groups([sprint(1095, 'Red'), sprint(1096, 'Black'), sprint(1097, 'Clear')]), [['1RC1095', '1RC1096', '1RC1097']]);
  const crawler = (n, c) => rel(`a${n}`, `${n}`, `AMXRock RCX10B Scale Crawler Pick-up 1/10 RTR ${c}`, { brand: 'brand/amewi', kit: 'kit/amewi/amxrock-rcx10b', color: c });
  assert.deepEqual(groups([crawler(22432, 'white'), crawler(22433, 'gray')]), [['22432', '22433']]);
  const buggy = (n, c) => rel(`p${n}`, `${n}`, `1:24 4WD Buggy PULSE RTR - ${c}`, { brand: 'brand/absima', kit: 'kit/absima/pulse', color: c });
  assert.deepEqual(groups([buggy(10015, 'yellow'), buggy(10016, 'red')]), [['10015', '10016']]);
});

test('the name colour word stands in when a release has no colour field', () => {
  const white = rel('w', '22432', 'AMXRock RCX10B Scale Crawler Pick-up 1/10 RTR white', { brand: 'brand/amewi', kit: 'kit/amewi/amxrock-rcx10b' });
  const grey = rel('g', '22433', 'AMXRock RCX10B Scale Crawler Pick-up 1/10 RTR grey', { brand: 'brand/amewi', kit: 'kit/amewi/amxrock-rcx10b' });
  assert.deepEqual(groups([white, grey]), [['22432', '22433']]);
  assert.deepEqual(colourLabels(colourwayGroups([white, grey])[0]), ['white', 'grey']);
});

test('near misses that are not colourways stay apart: RTR vs kit, 3S vs 6S, editions and versions, discontinued vs current', () => {
  const kit = rel('k', '1RC1095', 'Sprint Car 4.0, Red', { kind: 'kit', color: 'red', brand: 'brand/1rc-racing' });
  const rtr = rel('r', '1RC1096', 'Sprint Car 4.0, Black', { kind: 'rtr', color: 'black', brand: 'brand/1rc-racing' });
  assert.deepEqual(groups([kit, rtr]), [['1RC1095'], ['1RC1096']]);
  const s3 = rel('a', '22001', 'Granite 3S RTR, green', { color: 'green' });
  const s6 = rel('b', '22002', 'Granite 6S RTR, blue', { color: 'blue' });
  assert.deepEqual(groups([s3, s6]), [['22001'], ['22002']]);
  const e1 = rel('c', '23001', 'Granite Mega RTR, red', { color: 'red', edition: 'Mega' });
  const e2 = rel('d', '23002', 'Granite Mega RTR, blue', { color: 'blue', edition: 'Heritage' });
  assert.deepEqual(groups([e1, e2]), [['23001'], ['23002']]);
  const v3 = rel('e', 'ARA4302V3T1', 'Granite RTR, green', { color: 'green' });
  const v4 = rel('f', 'ARA4302V4T2', 'Granite RTR, blue', { color: 'blue' });
  assert.deepEqual(groups([v3, v4]), [['ARA4302V3T1'], ['ARA4302V4T2']]);
  const old = rel('g', '24001', 'Foo RTR, red', { color: 'red', status: 'discontinued' });
  const now = rel('h', '24002', 'Foo RTR, blue', { color: 'blue' });
  assert.deepEqual(groups([old, now]), [['24001'], ['24002']]);
});

test('identical names with no colour on either side do not group (the same car twice)', () => {
  const a = rel('a', '33001', 'Thing RTR');
  const b = rel('b', '33002', 'Thing RTR');
  assert.deepEqual(groups([a, b]), [['33001'], ['33002']]);
});

test('releases sharing a range group whatever their names and numbers say; the group name is what the names share', () => {
  const a = rel('a', '161300', 'VectR4 - Ford Escort RS Cosworth Rally Sanremo', { range: 'hpi/vectr4-ford-escort-rs-cosworth-colours', livery: 'Rally Sanremo' });
  const b = rel('b', '161301', 'VectR4 - Ford Escort RS Cosworth Imperial Blue', { range: 'hpi/vectr4-ford-escort-rs-cosworth-colours', color: 'blue' });
  const c = rel('c', '161302', 'VectR4 - Ford Escort RS Cosworth Imperial Blue');
  assert.deepEqual(groups([a, b, c]).filter((g) => g.length > 1), [['161300', '161301']]);
  assert.equal(groupName([a, b]), 'VectR4 - Ford Escort RS Cosworth');
  assert.deepEqual(colourLabels([a, b]), [undefined, 'blue']);
});

test('releases with no kind (not stated by any source) group with each other like any kind', () => {
  const a = rel('a', 'X-1-R', 'Test Truck, Red', { kind: undefined, color: 'red' });
  const b = rel('b', 'X-1-B', 'Test Truck, Blue', { kind: undefined, color: 'blue' });
  const c = rel('c', 'X-1-K', 'Test Truck, Kit', { kind: 'kit', color: 'green' });
  assert.deepEqual(groups([a, b, c]), [['X-1-B', 'X-1-R'], ['X-1-K']]);
});
