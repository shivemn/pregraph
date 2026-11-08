// Small helpers shared by pages. Build time only.
import { loadContent } from './content';
import type { ConceptNode } from './graph';
import type { Content } from './schema';

let cached: Content | undefined;
export function content(): Content {
  return (cached ??= loadContent());
}

/** "A", "A and B", "A, B and C" */
export function listOf(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** Only the fields the planner needs in the browser. Keeps the page small. */
export function plannerNodes(c: Content): ConceptNode[] {
  return c.concepts.map(({ id, title, area, hours, requires, recommends, kind, skipLabel }) => ({
    id, title, area, hours, requires, recommends, kind, ...(skipLabel ? { skipLabel } : {}),
  }));
}

export function title(c: Content, id: string): string {
  return c.concepts.find((x) => x.id === id)?.title ?? id;
}

/**
 * "Already working as" choices for the planner: switching from one job to
 * another. The planner leaves out each job's hiring and first-year lists and
 * everything under them.
 */
export function jobStarts(c: Content): Array<{ id: string; title: string; knows: string[] }> {
  return c.roles
    .filter((r) => r.kind !== 'exam')
    .map((r) => ({ id: `role:${r.id}`, title: r.title, knows: [...r.tiers.hire, ...r.tiers.firstYear] }));
}
