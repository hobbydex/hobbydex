// Video release links (src/lib/videoReleases.ts): colour variants of one car collapse to one link.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { videoReleaseLinks } from '../src/lib/videoReleases.ts';

const rel = (id, number, name, extra = {}) => ({ id: `release/corally/${id}`, brand: 'brand/corally', kit: 'kit/corally/furago', kind: 'rtr', number, name, status: 'released', ...extra });
const href = (id) => `/rc/releases/${id.split('/').slice(1).join('/')}/`;

const furago = [
  rel('plain', 'C-00230', 'FURAGO XD'),
  rel('b', 'C-00230-B', 'FURAGO XD, Blue', { color: 'blue' }),
  rel('g', 'C-00230-G', 'FURAGO XD, Green', { color: 'green' }),
  rel('o', 'C-00230-O', 'FURAGO XD, Orange', { color: 'orange' }),
];
const other = rel('punisher', 'C-00240', 'PUNISHER XD');

test('all colours of one car in a video: one link to the first release, labelled with the count', () => {
  const links = videoReleaseLinks(furago.slice(1), furago, href);
  assert.equal(links.length, 1);
  assert.equal(links[0].href, href(furago[0].id));
  assert.equal(links[0].label, 'FURAGO XD (3 colours)');
});

test('a single colour shown alone links to itself under its own name', () => {
  const links = videoReleaseLinks([furago[2]], furago, href);
  assert.deepEqual(links, [{ href: href(furago[2].id), label: 'FURAGO XD, Green' }]);
});

test('unrelated releases stay separate links, in the order listed', () => {
  const links = videoReleaseLinks([other, furago[1], furago[3]], furago.concat(other), href);
  assert.deepEqual(links.map((l) => l.label), ['PUNISHER XD', 'FURAGO XD (2 colours)']);
});

test('a release listed twice counts once', () => {
  const links = videoReleaseLinks([furago[1], furago[1]], furago, href);
  assert.deepEqual(links, [{ href: href(furago[1].id), label: 'FURAGO XD, Blue' }]);
});
