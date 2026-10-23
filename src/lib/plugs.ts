// The connector spec a part's `connector` field names (the plug a battery or ESC takes), or undefined when the
// site has no spec for that name. The names are the ones the data uses on batteries and ESCs.
import { db } from './data';

const SPEC_SLUG: Record<string, string> = {
  XT30: 'xt30', XT60: 'xt60', XT60H: 'xt60h', XT90: 'xt90', 'XT90-S': 'xt90s', XT150: 'xt150', AS150: 'as150', QS8: 'qs8',
  EC2: 'ec2', EC3: 'ec3', EC5: 'ec5', EC8: 'ec8', IC3: 'ic3', IC5: 'ic5',
  Deans: 'deans', 'T-Plug': 'deans', Tamiya: 'tamiya', 'Mini Tamiya': 'tamiya-mini',
};

export function plugSpec(connector: string | undefined): string | undefined {
  const slug = connector ? SPEC_SLUG[connector.trim()] : undefined;
  const id = slug ? `spec/connector/${slug}` : undefined;
  return id && db.spec.get(id) ? id : undefined;
}
