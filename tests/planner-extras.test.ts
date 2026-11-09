import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { nextMonday, studySessions, toIcs } from '../src/lib/calendar';
import { decodeProgress, encodeProgress, mergeProgress } from '../src/lib/progress';
import { closestJobs } from '../src/lib/closest';
import { indexConcepts } from '../src/lib/graph';
import { loadContent } from '../src/lib/content';

const stops = [
  { id: 'a', title: 'Alpha', hours: 3 },
  { id: 'b', title: 'Beta, with a comma', hours: 2 },
  { id: 'c', title: 'Gamma', hours: 5 },
];
const monday = new Date(2026, 10, 16); // 16 Nov 2026 is a Monday

describe('study sessions', () => {
  it('fills study days in order and covers every hour', () => {
    const s = studySessions(stops, { from: monday, days: [1, 2, 3, 4, 5], hoursPerWeek: 10, startHour: 19 });
    expect(s.reduce((h, x) => h + x.hours, 0)).toBe(10);
    expect(s.map((x) => x.hours)).toEqual([2, 2, 2, 2, 2]);
    expect(s[1]!.stops.map((x) => x.id)).toEqual(['a', 'b']); // a's last hour, then b
    expect(s.every((x) => x.start.getHours() === 19)).toBe(true);
    expect(s.every((x) => x.start.getDay() >= 1 && x.start.getDay() <= 5)).toBe(true);
  });

  it('never loses or reorders hours, for any pace and days', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 40 }), { minLength: 1, maxLength: 12 }),
        fc.uniqueArray(fc.integer({ min: 0, max: 6 }), { minLength: 1 }),
        fc.integer({ min: 1, max: 40 }),
        (hours, days, pace) => {
          const list = hours.map((h, i) => ({ id: `s${i}`, title: `S${i}`, hours: h }));
          const s = studySessions(list, { from: monday, days, hoursPerWeek: pace, startHour: 7 });
          const total = s.reduce((h, x) => h + x.hours, 0);
          expect(total).toBeCloseTo(hours.reduce((a, b) => a + b, 0), 6);
          const order = s.flatMap((x) => x.stops.map((y) => y.id)).filter((id, i, a) => a.indexOf(id) === i);
          expect(order).toEqual(list.map((x) => x.id));
        },
      ),
    );
  });

  it('writes a calendar file calendars accept', () => {
    const s = studySessions(stops, { from: monday, days: [0, 6], hoursPerWeek: 6, startHour: 9 });
    const ics = toIcs(s, { goal: 'Data analyst', stopUrl: 'https://example.com/concepts/', routeUrl: 'https://example.com/roles/data-analyst', id: 'data-analyst', now: monday });
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.trim().endsWith('END:VCALENDAR')).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(s.length);
    expect(ics).toContain('DTSTART:20261121T090000'); // first Saturday
    expect(ics).toContain('Beta\\, with a comma');
    for (const line of ics.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });

  it('starts plans on a Monday', () => {
    expect(nextMonday(new Date(2026, 10, 11)).getDate()).toBe(16);
    expect(nextMonday(monday).getDate()).toBe(16);
  });
});

describe('progress codes', () => {
  it('round-trips', () => {
    const p = { background: 'maths-grad', known: ['git'], done: ['sql', 'statistics'], pace: 15 };
    expect(decodeProgress(encodeProgress(p))).toEqual(p);
  });
  it('rejects anything else without throwing', () => {
    for (const bad of ['', 'hello', 't1.!!!', 't1.' + btoa('not json')]) expect(decodeProgress(bad)).toBeUndefined();
  });
  it('merges without losing either side', () => {
    const m = mergeProgress({ known: ['a'], done: ['b'] }, { known: ['c'], done: ['a', 'd'], pace: 5 });
    expect(m.known.sort()).toEqual(['a', 'c']);
    expect(m.done.sort()).toEqual(['b', 'd']);
    expect(m.pace).toBe(5);
  });
});

describe('closest jobs', () => {
  const c = loadContent();
  const index = indexConcepts(c.concepts);
  const jobs = c.roles.filter((r) => r.kind !== 'exam' && !r.variantOf).map((r) => ({ id: r.id, title: r.title, hire: r.tiers.hire }));

  it('shows nothing until you have moved towards a job', () => {
    expect(closestJobs(index, jobs, new Set())).toEqual([]);
  });

  it('puts a job first once its whole hiring list is behind you', () => {
    const analyst = c.roles.find((r) => r.id === 'data-analyst')!;
    const have = new Set(c.concepts.map((x) => x.id).filter((id) => analyst.tiers.hire.includes(id)));
    const [first] = closestJobs(index, jobs, have);
    expect(first!.hours).toBe(0);
  });
});
