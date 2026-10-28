// The hardware bag on a part page (built output): one svg in millimetres. The 1 cm bar spans exactly 10 user
// units, and every copy is a <use> whose width and height equal its symbol's mm viewBox, so items are not scaled.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findPage, bagOf } from './built-pages.mjs';

test('the 1 cm bar spans 10 user units and the items are drawn unscaled in mm', () => {
  const page = findPage('rc/parts/', (h) => bagOf(h)?.includes('class="hbbar"'));
  assert.ok(page, 'some part page has a hardware bag with a bar');
  const svg = bagOf(page.html);
  const bar = svg.match(/<g class="hbbar"[^>]*><path d="M0 [\d.]+ H([\d.]+)"/);
  assert.ok(bar, 'the bar is drawn');
  assert.equal(Number(bar[1]), 10, 'the bar is 10 user units (mm) long');
  const symbols = new Map([...svg.matchAll(/<symbol id="([^"]+)" viewBox="([^"]+)"/g)].map((m) => [m[1], m[2].split(' ').map(Number)]));
  const uses = [...svg.matchAll(/<use href="#([^"]+)" x="[^"]+" y="[^"]+" width="([^"]+)" height="([^"]+)"/g)];
  assert.ok(uses.length > 0, 'copies are drawn');
  for (const [, href, w, h] of uses) {
    const vb = symbols.get(href);
    assert.ok(vb, `symbol ${href} exists`);
    assert.ok(Math.abs(Number(w) - vb[2]) < 0.01 && Math.abs(Number(h) - vb[3]) < 0.01, `${href} is drawn at its mm size`);
  }
});
