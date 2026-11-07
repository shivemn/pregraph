import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { criticalPath, findCycle, indexConcepts, neededConcepts, planPath, type ConceptNode } from '../src/lib/graph';
import { checkContent, loadContent } from '../src/lib/content';
import { picksFor, targetsUpTo, type Tier } from '../src/lib/schema';

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

  it('starts the longest chain first', () => {
    // short (1h) unlocks nothing else; long1 -> long2 -> goal is a 30h chain
    const concepts = [
      node('short', [], { hours: 1 }),
      node('long1', [], { hours: 10 }),
      node('long2', ['long1'], { hours: 10 }),
      node('goal', ['short', 'long2'], { hours: 10 }),
    ];
    expect(planPath(concepts, ['goal'], new Set()).steps.map((s) => s.id)).toEqual(['long1', 'long2', 'short', 'goal']);
  });

  it('stays in the same area unless another one is much more urgent', () => {
    const concepts = [
      node('a1', [], { area: 'a', hours: 10 }),
      node('a2', [], { area: 'a', hours: 6 }), // 60% as urgent as b1: stay in area a
      node('b1', [], { area: 'b', hours: 10 }),
      node('goal', ['a1', 'a2', 'b1'], { area: 'g', hours: 1 }),
    ];
    expect(planPath(concepts, ['goal'], new Set()).steps.map((s) => s.id)).toEqual(['a1', 'a2', 'b1', 'goal']);
    concepts[1]!.hours = 4; // now only 40% as urgent: jump to b1 first
    expect(planPath(concepts, ['goal'], new Set()).steps.map((s) => s.id)).toEqual(['a1', 'b1', 'a2', 'goal']);
  });

  it('explains why each step is there', () => {
    const concepts = [node('base'), node('x', ['base']), node('y', ['base']), node('only-y', [])];
    concepts[2]!.requires.push('only-y');
    const plan = planPath(concepts, ['x', 'y'], new Set());
    const step = (id: string) => plan.steps.find((s) => s.id === id)!;
    expect(step('base').neededFor.sort()).toEqual(['x', 'y']);
    expect(step('only-y').neededFor).toEqual(['y']);
    expect(step('base').unlocks.sort()).toEqual(['x', 'y']);
  });
});

describe('criticalPath', () => {
  it('adds up the longest chain of hours waiting on each concept', () => {
    const idx = indexConcepts(diamond.map((c) => ({ ...c, hours: 2 })));
    const rank = criticalPath(idx, new Set(['a', 'b', 'c', 'd']));
    expect(rank.get('d')).toBe(2);
    expect(rank.get('b')).toBe(4);
    expect(rank.get('a')).toBe(6);
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

  const plan = (role: string, background: string, tier: Tier = 'firstYear') => {
    const r = content.roles.find((x) => x.id === role)!;
    const b = content.backgrounds.find((x) => x.id === background)!;
    return planPath(content.concepts, targetsUpTo(r, tier), new Set(b.knows)).steps.map((s) => s.id);
  };

  it('maths graduates skip proofs and discrete maths', () => {
    const ids = plan('software-engineer', 'maths-grad');
    expect(ids).not.toContain('proofs');
    expect(ids).not.toContain('discrete-math');
    expect(ids).toContain('os-processes-memory');
    expect(ids.indexOf('c-and-memory')).toBeLessThan(ids.indexOf('os-processes-memory'));
  });

  it('a CS graduate gets a much shorter route than someone starting from zero', () => {
    for (const r of content.roles) {
      expect(plan(r.id, 'cs-grad', 'extra').length).toBeLessThanOrEqual(plan(r.id, 'no-background', 'extra').length);
    }
    expect(plan('backend-engineer', 'cs-grad').length).toBeLessThan(plan('backend-engineer', 'no-background').length - 8);
  });

  it('later tiers only ever add stops', () => {
    for (const r of content.roles) {
      const hire = new Set(plan(r.id, 'no-background', 'hire'));
      const year = plan(r.id, 'no-background', 'firstYear');
      for (const id of hire) expect(year).toContain(id);
    }
  });

  it('catches a cycle someone might add by mistake', () => {
    const broken = structuredClone(content);
    broken.concepts.find((c) => c.id === 'programming-basics')!.requires.push('graph-algorithms');
    expect(checkContent(broken).join('\n')).toMatch(/cycle/);
  });

  it('catches a role that lists the same thing in two tiers', () => {
    const broken = structuredClone(content);
    const r = broken.roles[0]!;
    r.tiers.extra.push(r.tiers.hire[0]!);
    expect(checkContent(broken).join('\n')).toMatch(/more than one tier/);
  });
});

describe('picks', () => {
  const content = loadContent();
  const resources = new Map(content.resources.map((r) => [r.id, r]));

  it('picks a free source of the right medium, preferring primary over alternative, never a deep dive', () => {
    const concept = {
      resources: [
        { resource: 'clrs', role: 'primary' },         // paid book: never the pick
        { resource: 'algs4', role: 'alternative' },     // free read
        { resource: 'mit-6006', role: 'deep-dive' },    // free watch, but a deep dive
        { resource: 'cses-problemset', role: 'primary' },
      ],
    };
    const p = picksFor(concept, resources);
    expect(p.read).toBe(1);
    expect(p.watch).toBeUndefined();
    expect(p.practice).toBe(3);
  });

  it('gives almost every stop something to read', () => {
    const withRead = content.concepts.filter((c) => picksFor(c, resources).read !== undefined).length;
    expect(withRead / content.concepts.length).toBeGreaterThan(0.95);
  });
});
