/**
 * Certificates: grouping them for the Certifications page, and picking the
 * ones for a job. Job titles use their route's list.
 */
import type { Certification, Role } from './schema';

const GROUPS: Array<{ id: Certification['group']; title: string }> = [
  { id: 'cloud', title: 'Cloud and DevOps' },
  { id: 'systems', title: 'Linux and networks' },
  { id: 'security', title: 'Security' },
  { id: 'data-ai', title: 'Data and AI' },
  { id: 'software', title: 'Programming' },
  { id: 'enterprise', title: 'Enterprise software' },
  { id: 'platforms', title: 'Business platforms' },
  { id: 'hardware', title: 'Hardware and chips' },
  { id: 'finance', title: 'Finance and actuarial' },
  { id: 'product', title: 'Product and project work' },
];

const COST_ORDER: Record<Certification['cost'], number> = { free: 0, low: 1, mid: 2, high: 3 };

export function costLabel(cost: Certification['cost']): string {
  return { free: 'Free', low: 'Low cost', mid: 'Mid cost', high: 'Expensive' }[cost];
}

/** "Low cost: US$100", or just the price when it already says it's free. */
export function fareText(x: Pick<Certification, 'cost' | 'price'>): string {
  return x.cost === 'free' && /^free/i.test(x.price) ? x.price : `${costLabel(x.cost)}: ${x.price}`;
}

const byCost = (a: Certification, b: Certification) => COST_ORDER[a.cost] - COST_ORDER[b.cost] || a.title.localeCompare(b.title);

/** Non-empty groups in page order, cheapest first within each. */
export function certificationGroups(list: readonly Certification[]) {
  return GROUPS.map((g) => ({ ...g, items: list.filter((x) => x.group === g.id).sort(byCost) })).filter((g) => g.items.length > 0);
}

/** The certificates that help for a job, free ones first. */
export function certificationsFor(role: Pick<Role, 'id' | 'variantOf'>, list: readonly Certification[]): Certification[] {
  const route = role.variantOf ?? role.id;
  return list.filter((x) => x.routes.includes(route)).sort(byCost);
}
