// Vehicle pages whose model was folded into another name in hobbydex-rc (one real vehicle, one name): the old page
// slug, per make slug, and the slug of the page that replaces it. [model].astro serves a 301 for each. Add a line when
// a depicts.model is renamed or folded, after the data PR is merged; an entry whose slug is a live page is ignored.
export const vehicleMoves: Record<string, Record<string, string>> = {
  'chevrolet': {
    'c10-fleetside-pickup': 'c10',
    'c10-pickup': 'c10',
    'c10-pickup-truck': 'c10',
    'chevelless-454-ls6': 'chevelle-ss-454-ls6',
    'colorado-fmt24': 'colorado',
    'k10-fcx18': 'k10',
    'k10-fcx18s-v2': 'k10',
    'k10-pickup': 'k10',
    'k5-blazer-fcx10': 'k5-blazer',
    'k5-blazer-fcx24': 'k5-blazer',
    'k5-blazer-fcx24s': 'k5-blazer',
  },
  'dodge': {
    'challenger-non-deco': 'challenger',
    'challenger-srt-hellcatt': 'challenger-srt-hellcat',
    'stratus-190mm-race': 'stratus',
  },
  'ford': {
    'bronco-fcx18ii': 'bronco',
    'bronco-u4-fsc18': 'bronco-u4',
    'f-100-fcx18ii': 'f-100',
    'f-100-pick-up-truck': 'f-100',
    'f-150-pick-up': 'f-150',
    'f-150-truck': 'f-150',
    'f100': 'f-100',
    'fiestas2000': 'fiesta-s2000',
    'focus-wrc-rally': 'focus-wrc',
    'mustang-gt-coupe': 'mustang-gt',
    'puma-hybrid-rally1-spec': 'puma-hybrid-rally1',
    'raptor-xl-5': 'raptor',
  },
  'hummer': {
    'ev-fcx18': 'ev',
  },
  'jeep': {
    'wrangler-jlu-crc': 'wrangler-jlu',
  },
  'land-rover': {
    'defender-110-fcx10': 'defender-110',
    'defender-110-fcx24m': 'defender-110',
    'defender-90-fcx24m': 'defender-90',
    'discovery-1st-gen-fcx10': 'discovery-1st-gen',
    'discovery-1st-gen-fcx24m': 'discovery-1st-gen',
    'range-rover-fcx10': 'range-rover',
    'range-rover-fcx24m': 'range-rover',
  },
  'mazda': {
    '6-190mm-race': '6',
    'rx-7-fd3s-190mm': 'rx-7-fd3s',
  },
  'mercedes-benz': {
    '190e-2-5-16-evolution-ii': '190-e-2-5-16-evo-ii',
    'actros-3363': 'actros-3363-gigaspace',
    'actros-arocs-gigaspace': 'actros-ii-arocs-gigaspace',
    'actros-ii-gigaspace': 'actros-ii-arocs-gigaspace',
    'amg-gt3-non-deco': 'amg-gt3',
    'arocs-actros': 'arocs',
    'bonneted-truck': 'round-hood',
    'c-11': 'c11',
    'round-bonnet': 'round-hood',
    'round-hood-truck': 'round-hood',
    'round-nosed': 'round-nose',
    'unimog-3250mm': 'unimog-3-250',
    'unimog-fcx24': 'unimog',
  },
  'nissan': {
    'gt-r-r35-pro-mod-tough-color': 'gt-r-r35-pro-mod',
  },
  'porsche': {
    '911-gt3-rs-gt-silbermetallic': '911-gt3-rs',
    '962c-coupe-nondecoration': '962c-coupe',
  },
  'subaru': {
    'impreza-kx1clear': 'impreza-kx1',
    'impreza-wrc2008': 'impreza-wrc-08',
  },
  'toyota': {
    'fj45-pickup': 'fj45-pick-up',
    'land-cruiser-80-fcx10': 'land-cruiser-80',
    'lc80-fcx10pro-v2': 'land-cruiser-80',
    'lc80-fcx18': 'land-cruiser-80',
    'lc80-fcx18s-v2': 'land-cruiser-80',
  },
};
