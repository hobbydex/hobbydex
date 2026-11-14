// Profiling only (build-profile branch): logs the RSS and heap peak of each Astro build phase to a JSON-lines file.
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const out = process.env.PROFILE_OUT ?? 'profile/out/phases.jsonl';
mkdirSync(dirname(out), { recursive: true });
const t0 = performance.now();
let last = t0;
let peakRss = 0;
let peakHeap = 0;
const sample = () => {
  const m = process.memoryUsage();
  peakRss = Math.max(peakRss, m.rss);
  peakHeap = Math.max(peakHeap, m.heapUsed);
};
const timer = setInterval(sample, 250);
timer.unref();

// peaks are per window: each mark reports the peak since the previous mark, then starts a new window
function mark(event) {
  sample();
  const now = performance.now();
  const rec = {
    event,
    t_s: +((now - t0) / 1000).toFixed(2),
    phase_s: +((now - last) / 1000).toFixed(2),
    rss_peak_mb: +(peakRss / 1048576).toFixed(0),
    heap_peak_mb: +(peakHeap / 1048576).toFixed(0),
    max_rss_so_far_mb: +(process.resourceUsage().maxRSS / 1024).toFixed(0),
  };
  appendFileSync(out, JSON.stringify(rec) + '\n');
  last = now;
  peakRss = process.memoryUsage().rss;
  peakHeap = process.memoryUsage().heapUsed;
}

export function phases(label, events) {
  const hooks = {};
  for (const e of events) hooks[e] = () => mark(`${e} [${label}]`);
  return { name: `hobbydex-phases-${label}`, hooks };
}
