import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { coaches, duration, hourRange, WEEKS_PER_COACH } from '../src/lib/coaches';

const steps = fc.array(fc.record({ id: fc.uuid(), hours: fc.integer({ min: 1, max: 120 }) }), { maxLength: 40 });
const pace = fc.integer({ min: 1, max: 40 });

describe('coaches', () => {
  it('keeps every stop, in order', () => {
    fc.assert(
      fc.property(steps, pace, (s, p) => {
        expect(coaches(s, p).flatMap((c) => c.stops)).toEqual(s);
      }),
    );
  });

  it('never overfills a coach, unless one stop is bigger than a coach', () => {
    fc.assert(
      fc.property(steps, pace, (s, p) => {
        for (const c of coaches(s, p)) {
          if (c.stops.length > 1) expect(c.hours).toBeLessThanOrEqual(p * WEEKS_PER_COACH);
        }
      }),
    );
  });

  it('numbers coaches and their weeks in order', () => {
    fc.assert(
      fc.property(steps, pace, (s, p) => {
        const cs = coaches(s, p);
        cs.forEach((c, i) => {
          expect(c.number).toBe(i + 1);
          expect(c.weeks[0]).toBeLessThanOrEqual(c.weeks[1]);
          if (i > 0) expect(c.weeks[0]).toBeGreaterThanOrEqual(cs[i - 1]!.weeks[0]);
        });
      }),
    );
  });

  it('fills a coach up to about a month', () => {
    const route = Array.from({ length: 6 }, (_, i) => ({ id: `s${i}`, hours: 20 }));
    // 10 h a week: 40 h a coach, so two stops each.
    expect(coaches(route, 10).map((c) => c.stops.length)).toEqual([2, 2, 2]);
    expect(coaches(route, 10).map((c) => c.weeks)).toEqual([[1, 4], [5, 8], [9, 12]]);
  });
});

describe('duration and ranges', () => {
  it('reads like a person would say it', () => {
    expect(duration(40, 10)).toBe('about 4 weeks');
    expect(duration(300, 10)).toBe('about 7 months');
    expect(duration(600, 10)).toBe('about 1 year and 2 months');
    expect(duration(5, 10)).toBe('about a week');
  });

  it('puts the estimate inside its range', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 2000 }), (h) => {
        const [lo, hi] = hourRange(h);
        expect(lo).toBeLessThanOrEqual(h + 5);
        expect(hi).toBeGreaterThanOrEqual(h - 5);
        expect(lo).toBeLessThanOrEqual(hi);
      }),
    );
  });
});
