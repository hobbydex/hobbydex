// A platform with no outline borrows a release's trace only when the releases are one car.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { outlineFromReleases as pick } from '../src/lib/kitArt.ts';

const impala = { make: 'Chevrolet', model: 'Impala' };

test('one depicted car: the first trace is used', () => {
  assert.equal(pick('FiftyNine', [{ name: 'Jevries', depicts: impala }, { name: 'blue', art: 'a', depicts: impala }, { name: 'grey', art: 'b', depicts: impala }]), 'a');
});
test('several depicted cars keep the icon', () => {
  assert.equal(pick('TA02', [{ name: 'Calibra', art: 'a', depicts: { make: 'Opel', model: 'Calibra' } }, { name: 'F-150', depicts: { make: 'Ford', model: 'F-150' } }]), undefined);
});
test('no trace, no outline', () => {
  assert.equal(pick('X', [{ name: 'X RTR', depicts: impala }]), undefined);
});
test('a large family keeps the icon', () => {
  assert.equal(pick('Enduro', Array.from({ length: 9 }, (_, i) => ({ name: `Enduro ${i}`, art: 'a' }))), undefined);
});
test('no depicted car: every release must carry the platform name', () => {
  assert.equal(pick('Mini-B', [{ name: 'Mini-B 2S RTR', art: 'a' }, { name: 'MINI B Roller' }]), 'a');
  assert.equal(pick('DT-01', [{ name: 'Fighter Buggy RX', art: 'a' }, { name: 'DT-01 Chassis' }]), undefined);
});
test('a chassis name in brackets is a body on that chassis', () => {
  assert.equal(pick('TA02T', [{ name: 'Desert Fielder (TA02T)', art: 'a' }, { name: 'Other (TA02T)' }]), undefined);
});
