// The top view of a screw head, true scale, for the hardware sheet: the head disc (round, hex or flanged) and the drive
// recess (hex socket, cross, Torx, slot), both built around the one centre 0,0. The disc takes the part's colour
// (--sheet-fill) with an ink outline; the recess is drawn in the ink colour with an outline in the fill colour, so it
// shows on black, silver and gold alike. Pure geometry: no imports, tested in tests/screwTop.test.mjs.
export type Pt = [number, number];
const fx = (v: number) => String(Math.round(v * 100) / 100);
const poly = (pts: Pt[]) => `M${pts.map(([x, y]) => `${fx(x)} ${fx(y)}`).join('L')}Z`;
const hexPts = (r: number): Pt[] => [0, 1, 2, 3, 4, 5].map((i) => [r * Math.cos((i * Math.PI) / 3 + Math.PI / 6), r * Math.sin((i * Math.PI) / 3 + Math.PI / 6)]);

/** The centre of the bounding box of a point list. */
export function boxCentre(pts: Pt[]): Pt {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
}

export type TopView = { svg: string; headCentre: Pt; driveCentre?: Pt; driveD?: string };

/** `head`: the spec's head (flanged-x, hex, set ...); `drive`: hex, phillips, jis, torx, slot; `d`: thread diameter; `dk`: head diameter; `key`: hex key across flats. */
export function topView(o: { head: string; drive: string; d: number; dk: number; key?: number }): TopView {
  const base = o.head.replace(/^flanged-/, '');
  const R = (base === 'set' ? o.d : o.dk) / 2;
  let svg: string, headCentre: Pt;
  if (base === 'hex') {
    const pts = hexPts(R / Math.cos(Math.PI / 6));   // the head's width across flats is dk
    svg = `<path d="${poly(pts)}" fill="var(--sheet-fill)" stroke="currentColor" stroke-width="0.15" stroke-linejoin="round"/>`;
    headCentre = boxCentre(pts);
  } else {
    svg = `<circle cx="0" cy="0" r="${fx(R)}" fill="var(--sheet-fill)" stroke="currentColor" stroke-width="0.15"/>`;
    headCentre = [0, 0];
  }
  if (o.head.startsWith('flanged-')) svg += `<circle cx="0" cy="0" r="${fx(R * 0.78)}" fill="none" stroke="currentColor" stroke-width="0.12"/>`;
  let pts: Pt[] | undefined;
  const key = o.key ?? 0.6 * R;
  if (o.drive === 'hex') pts = hexPts(key / Math.sqrt(3));
  else if (o.drive === 'phillips' || o.drive === 'jis') {
    const l = R, w = Math.max(0.35, R * 0.16), a = l / 2, b = w / 2;
    pts = [[-a, -b], [-b, -b], [-b, -a], [b, -a], [b, -b], [a, -b], [a, b], [b, b], [b, a], [-b, a], [-b, b], [-a, b]];
  } else if (o.drive === 'torx') {
    const r1 = R * 0.5, r2 = r1 * 0.78;
    pts = Array.from({ length: 12 }, (_, i): Pt => { const r = i % 2 ? r2 : r1, t = (i * Math.PI) / 6; return [r * Math.cos(t), r * Math.sin(t)]; });
  } else if (o.drive === 'slot') {
    const a = R * 0.85, b = Math.max(0.3, R * 0.14) / 2;
    pts = [[-a, -b], [a, -b], [a, b], [-a, b]];
  }
  if (!pts) return { svg, headCentre };
  const driveD = poly(pts);
  svg += `<path d="${driveD}" fill="currentColor" stroke="var(--sheet-fill)" stroke-width="0.1" stroke-linejoin="round"/>`;
  return { svg, headCentre, driveCentre: boxCentre(pts), driveD };
}
