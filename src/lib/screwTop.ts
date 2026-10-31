// The top view of a screw head, true scale: the head disc (round, hex or flanged) and the drive recess (hex socket,
// cross, Torx, slot), both built around the one centre 0,0. Pure geometry: no imports, tested in tests/screwTop.test.mjs.
// Geometry after the hw-sheets draft; the cross (Phillips and JIS) is built from two equal bars, so its four arms are
// equal and it is centred on the head.
export type Pt = [number, number];
const fx = (v: number) => String(Math.round(v * 100) / 100);
export const poly = (pts: Pt[]) => `M${pts.map(([x, y]) => `${fx(x)} ${fx(y)}`).join('L')}Z`;
export const circlePath = (cx: number, cy: number, r: number) =>
  `M${fx(cx - r)} ${fx(cy)}a${fx(r)} ${fx(r)} 0 1 0 ${fx(2 * r)} 0a${fx(r)} ${fx(r)} 0 1 0 ${fx(-2 * r)} 0Z`;
export const hexPts = (r: number): Pt[] => [0, 1, 2, 3, 4, 5].map((i) => [r * Math.cos((i * Math.PI) / 3 + Math.PI / 6), r * Math.sin((i * Math.PI) / 3 + Math.PI / 6)]);

/** The centre of the bounding box of a point list. */
export function boxCentre(pts: Pt[]): Pt {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
}

/** The outline of a cross recess in a head of radius R: two bars of equal length (R) and width, centred on 0,0. */
export function crossPts(R: number): Pt[] {
  const a = R / 2, b = Math.max(0.35, R * 0.16) / 2;
  return [[-a, -b], [-b, -b], [-b, -a], [b, -a], [b, -b], [a, -b], [a, b], [b, b], [b, a], [-b, a], [-b, b], [-a, b]];
}

export type TopView = { head: string; flange?: string; headCentre: Pt; drive?: string; driveCentre?: Pt };

/** `head`: the spec's head (flanged-x, hex, set ...); `drive`: hex, phillips, jis, torx, slot; `at`: where the head's centre goes (default 0,0); `d`: thread diameter; `dk`: head diameter; `key`: hex key across flats. */
export function topView(o: { head: string; drive: string; d: number; dk: number; key?: number }, at: Pt = [0, 0]): TopView {
  const sh = (pts: Pt[]): Pt[] => pts.map(([x, y]) => [x + at[0], y + at[1]]);
  const base = o.head.replace(/^flanged-/, '');
  const R = (base === 'set' ? o.d : o.dk) / 2;
  let head: string, headCentre: Pt;
  if (base === 'hex') {
    const pts = hexPts(R / Math.cos(Math.PI / 6));   // the head's width across flats is dk
    head = poly(sh(pts));
    headCentre = boxCentre(sh(pts));
  } else {
    head = circlePath(at[0], at[1], R);
    headCentre = [at[0], at[1]];
  }
  const flange = o.head.startsWith('flanged-') ? circlePath(at[0], at[1], R * 0.78) : undefined;
  let pts: Pt[] | undefined;
  const key = o.key ?? 0.6 * R;
  if (o.drive === 'hex') pts = hexPts(key / Math.sqrt(3));
  else if (o.drive === 'phillips' || o.drive === 'jis') pts = crossPts(R);
  else if (o.drive === 'torx') {
    const r1 = R * 0.5, r2 = r1 * 0.78;
    pts = Array.from({ length: 12 }, (_, i): Pt => { const r = i % 2 ? r2 : r1, t = (i * Math.PI) / 6; return [r * Math.cos(t), r * Math.sin(t)]; });
  } else if (o.drive === 'slot') {
    const a = R * 0.85, b = Math.max(0.3, R * 0.14) / 2;
    pts = [[-a, -b], [a, -b], [a, b], [-a, b]];
  }
  if (!pts) return { head, flange, headCentre };
  return { head, flange, headCentre, drive: poly(sh(pts)), driveCentre: boxCentre(sh(pts)) };
}
