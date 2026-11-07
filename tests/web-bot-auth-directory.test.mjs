import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createPublicKey, verify } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// The crawler's Web Bot Auth key directory: a JWKS of public Ed25519 keys, each kid its RFC 7638 thumbprint
// (the keyid the crawler signs with). The crawler checks its own keyid against the live copy of this file.
const dir = JSON.parse(readFileSync(new URL('../public/.well-known/http-message-signatures-directory', import.meta.url), 'utf8'));
const thumbprint = (k) => createHash('sha256').update(JSON.stringify({ crv: k.crv, kty: k.kty, x: k.x })).digest('base64url');

test('the key directory lists public Ed25519 keys only, kid = thumbprint', () => {
  assert.ok(Array.isArray(dir.keys) && dir.keys.length > 0);
  for (const k of dir.keys) {
    assert.equal(k.kty, 'OKP');
    assert.equal(k.crv, 'Ed25519');
    assert.equal(k.d, undefined, 'a private key part must never be published');
    assert.equal(Buffer.from(k.x, 'base64url').length, 32);
    assert.equal(k.kid, thumbprint(k));
  }
});

test('the RFC 9421 test key gives the thumbprint the drafts list', () => {
  assert.equal(thumbprint({ kty: 'OKP', crv: 'Ed25519', x: 'JrQLj5P_89iXES9-vFgrIy29clF9CC_oPPsw3c5D0bs' }),
    'poqkLGiymh_W0uP6PZFw-dvez3QJT5SolqXBCW38r0U');
});

// ops/server/Caddyfile serves the directory path with its media type, no caching, and a response signature (tag
// http-message-signatures-directory, covering "@authority";req) read per request from the files that
// ops/server/bot-sig-tick.py writes every minute from the list the crawler's PC presigns (one per minute).
test('the Caddyfile reads the directory signature from the per-minute files, uncached', () => {
  const caddy = readFileSync(new URL('../ops/server/Caddyfile', import.meta.url), 'utf8');
  const block = caddy.slice(caddy.indexOf('# BEGIN web-bot-auth directory'), caddy.indexOf('# END web-bot-auth directory'));
  assert.match(block, /Content-Type application\/http-message-signatures-directory\+json/);
  assert.match(block, /Cache-Control no-store/);
  assert.match(block, /Signature-Input "\{file\.\/srv\/hobbydex\/bot-sig\/signature-input\}"/);
  assert.match(block, /Signature "\{file\.\/srv\/hobbydex\/bot-sig\/signature\}"/);
  assert.match(caddy, /@mutable not path [^\n]*\/\.well-known\/http-message-signatures-directory/);
});

test('bot-sig-tick.py writes the newest presigned signature whose minute has come', () => {
  const dir = mkdtempSync(join(tmpdir(), 'botsig-'));
  writeFileSync(join(dir, 'signatures.tsv'), ['1000\tin-a\tsig-a', '1060\tin-b\tsig-b', '1120\tin-c\tsig-c', ''].join('\n'));
  const tick = (now) => {
    const r = spawnSync('python3', ['-I', fileURLToPath(new URL('../ops/server/bot-sig-tick.py', import.meta.url))],
      { env: { ...process.env, BOT_SIG_DIR: dir, BOT_SIG_NOW: String(now) }, encoding: 'utf8' });
    return [r.status, readFileSync(join(dir, 'signature-input'), 'utf8'), readFileSync(join(dir, 'signature'), 'utf8')];
  };
  assert.deepEqual(tick(1060), [0, 'in-b', 'sig-b']);
  assert.deepEqual(tick(1119), [0, 'in-b', 'sig-b']);
  assert.deepEqual(tick(5000), [0, 'in-c', 'sig-c']);
  rmSync(dir, { recursive: true });
});
