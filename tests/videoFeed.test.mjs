// The videos of the home page and the /videos/ feed (src/lib/videoFeed.ts, src/lib/videoFeed.json).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { feedVideo, feedExclusion } from '../src/lib/videoFeed.ts';

const brand = (title) => ({ title });

test('a video of a release, kit or part always shows', () => {
  assert.ok(feedVideo({ title: '2026 ROAR Nationals A Main', releases: ['release/x/1'] }));
  assert.ok(feedVideo({ title: 'Giveaway', parts: ['part/x/1'] }));
});

test('a brand video with RC content shows', () => {
  for (const t of ['Meet the RLAARLO AK962 | 1/6 Scale, BUILT TO CHASE THE LIMIT.', 'HEAR THE THUNDER',
    'BATRAZZI FCX18 II F-100 | Red Build Showcase - Wheel & Tire Setup', 'Freeing up front cup ball joints',
    'Inside Ronald Völker’s ETS race setup 2026', 'Porsche 911 GT3 Cup Car Body', 'MST New Release Preview – M4A Body Shell'])
    assert.ok(feedVideo(brand(t)), t);
});

test('a brand video of races, events, giveaways, streams or merchandise stays out', () => {
  assert.equal(feedExclusion(brand('2026 ROAR 1/8th Off-Road Nationals - Pro Nitro Truck A Main')), 'race or event coverage');
  assert.equal(feedExclusion(brand('HPI at the 2026 GT Show')), 'race or event coverage');
  assert.equal(feedExclusion(brand('£900 Cash Purse. 100% Free Entry. RLAARLO CUP UK')), 'race or event coverage');
  assert.equal(feedExclusion(brand('THE MOVIE of KYOSHO BOOTH at the TOKYO HOBBY SHOW 2024')), 'race or event coverage');
  assert.equal(feedExclusion(brand('Thunder Tiger Youtube Subscription Sweepstakes')), 'giveaway or contest');
  assert.equal(feedExclusion(brand('Friday Live Stream with the team')), 'live stream or podcast');
  assert.equal(feedExclusion(brand('New team hoodies are in')), 'merchandise');
  assert.equal(feedExclusion(brand('Our new speed boat')), 'out of scope (aircraft, boats, slot cars, static models)');
});
