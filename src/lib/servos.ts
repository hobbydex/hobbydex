// Servo rows for the comparison page and the "similar servos" lists.
import { db, type Part } from './data';

export type ServoRow = { part: Part; size?: string; spline?: number };

export const servos: ServoRow[] = db.parts.filter((p) => p.category === 'servo').map((part) => {
  const link = (part.equivalent_to ?? []).find((e) => e.spec.startsWith('spec/servo/'));
  const spec = link ? db.spec.get(link.spec) : undefined;
  return { part, size: spec?.size_class as string | undefined, spline: spec?.spline_teeth as number | undefined };
});
const byId = new Map(servos.map((s) => [s.part.id, s]));
export const servoRow = (id: string) => byId.get(id);

/** A servo's name without its number in front ("SB-2290SG SB-2290SG Standard ..."). */
export const shortName = (p: Part) => p.name.startsWith(p.number) ? p.name.slice(p.number.length).trim() : p.name === p.number ? '' : p.name;

/** Same size class (and spline when both state one), closest torque and speed first. */
export function similarServos(id: string, n = 8): ServoRow[] {
  const me = byId.get(id);
  if (!me?.size) return [];
  const t = me.part.torque_kgcm, s = me.part.speed_s;
  const dist = (o: ServoRow) =>
    (t && o.part.torque_kgcm ? Math.abs(Math.log(o.part.torque_kgcm / t)) : 1) + (s && o.part.speed_s ? Math.abs(Math.log(o.part.speed_s / s)) : 1);
  return servos.filter((o) => o.part.id !== id && o.size === me.size && (!me.spline || !o.spline || o.spline === me.spline))
    .sort((a, b) => dist(a) - dist(b) || a.part.number.localeCompare(b.part.number)).slice(0, n);
}
