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
  return c.concepts.map(({ id, title, area, hours, requires, recommends, kind }) => ({
    id, title, area, hours, requires, recommends, kind,
  }));
}

export function title(c: Content, id: string): string {
  return c.concepts.find((x) => x.id === id)?.title ?? id;
}
