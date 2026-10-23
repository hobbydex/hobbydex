// A release's `kind` as shown on the site, under the label "Build": kit (built by the buyer), RTR, ARR, roller (a built chassis without electronics).
const LABELS: Record<string, string> = { kit: 'Kit', rtr: 'RTR', arr: 'ARR', roller: 'Roller (rolling chassis)' };
export function buildLabel(kind?: string): string {
  return kind ? LABELS[kind] ?? kind : '';
}
