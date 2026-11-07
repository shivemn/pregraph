/**
 * Layered drawing of a DAG for the route map (the Sugiyama method, cut down):
 *
 *   1. Layers: each node goes one row below its deepest prerequisite
 *      (longest path from a source), so every edge points down.
 *   2. Long edges: an edge that skips rows gets a chain of invisible "dummy"
 *      nodes, one per row it passes through, so it can bend around things.
 *   3. Order within rows: sweep down and up a few times, moving each node to
 *      the average position of its neighbours in the row above or below (the
 *      barycentre heuristic). Keep whichever ordering had the fewest crossings.
 *      Finding the true minimum is NP-hard, so this is the usual compromise.
 *   4. Coordinates: start with centred rows, then a few passes that pull each
 *      node towards the average x of its neighbours, pushing apart anything
 *      that would overlap. Edges come out much straighter than with plain
 *      centring. Dummies take up less room than real stops.
 *
 * Pure function, no DOM, so it's tested like the rest of the engine.
 */

export interface LayoutOptions {
  /** Vertical distance between rows. */
  rowGap?: number;
  /** Horizontal room a real node takes up (its label needs space). */
  nodeWidth?: number;
  /** Horizontal room a dummy takes up. */
  dummyWidth?: number;
  /** Barycentre sweeps (one down plus one up each). */
  sweeps?: number;
  padding?: number;
}

export interface PlacedNode {
  id: string;
  layer: number;
  x: number;
  y: number;
}

export interface RoutedEdge {
  from: string;
  to: string;
  /** Start, any bends, end. */
  points: Array<[number, number]>;
}

export interface Layout {
  nodes: Map<string, PlacedNode>;
  edges: RoutedEdge[];
  layers: string[][];
  width: number;
  height: number;
  crossings: number;
  /** Crossings before the barycentre sweeps, for comparison. */
  initialCrossings: number;
}

const DUMMY = '\u0000'; // can't appear in a content id

export const isDummy = (id: string) => id.startsWith(DUMMY);

/** Edges are [before, after]: the first must be learned before the second. */
export function layeredLayout(
  nodeIds: readonly string[],
  edgeList: ReadonlyArray<readonly [string, string]>,
  options: LayoutOptions = {},
): Layout {
  const { rowGap = 100, nodeWidth = 150, dummyWidth = 26, sweeps = 8, padding = 24 } = options;
  const nodeSet = new Set(nodeIds);
  const edges = edgeList.filter(([a, b]) => nodeSet.has(a) && nodeSet.has(b) && a !== b);

  // 1. Layers by longest path, in topological order.
  const succ = new Map<string, string[]>(nodeIds.map((id) => [id, []]));
  const inDegree = new Map<string, number>(nodeIds.map((id) => [id, 0]));
  for (const [a, b] of edges) {
    succ.get(a)!.push(b);
    inDegree.set(b, inDegree.get(b)! + 1);
  }
  const layer = new Map<string, number>(nodeIds.map((id) => [id, 0]));
  const queue = nodeIds.filter((id) => inDegree.get(id) === 0);
  const topo: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    topo.push(id);
    for (const n of succ.get(id)!) {
      layer.set(n, Math.max(layer.get(n)!, layer.get(id)! + 1));
      inDegree.set(n, inDegree.get(n)! - 1);
      if (inDegree.get(n) === 0) queue.push(n);
    }
  }
  if (topo.length !== nodeIds.length) throw new Error('layeredLayout needs an acyclic graph');

  // 2. Split long edges into one-row segments through dummy nodes.
  const segments: Array<[string, string]> = [];
  const chains: Array<{ from: string; to: string; via: string[] }> = [];
  for (const [a, b] of edges) {
    const via: string[] = [];
    let prev = a;
    for (let l = layer.get(a)! + 1; l < layer.get(b)!; l++) {
      const d = `${DUMMY}${a}>${b}#${l}`;
      layer.set(d, l);
      via.push(d);
      segments.push([prev, d]);
      prev = d;
    }
    segments.push([prev, b]);
    chains.push({ from: a, to: b, via });
  }

  const depth = Math.max(0, ...layer.values()) + 1;
  const layers: string[][] = Array.from({ length: depth }, () => []);
  for (const id of topo) layers[layer.get(id)!]!.push(id);
  for (const c of chains) for (const d of c.via) layers[layer.get(d)!]!.push(d);

  const up = new Map<string, string[]>();
  const down = new Map<string, string[]>();
  for (const row of layers) for (const id of row) { up.set(id, []); down.set(id, []); }
  for (const [a, b] of segments) {
    down.get(a)!.push(b);
    up.get(b)!.push(a);
  }

  // 3. Barycentre sweeps, keeping the best ordering seen.
  const initialCrossings = countCrossings(layers, down);
  let best = layers.map((r) => [...r]);
  let bestCrossings = initialCrossings;
  let current = layers.map((r) => [...r]);

  const reorder = (row: string[], ref: string[], neighbours: Map<string, string[]>) => {
    const pos = new Map(ref.map((id, i) => [id, i]));
    const key = new Map<string, number>();
    row.forEach((id, i) => {
      const ns = neighbours.get(id)!;
      key.set(id, ns.length === 0 ? i : ns.reduce((s, n) => s + pos.get(n)!, 0) / ns.length);
    });
    // Stable sort: ties keep their current order, so results are deterministic.
    return row
      .map((id, i) => ({ id, i }))
      .sort((p, q) => key.get(p.id)! - key.get(q.id)! || p.i - q.i)
      .map((p) => p.id);
  };

  for (let s = 0; s < sweeps && bestCrossings > 0; s++) {
    for (let l = 1; l < depth; l++) current[l] = reorder(current[l]!, current[l - 1]!, up);
    for (let l = depth - 2; l >= 0; l--) current[l] = reorder(current[l]!, current[l + 1]!, down);
    const c = countCrossings(current, down);
    if (c < bestCrossings) {
      bestCrossings = c;
      best = current.map((r) => [...r]);
    }
  }

  // 4. Coordinates.
  const widthOf = (id: string) => (isDummy(id) ? dummyWidth : nodeWidth);
  const gapBetween = (a: string, b: string) => (widthOf(a) + widthOf(b)) / 2;
  const x = new Map<string, number>();
  for (const row of best) {
    let left = -row.reduce((w, id) => w + widthOf(id), 0) / 2;
    for (const id of row) {
      x.set(id, left + widthOf(id) / 2);
      left += widthOf(id);
    }
  }
  const pull = (row: string[], neighbours: Map<string, string[]>) => {
    if (row.length === 0) return;
    const want = row.map((id) => {
      const ns = neighbours.get(id)!;
      return ns.length === 0 ? x.get(id)! : ns.reduce((s, n) => s + x.get(n)!, 0) / ns.length;
    });
    const got = [...want];
    for (let i = 1; i < row.length; i++) got[i] = Math.max(got[i]!, got[i - 1]! + gapBetween(row[i - 1]!, row[i]!));
    // Pushing apart only moves things right; shift the row back so it stays centred on what it wanted.
    const shift = (want.reduce((a, b) => a + b, 0) - got.reduce((a, b) => a + b, 0)) / row.length;
    row.forEach((id, i) => x.set(id, got[i]! + shift));
  };
  for (let pass = 0; pass < 4; pass++) {
    for (let l = 1; l < depth; l++) pull(best[l]!, up);
    for (let l = depth - 2; l >= 0; l--) pull(best[l]!, down);
  }
  let minX = Infinity;
  let maxX = -Infinity;
  for (const [id, v] of x) {
    minX = Math.min(minX, v - widthOf(id) / 2);
    maxX = Math.max(maxX, v + widthOf(id) / 2);
  }
  const placed = new Map<string, PlacedNode>();
  best.forEach((row, l) => {
    for (const id of row) placed.set(id, { id, layer: l, x: padding + x.get(id)! - minX, y: padding + l * rowGap });
  });
  const inner = maxX - minX;

  const routed: RoutedEdge[] = chains.map(({ from, to, via }) => ({
    from,
    to,
    points: [from, ...via, to].map((id) => {
      const p = placed.get(id)!;
      return [p.x, p.y] as [number, number];
    }),
  }));

  const nodes = new Map<string, PlacedNode>();
  for (const id of nodeIds) nodes.set(id, placed.get(id)!);

  return {
    nodes,
    edges: routed,
    layers: best.map((r) => r.filter((id) => !isDummy(id))),
    width: inner + padding * 2,
    height: padding * 2 + (depth - 1) * rowGap,
    crossings: bestCrossings,
    initialCrossings,
  };
}

/** Number of pairs of edges that cross between neighbouring rows. */
export function countCrossings(layers: string[][], down: ReadonlyMap<string, readonly string[]>): number {
  let total = 0;
  for (let l = 0; l + 1 < layers.length; l++) {
    const top = new Map(layers[l]!.map((id, i) => [id, i]));
    const bottom = new Map(layers[l + 1]!.map((id, i) => [id, i]));
    const pairs: Array<[number, number]> = [];
    for (const id of layers[l]!) {
      for (const n of down.get(id) ?? []) {
        if (bottom.has(n)) pairs.push([top.get(id)!, bottom.get(n)!]);
      }
    }
    for (let i = 0; i < pairs.length; i++) {
      for (let j = i + 1; j < pairs.length; j++) {
        const [a1, b1] = pairs[i]!;
        const [a2, b2] = pairs[j]!;
        if ((a1 - a2) * (b1 - b2) < 0) total++;
      }
    }
  }
  return total;
}

/** SVG path through the points, with vertical S-curves between rows. */
export function curvePath(points: ReadonlyArray<readonly [number, number]>): string {
  let d = `M${points[0]![0]},${points[0]![1]}`;
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1]!;
    const [x1, y1] = points[i]!;
    const my = (y0 + y1) / 2;
    d += ` C${x0},${my} ${x1},${my} ${x1},${y1}`;
  }
  return d;
}
