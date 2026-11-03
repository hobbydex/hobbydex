import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const page = (dir, path, html) => {
  mkdirSync(join(dir, path), { recursive: true });
  writeFileSync(join(dir, path, 'index.html'), html);
};

test('check-links counts missing targets and ignores inline script strings', () => {
  const dir = mkdtempSync(join(tmpdir(), 'links-'));
  try {
    page(dir, 'a', '<a href="/b/">ok</a><a href="/missing/">x</a>' +
      '<script>el.innerHTML = `<a href="/rc/${id}">t</a>`</script><script src="/gone.js"></script>');
    page(dir, 'b', '<!-- <a href="/commented/">c</a> --><a href="/a/#top">back</a>');
    const run = (...args) => spawnSync('node', ['tools/check-links.mjs', '--dist', dir, ...args], { encoding: 'utf8' });
    const r = run();
    assert.equal(r.status, 1);
    assert.match(r.stdout, /2 distinct broken targets/);
    assert.match(r.stdout, /\/missing\//);
    assert.match(r.stdout, /\/gone\.js/);
    assert.doesNotMatch(r.stdout, /\$\{id\}|commented/);
    assert.equal(run('--report').status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
