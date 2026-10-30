// What a charger part states (hobbydex-rc docs/schema.md "Chargers"): chemistries, watts per input, mains and DC input, plugs.
import type { Part } from './data';

export const CHEMISTRY: Record<string, string> = { lipo: 'LiPo', lihv: 'LiHV', life: 'LiFe', liion: 'Li-ion', nimh: 'NiMH', nicd: 'NiCd', pb: 'Pb', nizn: 'NiZn' };
export const MAINS: Record<string, string> = { EU: 'EU (Europlug / Schuko)', UK: 'UK (3-pin)', US: 'US (2-pin)', AU: 'AU (angled pins)' };

const range = (r?: number[]) => (r && r.length === 2 ? (r[0] === r[1] ? `${r[0]}` : `${r[0]}-${r[1]}`) : undefined);

/** Charge power from the mains and from the DC input, in watts; the single `power_w` when the maker gives no split. */
export function chargerWatts(p: Part): string | undefined {
  const ac = p.power_ac_w, dc = p.power_dc_w;
  if (ac !== undefined && dc !== undefined) return `${ac} AC / ${dc} DC`;
  if (ac !== undefined) return `${ac} AC`;
  if (dc !== undefined) return `${dc} DC`;
  return p.power_w !== undefined ? `${p.power_w}` : undefined;
}

export const chemistries = (p: Part) => (p.charges ?? []).map((c) => CHEMISTRY[c] ?? c);

/** The inputs in one line: "AC 100-240 V; DC 11-18 V (XT60)". */
export function chargerInput(p: Part): string | undefined {
  const ac = range(p.ac_input_v), dc = range(p.dc_input_v);
  const parts = [ac && `AC ${ac} V`, (dc || p.dc_input_connector) && `DC ${dc ? `${dc} V` : ''}${p.dc_input_connector ? `${dc ? ' ' : ''}(${p.dc_input_connector})` : ''}`.trim()].filter(Boolean);
  return parts.length ? parts.join('; ') : undefined;
}

/** The numbers of a watts cell, for the range filter: "100 AC / 250 DC" -> [100, 250]. */
export const wattsIn = (text: string) => (text.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
