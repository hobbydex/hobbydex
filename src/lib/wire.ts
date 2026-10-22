// Wire and heat shrink facts on a part page: the gauge and its spec, the insulation, the length and the shrink sizes.
import { db, url, type Part } from './data';

export const INSULATION: Record<string, string> = { silicone: 'Silicone', pvc: 'PVC', teflon: 'Teflon' };

/** The gauges a wire part names: one, or two for a lead with two gauges. */
export const gauges = (p: Part): number[] => ([] as number[]).concat((p as { wire_awg?: number | number[] }).wire_awg ?? []);

/** Link to the gauge's spec when the spec exists (8 to 30 AWG); a gauge outside the specs is plain text. */
export function gaugeLink(n: number) {
  return db.spec.get(`spec/wire/${n}awg`) ? url.spec(`spec/wire/${n}awg`) : undefined;
}

export const mmText = (n: number) => (n >= 1000 && n % 1000 === 0 ? `${n / 1000} m` : `${n} mm`);

/** The size a heat shrink tube shrinks to: supplied diameter / ratio, only when the ratio is stated. */
export function shrinksTo(p: { diameter_mm?: number | number[]; shrink_ratio?: number }): number[] | undefined {
  if (!p.shrink_ratio || p.diameter_mm === undefined) return undefined;
  return ([] as number[]).concat(p.diameter_mm).map((d) => Math.round((d / p.shrink_ratio!) * 100) / 100);
}
