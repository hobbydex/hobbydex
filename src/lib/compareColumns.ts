// Columns and parts of the ESC and motor compare pages (/rc/escs/, /rc/motors/). Each value is the part's own
// field, or for a motor its generic spec (can, shaft). PartTable leaves out a column no listed part has a value for.
import { type Part, type Spec, type KeyField } from './data';
import { format, type Column } from './categoryColumns';

type Opt = { label: string; unit?: string; num?: boolean; fmt?: string; pick?: boolean; multi?: boolean; plug?: boolean };
const col = (field: string, o: Opt): Column => ({
  label: o.unit ? `${o.label} ${o.unit}` : o.label,
  num: !!o.num, pick: o.pick ?? false, multi: o.multi, plug: o.plug,
  field: { field, label: o.label, from: 'part', format: o.fmt, unit: o.unit } as KeyField,
  get: (p: Part, s?: Spec) => {
    const v = (p as unknown as Record<string, unknown>)[field] ?? s?.[field];
    if (v === undefined || v === null || v === '') return undefined;
    if (o.plug) return String(v);                                  // a plug name as written: "XT90-S" must not lose its dash
    if (o.fmt === 'dims' && Array.isArray(v)) return v.join(' x ');
    if (o.multi && Array.isArray(v)) return v.join(', ');
    return format(v, { field, label: o.label, from: 'part', format: o.fmt, unit: o.unit } as KeyField);
  },
});

export const escFields: Column[] = [
  col('motor_type', { label: 'Type', pick: true }),
  col('sensored', { label: 'Sensor port', fmt: 'yesno' }),
  col('current_a', { label: 'Current', unit: 'A', num: true }),
  col('peak_current_a', { label: 'Peak', unit: 'A', num: true }),
  col('lipo_cells', { label: 'LiPo', fmt: 'cells' }),
  col('bec_v', { label: 'BEC', fmt: 'volts' }),
  col('bec_a', { label: 'BEC current', unit: 'A', num: true }),
  col('connector', { label: 'Battery plug', plug: true, pick: true }),
  col('motor_connector', { label: 'Motor plug', plug: true }),
  col('receiver_connector', { label: 'Receiver plug', plug: true }),
  col('waterproof', { label: 'Waterproof', fmt: 'yesno', pick: true }),
  col('scales', { label: 'Scales', multi: true, pick: true }),
  col('dimensions_mm', { label: 'Size', unit: 'mm', fmt: 'dims' }),
  col('weight_g', { label: 'Weight', unit: 'g', num: true }),
];

// Mounting holes as the maker states them: "2 x M3 @ 25 mm", several patterns joined with " + ".
const holes = (p: Part) => p.mount_holes?.length
  ? p.mount_holes.map((h) => `${h.count ? `${h.count} x ` : ''}${h.thread} @ ${h.circle_mm} mm`).join(' + ') : undefined;
const mountHoles: Column = { label: 'Mount holes', num: false, pick: true, field: { field: 'mount_holes', label: 'Mount holes', from: 'part' } as KeyField, get: holes };

export const motorFields: Column[] = [
  col('motor_type', { label: 'Type', pick: true }),
  col('sensored', { label: 'Sensored', fmt: 'yesno' }),
  col('kv', { label: 'kV', num: true }),
  col('turns', { label: 'Turns', num: true }),
  col('can', { label: 'Can' }),
  col('shaft_mm', { label: 'Shaft', unit: 'mm', num: true }),
  mountHoles,
  col('motor_connector', { label: 'Leads', plug: true, pick: true }),
  col('waterproof', { label: 'Waterproof', fmt: 'yesno', pick: true }),
  col('scales', { label: 'Scales', multi: true, pick: true }),
  col('weight_g', { label: 'Weight', unit: 'g', num: true }),
];

// Motor spare parts in the motor category: rotors, brushes, end plates, rebuild and conversion kits, sensor
// boards, mounts and accessories. A motor with a kV or turns figure is always complete; one without either is
// left out when its name says it is a spare. A name with no spare word and no figure stays in.
const SPARE = /\b(rotors?|armature|commutator|brushes|brush|end ?bells?|end ?plates?|endplatte|end ?caps?|rebuild|(rebuild|replacement|conversion|spare|upgrade|motor) kits?|conversions?|board|pcb|sensor units?|sensor pcb|solder|tabs?|covers?|seat|brackets?|shims?|adapter|adaptor|heat ?sinks?|cooler|fans?|fixing|mou?nting|balancer|cleaning|spray|adjust\w*|positioning|accessor\w*|spare|dust|gasket|screws?|bearings?|wires?|cables?|magnets?|springs?|caps?)\b/i;
export const isMotorSpare = (p: Part) => p.kv === undefined && p.turns === undefined && SPARE.test(p.name);

// ESC accessories in the esc category: cases, covers, dust covers, heatsinks, fans, programming boxes. A part with a
// current or cell figure is an ESC; one without either is left out when its name says it is an accessory, unless
// the name also says it is a controller, combo, system or board (a "Sensored ESC ... with FAN" stays in).
const ESC_ACC = /\b(case|cases|covers?|heat ?sinks?|fans?|capacitors?|caps?|housing|geh\w+use|box|wire|pcb|programm\w*)\b/i;
const ESC_KEEP = /\b(sensored|brushless|brushed|waterproof|speed|controllers?|regler|combo|system|power|motor|receiver|reciever|rx|unit|speedo|board|module)\b|\+/i;
export const isEscAccessory = (p: Part) => p.current_a === undefined && p.lipo_cells === undefined && ESC_ACC.test(p.name) && !ESC_KEEP.test(p.name);
