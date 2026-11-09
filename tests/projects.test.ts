import { describe, expect, it } from 'vitest';
import { loadContent } from '../src/lib/content';
import { planPath } from '../src/lib/graph';
import { plannerNodes } from '../src/lib/site';
import { targetsUpTo } from '../src/lib/schema';

const c = loadContent();
const nodes = plannerNodes(c);
const kind = new Map(c.concepts.map((x) => [x.id, x.kind]));

describe('projects', () => {
  it('every project has a brief', () => {
    const missing = c.concepts.filter((x) => x.kind === 'project' && !x.brief).map((x) => x.id);
    expect(missing).toEqual([]);
  });

  it('every job route ends in a project, from scratch and from each background', () => {
    const wrong: string[] = [];
    const starts = [new Set<string>(), ...c.backgrounds.map((b) => new Set(b.knows))];
    for (const role of c.roles.filter((r) => r.kind === 'role')) {
      for (const known of starts) {
        const plan = planPath(nodes, targetsUpTo(role, 'hire'), known);
        const last = plan.steps.at(-1);
        if (last && kind.get(last.id) !== 'project') wrong.push(`${role.id}: ends with ${last.id}`);
      }
    }
    expect([...new Set(wrong)]).toEqual([]);
  });
});
