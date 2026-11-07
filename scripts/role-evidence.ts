/**
 * `npm run evidence -- backend-engineer`
 *
 * Reads research/postings/<role>.csv (one row per job posting, tagged by hand
 * with concept ids) and prints how often each concept is asked for, next to
 * the tier the role currently puts it in. Thresholds are a starting point for
 * a human decision, not a rule: see docs/ROLES.md.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadContent } from '../src/lib/content';

const roleId = process.argv[2];
if (!roleId) {
  console.error('Usage: npm run evidence -- <role-id>');
  process.exit(1);
}

const c = loadContent();
const role = c.roles.find((r) => r.id === roleId);
if (!role) {
  console.error(`No role "${roleId}". Known roles: ${c.roles.map((r) => r.id).join(', ')}`);
  process.exit(1);
}

const file = join(process.cwd(), 'research', 'postings', `${roleId}.csv`);
const rows = readFileSync(file, 'utf8').trim().split(/\r?\n/).slice(1);
const conceptIds = new Set(c.concepts.map((x) => x.id));
const counts = new Map<string, number>();
const unknown = new Set<string>();

for (const row of rows) {
  const skills = row.split(',').at(-1)!.split(';').map((s) => s.trim()).filter(Boolean);
  for (const s of new Set(skills)) {
    if (!conceptIds.has(s)) unknown.add(s);
    counts.set(s, (counts.get(s) ?? 0) + 1);
  }
}

const currentTier = new Map<string, string>();
for (const [tier, ids] of Object.entries(role.tiers)) for (const id of ids) currentTier.set(id, tier);

const suggest = (share: number) => (share >= 0.5 ? 'hire' : share >= 0.2 ? 'firstYear' : 'extra');
const n = rows.length;
console.log(`${role.title}: ${n} postings\n`);
console.log('share  suggested  current    concept');
for (const [id, k] of [...counts].sort((a, b) => b[1] - a[1])) {
  const share = k / n;
  const now = currentTier.get(id) ?? '-';
  const flag = now !== '-' && now !== suggest(share) ? '  <- differs' : '';
  console.log(`${String(Math.round(share * 100)).padStart(4)}%  ${suggest(share).padEnd(9)}  ${now.padEnd(9)}  ${id}${flag}`);
}
const neverAsked = [...currentTier.keys()].filter((id) => !counts.has(id));
if (neverAsked.length) console.log(`\nIn the role but in no posting: ${neverAsked.join(', ')}`);
if (unknown.size) console.log(`\nTags that aren't concept ids yet (fix the tag or add the concept): ${[...unknown].join(', ')}`);
