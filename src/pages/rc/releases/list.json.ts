import { releaseList } from '../../../lib/releaseList';

// The release table's rows (see lib/releaseList.ts); loaded by the release table on /rc/releases/ only.
export function GET() {
  return new Response(JSON.stringify(releaseList()), { headers: { 'Content-Type': 'application/json' } });
}
