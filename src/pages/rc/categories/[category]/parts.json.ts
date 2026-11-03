import { byCategory, categories } from '../../../../lib/categoryIndex';
import { buildExplorer } from '../../../../lib/categoryExplorer';
import { BIG } from '../../../../lib/categoryIndex';

// The whole category as compact rows for the filter table (components/CategoryExplorer.astro); only categories above BIG.
export function getStaticPaths() {
  return categories.filter((c) => [...byCategory.get(c)!.values()].reduce((n, ps) => n + ps.length, 0) > BIG).map((category) => ({ params: { category } }));
}
export function GET({ params }: { params: { category: string } }) {
  const parts = [...byCategory.get(params.category)!.values()].flat();
  return new Response(JSON.stringify(buildExplorer(params.category, parts)), { headers: { 'Content-Type': 'application/json' } });
}
