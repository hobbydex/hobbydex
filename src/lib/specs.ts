import { db, type Spec } from './data';

export const specLabel: Record<string, string> = { screw: 'Screws', bearing: 'Bearings', oil: 'Silicone oils', pinion: 'Pinions', battery: 'Batteries', servo: 'Servos', motor: 'Motors', 'wheel-hex': 'Wheel hexes', pin: 'Pins', nut: 'Nuts', washer: 'Washers and shims' };

/** One short paragraph per spec category: what the part is and which figures decide the fit. */
export const specIntro: Record<string, string> = {
  screw: 'Machine screws by thread, length, head and drive. M3x10 is a 3 mm thread 10 mm long, measured under the head on button and cap heads and over the whole screw on countersunk ones. The head decides the seat (a countersunk head needs a chamfered hole) and the drive the tool: hex socket, Torx or Phillips.',
  bearing: 'Ball bearings by bore, outer diameter and width in mm, with the trade designation where one exists (10x15x4 is a 6700). Shielded, rubber-sealed and flanged bearings of one size swap freely in most places; a flanged one needs room for its lip.',
  oil: 'Silicone oils by viscosity in cSt (centistokes), for shocks and differentials. Thin oils of a few hundred cSt go in shocks, thick ones from 1,000 to 1,000,000 cSt in differentials. Makers who rate oils in weight use scales that differ by brand, so only oils stated in cSt are listed.',
  battery: 'Battery packs by chemistry, cell count and capacity. 2S LiPo is two lithium-polymer cells in series at 7.4 V nominal; NiMH packs count cells of 1.2 V. Capacity in mAh sets the run time. The plug and the pack\'s outer size decide whether it fits the car and are on the branded parts.',
  servo: 'Servos by case size class and output spline. The size class (micro, mini, low profile, standard, jumbo) fixes the case and its mounting holes; the spline count (23T, 24T, 25T) decides which horns and arms fit. Torque and speed are on the branded parts.',
  motor: 'Electric motors by type, can size and shaft. 540 and 550 are the classic cans of about 36 mm with a 3.175 mm shaft; 380 cans are smaller. A brushless motor\'s number gives its size (3650: 36 mm can, 50 mm long); turns on a brushed motor and kV on a brushless one give the speed.',
  'wheel-hex': 'Wheel hexes are the drive hexagons between axle and wheel. 12 mm is the 1/10 standard, 14 mm is used on heavier 1/10 trucks, 17 mm on 1/8 cars and 23 or 24 mm on 1/5 scale. A wheel fits only a car with the same hex; the wheel nut\'s thread is a separate spec.',
  pin: 'Parallel pins by diameter and length in mm: the plain steel pins that lock drive-shaft cups, wheel hexes and gears to their shafts. A grooved pin or a pin with an E-clip is a different part.',
  nut: 'Nuts by thread and type. Hex, nylon-insert lock and flanged nuts share a thread; the type decides whether they hold under vibration and how much room they need. Wheel nuts list the hex size a wrench takes.',
  washer: 'Washers, shims and spacers share one spec: bore, outer diameter and thickness in mm. The generic name follows the thickness, whatever the maker calls its own part; countersunk and conical ones carry a prefix.',
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
