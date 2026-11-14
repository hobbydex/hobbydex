// Summarises the profiling run: GNU time reports, Astro phase log, CPU and heap profiles. Prints Markdown.
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] ?? 'profile/out';
const out = [];
const p = (s = '') => out.push(s);
const toSec = (s) => s.split(':').map(Number).reduce((a, v) => a * 60 + v, 0);
const modes = ['timing', 'profiled'];

function timeReport(name) {
  const f = join(dir, `${name}.time`);
  if (!existsSync(f)) return null;
  const t = readFileSync(f, 'utf8');
  const g = (re) => t.match(re)?.[1];
  return {
    wall: toSec(g(/Elapsed \(wall clock\) time .*?: (\S+)/) ?? '0'),
    rssMb: Number(g(/Maximum resident set size \(kbytes\): (\d+)/) ?? 0) / 1024,
    cpu: Number(g(/User time \(seconds\): ([\d.]+)/) ?? 0) + Number(g(/System time \(seconds\): ([\d.]+)/) ?? 0),
    exit: g(/Exit status: (\d+)/),
  };
}

const phases = ['export', 'parse', 'astro', 'pagefind', 'redirects', 'checklinks', 'tar'];
p('## Phase table (GNU time -v per process; wall = elapsed, RSS = peak of the process)');
p();
p('| phase | timing: wall s | timing: peak RSS MB | timing: CPU s | profiled: wall s | profiled: peak RSS MB | profiled: CPU s |');
p('|---|---:|---:|---:|---:|---:|---:|');
for (const ph of phases) {
  const cells = modes.flatMap((m) => {
    const r = timeReport(`${m}-${ph}`);
    if (!r) return ['-', '-', '-'];
    return [r.wall.toFixed(1) + (r.exit && r.exit !== '0' ? ` (exit ${r.exit})` : ''), r.rssMb.toFixed(0), r.cpu.toFixed(1)];
  });
  p(`| ${ph} | ${cells.join(' | ')} |`);
}
p();

p('## Export and JSON parse (profile/parse.mjs, timing run)');
p();
const parseFile = join(dir, 'timing-parse.json');
if (existsSync(parseFile) && statSync(parseFile).size > 0) {
  const j = JSON.parse(readFileSync(parseFile, 'utf8'));
  p(`file ${j.file_mb} MB, read ${j.read_ms} ms, JSON.parse ${j.parse_ms} ms, heap retained ${j.heap_retained_mb} MB`);
  p();
  p('| array | records | JSON MB |');
  p('|---|---:|---:|');
  for (const r of j.per_key) p(`| ${r.key} | ${r.records} | ${r.json_mb} |`);
  p();
}

for (const m of modes) {
  const f = join(dir, `${m}-phases.jsonl`);
  if (!existsSync(f)) continue;
  p(`## Astro phases (${m}, in-process: peak sampled every 250 ms since the previous mark)`);
  p();
  p('| event | phase s | peak RSS MB | peak heap MB | max RSS so far MB |');
  p('|---|---:|---:|---:|---:|');
  for (const line of readFileSync(f, 'utf8').split('\n').filter(Boolean)) {
    const r = JSON.parse(line);
    p(`| ${r.event} | ${r.phase_s} | ${r.rss_peak_mb} | ${r.heap_peak_mb} | ${r.max_rss_so_far_mb} |`);
  }
  p();
}

// CPU profile: self time per function and per package (the largest profile file is the astro build)
function shortUrl(url) {
  return url.replace(/^file:\/\//, '').replace(/^.*\/hobbydex\/hobbydex\//, '').replace(/^.*node_modules\//, '');
}
function pkgOf(url, name) {
  if (!url) return `(${name})`;
  if (url.startsWith('node:')) return 'node:builtin';
  const nm = url.lastIndexOf('node_modules/');
  if (nm >= 0) {
    const rest = url.slice(nm + 13).split('/');
    return rest[0].startsWith('@') ? `${rest[0]}/${rest[1]}` : rest[0];
  }
  if (url.includes('/src/')) return 'hobbydex src/';
  if (url.includes('/data/')) return 'hobbydex data/';
  return shortUrl(url).split('/').slice(0, 2).join('/');
}
const cpuDir = join(dir, 'cpu');
if (existsSync(cpuDir)) {
  const files = readdirSync(cpuDir).filter((f) => f.endsWith('.cpuprofile')).map((f) => join(cpuDir, f));
  files.sort((a, b) => statSync(b).size - statSync(a).size);
  if (files.length) {
    const prof = JSON.parse(readFileSync(files[0], 'utf8'));
    const byId = new Map(prof.nodes.map((n) => [n.id, n]));
    const fn = new Map();
    const pkg = new Map();
    let total = 0;
    for (let i = 0; i < prof.samples.length; i++) {
      const n = byId.get(prof.samples[i]);
      const dt = prof.timeDeltas[i] ?? 0;
      total += dt;
      const cf = n.callFrame;
      const key = `${cf.functionName || '(anonymous)'} ${shortUrl(cf.url || '(native)')}:${cf.lineNumber + 1}`;
      fn.set(key, (fn.get(key) ?? 0) + dt);
      const k = pkgOf(cf.url, cf.functionName);
      pkg.set(k, (pkg.get(k) ?? 0) + dt);
    }
    const top = (m, n) => [...m].sort((a, b) => b[1] - a[1]).slice(0, n);
    p(`## CPU self time (profiled run, ${files[0].split('/').pop()}, total ${(total / 1e6).toFixed(1)} s sampled)`);
    p();
    p('| function | self s | share |');
    p('|---|---:|---:|');
    for (const [k, v] of top(fn, 12)) p(`| \`${k}\` | ${(v / 1e6).toFixed(1)} | ${((100 * v) / total).toFixed(1)}% |`);
    p();
    p('| package / area | self s | share |');
    p('|---|---:|---:|');
    for (const [k, v] of top(pkg, 10)) p(`| ${k} | ${(v / 1e6).toFixed(1)} | ${((100 * v) / total).toFixed(1)}% |`);
    p();
  }
}

// Heap profile: sampled bytes still live at process exit, per function (not the peak)
const heapDir = join(dir, 'heap');
if (existsSync(heapDir)) {
  const files = readdirSync(heapDir).filter((f) => f.endsWith('.heapprofile')).map((f) => join(heapDir, f));
  files.sort((a, b) => statSync(b).size - statSync(a).size);
  if (files.length) {
    const prof = JSON.parse(readFileSync(files[0], 'utf8'));
    const fn = new Map();
    let total = 0;
    const stack = [prof.head];
    while (stack.length) {
      const n = stack.pop();
      const cf = n.callFrame;
      const key = `${cf.functionName || '(anonymous)'} ${shortUrl(cf.url || '(native)')}:${cf.lineNumber + 1}`;
      fn.set(key, (fn.get(key) ?? 0) + n.selfSize);
      total += n.selfSize;
      for (const c of n.children ?? []) stack.push(c);
    }
    p(`## Heap at exit (sampled, live bytes per function; total ${(total / 1048576).toFixed(0)} MB)`);
    p();
    p('| function | live MB | share |');
    p('|---|---:|---:|');
    for (const [k, v] of [...fn].sort((a, b) => b[1] - a[1]).slice(0, 12)) p(`| \`${k}\` | ${(v / 1048576).toFixed(1)} | ${((100 * v) / total).toFixed(1)}% |`);
    p();
  }
}

console.log(out.join('\n'));
