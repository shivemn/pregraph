/**
 * "Closest jobs from where you are": every route ranked by how much is left
 * to get hired, counting what you've finished and what you already know.
 */
import { planPath, type Index } from './graph';

export interface JobTarget {
  id: string;
  title: string;
  hire: string[];
}

export interface Closest {
  id: string;
  title: string;
  /** Stops still to do. */
  stops: number;
  hours: number;
  /** Stops on the full route that are already behind you. */
  behind: number;
}

export function closestJobs(index: Index, jobs: readonly JobTarget[], have: ReadonlySet<string>, limit = 5): Closest[] {
  return jobs
    .map((j) => {
      const full = planPath(index, j.hire, new Set());
      const left = planPath(index, j.hire, have);
      return { id: j.id, title: j.title, stops: left.steps.length, hours: left.totalHours, behind: full.steps.length - left.steps.length };
    })
    .filter((j) => j.behind > 0) // only jobs you've actually moved towards
    .sort((a, b) => a.hours - b.hours || a.stops - b.stops || a.title.localeCompare(b.title))
    .slice(0, limit);
}
