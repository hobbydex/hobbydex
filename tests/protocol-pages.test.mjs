// Radio protocol pages (src/pages/rc/specs/protocol/): the index lists every protocol, a protocol page lists its
// transmitters and receivers, and a part page links back to the protocols it lists. Checks properties of the built
// pages (dist/), not a live protocol or part.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { radioGroup } from '../src/lib/radio.ts';

const file = (path) => fileURLToPath(new URL(`../dist${path}index.html`, import.meta.url));
const read = (path) => readFileSync(file(path), 'utf8');
const index = read('/rc/specs/protocol/');
const protocolPages = [...new Set([...index.matchAll(/href="(\/rc\/specs\/protocol\/[^"/]+\/)"/g)].map((m) => m[1]))];
const partLinks = (html) => [...new Set([...html.matchAll(/href="(\/rc\/parts\/[^"]+\/)"/g)].map((m) => m[1]))];

test('the index links many protocol pages and each one exists', () => {
  assert.ok(protocolPages.length > 10, 'many protocols');
  for (const p of protocolPages) assert.ok(existsSync(file(p)), `${p} is built`);
});

test('a protocol page has a maker or no maker link, and lists parts that link back to it', () => {
  let checked = 0;
  for (const p of protocolPages) {
    const html = read(p);
    assert.match(html, /<h1>[^<]+<\/h1>/);
    const parts = partLinks(html);
    assert.ok(parts.length > 0, `${p} lists parts`);
    for (const part of parts.slice(0, 3)) {
      assert.ok(read(part).includes(`href="${p}"`), `${part} links back to ${p}`);
      checked++;
    }
  }
  assert.ok(checked > 30);
});

test('a protocol with transmitters and receivers has both tables', () => {
  const both = protocolPages.map(read).filter((h) => h.includes('id="transmitter"') && h.includes('id="receiver"'));
  assert.ok(both.length > 3, 'several protocols have both');
  for (const h of both) assert.ok(h.indexOf('id="transmitter"') < h.indexOf('id="receiver"'), 'transmitters first');
});

test('a protocol that also runs another links it, and says which parts list both', () => {
  const page = protocolPages.map(read).find((h) => h.includes('Other protocols it works with'));
  assert.ok(page, 'some protocol has compatible protocols');
  const links = [...page.matchAll(/also runs <a href="(\/rc\/specs\/protocol\/[^"]+\/)"/g)].map((m) => m[1]);
  assert.ok(links.length > 0);
  for (const l of links) assert.ok(existsSync(file(l)), `${l} is built`);
});

test('radioGroup: the unit decides, a name word decides when no unit is set', () => {
  const p = (name, radio_unit) => ({ name, radio_unit });
  assert.equal(radioGroup(p('x', 'set')), 'transmitter');
  assert.equal(radioGroup(p('x', 'receiver')), 'receiver');
  assert.equal(radioGroup(p('x', 'gyro')), 'other');
  assert.equal(radioGroup(p('SR515 DSMR 5-Channel Sport Receiver')), 'receiver');
  assert.equal(radioGroup(p('DX5 Transmitter with SR2100 Receiver')), 'transmitter');
  assert.equal(radioGroup(p('Servo saver')), 'other');
});
