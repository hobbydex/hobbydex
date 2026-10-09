export const categoryLabel: Record<string, string> = {
  'ball-end': 'Ball ends and links', bearing: 'Bearings and bushings', body: 'Body and covers', 'bumper-guard': 'Bumpers and guards',
  chassis: 'Chassis and mounts', decal: 'Decals', differential: 'Differential', drivetrain: 'Drivetrain', electronics: 'Electronics',
  'engine-fuel': 'Engine and fuel', gear: 'Gears and transmission', motor: 'Motors', nut: 'Nuts', 'o-ring-seal': 'O-rings and seals',
  'oil-grease': 'Oils and greases', 'pin-clip': 'Pins and clips', pinion: 'Pinions', screw: 'Screws', shock: 'Shocks',
  'shock-spring': 'Shock springs', 'spur-gear': 'Spur gears', steering: 'Steering', suspension: 'Suspension', tire: 'Tires',
  tool: 'Tools', 'washer-shim': 'Washers, shims and spacers', wheel: 'Wheels', wing: 'Wings',
};
export const catName = (c?: string) => (c ? categoryLabel[c] ?? c : '');
