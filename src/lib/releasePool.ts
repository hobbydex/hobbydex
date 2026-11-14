// Every release of the dataset as one array, built once per build: colourway groups are cached per array.
import type { Release } from './data';
import { db } from './data';

let pool: Release[] | undefined;
export const releasePool = (): Release[] => (pool ??= [...db.release.values()]);
