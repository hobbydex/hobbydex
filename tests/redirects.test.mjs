// Redirect map tests (tools/redirects.mjs). The fixture test builds its own small dist in a temp folder; the built
// test runs after `npm run build` (dist/) and is skipped without a build. Both run in `npm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const tool = fileURLToPath(new URL('../tools/redirects.mjs', import.meta.url));
const run = (args) => spawnSync(process.execPath, [tool, ...args], { encoding: 'utf8' });
const page = (dir, html) => { mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, 'index.html'), html); };
const stub = (from, to) => `<!doctype html><title>Redirecting to: ${to}</title><meta http-equiv="refresh" content="0;url=${to}"><meta name="robots" content="noindex"><body>x</body>`;

test('every redirect page gets a 301 entry, with and without the trailing slash', () => {
  const dist = mkdtempSync(join(tmpdir(), 'redirects-'));
  try {
    page(join(dist, 'rc/platforms/3racing/advance-m5-pro'), '<!doctype html><title>Platform</title>');
    page(join(dist, 'rc/kits/3racing/advance-m5-pro'), stub('/rc/kits/3racing/advance-m5-pro/', '/rc/platforms/3racing/advance-m5-pro/'));
    assert.equal(run(['--dist', dist]).status, 0);
    const map = readFileSync(join(dist, 'redirects.caddy'), 'utf8');
    assert.match(map, /^\t"\/rc\/kits\/3racing\/advance-m5-pro\/" "\/rc\/platforms\/3racing\/advance-m5-pro\/"$/m);
    assert.match(map, /^\t"\/rc\/kits\/3racing\/advance-m5-pro" "\/rc\/platforms\/3racing\/advance-m5-pro\/"$/m);
    assert.match(map, /^redir @hobbydex_moved \{hobbydex_to\} permanent$/m);
    assert.equal(run(['--dist', dist, '--check']).status, 0);
    writeFileSync(join(dist, 'redirects.caddy'), map.replace(/^\t"\/rc\/kits\/3racing\/advance-m5-pro\/".*\n/m, ''));
    assert.equal(run(['--dist', dist, '--check']).status, 1, 'a stub without its entry fails the check');
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
});

test('a redirect whose target is itself a redirect page fails (no chains)', () => {
  const dist = mkdtempSync(join(tmpdir(), 'redirects-'));
  try {
    page(join(dist, 'rc/a'), stub('/rc/a/', '/rc/b/'));
    page(join(dist, 'rc/b'), stub('/rc/b/', '/rc/c/'));
    page(join(dist, 'rc/c'), '<!doctype html><title>Page</title>');
    const r = run(['--dist', dist]);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /\/rc\/a\/: target \/rc\/b\/ is not a live page \(it is a redirect itself\)/);
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
});

test('the built site: every redirect page has its entry', { skip: !existsSync('dist/index.html') }, () => {
  const r = run(['--dist', 'dist', '--check']);
  assert.equal(r.status, 0, r.stderr || r.stdout);
  assert.match(readFileSync('dist/redirects.caddy', 'utf8'), /^redir @hobbydex_moved/m);
});
