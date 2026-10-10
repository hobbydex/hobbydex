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
const ICON: Record<string, string> = { 'street-basher': 'car', 'speed-run': 'pan-car' };
export const kitTypeIcon = (c?: string) => ICON[c ?? 'car'] ?? c ?? 'car';
export const kitTypeOrder = Object.keys(kitTypeLabel);
