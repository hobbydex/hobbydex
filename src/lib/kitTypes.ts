// Kit types (the kit `category`): labels, page order and their icon in /icons.svg.
export const kitTypeLabel: Record<string, string> = {
  buggy: 'Buggies', truggy: 'Truggies', 'stadium-truck': 'Stadium trucks', 'short-course': 'Short course', monster: 'Monster trucks',
  'desert-truck': 'Desert trucks', truck: 'Trucks', 'tractor-truck': 'Tractor trucks', 'race-truck': 'Race trucks', trailer: 'Trailers', crawler: 'Crawlers', touring: 'Touring cars', gt: 'GT', 'on-road': 'On-road', formula: 'Formula',
  'pan-car': 'Pan cars', rally: 'Rally', 'street-basher': 'Street bashers', drift: 'Drift cars', drag: 'Drag cars', lowrider: 'Lowriders', oval: 'Oval cars',
  'speed-run': 'Speed run', kart: 'Karts', motorcycle: 'Motorcycles', tank: 'Tanks', construction: 'Construction', car: 'Other cars', boat: 'Boats',
};
export const kitTypeOne: Record<string, string> = {
  buggy: 'buggy', truggy: 'truggy', 'stadium-truck': 'stadium truck', 'short-course': 'short course truck', monster: 'monster truck',
  'desert-truck': 'desert truck', truck: 'truck', 'tractor-truck': 'tractor truck', 'race-truck': 'race truck', trailer: 'trailer', crawler: 'crawler', touring: 'touring car', gt: 'GT car', 'on-road': 'on-road car', formula: 'formula car',
  'pan-car': 'pan car', rally: 'rally car', 'street-basher': 'street basher', drift: 'drift car', drag: 'drag car', lowrider: 'lowrider', oval: 'oval car',
  'speed-run': 'speed run car', kart: 'kart', motorcycle: 'motorcycle', tank: 'tank', construction: 'construction machine', car: 'car', boat: 'boat',
};
// A short explanation shown on each type's page.
export const kitTypeAbout: Record<string, string> = {
  buggy: "An off-road racer with a low, light chassis, long-travel suspension, a rear wing and its wheels outside the body. 2WD or 4WD, electric or nitro.",
  truggy: "A truck-buggy hybrid: a buggy-style chassis made longer and wider, on bigger truck tyres, with a truck-style body and wing. More stable over rough ground and big jumps than a buggy, a little slower through tight corners. Usually 4WD, electric or nitro.",
  'stadium-truck': "A racer with buggy suspension under a pickup-style body, on wide truck tyres outside the body. 2WD or 4WD.",
  'short-course': "Modelled on full-size short course race trucks: a truck body with wide fenders over long-travel suspension, and bumpers front and rear so trucks can lean on each other in a race. 2WD or 4WD.",
  monster: "Big wheels, high ground clearance and long suspension travel, made for jumping and bashing rather than racing.",
  'desert-truck': "Modelled on desert racers and trophy trucks: a wide stance and very long suspension travel under a body over a tube frame.",
  truck: "Scale rigid road trucks: tippers, dump trucks, hook lifts, cranes, military trucks and 4x4 pickups, often with lights and sound.",
  'tractor-truck': "Scale semi tractor units (Sattelzugmaschinen): a cab and chassis with a fifth wheel and no fixed body, often with a trailer, lights and sound. Some carry a loader crane or a tipper semi-trailer.",
  'race-truck': "Modelled on the cab-over semi trucks of truck racing: a tractor unit without a trailer, on an on-road car chassis.",
  trailer: "A trailer or dolly sold on its own, towed by a tractor truck, a machine or a crawler: semi-trailers, low loaders, tippers and timber dollies. Nothing drives its wheels; some have working hydraulics, lights or landing legs.",
  crawler: "Built for slow, technical off-road driving: climbing rocks, trails and steep or rough terrain. Solid axles on links, lots of suspension articulation, low gearing, and usually a scale body.",
  touring: "An on-road car under the body of a production or race car, on rubber or foam tyres. Most are 4WD, driven by belts or a shaft; front-wheel drive (FF) and rear-wheel drive chassis are common too.",
  gt: "A GT-body racing car on a buggy-style chassis: the 1/8 GT class, on nitro or electric power.",
  'on-road': "An on-road racer with independent suspension that is not a touring car: the 1/8 nitro or electric on-road class.",
  formula: "An open-wheel single-seater, modelled on Formula 1 and similar classes; usually rear-wheel drive.",
  'pan-car': "A simple on-road racer: a flat chassis plate with the motor on a rear pod driving the rear axle directly, no gearbox, usually on foam tyres.",
  rally: "A rally car body on a 4WD chassis with more ground clearance than a touring car, for tarmac, gravel and dirt.",
  'street-basher': "A road car style body on a sturdy chassis made for fun driving and speed rather than racing.",
  drift: "An on-road car set up to slide sideways: today mostly rear-wheel drive with a gyro, on hard plastic tyres.",
  drag: "Built for straight-line drag racing over a short strip: no prep drag cars and trucks with a car body, big soft rear tyres and a wheelie bar, and rail dragsters.",
  oval: "Built for oval-track racing, mostly an American scene: winged sprint cars with their big top wing, midgets, late models, modifieds and street stocks, on dirt or asphalt. Many turn only left, with offset suspension and staggered tyres.",
  lowrider: "A classic American car that sits low on small wire wheels, with servos or hydraulics that lift and drop each corner, so it can hop, dance and drive on three wheels.",
  'speed-run': "Built for top speed in a straight line.",
  kart: "A go-kart: a low tube frame with no suspension, small wheels and the driver's seat in the open, often with a figure in it.",
  motorcycle: "A two-wheeled bike, mostly motocross and dirt bikes, kept upright by a gyro or a spinning flywheel in the front wheel; often with a rider figure.",
  tank: "A tracked military tank: a hull on tracks driven left and right, with a turning turret and often sound, smoke and recoil.",
  construction: "Construction machines: excavators, wheel loaders, bulldozers, dumpers and cranes, often with working hydraulics.",
  car: "Cars that fit none of the other types.",
  boat: "Radio controlled boats.",
};
const ICON: Record<string, string> = { 'street-basher': 'car', 'speed-run': 'pan-car', gt: 'touring', 'on-road': 'touring', 'tractor-truck': 'truck' };
export const kitTypeIcon = (c?: string) => ICON[c ?? 'car'] ?? c ?? 'car';
export const kitTypeOrder = Object.keys(kitTypeLabel);
