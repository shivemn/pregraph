/** `npm run validate` — fails (exit 1) if content/ has any problem. Runs in CI and before every build. */
import { loadContent, ContentError } from '../src/lib/content';

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
} catch (err) {
  if (err instanceof ContentError) {
    console.error(`✗ ${err.message}`);
    process.exit(1);
  }
  throw err;
}
