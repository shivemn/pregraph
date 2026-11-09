/**
 * A route as dated study sessions, and those sessions as a calendar file
 * (.ics) that Google Calendar, Outlook and Apple Calendar all import.
 *
 * Times are "floating": 7 pm means 7 pm wherever the calendar is, which is
 * what a study plan wants.
 */

export interface SessionStop {
  id: string;
  title: string;
  hours: number;
}

export interface Session {
  start: Date;
  hours: number;
  /** The stops worked on in this session, in route order. */
  stops: SessionStop[];
}

export interface SessionOptions {
  /** First day to schedule from (its time of day is ignored). */
  from: Date;
  /** Days of the week to study, 0 = Sunday ... 6 = Saturday. */
  days: number[];
  hoursPerWeek: number;
  /** Hour of the day sessions start, 0–23. */
  startHour: number;
}

/**
 * Lays the stops out over study days in order. Each day gets the week's
 * hours split evenly, in half-hour steps; a stop runs over as many days as
 * it needs, and a day can finish one stop and start the next.
 */
export function studySessions(stops: SessionStop[], o: SessionOptions): Session[] {
  const days = [...new Set(o.days)].filter((d) => d >= 0 && d <= 6);
  if (days.length === 0 || stops.length === 0) return [];
  const perDay = Math.max(0.5, Math.round((o.hoursPerWeek / days.length) * 2) / 2);

  const queue = stops.map((s) => ({ ...s, left: Math.max(0, s.hours) })).filter((s) => s.left > 0);
  const out: Session[] = [];
  const day = new Date(o.from.getFullYear(), o.from.getMonth(), o.from.getDate());
  // A guard against bad input: no route is longer than twenty years.
  for (let guard = 0; queue.length > 0 && guard < 366 * 20; guard++, day.setDate(day.getDate() + 1)) {
    if (!days.includes(day.getDay())) continue;
    let room = perDay;
    const worked: SessionStop[] = [];
    while (room > 0 && queue.length > 0) {
      const s = queue[0]!;
      const take = Math.min(room, s.left);
      s.left -= take;
      room -= take;
      if (!worked.some((w) => w.id === s.id)) worked.push({ id: s.id, title: s.title, hours: s.hours });
      if (s.left <= 1e-9) queue.shift();
    }
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), o.startHour, 0, 0);
    out.push({ start, hours: perDay - room, stops: worked });
  }
  return out;
}

const pad = (n: number) => String(n).padStart(2, '0');
const floating = (d: Date) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
const stamp = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;

/** Text escaping from RFC 5545: backslash, semicolon, comma and newline. */
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Lines longer than 75 octets are folded onto continuation lines starting with a space. */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = '';
  let size = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (size + n > (parts.length === 0 ? 75 : 74)) {
      parts.push(current);
      current = '';
      size = 0;
    }
    current += ch;
    size += n;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

export interface CalendarInfo {
  /** e.g. "Data analyst". */
  goal: string;
  /** Where each stop's page lives, e.g. "https://terminus.pages.dev/concepts/". */
  stopUrl: string;
  /** The route page, for the description. */
  routeUrl: string;
  /** For unique event ids. */
  id: string;
  now?: Date;
}

export function toIcs(sessions: Session[], info: CalendarInfo): string {
  const now = info.now ?? new Date();
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Terminus//Study plan//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(`Terminus: ${info.goal}`)}`,
  ];
  sessions.forEach((s, i) => {
    const end = new Date(s.start.getTime() + s.hours * 3600 * 1000);
    const names = s.stops.map((x) => x.title);
    const summary = `Study: ${names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0]}`;
    const body = [
      `Your route to ${info.goal}, session ${i + 1} of ${sessions.length}.`,
      ...s.stops.map((x) => `${x.title}: ${info.stopUrl}${x.id}`),
      `Tick stops off on your route: ${info.routeUrl}`,
    ].join('\n');
    lines.push(
      'BEGIN:VEVENT',
      `UID:${info.id}-${i + 1}@terminus`,
      `DTSTAMP:${stamp(now)}`,
      `DTSTART:${floating(s.start)}`,
      `DTEND:${floating(end)}`,
      `SUMMARY:${esc(summary)}`,
      `DESCRIPTION:${esc(body)}`,
      `URL:${s.stops[0] ? `${info.stopUrl}${s.stops[0].id}` : info.routeUrl}`,
      'TRANSP:OPAQUE',
      'END:VEVENT',
    );
  });
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

/** The next Monday after a date, or the date itself if it's a Monday. */
export function nextMonday(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  out.setDate(out.getDate() + ((8 - out.getDay()) % 7));
  return out;
}
