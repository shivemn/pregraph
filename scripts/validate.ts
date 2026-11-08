/** `npm run validate` — fails (exit 1) if content/ has any problem. Runs in CI and before every build. */
import { loadContent, ContentError } from '../src/lib/content';
import { MEDIA, picksFor } from '../src/lib/schema';

try {
  const c = loadContent();
  const sections = c.concepts.reduce((n, x) => n + x.resources.length, 0);
  const unverified = c.concepts.reduce((n, x) => n + x.resources.filter((s) => !s.verified).length, 0);
  const kinds = (k: string) => c.concepts.filter((x) => x.kind === k).length;
  const drafts = c.roles.filter((r) => !r.evidence).length;
  console.log(
    `✓ content OK: ${kinds('concept')} concepts, ${kinds('tool')} tools, ${kinds('project')} projects, ` +
      `${c.resources.length} resources, ${sections} resource sections (${unverified} not yet verified), ` +
      `${c.roles.length} roles (${drafts} still drafts without job-posting evidence)`,
  );

  // Coverage of the three picks. Not an error: gaps are shown on the site as "not picked yet".
  const resources = new Map(c.resources.map((r) => [r.id, r]));
  const picks = c.concepts.map((x) => ({ id: x.id, kind: x.kind, p: picksFor(x, resources) }));
  const line = MEDIA.map((m) => `${m} ${picks.filter((x) => x.p[m] !== undefined).length}/${c.concepts.length}`).join(', ');
  console.log(`  picks: ${line}`);
  console.log(`  tools page: ${c.toolGroups.reduce((n, g) => n + g.tools.length, 0)} tools on ${c.toolGroups.length} shelves`);
  if (process.argv.includes('--gaps')) {
    for (const m of MEDIA) {
      const missing = picks.filter((x) => x.p[m] === undefined && x.kind !== 'project').map((x) => x.id);
      if (missing.length) console.log(`  no ${m} pick: ${missing.join(', ')}`);
    }
    const shelved = new Set(c.toolGroups.flatMap((g) => g.tools));
    const unshelved = c.concepts.filter((x) => x.kind === 'tool' && !shelved.has(x.id)).map((x) => x.id);
    if (unshelved.length) console.log(`  tools not on the tools page: ${unshelved.join(', ')}`);
  }
} catch (err) {
  if (err instanceof ContentError) {
    console.error(`✗ ${err.message}`);
    process.exit(1);
  }
  throw err;
}
