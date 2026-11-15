// Video part links and the link choice of a video card (src/lib/videoParts.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { videoPartLinks, videoLinks } from '../src/lib/videoParts.ts';

const part = (id, number, name, extra = {}) => ({ id: `part/injora/${id}`, brand: 'brand/injora', number, name, ...extra });
const href = (id) => `/rc/parts/${id.split('/').slice(1).join('/')}/`;
const range = 'injora/ir80-30-colours';
const bodies = [
  part('ir80-30pu', 'IR80-30PU', 'IR80-30 Pickup Hard Body for 1/30 SCX30 (Purple)', { range }),
  part('ir80-30gn', 'IR80-30GN', 'IR80-30 Pickup Hard Body for 1/30 SCX30 (Green)', { range }),
  part('ir80-30gl', 'IR80-30GL', 'IR80-30 Pickup Hard Body for 1/30 SCX30 (Grey)', { range }),
];
const charger = { id: 'part/hitec/44353', brand: 'brand/hitec', number: '44353', name: 'RDX1 Nano' };

test('a part shown alone links to itself under its own name', () => {
  assert.deepEqual(videoPartLinks([charger], href), [{ href: '/rc/parts/hitec/44353/', label: 'RDX1 Nano' }]);
});

test('colour versions of one part collapse to one link to the lowest number, labelled with the shared name', () => {
  const links = videoPartLinks(bodies, href);
  assert.deepEqual(links, [{ href: href(bodies[2].id), label: 'IR80-30 Pickup Hard Body for 1/30 SCX30 (3 colours)' }]);
});

test('the shared name stops at a whole word', () => {
  const a = part('a', 'A1', 'Fan Black - Red', { range: 'x/a-colours' }), b = part('b', 'A2', 'Fan Black - Rose', { range: 'x/a-colours' });
  assert.equal(videoPartLinks([a, b], href)[0].label, 'Fan Black (2 colours)');
});

test('parts outside a colour range stay separate, in the order listed; a part listed twice counts once', () => {
  const links = videoPartLinks([charger, bodies[0], charger, bodies[1]], href);
  assert.deepEqual(links.map((l) => l.label), ['RDX1 Nano', 'IR80-30 Pickup Hard Body for 1/30 SCX30 (2 colours)']);
});

test('a card links its releases first, else its parts, else its platforms', () => {
  const r = [{ href: '/r/', label: 'R' }], p = [{ href: '/p/', label: 'P' }], k = [{ href: '/k/', label: 'K platform' }];
  assert.deepEqual(videoLinks(r, () => p, () => k), r);
  assert.deepEqual(videoLinks([], () => p, () => k), p);
  assert.deepEqual(videoLinks([], () => [], () => k), k);
  assert.deepEqual(videoLinks([], () => [], () => []), []);
});
