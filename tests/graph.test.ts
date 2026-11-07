import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { findCycle, indexConcepts, neededConcepts, planPath, type ConceptNode } from '../src/lib/graph';
import { checkContent, loadContent } from '../src/lib/content';

const node = (id: string, requires: string[] = [], extra: Partial<ConceptNode> = {}): ConceptNode => ({
  id,
  title: id,
  area: 'a',
  hours: 1,
  requires,
  recommends: [],
  ...extra,
});

// a → b → d, a → c → d, e is unrelated
const diamond = [node('a'), node('b', ['a']), node('c', ['a']), node('d', ['b', 'c']), node('e')];

describe('neededConcepts', () => {
  it('pulls in all hard prerequisites of the goals', () => {
    const needed = neededConcepts(indexConcepts(diamond), ['d'], new Set());
    expect([...needed].sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('stops walking at known concepts', () => {
    // Knowing b means we never look behind it, but c still needs a.
    const needed = neededConcepts(indexConcepts(diamond), ['d'], new Set(['b']));
    expect([...needed].sort()).toEqual(['a', 'c', 'd']);
  });

  it('returns nothing when the goal itself is known', () => {
    expect(neededConcepts(indexConcepts(diamond), ['d'], new Set(['d'])).size).toBe(0);
  });

  it('throws on an unknown goal', () => {
    expect(() => neededConcepts(indexConcepts(diamond), ['zzz'], new Set())).toThrow(/Unknown concept/);
  });
});

describe('planPath', () => {
  it('orders prerequisites first and reports the frontier', () => {
    const plan = planPath(diamond, ['d'], new Set());
    expect(plan.steps.map((s) => s.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(plan.frontier).toEqual(['a']);
    expect(plan.totalHours).toBe(4);
  });

  it('uses soft edges for order but never pulls them in', () => {
    const concepts = [node('x'), node('y'), node('goal', ['x', 'y']), node('extra')];
    concepts[0]!.recommends = ['y']; // y before x, if both are needed
    concepts[1]!.recommends = ['extra']; // extra is NOT needed, so ignored
    const plan = planPath(concepts, ['goal'], new Set());
    expect(plan.steps.map((s) => s.id)).toEqual(['y', 'x', 'goal']);
  });

  it('drops soft edges that would create a cycle', () => {
    const concepts = [node('x', [], { recommends: ['y'] }), node('y', ['x']), node('goal', ['y'])];
    expect(planPath(concepts, ['goal'], new Set()).steps.map((s) => s.id)).toEqual(['x', 'y', 'goal']);
  });

  it('tie-breaks by same area, then fewer hours, then id', () => {
    const concepts = [
      node('m1', [], { area: 'maths', hours: 5 }),
      node('c-long', [], { area: 'cs', hours: 9 }),
      node('c-short', [], { area: 'cs', hours: 2 }),
      node('m2', [], { area: 'maths', hours: 3 }),
      node('goal', ['m1', 'c-long', 'c-short', 'm2'], { area: 'cs' }),
    ];
    const ids = planPath(concepts, ['goal'], new Set()).steps.map((s) => s.id);
    // c-short (2h) first, then stay in cs, then maths shortest-first.
    expect(ids).toEqual(['c-short', 'c-long', 'm2', 'm1', 'goal']);
  });
});

describe('findCycle', () => {
  it('returns null for a DAG', () => {
    const idx = indexConcepts(diamond);
    expect(findCycle(idx.keys(), (id) => idx.get(id)!.requires)).toBeNull();
  });

  it('returns the cycle in "comes before" order', () => {
    // p requires r, q requires p, r requires q:  r → p → q → r
    const idx = indexConcepts([node('p', ['r']), node('q', ['p']), node('r', ['q'])]);
    const cycle = findCycle(['p'], (id) => idx.get(id)!.requires)!;
    expect(cycle[0]).toBe(cycle[cycle.length - 1]);
    for (let i = 0; i + 1 < cycle.length; i++) {
      // each element must be a prerequisite of the next
      expect(idx.get(cycle[i + 1]!)!.requires).toContain(cycle[i]);
    }
  });
});

describe('properties on random DAGs', () => {
  // Random DAG: node i may only require nodes j < i, so there are never cycles.
  const randomDag = fc.integer({ min: 1, max: 40 }).chain((n) =>
    fc
      .tuple(
        fc.array(fc.array(fc.nat({ max: n - 1 }), { maxLength: 4 }), { minLength: n, maxLength: n }),
        fc.array(fc.array(fc.nat({ max: n - 1 }), { maxLength: 2 }), { minLength: n, maxLength: n }),
        fc.array(fc.constantFrom('p', 'q', 'r'), { minLength: n, maxLength: n }),
      )
      .map(([req, rec, areas]) =>
        Array.from({ length: n }, (_, i) =>
          node(`n${i}`, [...new Set(req[i]!.filter((j) => j < i).map((j) => `n${j}`))], {
            area: areas[i]!,
            hours: (i % 7) + 1,
            recommends: rec[i]!.filter((j) => j !== i).map((j) => `n${j}`),
          }),
        ),
      ),
  );

  const scenario = randomDag.chain((dag) =>
    fc.record({
      dag: fc.constant(dag),
      goals: fc.subarray(dag.map((c) => c.id), { minLength: 1 }),
      known: fc.subarray(dag.map((c) => c.id)),
    }),
  );

  it('every step comes after all of its hard prerequisites still in the plan', () => {
    fc.assert(
      fc.property(scenario, ({ dag, goals, known }) => {
        const plan = planPath(dag, goals, new Set(known));
        const position = new Map(plan.steps.map((s, i) => [s.id, i]));
        const idx = indexConcepts(dag);
        for (const s of plan.steps) {
          for (const p of idx.get(s.id)!.requires) {
            if (position.has(p)) expect(position.get(p)!).toBeLessThan(position.get(s.id)!);
          }
        }
      }),
    );
  });

  it('never includes known concepts, and includes every unknown goal', () => {
    fc.assert(
      fc.property(scenario, ({ dag, goals, known }) => {
        const knownSet = new Set(known);
        const ids = new Set(planPath(dag, goals, knownSet).steps.map((s) => s.id));
        for (const k of known) expect(ids.has(k)).toBe(false);
        for (const g of goals) if (!knownSet.has(g)) expect(ids.has(g)).toBe(true);
      }),
    );
  });

  it('frontier steps have no unmet hard prerequisites', () => {
    fc.assert(
      fc.property(scenario, ({ dag, goals, known }) => {
        const knownSet = new Set(known);
        const plan = planPath(dag, goals, knownSet);
        const idx = indexConcepts(dag);
        const inPlan = new Set(plan.steps.map((s) => s.id));
        for (const f of plan.frontier) {
          for (const p of idx.get(f)!.requires) expect(knownSet.has(p) || !inPlan.has(p)).toBe(true);
        }
      }),
    );
  });
});

describe('real content', () => {
  const content = loadContent();

  it('passes all checks', () => {
    expect(checkContent(content)).toEqual([]);
  });

  it('maths graduates skip proofs and discrete maths', () => {
    const path = content.paths.find((p) => p.slug === 'maths-to-cs')!;
    const bg = content.backgrounds.find((b) => b.id === path.background)!;
    const goal = content.goals.find((g) => g.id === path.goal)!;
    const ids = planPath(content.concepts, goal.targets, new Set(bg.knows)).steps.map((s) => s.id);
    expect(ids).not.toContain('proofs');
    expect(ids).not.toContain('discrete-math');
    expect(ids).toContain('operating-systems');
    expect(ids.indexOf('c-and-memory')).toBeLessThan(ids.indexOf('operating-systems'));
  });

  it('catches a cycle someone might add by mistake', () => {
    const broken = structuredClone(content);
    broken.concepts.find((c) => c.id === 'programming-basics')!.requires.push('algorithms');
    expect(checkContent(broken).join('\n')).toMatch(/cycle/);
  });
});
