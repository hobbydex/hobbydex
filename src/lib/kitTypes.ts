// Kit types (the kit `category`): labels, page order and their icon in /icons.svg.
export const kitTypeLabel: Record<string, string> = {
  buggy: 'Buggies', truggy: 'Truggies', 'stadium-truck': 'Stadium trucks', 'short-course': 'Short course', monster: 'Monster trucks',
  'desert-truck': 'Desert trucks', truck: 'Trucks', crawler: 'Crawlers', touring: 'Touring cars', formula: 'Formula',
  'pan-car': 'Pan cars', rally: 'Rally', 'street-basher': 'Street bashers', drift: 'Drift cars',
  'speed-run': 'Speed run', car: 'Other cars', boat: 'Boats',
};
export const kitTypeOne: Record<string, string> = {
  buggy: 'buggy', truggy: 'truggy', 'stadium-truck': 'stadium truck', 'short-course': 'short course truck', monster: 'monster truck',
  'desert-truck': 'desert truck', truck: 'truck', crawler: 'crawler', touring: 'touring car', formula: 'formula car',
  'pan-car': 'pan car', rally: 'rally car', 'street-basher': 'street basher', drift: 'drift car',
  'speed-run': 'speed run car', car: 'car', boat: 'boat',
};
// A short explanation shown on each type's page.
export const kitTypeAbout: Record<string, string> = {
  buggy: 'An off-road racer with a low, light chassis, long-travel suspension, a rear wing and its wheels outside the body. Raced as 1/10 2WD and 4WD, and as 1/8 4WD with a nitro engine or electric motor.',
  truggy: 'A truck-buggy hybrid: a 1/8 buggy chassis made longer and wider, on bigger truck tyres, with a truck-style body and wing. More stable over rough ground and big jumps than a buggy, a little slower through tight corners. Mostly 1/8 4WD, nitro or electric, with its own racing class.',
  'stadium-truck': 'A racer with buggy suspension under a pickup-style body, on wide truck tyres outside the body. A 1/10 racing class, 2WD and 4WD.',
  'short-course': 'Modelled on full-size short course race trucks: the body covers the wheels, with bumpers front and rear, so trucks can lean on each other in a race. Mostly 1/10, 2WD or 4WD.',
  monster: 'Big wheels, high ground clearance and long suspension travel, made for jumping and bashing rather than racing. From 1/18 to 1/5.',
  'desert-truck': 'Modelled on desert racers and trophy trucks: a wide stance and very long suspension travel under a body over a tube frame.',
  truck: 'Scale road trucks and tractor units (such as Tamiya\'s 1/14 trucks), often with trailers, lights and sound.',
  crawler: 'Built to climb rocks slowly and precisely: solid axles on links, lots of suspension articulation, low gearing, and usually a scale body.',
  touring: 'An on-road car with a 4WD chassis under the body of a production or race car, on rubber or foam tyres. Raced in 1/10 with 190 mm bodies.',
  formula: 'An open-wheel single-seater, modelled on Formula 1 and similar classes; usually 1/10 rear-wheel drive.',
  'pan-car': 'A simple on-road racer: a flat chassis plate with the motor on a rear pod driving the rear axle directly, no gearbox. Raced in 1/12 and 1/10 on foam tyres.',
  rally: 'A rally car body on a 4WD chassis with more ground clearance than a touring car, for tarmac and gravel.',
  'street-basher': 'A road car style body on a sturdy chassis made for fun driving and speed rather than racing.',
  drift: 'An on-road car set up to slide sideways: today mostly rear-wheel drive with a gyro, on hard plastic tyres.',
  'speed-run': 'Built for top speed in a straight line.',
  car: 'Cars that fit none of the other types.',
  boat: 'Radio controlled boats.',
};
const ICON: Record<string, string> = { 'street-basher': 'car', 'speed-run': 'pan-car' };
export const kitTypeIcon = (c?: string) => ICON[c ?? 'car'] ?? c ?? 'car';
export const kitTypeOrder = Object.keys(kitTypeLabel);
