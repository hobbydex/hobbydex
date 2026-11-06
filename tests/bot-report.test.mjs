import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

// ops/server/bot-report.py reads the Caddy JSON access log. The fixture holds 13 requests on two UTC days.
const script = new URL('../ops/server/bot-report.py', import.meta.url).pathname;
const fixture = new URL('./fixtures/bot-report/access.log', import.meta.url);
const log = readFileSync(fixture);

const run = (args, input) => {
  const r = spawnSync('python3', ['-I', script, ...args], { input, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout;
};

test('the report counts bots per day, leaves out human requests and lists 404 and 5xx paths', () => {
  const out = run([fixture.pathname], undefined);
  assert.match(out, /^13 request lines; 1 human requests ignored; 0 unreadable lines skipped/);
  assert.match(out, /\n2026-11-04\n {2}Googlebot: 4 hits \(2xx 2 3xx 1 4xx 1\)\n/);
  assert.match(out, /sections: \/rc\/parts 50\.0% {2}\/rc\/releases 25\.0% {2}\/ 25\.0%/);
  assert.match(out, / {7}1 {2}404x1 {10}\/rc\/parts\/missing/);
  assert.match(out, /Bingbot: 1 hits \(5xx 1\)/);
  assert.match(out, / {7}1 {2}500x1 {10}\/rc\/categories\/cars/);
  assert.match(out, /other bots: 1 hits \(4xx 1\)/);
  assert.match(out, /\n2026-11-05\n {2}Googlebot: 4 hits \(2xx 1 4xx 2 5xx 1\)\n/);
  assert.match(out, / {5}3 {2}404x2 503x1 {4}\/rc\/parts\/gone/);
  assert.match(out, /Bingbot: 1 hits \(4xx 1\)/);
  assert.match(out, /other bots: 1 hits \(2xx 1\)/);
  assert.doesNotMatch(out, /Firefox/);
});

test('standard input gives the same report as the file', () => {
  assert.equal(run([], log), run([fixture.pathname], undefined));
});

test('plain and gzip members mixed in one stream, as sudo cat access.log* gives them', () => {
  const lines = log.toString('utf8').split('\n');
  const head = Buffer.from(lines.slice(0, 5).join('\n') + '\n');
  const middle = gzipSync(Buffer.from(lines.slice(5, 9).join('\n') + '\n'));
  const tail = Buffer.from(lines.slice(9).join('\n'));
  const mixed = Buffer.concat([head, middle, tail]);
  assert.equal(run([], mixed), run([fixture.pathname], undefined));
});

test('a gzip-only file is read like the plain one', () => {
  const gz = gzipSync(log);
  assert.equal(run([], gz), run([fixture.pathname], undefined));
});
