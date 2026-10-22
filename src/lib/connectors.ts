// Connector references: a part's `connector` field ("XT60", "5mm bullet", "JR/Futaba") linked to the connector spec
// it names. The spec is found by its alias here or by its name; a value no spec matches stays plain text.
import { db } from './data';

const ALIAS: Record<string, string> = {
  XT30: 'xt30', XT60: 'xt60', XT90: 'xt90', XT150: 'xt150',
  EC2: 'ec2', EC3: 'ec3', EC5: 'ec5', EC8: 'ec8', IC3: 'ic3', IC5: 'ic5',
  DEANS: 'deans', 'T-PLUG': 'deans', TAMIYA: 'tamiya', 'MINI TAMIYA': 'tamiya-mini',
  'JST-XH': 'jst-xh', 'JST-RCY': 'jst-rcy', QS8: 'qs8',
  JR: 'servo-jr-futaba', FUTABA: 'servo-jr-futaba', 'JR/FUTABA': 'servo-jr-futaba',
  '2MM BULLET': 'bullet-2mm', '3.5MM BULLET': 'bullet-3.5mm', '4MM BULLET': 'bullet-4mm', '5MM BULLET': 'bullet-5mm',
  '6MM BULLET': 'bullet-6mm', '8MM BULLET': 'bullet-8mm', '4MM BANANA': 'banana-4mm',
};

// the connector spec id a single connector name points to, if any
export function connectorSpecId(name: string): string | undefined {
  const k = name.trim().toUpperCase();
  const slug = ALIAS[k];
  if (slug) return `spec/connector/${slug}`;
  const byName = db.specs.find((s) => s.category === 'connector' && String(s.name ?? '').toUpperCase() === k);
  return byName?.id;
}

// the connectors a part's `connector` value names, one entry per plug; `spec` is the connector spec when one exists
export function connectorRefs(value: string | undefined): { text: string; spec?: string }[] {
  if (!value) return [];
  return value.split(/\s*(?:\+|&| and )\s*/).map((text) => {
    const id = connectorSpecId(text);
    return { text, spec: id && db.spec.get(id) ? id : undefined };
  });
}
