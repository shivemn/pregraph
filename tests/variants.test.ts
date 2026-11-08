import { describe, expect, it } from 'vitest';
import { expandVariants, loadContent } from '../src/lib/content';
import type { Role } from '../src/lib/schema';

const route: Role = {
  id: 'backend',
  title: 'Backend',
  family: 'software',
  kind: 'role',
  summary: 's',
  tiers: { hire: ['java', 'sql', 'git'], firstYear: ['docker', 'django'], extra: ['java-extra'] },
};

describe('job titles', () => {
  it('drops from every tier and adds to the hiring list', () => {
    const problems: string[] = [];
    const [v] = expandVariants([route], [{ id: 'py', title: 'Python developer', extends: 'backend', summary: 's', adds: ['python', 'django'], drops: ['java'] }], problems);
    expect(problems).toEqual([]);
    expect(v!.tiers.hire).toEqual(['sql', 'git', 'python', 'django']);
    expect(v!.tiers.firstYear).toEqual(['docker']); // django moved up to hiring
    expect(v!.variantOf).toBe('backend');
    expect(v!.family).toBe('software');
  });

  it('reports a drop the route never had, and an unknown route', () => {
    const problems: string[] = [];
    expandVariants([route], [
      { id: 'a', title: 'A', extends: 'backend', summary: 's', adds: [], drops: ['rust'] },
      { id: 'b', title: 'B', extends: 'nope', summary: 's', adds: [], drops: [] },
    ], problems);
    expect(problems).toHaveLength(2);
  });

  it('gives every title in the content a route that exists', () => {
    const c = loadContent();
    const ids = new Set(c.roles.map((r) => r.id));
    const titles = c.roles.filter((r) => r.variantOf);
    expect(titles.length).toBeGreaterThan(100);
    for (const t of titles) expect(ids.has(t.variantOf!)).toBe(true);
  });
});
