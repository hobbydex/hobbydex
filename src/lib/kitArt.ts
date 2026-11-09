// The outline a platform shows when it has none of its own: a traced release, if the releases are one car.
// A chassis sold under different bodies keeps its type icon, as one body would misrepresent it.
type Depicts = { make?: string; model?: string };
type Rel = { name: string; art?: string; depicts?: Depicts };

const MAX_RELEASES = 8;   // more than this is a family of bodies (Element Enduro, Team Associated Apex)
const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');

export function outlineFromReleases(kitName: string, releases: Rel[]): string | undefined {
  const art = releases.find((r) => r.art)?.art;
  if (!art || releases.length > MAX_RELEASES) return undefined;
  const cars = new Set(releases.flatMap((r) => (r.depicts?.model ? [squash(`${r.depicts.make} ${r.depicts.model}`)] : [])));
  if (cars.size > 1) return undefined;
  if (cars.size === 1) return art;
  // no car named anywhere: every release must carry the platform's name, and not as Tamiya's "Body Name (TB-05)"
  const name = squash(kitName);
  const ownName = releases.every((r) => squash(r.name).includes(name) && !squash(r.name.match(/\(([^()]*)\)\s*$/)?.[1] ?? '').includes(name));
  return ownName ? art : undefined;
}
