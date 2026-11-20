// Which makers' videos the home page's latest videos and the /videos/ feed list: every video of a release, kit or part,
// and a brand video (one that names none) when it shows RC content, that is when no exclusion of videoFeed.json
// (race and event coverage, giveaways, live streams, merchandise, out-of-scope lines) matches its title.
import feed from './videoFeed.json' with { type: 'json' };

type FeedDoc = { title: string; releases?: string[]; kits?: string[]; parts?: string[] };

const rules = feed.exclude.map((e) => ({ reason: e.reason, rx: new RegExp(e.pattern, 'i') }));

// a video of a product (a release, a whole kit, a part); a brand video names none (a build team, a workshop, a product
// line)
export const productVideo = (d: FeedDoc) => !!(d.releases?.length || d.kits?.length || d.parts?.length);

/** Why a brand video stays out of the feed (the first matching exclusion's reason), or undefined when it shows. */
export const feedExclusion = (d: FeedDoc): string | undefined =>
  productVideo(d) ? undefined : rules.find((r) => r.rx.test(d.title))?.reason;

/** True when the video belongs in the home page's latest videos and the /videos/ feed. */
export const feedVideo = (d: FeedDoc) => feedExclusion(d) === undefined;
