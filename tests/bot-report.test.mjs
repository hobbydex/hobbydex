import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

const summary = (args, input) => JSON.parse(run(['--summary', ...args], input));

test('--summary gives one entry per UTC day with the bot split and the since filter', () => {
  const all = summary([fixture.pathname]);
  assert.equal(all.lines, 13);
  assert.deepEqual(all.days.map((d) => d.day), ['2026-11-04', '2026-11-05']);
  assert.equal(all.days[0].crawlers.Googlebot, 4);
  assert.equal(all.days[1].crawlers.Bingbot, 1);
  assert.equal(all.days[1].crawlers.CCBot, 1);
  assert.equal(all.days[1].blocked_403, 1);
  // the fixture's log starts at 10:01 UTC on the first day, so that day is partial; the next one is whole
  assert.deepEqual(all.days.map((d) => d.partial), [true, false]);

  const later = summary(['--since', '2026-11-05', fixture.pathname]);
  assert.deepEqual(later.days.map((d) => d.day), ['2026-11-05']);
  assert.equal(later.since, '2026-11-05');
});

test('--summary: a human browser request counts as a page view and a visitor, a static file does not', () => {
  const line = (uri, ua, ip, status = 200, method = 'GET') => JSON.stringify({
    ts: 1793786500, status,
    request: { method, uri, client_ip: ip, remote_ip: ip, headers: { 'User-Agent': [ua] } },
  });
  const chrome = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
  const input = [
    line('/rc/parts', chrome, '203.0.113.5'),
    line('/rc/parts?page=2', chrome, '203.0.113.5'),
    line('/_astro/app.js', chrome, '203.0.113.6'),
    line('/robots.txt', chrome, '198.51.100.9'),
    line('/rc/parts', 'Mozilla/5.0 (compatible; ClaudeBot/1.0)', '198.51.100.9'),
    line('/rc/parts', chrome, '198.51.100.9', 403),
  ].join('\n') + '\n';
  const dir = mkdtempSync(join(tmpdir(), 'bot-report-'));
  const file = join(dir, 'access.log');
  writeFileSync(file, input);
  const out = summary([file]);
  const day = out.days[0];
  assert.equal(day.page_views, 2);
  assert.equal(day.unique_visitors, 1);
  assert.equal(day.crawlers.ClaudeBot, 1);
  assert.equal(day.blocked_403, 1);
  const net = day.networks.find((n) => n.prefix === '198.51.0.0/16');
  assert.equal(net, undefined, 'networks under 50 requests are counted as other networks');
  assert.equal(day.other_networks.count, 2);
});

// Rolled files: tests/fixtures/bot-report/rolled holds a plain file and a gzipped one, each with requests from two UTC
// days, as Caddy rolls them (access-<time>.log, .log.gz). The days come from each request's own time.
const rolled = new URL('./fixtures/bot-report/rolled/', import.meta.url).pathname;
const plainRoll = `${rolled}access-2026-11-04T12-00-00.000.log`;
const gzRoll = `${rolled}access-2026-11-05T12-00-00.000.log.gz`;

test('--summary over a plain and a gzipped rolled file groups each request by its own UTC day', () => {
  const out = summary([plainRoll, gzRoll]);
  assert.equal(out.lines, 5);
  assert.equal(out.first_line, '2026-11-04T12:00:00Z');
  assert.deepEqual(out.days.map((d) => d.day), ['2026-11-04', '2026-11-05', '2026-11-06']);
  assert.deepEqual(out.days.map((d) => d.requests), [2, 2, 1]);
  assert.deepEqual(out.days.map((d) => d.crawlers), [{ Googlebot: 2 }, { Bingbot: 1 }, { ClaudeBot: 1 }]);
  assert.deepEqual(out.days.map((d) => d.page_views), [0, 1, 0]);
  assert.equal(out.days[2].blocked_403, 1);
  // the log begins after midnight on the first day, so that day is partial; no day is today
  assert.deepEqual(out.days.map((d) => d.partial), [true, false, false]);
});

test('the default log glob reads the current and the rolled files, plain or gzipped', () => {
  // the module's LOG_GLOB is pointed at the fixture folder; the summary must equal the one for the named files
  const py = `
import importlib.util, json, sys
spec = importlib.util.spec_from_file_location('bot_report', sys.argv[1])
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
m.LOG_GLOB = sys.argv[2]
m.main(['--summary'])`;
  const r = spawnSync('python3', ['-I', '-c', py, script, `${rolled}access*.log*`], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout).days, summary([plainRoll, gzRoll]).days);
});

test('a day is partial only when it is today or the logs start after its first second', () => {
  const py = `
import importlib.util, json, sys
spec = importlib.util.spec_from_file_location('bot_report', sys.argv[1])
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
files = [open(f, 'rb') for f in sys.argv[2:4]]
print(json.dumps(m.summarise(files, '', '2026-11-06')))`;
  const r = spawnSync('python3', ['-I', '-c', py, script, plainRoll, gzRoll], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.deepEqual(out.days.map((d) => d.partial), [true, false, true]);
  const since = summary(['--since', '2026-11-05', plainRoll, gzRoll]);
  assert.deepEqual(since.days.map((d) => d.day), ['2026-11-05', '2026-11-06']);
});
