import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

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
