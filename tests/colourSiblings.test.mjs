// Colour siblings (src/lib/colourSiblings.ts): which releases are the same kit in another body colour.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { colourSiblings } from '../src/lib/colourSiblings.ts';

const rel = (id, number, name, extra = {}) => ({ id: `release/x/${id}`, brand: 'brand/kyosho', kit: 'kit/kyosho/a', kind: 'rtr', number, name, ...extra });
const ids = (r, pool) => colourSiblings(r, pool).map((x) => x.number);

test('Kyosho 34118T1S and 34118T2S (readyset, colour type N) are siblings', () => {
  const t1 = rel('34118t1s', '34118T1S', 'Inferno NEO 4.0 VE readyset', { year: 2026 });
  const t2 = rel('34118t2s', '34118T2S', 'INFERNO NEO 4.0 VE Color type 2 w/KT-231P+', { year: 2026 });
  assert.deepEqual(ids(t1, [t1, t2]), ['34118T2S']);
  assert.deepEqual(ids(t2, [t1, t2]), ['34118T1S']);
});

test('Kyosho 33029T1 and 33029T2 are siblings', () => {
  const t1 = rel('33029t1', '33029T1', 'INFERNO NEO 4.0 w/KT-231P');
  const t2 = rel('33029t2', '33029T2', 'INFERNO NEO 4.0 w/KT-231P');
  assert.deepEqual(ids(t1, [t1, t2]), ['33029T2']);
});

test('the same colour code with a set suffix is the same colour, not a sibling', () => {
  const plain = rel('33029t1', '33029T1', 'INFERNO NEO 4.0 w/KT-231P');
  const readyset = rel('33029t1s', '33029T1S', 'Inferno NEO 4.0 readyset, color type 1');
  assert.deepEqual(ids(plain, [plain, readyset]), []);
});

test('two different Tamiya TT-02 bodies are not siblings', () => {
  const a = rel('47346', '47346', 'Neo Scorcher Blue Metallic (TT-02B)', { brand: 'brand/tamiya', kit: 'kit/tamiya/tt-02b', kind: 'kit', color: 'blue' });
  const b = rel('47355', '47355', 'Dual Ridge Black Metallic (TT-02B)', { brand: 'brand/tamiya', kit: 'kit/tamiya/tt-02b', kind: 'kit', color: 'black' });
  assert.deepEqual(ids(a, [a, b]), []);
});

test('a kit and an RTR of the same name are not siblings', () => {
  const kit = rel('k1', 'L1T1', 'Test Buggy', { kind: 'kit', color: 'red' });
  const rtr = rel('r1', 'L1T2', 'Test Buggy', { kind: 'rtr', color: 'blue' });
  assert.deepEqual(ids(kit, [kit, rtr]), []);
});

test('colour words in the name pair releases with a letter code; other years do not', () => {
  const red = rel('a', '30615C', 'Tomahawk Red', { year: 2020, color: 'red' });
  const blue = rel('b', '30615B', 'Tomahawk Blue', { year: 2021, color: 'blue' });
  const old = rel('c', '30615B', 'Tomahawk Blue', { year: 2015, color: 'blue' });
  assert.deepEqual(ids(red, [red, blue, old]), ['30615B']);
  assert.deepEqual(ids(red, [red, old]), []);
});

test('a release without an item number or a colour does not pair', () => {
  const a = rel('a', undefined, 'Thing', { color: 'red' });
  const b = rel('b', 'X1T1', 'Thing', { color: 'blue' });
  assert.deepEqual(ids(b, [a, b]), []);
  const c = rel('c', '34118', 'Inferno NEO 4.0 VE');
  const d = rel('d', '34118T1S', 'Inferno NEO 4.0 VE readyset');
  assert.deepEqual(ids(c, [c, d]), []);
});

test('a colour code after a dash pairs; the motor version before it keeps BRS and BRD apart', () => {
  const yw = rel('a', 'BRS-YW', '1:8 Bronco Raptor BRS-YW', { color: 'yellow' });
  const gy = rel('b', 'BRS-GY', '1:8 Bronco Raptor BRS-GY', { color: 'grey' });
  const or = rel('c', 'BRD-OR', '1:8 Bronco Raptor BRD-OR', { color: 'orange' });
  assert.deepEqual(ids(yw, [yw, gy, or]), ['BRS-GY']);
  assert.deepEqual(ids(or, [yw, gy, or]), []);
  const nocolour = rel('d', 'BRS-DG', '1:8 Bronco Raptor BRS-DG');
  assert.deepEqual(ids(nocolour, [yw, gy, nocolour]), []);
});

test('releases sharing a range are siblings', async () => {
  const { colourSiblings } = await import('../src/lib/colourSiblings.ts');
  const r = (id, number, name, extra = {}) => ({ id: `release/hpi/${id}`, brand: 'brand/hpi', kit: 'kit/hpi/vectr4', kind: 'rtr', number, name, status: 'released', range: 'hpi/x-colours', ...extra });
  const a = r('161300', '161300', 'VectR4 Rally Sanremo');
  const b = r('161301', '161301', 'VectR4 Imperial Blue');
  assert.deepEqual(colourSiblings(a, [a, b]).map((x) => x.number), ['161301']);
});
