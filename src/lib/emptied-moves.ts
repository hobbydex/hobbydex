// Pages that held no part any more after a reclassification or a rename in hobbydex-rc, so no page is built at their
// address. Each address answers 301 to the page that replaces it: the category page (the brand page where the parts
// were uncategorised, since there is no category page for those). The key is "category/brand" for a category x brand
// page and "brand/platform/category" for a platform x category page. A key whose page is built again is ignored.
// Read by categories/[category]/[brand].astro, categories/uncategorised/[brand].astro and
// platforms/[brand]/[slug]/parts/[cat].astro; tests/emptied-moves.test.mjs checks each target is a built page.
export const categoryBrandMoves: Record<string, string> = {
  'pin-clip/lrp': '/rc/categories/pin/',
  'uncategorised/mjx': '/rc/brands/mjx/',
  'uncategorised/x-rider': '/rc/brands/x-rider/',
  'turnbuckle/blackzon': '/rc/categories/turnbuckle/',
  'wing/blackzon': '/rc/categories/wing/',
  'oil-grease/blackzon': '/rc/categories/oil-grease/',
  'body-accessory/muchmore-racing': '/rc/categories/body-accessory/',
  'body-accessory/incision': '/rc/categories/body-accessory/',
  'body-accessory/protek-rc': '/rc/categories/body-accessory/',
  'electronics/mip': '/rc/categories/electronics/',
  'electronics/vaterra': '/rc/categories/electronics/',
};
// a platform x category parts page emptied: the platform page (its option parts are listed there)
export const platformCategoryMoves: Record<string, string> = {
  'hobbytech/crx/spur-gear': '/rc/platforms/hobbytech/crx/',
  'hobbytech/crx/body-accessory': '/rc/platforms/hobbytech/crx/',
  'mugen/mtc3/misc': '/rc/platforms/mugen/mtc3/',
};
