import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createPublicKey, verify } from 'node:crypto';
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

// ops/server/Caddyfile serves the directory path with its media type and a response signature (tag
// http-message-signatures-directory, covering "@authority";req). The signature must verify with a listed key and
// must not have expired: Cloudflare stops verifying after `expires`.
test('the Caddyfile signature of the key directory verifies with a listed key and has not expired', () => {
  const caddy = readFileSync(new URL('../ops/server/Caddyfile', import.meta.url), 'utf8');
  const field = (name) => {
    const m = caddy.match(new RegExp(`^\\t+${name} \`(sig1[^\`]*)\``, 'm'));
    assert.ok(m, `Caddyfile has no ${name} for the directory`);
    return m[1];
  };
  assert.match(caddy, /Content-Type application\/http-message-signatures-directory\+json/);
  const input = field('Signature-Input');
  const sig = field('Signature');
  const params = input.slice(input.indexOf('=') + 1);
  assert.match(params, /^\("@authority";req\)/);
  assert.match(params, /tag="http-message-signatures-directory"/);
  const keyid = params.match(/keyid="([^"]+)"/)[1];
  const expires = Number(params.match(/expires=(\d+)/)[1]);
  const created = Number(params.match(/created=(\d+)/)[1]);
  assert.ok(expires - created <= 90 * 86400, 'the signature lives at most 90 days');
  assert.ok(expires > Date.now() / 1000 + 7 * 86400, 'renew the directory signature: it expires within 7 days');
  const k = dir.keys.find((x) => x.kid === keyid);
  assert.ok(k, 'the signing keyid is listed in the directory');
  const publicKey = createPublicKey({ key: k, format: 'jwk' });
  const base = Buffer.from(`"@authority";req: hobbydex.com\n"@signature-params": ${params}`, 'ascii');
  const raw = Buffer.from(sig.slice(sig.indexOf(':') + 1, -1), 'base64');
  assert.ok(verify(null, base, publicKey, raw), 'the directory signature does not verify');
});
