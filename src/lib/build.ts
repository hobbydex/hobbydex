// A release's `kind` as shown on the site, under the label "Build": kit (built by the buyer), RTR, ARR, roller (a built chassis without electronics),
// 3D print (the maker sells files the buyer prints).
export const BUILD_LABELS: Record<string, string> = { kit: 'Kit', rtr: 'RTR', arr: 'ARR', roller: 'Roller (rolling chassis)', print: '3D print' };
const LABELS = BUILD_LABELS;
// A release's `power` (the power system in the box) in the words of the lists and filters; "none" (a roller) has no word.
export const POWER_LABELS: Record<string, string> = { brushed: 'brushed', brushless: 'brushless', nitro: 'nitro', gas: 'gas' };
export function powerLabel(power?: string): string {
  return power ? POWER_LABELS[power] ?? '' : '';
}
// "RTR · brushless": the build, then the power system where the data states one.
export function buildLabel(kind?: string, power?: string): string {
  const build = kind ? LABELS[kind] ?? kind : '';
  return [build, powerLabel(power)].filter(Boolean).join(' · ');
}
