// The breadcrumb trail of a page. A page passes it to the Base layout as `crumbs`; the layout renders the visible
// trail ("Hobbydex / RC cars / Kyosho / ...") and the schema.org BreadcrumbList in the head from this one list, so
// the two cannot drift. Pages without a trail pass none and get neither.

export interface Crumb {
  name: string;
  // site path of the crumb's page ('/rc/'); the current page (last crumb) and an unlinked middle crumb have none
  href?: string;
  // shown muted after the crumb, e.g. '(brand defunct)'; not part of the name
  note?: string;
}

// schema.org BreadcrumbList for the trail, with absolute `item` URLs on every element but the last (the current page).
// An unlinked middle crumb (e.g. 'Chassis not yet known') has no page to point at, so it is left out of the list:
// Google requires `item` on every element but the last.
export function breadcrumbJsonLd(crumbs: Crumb[], site: string | URL) {
  const last = crumbs.length - 1;
  const listed = crumbs.filter((c, i) => i === last || c.href);
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: listed.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name.trim(),
      ...(i < listed.length - 1 ? { item: new URL(c.href!, site).href } : {}),
    })),
  };
}

// JSON for a <script type="application/ld+json"> body: < > & and the JS line separators are written as \u escapes,
// so no name can close the script element or start a comment in it. JSON.parse reads the same value back.
export function jsonLdText(data: unknown): string {
  return JSON.stringify(data).replace(/[<>&\u2028\u2029]/g, (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`);
}
