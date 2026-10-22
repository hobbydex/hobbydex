import { db, type Spec } from './data';

// the line icon of each spec category (public/icons.svg)
export const specIcon: Record<string, string> = { screw: 'screw', nut: 'nut', washer: 'washer-shim', bearing: 'bearing', pin: 'pin', eclip: 'eclip', pinion: 'pinion', oil: 'oil-grease', battery: 'battery', servo: 'servo', motor: 'motor', engine: 'engine-fuel', 'wheel-hex': 'wheel', connector: 'wire', wire: 'wire' };
export const specLabel: Record<string, string> = { screw: 'Screws', bearing: 'Bearings', oil: 'Silicone oils', pinion: 'Pinions', battery: 'Batteries', servo: 'Servos', motor: 'Motors', 'wheel-hex': 'Wheel hexes', pin: 'Pins', nut: 'Nuts', washer: 'Washers and shims', eclip: 'E-clips', connector: 'Connectors', wire: 'Wire gauges' };

/** One short paragraph per spec category: what the part is and which figures decide the fit. */
export const specIntro: Record<string, string> = {
  screw: 'Machine screws by thread, length, head and drive. M3x10 is a 3 mm thread 10 mm long, measured under the head on button and cap heads and over the whole screw on countersunk ones. The head decides the seat (a countersunk head needs a chamfered hole) and the drive the tool: hex socket, Torx or Phillips.',
  bearing: 'Ball bearings by bore, outer diameter and width in mm, with the trade designation where one exists (10x15x4 is a 6700). Shielded, rubber-sealed and flanged bearings of one size swap freely in most places; a flanged one needs room for its lip.',
  oil: 'Silicone oils by viscosity in cSt (centistokes), for shocks and differentials. Thin oils of a few hundred cSt go in shocks, thick ones from 1,000 to 1,000,000 cSt in differentials. Makers who rate oils in weight use scales that differ by brand, so only oils stated in cSt are listed.',
  battery: 'Battery packs by chemistry, cell count and capacity. 2S LiPo is two lithium-polymer cells in series at 7.4 V nominal; NiMH packs count cells of 1.2 V. Capacity in mAh sets the run time. The plug and the pack\'s outer size decide whether it fits the car and are on the branded parts.',
  servo: 'Servos by case size class and output spline. The size class (micro, mini, low profile, standard, jumbo) fixes the case and its mounting holes; the spline count (23T, 24T, 25T) decides which horns and arms fit. Torque and speed are on the branded parts.',
  motor: 'Electric motors by type, can size and shaft. 540 and 550 are the classic cans of about 36 mm with a 3.175 mm shaft; 380 cans are smaller. A brushless motor\'s number gives its size (3650: 36 mm can, 50 mm long). Speed is given as kV or turns, explained below; the mounting holes are drawn where the maker states them.',
  'wheel-hex': 'Wheel hexes are the drive hexagons between axle and wheel. 12 mm is the 1/10 standard, 14 mm is used on heavier 1/10 trucks, 17 mm on 1/8 cars and 23 or 24 mm on 1/5 scale. A wheel fits only a car with the same hex; the wheel nut\'s thread is a separate spec.',
  pin: 'Parallel pins by diameter and length in mm: the plain steel pins that lock drive-shaft cups, wheel hexes and gears to their shafts. A grooved pin or a pin with an E-clip is a different part.',
  nut: 'Nuts by thread and type. Hex, nylon-insert lock and flanged nuts share a thread; the type decides whether they hold under vibration and how much room they need. Wheel nuts list the hex size a wrench takes.',
  washer: 'Washers, shims and spacers share one spec: bore, outer diameter and thickness in mm. The generic name follows the thickness, whatever the maker calls its own part; countersunk and conical ones carry a prefix.',
  eclip: 'E-clips (E-rings, DIN 6799 type) by the shaft they fit, in mm: a 3 mm E-clip goes on a 3 mm shaft, as the RC makers name them. Clips that state a thickness, and bowed (wave) E-rings, are listed apart from the plain clip of the same shaft.',
  connector: 'Power and signal connectors by family and size: the XT, EC and Deans plugs of the electric cars, Tamiya and JST balance and servo plugs, and the bullet and banana plugs of chargers and motors. A spec is one family and size; the pins, contact diameter and anti-spark design belong to the family, and a current is listed only where the maker states it, with its wire.',
  wire: 'Bare solid round copper conductors by AWG gauge, from 8 to 30. The smaller the number, the thicker the wire: a 12 AWG conductor is 2.05 mm across and 3.31 mm² in section, from the AWG formula of ASTM B258. Insulation, strands and length are the branded part\'s own, and a wire part links to the gauge it names.',
  pinion: 'Pinion gears by tooth count and pitch. The pitch (48, 32 or 64 DP, or module 1 and 0.8 in metric) must match the spur gear; the tooth count sets the gearing. The bore, 3.175 or 5 mm, follows the motor shaft and is on the branded parts.',
};

const num = (v: unknown) => (typeof v === 'number' ? v : Number(String(v ?? '').replace(/^M/, '')) || 0);

/** Sort within a category by its natural size order. */
export function specSort(a: Spec, b: Spec) {
  if (a.category === 'screw') return num(a.thread) - num(b.thread) || num(a.length_mm) - num(b.length_mm) || String(a.head).localeCompare(String(b.head)) || String(a.drive).localeCompare(String(b.drive));
  if (a.category === 'bearing') return String(a.type).localeCompare(String(b.type)) || num(a.bore_mm) - num(b.bore_mm) || num(a.outer_mm) - num(b.outer_mm) || num(a.width_mm) - num(b.width_mm);
  if (a.category === 'oil') return num(a.viscosity_cst) - num(b.viscosity_cst);
  if (a.category === 'battery') return String(a.chemistry).localeCompare(String(b.chemistry)) || num(a.cells) - num(b.cells) || num(a.capacity_mah) - num(b.capacity_mah);
  if (a.category === 'servo') { const o = ['micro', 'mini', 'midi', 'low-profile', 'standard', 'jumbo', 'wing']; return o.indexOf(String(a.size_class)) - o.indexOf(String(b.size_class)) || num(a.spline_teeth) - num(b.spline_teeth); }
  if (a.category === 'wheel-hex') return num(a.hex_mm) - num(b.hex_mm);
  if (a.category === 'motor') return String(a.motor_type).localeCompare(String(b.motor_type)) || num(a.shaft_mm) - num(b.shaft_mm) || num(a.diameter_mm) - num(b.diameter_mm) || num(a.length_mm) - num(b.length_mm);
  if (a.category === 'nut') return num(String(a.thread).split('x')[0]) - num(String(b.thread).split('x')[0]) || String(a.thread).localeCompare(String(b.thread)) || String(a.type).localeCompare(String(b.type)) || String(a.profile ?? '').localeCompare(String(b.profile ?? ''));
  if (a.category === 'washer') return num(a.bore_mm) - num(b.bore_mm) || num(a.outer_mm) - num(b.outer_mm) || num(a.thickness_mm) - num(b.thickness_mm) || String(a.shape ?? '').localeCompare(String(b.shape ?? ''));
  if (a.category === 'eclip') return num(a.shaft_mm) - num(b.shaft_mm) || String(a.variant ?? '').localeCompare(String(b.variant ?? '')) || num(a.thickness_mm) - num(b.thickness_mm);
  if (a.category === 'connector') return String(a.family).localeCompare(String(b.family)) || num(a.contact_mm) - num(b.contact_mm) || num(a.current_a) - num(b.current_a) || a.id.localeCompare(b.id);
  if (a.category === 'wire') return num(a.awg) - num(b.awg);
  if (a.category === 'pin') return num(a.diameter_mm) - num(b.diameter_mm) || num(a.length_mm) - num(b.length_mm);
  if (a.category === 'pinion') return num(a.module) - num(b.module) || num(b.pitch_dp) - num(a.pitch_dp) || num(a.teeth) - num(b.teeth);
  return a.id.localeCompare(b.id);
}

export const specsByCategory = (() => {
  const m = new Map<string, Spec[]>();
  for (const s of db.specs) {
    if (!m.has(s.category)) m.set(s.category, []);
    m.get(s.category)!.push(s);
  }
  for (const v of m.values()) v.sort(specSort);
  return m;
})();

/** Branded parts linked to a spec, and how many distinct brands. */
export function linkedCount(id: string) {
  const ps = db.partsBySpec.get(id) ?? [];
  return { parts: ps.length, brands: new Set(ps.map((p) => p.part.brand)).size };
}

/** What kV and turns mean, shown on the motor spec and category pages. */
export const MOTOR_SPEED_NOTE = [
  'kV is how fast a brushless motor turns per volt: revolutions per minute for every volt, without load. A 4000 kV motor on a 2S LiPo (7.4 V) spins about 29,600 rpm unloaded. A higher kV is faster but draws more current and runs hotter; heavier cars and more cells call for a lower kV.',
  'Turns (T) count the windings of wire on each pole: fewer turns make a faster motor, so a 10.5T is faster than a 17.5T. Racing classes are set by turns (17.5T and 13.5T stock classes, for example), and brushed motors are rated by turns too, such as a 27T silver can or a 55T crawler motor. For a brushless motor kV and turns describe the same thing from two sides: the rules count turns, you gear for kV.',
];

/** What the battery figures mean, shown on the battery category page and the battery spec list. */
export const BATTERY_NOTE: [string, string][] = [
  ['Cells and voltage', 'A pack is cells in series, written as S: a 2S pack has two cells. The voltage depends on the chemistry. LiPo: 3.7 V per cell nominal, 4.2 V full, so 2S is 7.4 V and 3S 11.1 V. LiHV (high-voltage LiPo): 3.8 V nominal, 4.35 V full. LiFe (LiFePO4): 3.3 V nominal, 3.6 V full, so 2S is 6.6 V. Li-ion: 3.6 to 3.7 V nominal. NiMH: 1.2 V per cell, so a 6-cell pack is 7.2 V and a 7-cell pack 8.4 V. Check how many cells your ESC and motor take before choosing a pack.'],
  ['Capacity', 'Capacity in mAh is how much charge the pack holds: a 5000 mAh pack gives 5 A for an hour. More capacity means longer run time, but a bigger and heavier pack; check it fits the battery tray.'],
  ['C-rating', 'The C-rating is how fast a pack can deliver its charge: maximum current = C x capacity in Ah. A 5000 mAh 50C pack may give 50 x 5 = 250 A. Makers rate optimistically, so treat it as a comparison between packs of one brand rather than a hard limit. A pack with too low a rating for the motor sags in voltage, runs hot and ages fast.'],
  ['Why LiFe in a transmitter or receiver', 'A 2S LiFe pack gives 6.6 V, close to the old 4- or 5-cell NiMH packs, so most transmitters and receivers take it without a regulator. LiFe is a calmer chemistry than LiPo, keeps its charge for months, can be stored full and lasts many more cycles, which suits a radio that is used now and then.'],
  ['Plugs and cases', 'The plug must match the ESC (XT60, XT90, Deans or T-plug, EC5, Traxxas iD, IC5) or be changed. Racing classes often require a hard case, and shorty or saddle packs exist for cars with a small or split tray.'],
  ['Charging and running', 'Charge lithium packs with a balance charger, at 1C (the capacity in amps: 5 A for a 5000 mAh pack) unless the maker allows more, and never leave a charging pack alone. Do not run a lithium pack below about 3.0 V per cell under load: set the ESC\'s low-voltage cutoff. A swollen, punctured or hot pack is not charged again.'],
  ['Storing', 'LiPo and LiHV packs that will not be used for more than a few days are kept at storage voltage, about 3.8 V per cell: most chargers have a storage mode that charges or discharges to it. Never store them full or empty. Keep them unplugged from the car (an ESC slowly drains a pack), in a cool, dry place at room temperature, out of a hot car or sunlight, inside a fire-resistant LiPo bag or a metal box away from anything that burns, and check them now and then for swelling. LiFe packs can be stored full. NiMH packs lose charge by themselves, so store them part-charged and top them up before use.'],
];
