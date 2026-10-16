// Radio parts (hobbydex-rc docs/schema.md "radio_unit"): what the part is, and whose
// size and weight its figures are (a set's are the transmitter's).
import type { Part } from './data';

export const radioUnitLabel: Record<string, string> = { transmitter: 'Transmitter', receiver: 'Receiver', set: 'Set: transmitter and receiver' };

/** The label of a part's Size or Weight row: "Transmitter size" on a transmitter or a set, "Receiver weight" on a receiver. */
export function figureLabel(p: Part, what: 'size' | 'weight'): string {
  const who = p.radio_unit === 'receiver' ? 'Receiver' : p.radio_unit ? 'Transmitter' : '';
  return who ? `${who} ${what}` : what[0].toUpperCase() + what.slice(1);
}
