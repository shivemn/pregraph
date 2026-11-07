/**
 * Loads content/*.yaml, checks it against the schema, then checks the things a
 * schema can't: references between files, prerequisite cycles, free resources.
 * Runs at build time only (uses the filesystem).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';
import {
  backgroundSchema,
  conceptSchema,
  goalSchema,
  pathSchema,
  resourceSchema,
  type Content,
} from './schema';
import { findCycle } from './graph';

export class ContentError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Content has ${problems.length} problem(s):\n  - ${problems.join('\n  - ')}`);
  }
}

function readYaml(file: string): unknown {
  return parse(readFileSync(file, 'utf8'));
}

function parseList<T>(schema: z.ZodType<T>, data: unknown, file: string, problems: string[]): T[] {
  const result = z.array(schema).safeParse(data);
  if (result.success) return result.data;
  for (const issue of result.error.issues) {
    problems.push(`${file}: ${issue.path.join('.') || '(root)'}: ${issue.message}`);
  }
  return [];
}

/** Checks everything a schema can't. Returns a list of problems (empty = valid). */
export function checkContent(c: Content): string[] {
  const problems: string[] = [];
  const conceptIds = new Set<string>();
  const resourceById = new Map(c.resources.map((r) => [r.id, r]));

  const dupes = (kind: string, ids: string[]) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) problems.push(`Duplicate ${kind} id "${id}"`);
      seen.add(id);
    }
  };
  dupes('concept', c.concepts.map((x) => x.id));
  dupes('resource', c.resources.map((x) => x.id));
  dupes('background', c.backgrounds.map((x) => x.id));
  dupes('goal', c.goals.map((x) => x.id));
  dupes('path', c.paths.map((x) => x.slug));
  for (const x of c.concepts) conceptIds.add(x.id);

  for (const concept of c.concepts) {
    for (const p of [...concept.requires, ...concept.recommends]) {
      if (!conceptIds.has(p)) problems.push(`Concept "${concept.id}" refers to unknown concept "${p}"`);
      if (p === concept.id) problems.push(`Concept "${concept.id}" lists itself as a prerequisite`);
    }
    for (const s of concept.resources) {
      if (!resourceById.has(s.resource)) {
        problems.push(`Concept "${concept.id}" refers to unknown resource "${s.resource}"`);
      }
    }
    const hasFreePrimary = concept.resources.some(
      (s) => s.role === 'primary' && resourceById.get(s.resource)?.free,
    );
    if (!hasFreePrimary) problems.push(`Concept "${concept.id}" has no free primary resource`);
  }

  const byId = new Map(c.concepts.map((x) => [x.id, x]));
  const cycle = findCycle(conceptIds, (id) => (byId.get(id)?.requires ?? []).filter((p) => conceptIds.has(p)));
  if (cycle) problems.push(`Hard prerequisite cycle: ${cycle.join(' → ')}`);

  for (const b of c.backgrounds) {
    for (const k of b.knows) {
      if (!conceptIds.has(k)) problems.push(`Background "${b.id}" refers to unknown concept "${k}"`);
    }
  }
  for (const g of c.goals) {
    for (const t of g.targets) {
      if (!conceptIds.has(t)) problems.push(`Goal "${g.id}" refers to unknown concept "${t}"`);
    }
  }
  const backgroundIds = new Set(c.backgrounds.map((b) => b.id));
  const goalIds = new Set(c.goals.map((g) => g.id));
  for (const p of c.paths) {
    if (!backgroundIds.has(p.background)) problems.push(`Path "${p.slug}" refers to unknown background "${p.background}"`);
    if (!goalIds.has(p.goal)) problems.push(`Path "${p.slug}" refers to unknown goal "${p.goal}"`);
  }
  return problems;
}

/** Reads and validates the whole content/ folder. Throws ContentError on any problem. */
export function loadContent(root = join(process.cwd(), 'content')): Content {
  const problems: string[] = [];
  const conceptDir = join(root, 'concepts');
  const concepts = readdirSync(conceptDir)
    .filter((f) => f.endsWith('.yaml'))
    .sort()
    .flatMap((f) => parseList(conceptSchema, readYaml(join(conceptDir, f)), `concepts/${f}`, problems));

  const content: Content = {
    concepts,
    resources: parseList(resourceSchema, readYaml(join(root, 'resources.yaml')), 'resources.yaml', problems),
    backgrounds: parseList(backgroundSchema, readYaml(join(root, 'backgrounds.yaml')), 'backgrounds.yaml', problems),
    goals: parseList(goalSchema, readYaml(join(root, 'goals.yaml')), 'goals.yaml', problems),
    paths: parseList(pathSchema, readYaml(join(root, 'paths.yaml')), 'paths.yaml', problems),
  };

  problems.push(...checkContent(content));
  if (problems.length > 0) throw new ContentError(problems);
  return content;
}
