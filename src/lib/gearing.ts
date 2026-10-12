// The stock gearing of a release: the pinion and spur gear in the box (role kit), their ratio, and a small
// drawing of the two gears in mesh. Only when the box holds one pinion size and one spur size: a box with a
// choice of pinions has no single stock ratio. The data has no internal (transmission) ratio, so this is the
// spur/pinion ratio, not the final drive ratio.
import { db, type Part, type Release } from './data';
import { gearPath, svgWrap, moduleOf, pitchText } from './specDrawings';

export type Gearing = { pinion: Part; spur: Part; zp: number; zs: number; ratio: number; pitch: string; svg: string };

const teethOf = (p: Part) => {
  if (p.teeth) return p.teeth;
  const sp = (p.equivalent_to ?? []).map((e) => db.spec.get(e.spec)).find((s) => s?.category === 'pinion');
  return sp?.teeth ? Number(sp.teeth) : undefined;
};
const pitchOf = (p: Part) => {
  if (p.module || p.pitch_dp) return p;
  return (p.equivalent_to ?? []).map((e) => db.spec.get(e.spec)).find((s) => s?.category === 'pinion') ?? {};
};

export function gearing(release: Release): Gearing | undefined {
  const box = (release.contains ?? []).filter((c) => c.role === 'kit').map((c) => db.part.get(c.part)).filter((p): p is Part => !!p);
  const pick = (cat: string) => {
    const ps = box.filter((p) => p.category === cat && teethOf(p));
    return new Set(ps.map(teethOf)).size === 1 ? ps[0] : undefined;
  };
  const pinion = pick('pinion'), spur = pick('spur-gear');
  if (!pinion || !spur) return undefined;
  const zp = teethOf(pinion)!, zs = teethOf(spur)!;
  if (zs <= zp) return undefined;   // not a pinion driving a spur
  const mp = moduleOf(pitchOf(pinion)), ms = moduleOf(pitchOf(spur));
  if (mp && ms && Math.abs(mp - ms) / ms > 0.05) return undefined;   // different pitches cannot mesh: a data error
  const pitch = pitchText(ms ? pitchOf(spur) : pitchOf(pinion));
  return { pinion, spur, zp, zs, ratio: zs / zp, pitch, svg: meshSvg(zs, zp) };
}

// Two gears in mesh, in proportion (both have the same pitch, so the size follows the tooth count).
function meshSvg(zs: number, zp: number) {
  const s = Math.min(120 / (zs + 2), 210 / (zs + zp + 2));   // px per module
  const Rs = ((zs + 2) / 2) * s, Rp = ((zp + 2) / 2) * s, cy = Rs + 6, xs = Rs + 6, xp = xs + ((zs + zp) / 2) * s;
  const W = Math.ceil(xp + Rp + 6), H = Math.ceil(2 * Rs + 12);
  const body = `<path class="fill" d="${gearPath(xs, cy, zs, 1, s, Math.PI / 2)}"/><path class="fill" d="${gearPath(xp, cy, zp, 1, s, -Math.PI / 2 + Math.PI / zp)}"/>`
    + `<circle cx="${xs}" cy="${cy}" r="2"/><circle cx="${xp.toFixed(1)}" cy="${cy}" r="1.5"/>`
    + `<text x="${xs}" y="${cy - 8}" text-anchor="middle" class="big">${zs}T</text>`
    + `<text x="${xp.toFixed(1)}" y="${(cy + Rp + 14).toFixed(1)}" text-anchor="middle">${zp}T</text>`;
  return svgWrap(W, Math.max(H, Math.ceil(cy + Rp + 20)), `${zs}T spur gear and ${zp}T pinion`, body, false);
}
