// Incremental build, the page side (tools/incremental.mjs). A per-record route's getStaticPaths passes its entries
// through skipUnchanged(): an entry whose record closure matches the previous build is left out, and the astro
// build:done hook copies its page from the previous dist. Active only with HOBBYDEX_INCREMENTAL=1, a previous and
// a current manifest, and the same code fingerprint in both; anything else builds every page.
import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { DEFAULT_SKIP_LOG, pathFor } from '../../tools/incremental.mjs';

type Manifest = { schema: number; code: string; closures: Record<string, string> };
type State = { prev: Manifest; cur: Manifest; log: string } | null;
let state: State | undefined;

function load(): State {
  if (state !== undefined) return state;
  const env = process.env;
  if (env.HOBBYDEX_INCREMENTAL !== '1' || !env.HOBBYDEX_PREV_MANIFEST || !env.HOBBYDEX_MANIFEST || !env.HOBBYDEX_PREV_DIST) return (state = null);
  const prev = JSON.parse(readFileSync(env.HOBBYDEX_PREV_MANIFEST, 'utf8')) as Manifest;
  const cur = JSON.parse(readFileSync(env.HOBBYDEX_MANIFEST, 'utf8')) as Manifest;
  // any change to the code (src, public, tools, config, lock files) is a full build
  if (prev.schema !== cur.schema || prev.code !== cur.code) return (state = null);
  return (state = { prev, cur, log: env.HOBBYDEX_SKIP_LOG ?? DEFAULT_SKIP_LOG });
}

// Drops the entries of `entries` (route pattern `route`, e.g. '/rc/parts/[brand]/[number]/') whose record is unchanged.
export function skipUnchanged<T extends { params: Record<string, string | string[] | undefined> }>(
  route: string, entries: T[], idOf: (e: T) => string,
): T[] {
  const st = load();
  if (!st) return entries;
  const skipped: string[] = [];
  const kept = entries.filter((e) => {
    const id = idOf(e);
    const c = st.cur.closures[id];
    // a volatile page (a record whose status changes by date) and a new record are always built
    if (c === undefined || c === 'volatile' || st.prev.closures[id] !== c) return true;
    skipped.push(JSON.stringify({ path: pathFor(route, e.params as Record<string, string>), id }));
    return false;
  });
  if (skipped.length) {
    mkdirSync(dirname(st.log), { recursive: true });
    appendFileSync(st.log, `${skipped.join('\n')}\n`);
  }
  return kept;
}
