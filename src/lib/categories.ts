export const categoryLabel: Record<string, string> = {
  'ball-end': 'Ball ends', battery: 'Batteries', bearing: 'Bearings and bushings', body: 'Body and covers', 'body-accessory': 'Body accessories', 'bumper-guard': 'Bumpers and guards',
  chassis: 'Chassis and mounts', cooling: 'Cooling', decal: 'Decals', differential: 'Differential', drivetrain: 'Drivetrain', electronics: 'Electronics',
  'engine-fuel': 'Engine and fuel', gear: 'Gears and transmission', light: 'Lights', motor: 'Motors', nut: 'Nuts', 'o-ring-seal': 'O-rings and seals',
  'oil-grease': 'Oils and greases', pin: 'Pins', clip: 'Clips', pinion: 'Pinions', radio: 'Radios', 'scale-accessory': 'Scale accessories', screw: 'Screws', servo: 'Servos', charger: 'Chargers', shock: 'Shocks',
  'shock-spring': 'Shock springs', 'spur-gear': 'Spur gears', steering: 'Steering', suspension: 'Suspension', tire: 'Tires',
  tool: 'Tools', 'parts-tree': 'Parts trees', manual: 'Manuals', merchandise: 'Merchandise', 'hardware-set': 'Hardware sets and bags', 'rod-end': 'Rod ends and ball cups', turnbuckle: 'Turnbuckles', 'washer-shim': 'Washers, shims and spacers', wheel: 'Wheels', wing: 'Wings', wire: 'Wires and connectors',
};
import { db } from './data';
// labels from the category definitions in the data, with the built-in list as fallback
for (const c of db.categories) categoryLabel[c.id.split('/')[1]] = c.name;
export const catName = (c?: string) => (c ? categoryLabel[c] ?? c : '');
// Categories without an icon of their own draw the icon of the part they stand for: a hardware bag the screw, merchandise the printed decal.
const iconOf: Record<string, string> = { 'hardware-set': 'screw', merchandise: 'decal' };
export const categoryIcon = (c: string) => iconOf[c] ?? c;
// The icon that stands in for a part's picture: its category icon, or for a ball with a bore (no threaded shank)
// the through-hole ball or the ball nut; threaded studs and set-screw balls keep the ball stud.
export const partIcon = (p: { category?: string; ball_type?: string }) =>
  p.category === 'ball-end' && (p.ball_type === 'through-hole' || p.ball_type === 'nut') ? `ball-end-${p.ball_type}` : p.category && categoryIcon(p.category);

// The groups of the categories overview page (/rc/categories/), in page order; a category in no group is listed under Other.
export const categoryGroups: [string, string[]][] = [
  ['Electronics and power', ['esc', 'motor', 'servo', 'radio', 'battery', 'charger', 'light', 'electronics', 'wire', 'cooling']],
  ['Drivetrain', ['gear', 'spur-gear', 'pinion', 'differential', 'drivetrain', 'bearing']],
  ['Suspension and steering', ['suspension', 'shock', 'shock-spring', 'steering', 'ball-end', 'rod-end', 'turnbuckle']],
  ['Chassis and body', ['chassis', 'bumper-guard', 'body', 'body-accessory', 'wing', 'decal', 'scale-accessory']],
  ['Wheels and tires', ['wheel', 'tire']],
  ['Hardware', ['screw', 'nut', 'washer-shim', 'pin', 'clip', 'o-ring-seal', 'hardware-set']],
  ['Engine', ['engine-fuel']],
  ['Workshop', ['tool', 'glue', 'oil-grease', 'paint', 'hydraulic']],
  ['Other', ['manual', 'parts-tree', 'merchandise']],
];
