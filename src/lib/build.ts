// A release's `kind` as shown on the site, under the label "Build": kit (built by the buyer), RTR, ARR.
const LABELS: Record<string, string> = { kit: 'Kit', rtr: 'RTR', arr: 'ARR' };
export function buildLabel(kind?: string): string {
  return kind ? LABELS[kind] ?? kind : '';
}
