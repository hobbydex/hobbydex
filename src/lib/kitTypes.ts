// Kit types (the kit `category`): labels, page order and their icon in /icons.svg.
export const kitTypeLabel: Record<string, string> = {
  buggy: 'Buggies', truggy: 'Truggies', 'stadium-truck': 'Stadium trucks', 'short-course': 'Short course', monster: 'Monster trucks',
  'desert-truck': 'Desert trucks', truck: 'Trucks', crawler: 'Crawlers', touring: 'Touring cars', 'mini-touring': 'Mini touring', formula: 'Formula',
  'pan-car': 'Pan cars', rally: 'Rally', 'mini-buggy': 'Mini buggies', mini: 'Mini-Z and mini', 'street-basher': 'Street bashers', drift: 'Drift cars',
  'speed-run': 'Speed run', car: 'Other cars', boat: 'Boats',
};
export const kitTypeOne: Record<string, string> = {
  buggy: 'buggy', truggy: 'truggy', 'stadium-truck': 'stadium truck', 'short-course': 'short course truck', monster: 'monster truck',
  'desert-truck': 'desert truck', truck: 'truck', crawler: 'crawler', touring: 'touring car', 'mini-touring': 'mini touring car', formula: 'formula car',
  'pan-car': 'pan car', rally: 'rally car', 'mini-buggy': 'mini buggy', mini: 'mini car', 'street-basher': 'street basher', drift: 'drift car',
  'speed-run': 'speed run car', car: 'car', boat: 'boat',
};
const ICON: Record<string, string> = { 'mini-touring': 'touring', 'mini-buggy': 'buggy', 'street-basher': 'car', 'speed-run': 'pan-car' };
export const kitTypeIcon = (c?: string) => ICON[c ?? 'car'] ?? c ?? 'car';
export const kitTypeOrder = Object.keys(kitTypeLabel);
