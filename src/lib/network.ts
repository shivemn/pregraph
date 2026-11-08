/**
 * The network map on the home page: every job role as a terminus, grouped
 * into lines by family, with the stops each family has in common as stations.
 * A stop that two or more lines both call at is an interchange, which is
 * where you can change from one career to another.
 *
 * Pure layout, no drawing: this works out which stations go on which line,
 * the order of the lines left to right, and the row of each station. The
 * component draws it.
 */
import { indexConcepts, type ConceptNode } from './graph';

export interface NetRole {
  id: string;
  title: string;
  family: string;
  hire: string[];
}

export interface NetFamily {
  id: string;
  title: string;
  short?: string;
}

export interface NetLine {
  id: string;
  title: string;
  roles: Array<{ id: string; title: string }>;
  /** Station ids this line calls at, top to bottom. */
  stations: string[];
}

export interface NetStation {
  id: string;
  title: string;
  /** Lines that call here, in column order. Two or more makes an interchange. */
  lines: string[];
  /** Roles whose hiring list names this stop. */
  roles: string[];
  row: number;
  interchange: boolean;
}

export interface Network {
  /** Left to right. */
  lines: NetLine[];
  stations: NetStation[];
  rows: number;
}

/** At most this many stations a line, so the map stays readable. */
export const MAX_STATIONS = 7;

/**
 * A line calls at a stop when at least a third of its roles (and at least
 * two) have it on their hiring list.
 */
export function lineStations(roles: readonly NetRole[]): string[] {
  const need = Math.max(2, Math.ceil(roles.length / 3));
  const count = new Map<string, number>();
  for (const r of roles) for (const id of new Set(r.hire)) count.set(id, (count.get(id) ?? 0) + 1);
  return [...count]
    .filter(([, n]) => n >= need)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, MAX_STATIONS)
    .map(([id]) => id);
}

/** Every ordering of 0..n-1, in lexicographic order. n is at most 6 here. */
function permutations(n: number): number[][] {
  if (n === 0) return [[]];
  const out: number[][] = [];
  for (const rest of permutations(n - 1)) {
    for (let i = 0; i <= rest.length; i++) out.push([...rest.slice(0, i), n - 1, ...rest.slice(i)]);
  }
  return out.sort((a, b) => {
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i]! - b[i]!;
    return 0;
  });
}

/**
 * How many lines an interchange has to cross that don't stop there. The map
 * puts the lines in the order that makes this smallest, keeping the families
 * file's order when there's a tie.
 */
export function crossings(order: readonly string[], interchanges: ReadonlyArray<readonly string[]>): number {
  const col = new Map(order.map((id, i) => [id, i]));
  let n = 0;
  for (const lines of interchanges) {
    const cols = lines.map((l) => col.get(l)!);
    n += Math.max(...cols) - Math.min(...cols) + 1 - cols.length;
  }
  return n;
}

export function buildNetwork(
  concepts: readonly ConceptNode[],
  families: readonly NetFamily[],
  roles: readonly NetRole[],
): Network {
  const index = indexConcepts(concepts);
  const fams = families.filter((f) => roles.some((r) => r.family === f.id));
  const stationsOf = new Map(fams.map((f) => [f.id, lineStations(roles.filter((r) => r.family === f.id))]));

  const linesAt = new Map<string, string[]>();
  for (const f of fams) for (const s of stationsOf.get(f.id)!) linesAt.set(s, [...(linesAt.get(s) ?? []), f.id]);
  const interchanges = [...linesAt.values()].filter((ls) => ls.length > 1);

  // Column order: fewest lines crossed by interchanges.
  let order = fams.map((f) => f.id);
  let best = crossings(order, interchanges);
  for (const p of permutations(fams.length)) {
    const o = p.map((i) => fams[i]!.id);
    const n = crossings(o, interchanges);
    if (n < best) [order, best] = [o, n];
  }
  const col = new Map(order.map((id, i) => [id, i]));

  // Depth: how many map stations come before this one along prerequisites,
  // so a line never calls at a stop before the stops it needs.
  const onMap = new Set(linesAt.keys());
  const above = new Map<string, Set<string>>();
  const ancestors = (id: string): Set<string> => {
    const seen = new Set<string>();
    const stack = [...(index.get(id)?.requires ?? [])];
    while (stack.length) {
      const p = stack.pop()!;
      if (seen.has(p)) continue;
      seen.add(p);
      stack.push(...(index.get(p)?.requires ?? []));
    }
    return seen;
  };
  for (const s of onMap) above.set(s, new Set([...ancestors(s)].filter((a) => onMap.has(a))));
  const depthMemo = new Map<string, number>();
  const depth = (s: string): number => {
    if (!depthMemo.has(s)) depthMemo.set(s, Math.max(0, ...[...above.get(s)!].map((a) => depth(a) + 1)));
    return depthMemo.get(s)!;
  };

  // Rows, top to bottom. An interchange gets a row to itself, since its link
  // runs across the map. Every other stop goes as high as it can: below the
  // line's previous stop and below the stops it needs.
  const row = new Map<string, number>();
  const exclusive = new Set<number>();
  const used = new Set<number>();
  const lastOnLine = new Map<string, number>();
  const byTitle = (a: string, b: string) => index.get(a)!.title.localeCompare(index.get(b)!.title);
  const isInter = (s: string) => linesAt.get(s)!.length > 1;
  const sequence = [...onMap].sort(
    (a, b) =>
      depth(a) - depth(b) ||
      Number(isInter(b)) - Number(isInter(a)) ||
      linesAt.get(b)!.length - linesAt.get(a)!.length ||
      byTitle(a, b),
  );
  for (const s of sequence) {
    const floor = Math.max(
      0,
      ...[...above.get(s)!].map((a) => row.get(a)! + 1),
      ...linesAt.get(s)!.map((l) => (lastOnLine.get(l) ?? -1) + 1),
    );
    let r = floor;
    if (isInter(s)) {
      r = Math.max(floor, used.size ? Math.max(...used) + 1 : 0);
      exclusive.add(r);
    } else {
      while (exclusive.has(r)) r++;
    }
    row.set(s, r);
    used.add(r);
    for (const l of linesAt.get(s)!) lastOnLine.set(l, r);
  }
  const next = used.size ? Math.max(...used) + 1 : 0;

  const stations: NetStation[] = [...onMap]
    .map((id) => ({
      id,
      title: index.get(id)!.title,
      lines: [...linesAt.get(id)!].sort((a, b) => col.get(a)! - col.get(b)!),
      roles: roles.filter((r) => r.hire.includes(id)).map((r) => r.id),
      row: row.get(id)!,
      interchange: linesAt.get(id)!.length > 1,
    }))
    .sort((a, b) => a.row - b.row || col.get(a.lines[0]!)! - col.get(b.lines[0]!)!);

  const lines: NetLine[] = order.map((fid) => {
    const f = fams.find((x) => x.id === fid)!;
    return {
      id: fid,
      title: f.short ?? f.title,
      roles: roles.filter((r) => r.family === fid).map((r) => ({ id: r.id, title: r.title })),
      stations: stations.filter((s) => s.lines.includes(fid)).map((s) => s.id),
    };
  });

  return { lines, stations, rows: next };
}
