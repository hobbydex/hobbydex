// schema.org Dataset markup for Google Dataset Search, on the /data/ page. Read from the same licence module as the pages.
import { dataLicense } from './license.ts';
import { operator } from './operator.ts';

export const datasetName = 'Hobbydex RC parts database';
// The dataset's downloads: the GitHub releases of hobbydex-rc (the first is v2026.11.0).
export const dataReleasesUrl = 'https://github.com/hobbydex/hobbydex-rc/releases';

export function datasetJsonLd(dateModified: string = new Date().toISOString().slice(0, 10)) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: datasetName,
    description: 'RC cars, kits, releases, parts, fitment and manuals, read from the makers\' own manuals, parts lists and product pages, with the source of each record.',
    url: 'https://hobbydex.com/data/',
    sameAs: 'https://github.com/hobbydex/hobbydex-rc',
    license: dataLicense.url,
    isAccessibleForFree: true,
    creator: { '@type': 'Organization', name: operator.name, url: 'https://hobbydex.com/about/' },
    keywords: ['RC cars', 'radio-controlled cars', 'RC parts', 'kits', 'releases', 'fitment', 'part numbers', 'manuals', 'parts lists'],
    dateModified,
    distribution: [
      // The release CI adds one DataDownload per release asset (the JSON export) here once it publishes them;
      // until then the entry points at the releases page.
      { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: dataReleasesUrl },
    ],
  };
}
