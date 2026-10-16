// Kit drive values (hobbydex-rc docs/schema.md "kit"): their label and filter order.
export const driveOrder = ['2wd', '4wd', 'fwd', '6wd', '8wd', 'tracks'];
const LABEL: Record<string, string> = { '2wd': '2WD', '4wd': '4WD', fwd: 'FWD', '6wd': '6WD', '8wd': '8WD', tracks: 'Tracks' };
export const driveLabel = (d?: string) => (d ? LABEL[d] ?? d : '');
