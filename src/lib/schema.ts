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
  note: z.string().optional(),
});

export const resourceSectionSchema = z.object({
  resource: id,
  /** Which part of the resource teaches this concept, e.g. "Lectures 9–14". */
  locator: z.string().min(1),
  role: z.enum(['primary', 'alternative', 'deep-dive']).default('primary'),
  /** False until a human has opened the resource and checked the locator. */
  verified: z.boolean().default(false),
});

export const conceptSchema = z.object({
  id,
  title: z.string().min(1),
  area: id,
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
  description: z.string().min(1),
  knows: z.array(id),
});

export const goalSchema = z.object({
  id,
  title: z.string().min(1),
  description: z.string().min(1),
  targets: z.array(id).min(1),
});

export const pathSchema = z.object({
  slug: id,
  title: z.string().min(1),
  tagline: z.string().min(1),
  background: id,
  /** Goals you can switch between on this path. The first is the default. */
  goals: z.array(id).min(1),
});

export type Area = z.infer<typeof areaSchema>;
export type Resource = z.infer<typeof resourceSchema>;
export type ResourceSection = z.infer<typeof resourceSectionSchema>;
export type Concept = z.infer<typeof conceptSchema>;
export type Background = z.infer<typeof backgroundSchema>;
export type Goal = z.infer<typeof goalSchema>;
export type LearningPath = z.infer<typeof pathSchema>;

export interface Content {
  areas: Area[];
  concepts: Concept[];
  resources: Resource[];
  backgrounds: Background[];
  goals: Goal[];
  paths: LearningPath[];
}
