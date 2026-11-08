/**
 * The content contract. Every YAML file in content/ must match these schemas,
 * otherwise `npm run validate` (and therefore the build) fails.
 */
import { z } from 'zod';

const id = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'ids must be kebab-case, e.g. "operating-systems"');

export const areaSchema = z.object({
  id,
  title: z.string().min(1),
});

export const resourceSchema = z.object({
  id,
  title: z.string().min(1),
  author: z.string().min(1),
  type: z.enum(['book', 'video', 'course', 'site']),
  url: z.url(),
  free: z.boolean(),
  /** How you use it: read it, watch it, or practise with it. */
  medium: z.enum(['read', 'watch', 'practice']),
  /** What people actually call it, e.g. "OSTEP" or "CLRS". Used by search. */
  short: z.string().optional(),
  note: z.string().optional(),
});

export const resourceSectionSchema = z.object({
  resource: id,
  /** Which part of the resource teaches this concept, e.g. "Lectures 9–14". */
  locator: z.string().min(1),
  role: z.enum(['primary', 'alternative', 'deep-dive']).default('primary'),
  /** False until a human has opened the resource and checked the locator. */
  verified: z.boolean().default(false),
  /** One line on why this is the pick, shown next to it. */
  why: z.string().optional(),
});

export const conceptSchema = z.object({
  id,
  title: z.string().min(1),
  area: id,
  /** A concept to understand, a tool to get fluent in, or a project to build and show. */
  kind: z.enum(['concept', 'tool', 'project']).default('concept'),
  summary: z.string().min(1),
  hours: z.number().positive(),
  /** Hard prerequisites: must be learned first, and are pulled into a plan. */
  requires: z.array(id).default([]),
  /** Soft prerequisites: only nudge the order when both are already in a plan. */
  recommends: z.array(id).default([]),
  resources: z.array(resourceSectionSchema).min(1),
});

export const backgroundSchema = z.object({
  id,
  title: z.string().min(1),
  /** How it reads after "I'm", e.g. "a maths graduate" or "starting from zero". */
  phrase: z.string().min(1),
  description: z.string().min(1),
  knows: z.array(id),
});

export const familySchema = z.object({
  id,
  title: z.string().min(1),
});

/**
 * A shelf on the tools page: languages, databases and so on. A tool is any
 * concept someone might come to learn on its own, whatever its kind.
 */
export const toolGroupSchema = z.object({
  id,
  title: z.string().min(1),
  tools: z.array(id).min(1),
});

/**
 * A job role (or an exam) and what it takes. Requirements come in tiers so a
 * fresher can see the short list that gets them hired before the long one.
 */
export const roleSchema = z.object({
  id,
  title: z.string().min(1),
  family: id,
  kind: z.enum(['role', 'exam']).default('role'),
  /** What the job actually is, in a sentence or two. */
  summary: z.string().min(1),
  tiers: z.object({
    /** Needed to get hired as a fresher. */
    hire: z.array(id).min(1),
    /** Expected within the first year on the job. */
    firstYear: z.array(id).default([]),
    /** Useful, often asked about, rarely required. */
    extra: z.array(id).default([]),
  }),
  /**
   * Where the requirements come from. Without this, the role is a draft based
   * on our own judgement, and the site says so.
   */
  evidence: z
    .object({
      postings: z.number().int().positive(),
      region: z.string().min(1),
      collected: z.string().regex(/^\d{4}-\d{2}$/, 'use YYYY-MM'),
      note: z.string().optional(),
    })
    .optional(),
});

export type Medium = z.infer<typeof resourceSchema>['medium'];
export const MEDIA: Medium[] = ['read', 'watch', 'practice'];

/**
 * The pick for each medium: the first free section of that medium, preferring
 * "primary" over "alternative". Deep dives are never the pick.
 */
export function picksFor(
  concept: { resources: Array<{ resource: string; role: string }> },
  resources: ReadonlyMap<string, { medium: Medium; free: boolean }>,
): Partial<Record<Medium, number>> {
  const out: Partial<Record<Medium, number>> = {};
  for (const role of ['primary', 'alternative']) {
    concept.resources.forEach((s, i) => {
      const r = resources.get(s.resource);
      if (!r || !r.free || s.role !== role || out[r.medium] !== undefined) return;
      out[r.medium] = i;
    });
  }
  return out;
}

export type Area = z.infer<typeof areaSchema>;
export type Resource = z.infer<typeof resourceSchema>;
export type ResourceSection = z.infer<typeof resourceSectionSchema>;
export type Concept = z.infer<typeof conceptSchema>;
export type Background = z.infer<typeof backgroundSchema>;
export type Family = z.infer<typeof familySchema>;
export type Role = z.infer<typeof roleSchema>;
export type ToolGroup = z.infer<typeof toolGroupSchema>;
export type Tier = keyof Role['tiers'];

export const TIERS: Array<{ id: Tier; title: string }> = [
  { id: 'hire', title: 'To get hired' },
  { id: 'firstYear', title: 'First year on the job' },
  { id: 'extra', title: 'Good to have' },
];

/** Targets for a role up to and including a tier. */
export function targetsUpTo(role: Role, tier: Tier): string[] {
  const order: Tier[] = ['hire', 'firstYear', 'extra'];
  return order.slice(0, order.indexOf(tier) + 1).flatMap((t) => role.tiers[t]);
}

export interface Content {
  areas: Area[];
  families: Family[];
  concepts: Concept[];
  resources: Resource[];
  backgrounds: Background[];
  roles: Role[];
  toolGroups: ToolGroup[];
}
