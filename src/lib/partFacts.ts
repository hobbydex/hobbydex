import type { Part } from './data';
// a part's own spec clauses for its description, most identifying first; only what the part's record states
const SEAL: Record<string, string> = { open: 'open', metal: 'metal shields', rubber: 'rubber seals', 'rubber-metal': 'rubber and metal seals' };
export function partSpecs(p: Part, bearingSizes: string[] = [], bearingPcs = 0): string[] {
  const out: string[] = [];
  if (p.material) out.push(`${p.material === 'carbon' ? 'carbon fibre' : p.material}${p.material_grade ? ` ${p.material_grade}` : ''}`);
  if (bearingPcs) out.push(`${bearingPcs} bearings${bearingSizes.length ? ` (${bearingSizes.join(', ')})` : ''}`);
  if (p.seal && SEAL[p.seal]) out.push(SEAL[p.seal]);
  if (p.dimensions_mm) out.push(`${p.dimensions_mm.join(' x ')} mm`);
  if (p.teeth) out.push(`${p.teeth}T${p.pitch_dp ? ` ${p.pitch_dp} pitch` : p.module ? ` module ${p.module}` : ''}`);
  if (p.kv) out.push(`${p.kv} kV`);
  if (p.turns) out.push(`${p.turns}T`);
  if (p.current_a) out.push(`${p.current_a} A`);
  if (p.lipo_cells) out.push(p.lipo_cells[0] === p.lipo_cells[1] ? `${p.lipo_cells[0]}S LiPo` : `${p.lipo_cells[0]}-${p.lipo_cells[1]}S LiPo`);
  if (p.capacity_mah) out.push(`${p.capacity_mah} mAh`);
  if (p.torque_kgcm) out.push(`${p.torque_kgcm} kg/cm servo`);
  if (p.thread_type) out.push(`${p.thread_type} thread`);
  if (p.length_mm) out.push(`${p.length_mm} mm long`);
  if (p.pack_qty && p.pack_qty > 1 && !bearingPcs) out.push(`pack of ${p.pack_qty}`);
  return out;
}
