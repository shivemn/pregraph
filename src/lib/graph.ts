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
  /** concept, tool or project. The engine ignores it; the planner shows it. */
  kind?: string;
}

export interface PlanStep {
  id: string;
  title: string;
  area: string;
  hours: number;
  /** Hard prerequisites of this step that are still in the plan (not yet known). */
  waitingOn: string[];
  /** Later steps that list this one as a hard prerequisite. */
  unlocks: string[];
  /** Which of the requested goals pulled this step into the plan. */
  neededFor: string[];
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
 * (Kahn's algorithm). Soft edges inside the set count for ordering too; if
 * they happen to form a cycle they're dropped and hard edges alone decide.
 *
 * When several concepts are ready at once, two things pull against each other.
 * Starting the long chains early (largest critical path first, the classic
 * list-scheduling rule) keeps them from holding up the end. Staying in one
 * area keeps the plan readable. So: stay in the current area if something
 * there is at least STAY_RATIO as urgent as the most urgent ready concept;
 * otherwise jump to the most urgent one. Remaining ties go by id.
 */
export function orderConcepts(index: Index, needed: ReadonlySet<string>): string[] {
  const rank = criticalPath(index, needed);
  const withSoft = kahn(index, needed, rank, true);
  if (withSoft) return withSoft;
  const hardOnly = kahn(index, needed, rank, false);
  if (hardOnly) return hardOnly;
  const cycle = findCycle(needed, (id) => index.get(id)!.requires.filter((p) => needed.has(p)));
  throw new Error(`Prerequisite cycle: ${cycle?.join(' → ') ?? 'unknown'}`);
}

/**
 * For each needed concept: its own hours plus the longest chain of hours that
 * waits on it inside the needed set. Soft edges count here too, otherwise a
 * short soft prerequisite (say, Git before C) would look unimportant and hold
 * up the long chain behind it. Memoised DFS, O(V + E).
 */
export function criticalPath(index: Index, needed: ReadonlySet<string>): Map<string, number> {
  const dependents = new Map<string, string[]>();
  for (const id of needed) dependents.set(id, []);
  for (const id of needed) {
    const node = index.get(id)!;
    for (const p of new Set([...node.requires, ...node.recommends])) {
      if (needed.has(p) && p !== id) dependents.get(p)!.push(id);
    }
  }
  const rank = new Map<string, number>();
  const visiting = new Set<string>();
  const visit = (id: string): number => {
    const known = rank.get(id);
    if (known !== undefined) return known;
    if (visiting.has(id)) return 0; // a soft-edge cycle; ignore the back edge
    visiting.add(id);
    let longest = 0;
    for (const d of dependents.get(id)!) longest = Math.max(longest, visit(d));
    visiting.delete(id);
    const r = index.get(id)!.hours + longest;
    rank.set(id, r);
    return r;
  };
  for (const id of needed) visit(id);
  return rank;
}

function kahn(
  index: Index,
  needed: ReadonlySet<string>,
  rank: ReadonlyMap<string, number>,
  useSoft: boolean,
): string[] | null {
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

  // A linear scan of `ready` is plenty for a few hundred concepts.
  while (ready.length > 0) {
    const id: string = ready.splice(pickNext(ready, index, rank, lastArea), 1)[0]!;
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

/** How urgent a same-area concept must be, relative to the most urgent, to keep the current area. */
export const STAY_RATIO = 0.5;

function pickNext(
  ready: readonly string[],
  index: Index,
  rank: ReadonlyMap<string, number>,
  lastArea: string | null,
): number {
  const better = (a: number, b: number) => {
    const ra = rank.get(ready[a]!)!;
    const rb = rank.get(ready[b]!)!;
    return ra !== rb ? ra > rb : ready[a]! < ready[b]!;
  };
  let best = 0;
  let bestSameArea = -1;
  for (let i = 0; i < ready.length; i++) {
    if (better(i, best)) best = i;
    if (index.get(ready[i]!)!.area === lastArea && (bestSameArea < 0 || better(i, bestSameArea))) {
      bestSameArea = i;
    }
  }
  if (bestSameArea >= 0 && rank.get(ready[bestSameArea]!)! >= STAY_RATIO * rank.get(ready[best]!)!) {
    return bestSameArea;
  }
  return best;
}

/** Steps 1–3 together: the personal plan for these goals, given what you know. */
export function planPath(
  concepts: readonly ConceptNode[] | Index,
  goals: readonly string[],
  known: ReadonlySet<string>,
): Plan {
  const index = concepts instanceof Map ? concepts : indexConcepts(concepts);
  const needed = neededConcepts(index, goals, known);
  const order = orderConcepts(index, needed);

  // "Why is this here?": run the pruned walk once per goal. G small walks of
  // O(V + E) each is still nothing at this size.
  const neededFor = new Map<string, string[]>(order.map((id) => [id, []]));
  for (const g of goals) {
    for (const id of neededConcepts(index, [g], known)) neededFor.get(id)?.push(g);
  }

  const steps = order.map((id): PlanStep => {
    const c = index.get(id)!;
    return {
      id,
      title: c.title,
      area: c.area,
      hours: c.hours,
      waitingOn: c.requires.filter((p) => needed.has(p)),
      unlocks: order.filter((other) => index.get(other)!.requires.includes(id)),
      neededFor: neededFor.get(id)!,
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
