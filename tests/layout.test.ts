import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { countCrossings, curvePath, layeredLayout } from '../src/lib/layout';

describe('layeredLayout', () => {
  it('puts each node one row below its deepest prerequisite', () => {
    const l = layeredLayout(['a', 'b', 'c', 'd'], [['a', 'b'], ['b', 'c'], ['a', 'c'], ['c', 'd']]);
    expect(['a', 'b', 'c', 'd'].map((id) => l.nodes.get(id)!.layer)).toEqual([0, 1, 2, 3]);
  });

  it('bends long edges through one point per row they cross', () => {
    const l = layeredLayout(['a', 'b', 'c'], [['a', 'b'], ['b', 'c'], ['a', 'c']]);
    const long = l.edges.find((e) => e.from === 'a' && e.to === 'c')!;
    expect(long.points).toHaveLength(3);
  });

  it('untangles crossings it can avoid', () => {
    // In the starting order the second row comes out as [y, x, z], and a→z
    // crosses two other edges. Reordering fixes all of them.
    const l = layeredLayout(
      ['a', 'b', 'c', 'x', 'y', 'z'],
      [['a', 'z'], ['b', 'y'], ['c', 'x'], ['c', 'z']],
    );
    expect(l.initialCrossings).toBe(2);
    expect(l.crossings).toBe(0);
  });

  it('rejects a cycle', () => {
    expect(() => layeredLayout(['a', 'b'], [['a', 'b'], ['b', 'a']])).toThrow(/acyclic/);
  });

  const randomDag = fc.integer({ min: 1, max: 30 }).chain((n) =>
    fc
      .array(fc.tuple(fc.nat({ max: n - 1 }), fc.nat({ max: n - 1 })), { maxLength: n * 2 })
      .map((pairs) => ({
        nodes: Array.from({ length: n }, (_, i) => `n${i}`),
        // only lower → higher index, so it's always acyclic
        edges: pairs.filter(([a, b]) => a < b).map(([a, b]) => [`n${a}`, `n${b}`] as const),
      })),
  );

  it('always points edges downwards and never overlaps nodes in a row', () => {
    fc.assert(
      fc.property(randomDag, ({ nodes, edges }) => {
        const l = layeredLayout(nodes, edges);
        for (const [a, b] of edges) expect(l.nodes.get(a)!.y).toBeLessThan(l.nodes.get(b)!.y);
        for (const row of l.layers) {
          const xs = row.map((id) => l.nodes.get(id)!.x).sort((p, q) => p - q);
          for (let i = 1; i < xs.length; i++) expect(xs[i]! - xs[i - 1]!).toBeGreaterThanOrEqual(150 - 1e-6);
        }
      }),
    );
  });

  it('never ends up with more crossings than it started with', () => {
    fc.assert(
      fc.property(randomDag, ({ nodes, edges }) => {
        const l = layeredLayout(nodes, edges);
        expect(l.crossings).toBeLessThanOrEqual(l.initialCrossings);
      }),
    );
  });
});

describe('countCrossings', () => {
  it('counts each crossing pair once', () => {
    const down = new Map([['a', ['y']], ['b', ['x']]]);
    expect(countCrossings([['a', 'b'], ['x', 'y']], down)).toBe(1);
    expect(countCrossings([['a', 'b'], ['y', 'x']], down)).toBe(0);
  });
});

describe('curvePath', () => {
  it('draws one cubic segment per hop', () => {
    expect(curvePath([[0, 0], [10, 100], [20, 200]]).match(/C/g)).toHaveLength(2);
  });
});
