/**
 * Splits a route into coaches: runs of consecutive stops that take about a
 * month at the learner's pace. The order never changes; a coach just closes
 * when the next stop would overfill it. A stop bigger than a whole coach gets
 * one to itself.
 *
 * Coaches are worked out over the whole route, done stops included, so ticking
 * a stop never reshuffles them.
 */

export interface CoachStop {
  id: string;
  hours: number;
}

export interface Coach<T extends CoachStop> {
  /** 1-based. */
  number: number;
  stops: T[];
  hours: number;
  /** First and last week of study this coach covers, counting from week 1. */
  weeks: [number, number];
}

/** Weeks in a month, for "about a month per coach". */
export const WEEKS_PER_COACH = 4;

export function coaches<T extends CoachStop>(steps: T[], hoursPerWeek: number): Coach<T>[] {
  const capacity = Math.max(1, hoursPerWeek) * WEEKS_PER_COACH;
  const out: Coach<T>[] = [];
  let current: T[] = [];
  let hours = 0;
  let before = 0; // hours in earlier coaches

  const close = () => {
    if (current.length === 0) return;
    // Rounded to whole weeks, so neighbouring coaches don't share a week.
    const first = Math.round(before / hoursPerWeek) + 1;
    const last = Math.max(first, Math.round((before + hours) / hoursPerWeek));
    out.push({ number: out.length + 1, stops: current, hours, weeks: [first, last] });
    before += hours;
    current = [];
    hours = 0;
  };

  for (const s of steps) {
    if (current.length > 0 && hours + s.hours > capacity) close();
    current.push(s);
    hours += s.hours;
  }
  close();
  return out;
}

/** "about 3 weeks", "about 5 months", "about 1 year and 2 months". */
export function duration(hours: number, hoursPerWeek: number): string {
  const weeks = hours / Math.max(1, hoursPerWeek);
  if (weeks < 1.5) return 'about a week';
  if (weeks < 9) return `about ${Math.round(weeks)} weeks`;
  const months = Math.round(weeks / 4.345);
  if (months < 12) return `about ${months} months`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const y = years === 1 ? '1 year' : `${years} years`;
  return rest === 0 ? `about ${y}` : `about ${y} and ${rest} ${rest === 1 ? 'month' : 'months'}`;
}

/**
 * A range around an estimate. Hours per topic are rough, so totals are shown
 * as a range rather than a number that sounds measured.
 */
export function hourRange(hours: number): [number, number] {
  const round = (n: number) => (n < 50 ? Math.round(n) : Math.round(n / 10) * 10);
  return [round(hours * 0.85), round(hours * 1.15)];
}
