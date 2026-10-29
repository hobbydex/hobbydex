// Radio parts (hobbydex-rc docs/schema.md "radio_unit"): what the part is, and whose
// size and weight its figures are (a set's are the transmitter's).
import type { Part } from './data';

export const radioUnitLabel: Record<string, string> = { transmitter: 'Transmitter', receiver: 'Receiver', set: 'Set: transmitter and receiver', gyro: 'Gyro' };

/** The label of a part's Size or Weight row: "Transmitter size" on a transmitter or a set, "Receiver weight" on a receiver, "Gyro size" on a gyro. */
export function figureLabel(p: Part, what: 'size' | 'weight'): string {
  const who = p.radio_unit === 'receiver' ? 'Receiver' : p.radio_unit === 'gyro' ? 'Gyro' : p.radio_unit ? 'Transmitter' : '';
  return who ? `${who} ${what}` : what[0].toUpperCase() + what.slice(1);
}

/** What a radio part is for the protocol page's groups: its `radio_unit`, or the name's word when none is set. */
export function radioGroup(p: Part): 'transmitter' | 'receiver' | 'other' {
  if (p.radio_unit === 'transmitter' || p.radio_unit === 'set') return 'transmitter';
  if (p.radio_unit === 'receiver') return 'receiver';
  if (p.radio_unit) return 'other';
  if (/\breceiver\b|\brx\b/i.test(p.name) && !/\btransmitter\b|\btx\b/i.test(p.name)) return 'receiver';
  if (/\btransmitter\b|\bradio\b|\btx\b/i.test(p.name)) return 'transmitter';
  return 'other';
}
