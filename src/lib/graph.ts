/**
 * The path engine. Pure functions, no I/O, so the same code runs at build time
 * (to pre-render pages) and in the browser (to re-plan as you tick boxes).
 *
 * Edge convention: concept B lists A in `requires` means A → B, "A before B".
 * See docs/SYSTEM_DESIGN.md §6 for the algorithm walkthrough.
 */

/** The minimum the engine needs to know about a concept. */
export interface ConceptNode {
  id: string;
  title: string;
  area: string;
  hours: number;
  requires: string[];
  recommends: string[];
}

export interface PlanStep {
  id: string;
  title: string;
  area: string;
  hours: number;
  /** Hard prerequisites of this step that are still in the plan (not yet known). */
  waitingOn: string[];
}

export interface Plan {
  steps: PlanStep[];
  totalHours: number;
  /** Steps you can start right now: every hard prerequisite is known. */
  frontier: string[];
}

export type Index = Map<string, ConceptNode>;

export function indexConcepts(concepts: readonly ConceptNode[]): Index {
  return new Map(concepts.map((c) => [c.id, c]));
}

/**
 * Finds one cycle among the given nodes, following only the edges returned by
 * `prereqs`. Returns it as a closed list, e.g. ["a", "b", "c", "a"], or null.
 *
 * Iterative DFS with three colours: white (unseen), grey (on the current path),
 * black (finished). Meeting a grey node means we've walked in a circle.
 */
export function findCycle(
  nodes: Iterable<string>,
  prereqs: (id: string) => readonly string[],
): string[] | null {
  const WHITE = 0, GREY = 1, BLACK = 2;
  const colour = new Map<string, number>();
  const parent = new Map<string, string>();

  for (const start of nodes) {
    if ((colour.get(start) ?? WHITE) !== WHITE) continue;
    // Stack of [node, index of next neighbour to visit].
    const stack: Array<[string, number]> = [[start, 0]];
    colour.set(start, GREY);

    while (stack.length > 0) {
      const top = stack[stack.length - 1]!;
      const [node, i] = top;
      const next = prereqs(node);
      if (i < next.length) {
        top[1] = i + 1;
        const n = next[i]!;
        const c = colour.get(n) ?? WHITE;
        if (c === GREY) {
          // Rebuild the cycle by walking parents from `node` back to `n`.
          const cycle = [n, node];
          let cur = node;
          while (cur !== n) {
            cur = parent.get(cur)!;
            cycle.push(cur);
          }
          // We walked "requires" edges and rebuilt the path backwards,
          // so the list already reads in "comes before" order.
          return cycle;
        }
        if (c === WHITE) {
          colour.set(n, GREY);
          parent.set(n, node);
          stack.push([n, 0]);
        }
      } else {
        colour.set(node, BLACK);
        stack.pop();
      }
    }
  }
  return null;
}

/**
 * Step 1: which concepts do I still need for these goals?
 * Walks backwards along hard prerequisites and stops at anything known,
 * because knowing a concept implies you're past its prerequisites.
 */
export function neededConcepts(
  index: Index,
  goals: readonly string[],
  known: ReadonlySet<string>,
): Set<string> {
  const needed = new Set<string>();
  const stack = goals.filter((g) => !known.has(g));
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (needed.has(id)) continue;
    const node = index.get(id);
    if (!node) throw new Error(`Unknown concept "${id}"`);
    needed.add(id);
    for (const p of node.requires) if (!known.has(p)) stack.push(p);
  }
  return needed;
}

/**
 * Step 2: order the needed concepts so each comes after its prerequisites
 * (Kahn's algorithm). Soft edges inside the set also count for ordering;
 * if they happen to create a cycle, they're dropped and hard edges alone decide.
 *
 * Tie-break when several concepts are ready: stay in the same area as the
 * previous step, then shorter first, then alphabetical.
 */
export function orderConcepts(index: Index, needed: ReadonlySet<string>): string[] {
  const withSoft = kahn(index, needed, true);
  if (withSoft) return withSoft;
  const hardOnly = kahn(index, needed, false);
  if (hardOnly) return hardOnly;
  const cycle = findCycle(needed, (id) => index.get(id)!.requires.filter((p) => needed.has(p)));
  throw new Error(`Prerequisite cycle: ${cycle?.join(' → ') ?? 'unknown'}`);
}

function kahn(index: Index, needed: ReadonlySet<string>, useSoft: boolean): string[] | null {
  const inDegree = new Map<string, number>();
  const unlocks = new Map<string, string[]>();
  for (const id of needed) {
    inDegree.set(id, 0);
    unlocks.set(id, []);
  }
  for (const id of needed) {
    const node = index.get(id)!;
    const before = useSoft ? [...node.requires, ...node.recommends] : node.requires;
    for (const p of new Set(before)) {
      if (!needed.has(p)) continue;
      unlocks.get(p)!.push(id);
      inDegree.set(id, inDegree.get(id)! + 1);
    }
  }

  const ready = [...needed].filter((id) => inDegree.get(id) === 0);
  const order: string[] = [];
  let lastArea: string | null = null;

  while (ready.length > 0) {
    let best = 0;
    for (let i = 1; i < ready.length; i++) {
      if (better(index.get(ready[i]!)!, index.get(ready[best]!)!, lastArea)) best = i;
    }
    const id = ready.splice(best, 1)[0]!;
    order.push(id);
    lastArea = index.get(id)!.area;
    for (const next of unlocks.get(id)!) {
      const d = inDegree.get(next)! - 1;
      inDegree.set(next, d);
      if (d === 0) ready.push(next);
    }
  }
  return order.length === needed.size ? order : null;
}

function better(a: ConceptNode, b: ConceptNode, lastArea: string | null): boolean {
  const sa = a.area === lastArea ? 0 : 1;
  const sb = b.area === lastArea ? 0 : 1;
  if (sa !== sb) return sa < sb;
  if (a.hours !== b.hours) return a.hours < b.hours;
  return a.id < b.id;
}

/** Steps 1–3 together: the personal plan for these goals given what you know. */
export function planPath(
  concepts: readonly ConceptNode[] | Index,
  goals: readonly string[],
  known: ReadonlySet<string>,
): Plan {
  const index = concepts instanceof Map ? concepts : indexConcepts(concepts);
  const needed = neededConcepts(index, goals, known);
  const order = orderConcepts(index, needed);

  const steps = order.map((id): PlanStep => {
    const c = index.get(id)!;
    return {
      id,
      title: c.title,
      area: c.area,
      hours: c.hours,
      waitingOn: c.requires.filter((p) => needed.has(p)),
    };
  });

  return {
    steps,
    totalHours: steps.reduce((sum, s) => sum + s.hours, 0),
    frontier: steps.filter((s) => s.waitingOn.length === 0).map((s) => s.id),
  };
}

/** Concepts that list `id` as a hard prerequisite: "what does this unlock?" */
export function unlockedBy(concepts: readonly ConceptNode[], id: string): ConceptNode[] {
  return concepts.filter((c) => c.requires.includes(id));
}
