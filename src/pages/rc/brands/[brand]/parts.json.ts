// A brand's parts as compact rows [number, name, category slug] for the brand page's search box.
import { db, key } from '../../../../lib/data';

export function getStaticPaths() {
  return db.brands.filter((b) => db.partsByBrand.get(b.id)?.length).map((b) => ({ params: { brand: key(b.id)[0] }, props: { id: b.id } }));
}

export function GET({ props }: { props: { id: string } }) {
  // a fourth value, 1, marks a discontinued part (the search row shows the mark)
  const rows = (db.partsByBrand.get(props.id) ?? []).map((p) => [key(p.id)[1], p.name, p.category ?? '', ...(p.status === 'discontinued' ? [1] : [])]);
  return new Response(JSON.stringify(rows), { headers: { 'Content-Type': 'application/json' } });
}
