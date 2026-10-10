// A brand's parts as compact rows [number, name, category slug] for the brand page's search box.
import { db, key } from '../../../../lib/data';

export function getStaticPaths() {
  return db.brands.filter((b) => db.partsByBrand.get(b.id)?.length).map((b) => ({ params: { brand: key(b.id)[0] }, props: { id: b.id } }));
}

export function GET({ props }: { props: { id: string } }) {
  const rows = (db.partsByBrand.get(props.id) ?? []).map((p) => [key(p.id)[1], p.name, p.category ?? '']);
  return new Response(JSON.stringify(rows), { headers: { 'Content-Type': 'application/json' } });
}
