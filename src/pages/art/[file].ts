import { releaseArts } from '../../lib/releaseList';

// One static SVG per distinct release outline (a 48x24 viewBox, filled black so the release table can use it as a
// CSS mask in the release's colour). Many releases share an outline, so each is written once, under /art/<hash>.svg.
export function getStaticPaths() {
  return [...releaseArts()].map(([file, d]) => ({ params: { file }, props: { d } }));
}

export function GET({ props }: { props: { d: string } }) {
  return new Response(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 24"><path d="${props.d}"/></svg>`, {
    headers: { 'Content-Type': 'image/svg+xml' },
  });
}
