// What a stop's panel (and its concept page) shows: the book, the video and
// the practice pick, plus everything else. Built once at deploy time.
import { MEDIA, picksFor, type Content, type Cover, type Medium, type ProjectBrief } from './schema';

export interface Source {
  title: string;
  author: string;
  url: string;
  locator: string;
  why?: string;
  note?: string;
  free: boolean;
  verified: boolean;
  medium: Medium;
  role: 'primary' | 'alternative' | 'deep-dive';
}

export interface StopDetail {
  id: string;
  title: string;
  area: string;
  kind: string;
  hours: number;
  summary: string;
  requires: string[];
  unlocks: string[];
  picks: Partial<Record<Medium, Source>>;
  others: Source[];
  /** Projects only: what to build and what it must show. */
  brief?: ProjectBrief;
  /** What the stop covers. */
  covers?: Cover[];
}

export function stopDetails(c: Content): StopDetail[] {
  const resources = new Map(c.resources.map((r) => [r.id, r]));
  return c.concepts.map((x) => {
    const sources: Source[] = x.resources.map((s) => {
      const r = resources.get(s.resource)!;
      return {
        title: r.title,
        author: r.author,
        url: r.url,
        locator: s.locator,
        why: s.why,
        note: r.note,
        free: r.free,
        verified: s.verified,
        medium: r.medium,
        role: s.role,
      };
    });
    const pickIndex = picksFor(x, resources);
    const picks: Partial<Record<Medium, Source>> = {};
    for (const m of MEDIA) if (pickIndex[m] !== undefined) picks[m] = sources[pickIndex[m]!]!;
    const picked = new Set(Object.values(pickIndex));
    return {
      id: x.id,
      title: x.title,
      area: x.area,
      kind: x.kind,
      hours: x.hours,
      summary: x.summary,
      requires: x.requires,
      unlocks: c.concepts.filter((y) => y.requires.includes(x.id)).map((y) => y.id),
      picks,
      others: sources.filter((_, i) => !picked.has(i)),
      ...(x.brief ? { brief: x.brief } : {}),
      ...(x.covers.length ? { covers: x.covers } : {}),
    };
  });
}

export const MEDIUM_LABEL: Record<Medium, { title: string; verb: string }> = {
  read: { title: 'Read', verb: 'Read' },
  watch: { title: 'Watch', verb: 'Watch' },
  practice: { title: 'Practise', verb: 'Do' },
};
