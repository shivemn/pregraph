import { describe, expect, it } from 'vitest';
import { loadContent } from '../src/lib/content';
import { withPrerequisites } from '../src/lib/graph';
import { buildNetwork, crossings, lineStations } from '../src/lib/network';

const c = loadContent();
const jobs = c.roles.filter((r) => r.kind !== 'exam').map((r) => ({ id: r.id, title: r.title, family: r.family, hire: r.tiers.hire }));
const net = buildNetwork(c.concepts, c.families, jobs);
const index = new Map(c.concepts.map((x) => [x.id, x]));

describe('the network map', () => {
  it('ends every job role at exactly one terminus', () => {
    const termini = net.lines.flatMap((l) => l.roles.map((r) => r.id));
    expect(termini.sort()).toEqual(jobs.map((r) => r.id).sort());
  });

  it('marks a station as an interchange exactly when two or more lines call there', () => {
    for (const s of net.stations) expect(s.interchange).toBe(s.lines.length > 1);
    expect(net.stations.some((s) => s.interchange)).toBe(true);
  });

  it('never puts a stop above a stop it needs', () => {
    const row = new Map(net.stations.map((s) => [s.id, s.row]));
    for (const s of net.stations) {
      for (const before of withPrerequisites(index, index.get(s.id)!.requires)) {
        if (row.has(before)) expect(row.get(before)!).toBeLessThan(s.row);
      }
    }
  });

  it('gives each interchange a row of its own, and no two stops on a line the same row', () => {
    const rows = new Map<number, typeof net.stations>();
    for (const s of net.stations) rows.set(s.row, [...(rows.get(s.row) ?? []), s]);
    for (const at of rows.values()) {
      if (at.some((s) => s.interchange)) expect(at).toHaveLength(1);
      const lines = at.flatMap((s) => s.lines);
      expect(new Set(lines).size).toBe(lines.length);
    }
  });

  it('only calls at stops that a third of the line’s roles need', () => {
    for (const l of net.lines) {
      const roles = jobs.filter((r) => r.family === l.id);
      for (const s of l.stations) {
        expect(roles.filter((r) => r.hire.includes(s)).length).toBeGreaterThanOrEqual(Math.max(2, Math.ceil(roles.length / 3)));
      }
    }
  });
});

describe('layout helpers', () => {
  it('picks the stops most of a line shares', () => {
    const roles = [
      { id: 'a', title: 'A', family: 'f', hire: ['git', 'sql', 'x'] },
      { id: 'b', title: 'B', family: 'f', hire: ['git', 'sql'] },
      { id: 'c', title: 'C', family: 'f', hire: ['git', 'y'] },
    ];
    expect(lineStations(roles)).toEqual(['git', 'sql']);
  });

  it('counts lines an interchange passes without stopping', () => {
    expect(crossings(['a', 'b', 'c'], [['a', 'c']])).toBe(1);
    expect(crossings(['a', 'c', 'b'], [['a', 'c']])).toBe(0);
  });
});
