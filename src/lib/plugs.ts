// The connector spec a plug name means: a battery or ESC `connector` field, or one entry of a lead's `connectors`
// (hobbydex-rc tools/validate.py PLUG_SPEC). undefined when the name has no spec. "JR/Futaba" is one plug sold as
// fitting both servo plugs: it names both specs (space separated here).
const SPEC_SLUG: Record<string, string> = {
  XT30: 'xt30', XT60: 'xt60', XT60H: 'xt60h', XT90: 'xt90', 'XT90-S': 'xt90s', XT150: 'xt150', AS150: 'as150', QS8: 'qs8',
  EC2: 'ec2', EC3: 'ec3', EC5: 'ec5', EC8: 'ec8', IC3: 'ic3', IC5: 'ic5',
  Deans: 'deans', 'T-Plug': 'deans', Tamiya: 'tamiya', 'Mini Tamiya': 'tamiya-mini', 'JST-RCY': 'jst-rcy', 'JST-XH': 'jst-xh',
  JR: 'servo-jr', Futaba: 'servo-futaba', 'JR/Futaba': 'servo-jr servo-futaba',
  'Traxxas iD': 'traxxas-trx-id', 'Traxxas high-current': 'traxxas-high-current',
  '2mm bullet': 'bullet-2mm', '3.5mm bullet': 'bullet-3.5mm', '4mm bullet': 'bullet-4mm', '5mm bullet': 'bullet-5mm',
  '6mm bullet': 'bullet-6mm', '8mm bullet': 'bullet-8mm', '4mm banana': 'banana-4mm',
};

/** Every connector spec a plug name means: one, or two for "JR/Futaba"; empty when it has none. */
export function plugSpecIds(name: string | undefined): string[] {
  const slugs = name ? SPEC_SLUG[name.trim()] : undefined;
  return slugs ? slugs.split(' ').map((s) => `spec/connector/${s}`) : [];
}

/** A plug name split into the pieces to show, each with the spec it links to: "JR/Futaba" -> JR, Futaba. */
export function plugLinks(name: string): { text: string; spec?: string }[] {
  const ids = plugSpecIds(name);
  if (ids.length < 2) return [{ text: name, spec: ids[0] }];
  return name.split('/').map((text, i) => ({ text, spec: ids[i] }));
}

// The connector spec a battery's balance lead means: JST-XH, with pins = cells + 1 (jst-xh-3 for 2S to jst-xh-9 for 8S).
export function balanceSpecId(part: { balance_connector?: string; cells?: number }): string | undefined {
  const n = part.cells;
  if (part.balance_connector?.trim() !== 'JST-XH' || typeof n !== 'number' || !Number.isInteger(n) || n < 2 || n > 8) return undefined;
  return `spec/connector/jst-xh-${n + 1}`;
}
