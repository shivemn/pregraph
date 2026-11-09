/**
 * The planner's side tools: the jobs closest to where you are, your route
 * as a calendar, and a link that carries your progress to another device.
 */
import { useEffect, useMemo, useState } from 'react';
import { closestJobs, type JobTarget } from '../lib/closest';
import { nextMonday, studySessions, toIcs, type SessionStop } from '../lib/calendar';
import { duration } from '../lib/coaches';
import { encodeProgress, type Progress } from '../lib/progress';
import type { Index } from '../lib/graph';

/** Routes are fetched once per visit and shared by every planner on the page. */
let routesPromise: Promise<JobTarget[]> | undefined;
function loadRoutes(): Promise<JobTarget[]> {
  routesPromise ??= fetch('/routes.json')
    .then((r) => (r.ok ? r.json() : []))
    .catch(() => []);
  return routesPromise;
}

export function ClosestJobs({ index, have, exclude, pace }: { index: Index; have: Set<string>; exclude: string[]; pace: number }) {
  const [routes, setRoutes] = useState<JobTarget[] | null>(null);
  useEffect(() => {
    if (have.size > 0) loadRoutes().then(setRoutes);
  }, [have.size > 0]);
  const list = useMemo(
    () => (routes ? closestJobs(index, routes.filter((r) => !exclude.includes(r.id)), have, 5) : []),
    [routes, index, have, exclude.join()],
  );

  return (
    <section>
      <h2 className="side-heading">Closest jobs from where you are</h2>
      {have.size === 0 ? (
        <p className="quiet small">Tick off stops or pick your background, and the jobs you're nearest to show up here.</p>
      ) : !routes ? (
        <p className="quiet small">Working it out…</p>
      ) : list.length === 0 ? (
        <p className="quiet small">Nothing yet. Tick off a few stops and check again.</p>
      ) : (
        <ol className="closest">
          {list.map((j) => (
            <li key={j.id}>
              <a href={`/roles/${j.id}`}>{j.title}</a>
              <span className="quiet small">
                {j.stops === 0
                  ? ' Its hiring list is all behind you.'
                  : ` ${j.stops} ${j.stops === 1 ? 'stop' : 'stops'} left, ${duration(j.hours, pace)}.`}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

const DAY_SETS = [
  { id: 'weekdays', label: 'Weekdays', days: [1, 2, 3, 4, 5] },
  { id: 'everyday', label: 'Every day', days: [0, 1, 2, 3, 4, 5, 6] },
  { id: 'weekends', label: 'Weekends', days: [0, 6] },
  { id: 'mwf', label: 'Mon, Wed, Fri', days: [1, 3, 5] },
];
const HOURS = [6, 7, 8, 9, 10, 14, 17, 18, 19, 20, 21, 22];
const hourLabel = (h: number) => (h === 0 ? '12 am' : h < 12 ? `${h} am` : h === 12 ? '12 pm' : `${h - 12} pm`);
const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function CalendarExport({ stops, pace, goal, roleId, routePath }: { stops: SessionStop[]; pace: number; goal: string; roleId: string; routePath: string }) {
  const [daySet, setDaySet] = useState('weekdays');
  const [hour, setHour] = useState(19);
  const [from, setFrom] = useState(() => isoDate(nextMonday(new Date())));
  const days = DAY_SETS.find((d) => d.id === daySet)!.days;
  const start = new Date(`${from}T00:00:00`);
  const valid = !Number.isNaN(start.getTime());
  const sessions = useMemo(
    () => (valid ? studySessions(stops, { from: start, days, hoursPerWeek: pace, startHour: hour }) : []),
    [stops, pace, daySet, hour, from],
  );
  const perDay = sessions[0]?.hours ?? 0;
  const last = sessions[sessions.length - 1];

  const download = () => {
    const ics = toIcs(sessions, {
      goal,
      id: roleId,
      stopUrl: `${location.origin}/concepts/`,
      routeUrl: `${location.origin}${routePath}`,
    });
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `terminus-${roleId}.ics`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <section>
      <h2 className="side-heading">Put it in your calendar</h2>
      {stops.length === 0 ? (
        <p className="quiet small">Nothing left to schedule on this route.</p>
      ) : (
        <>
          <div className="cal-controls">
            <label>
              <span className="small">Study on</span>
              <select value={daySet} onChange={(e) => setDaySet(e.target.value)}>
                {DAY_SETS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
              </select>
            </label>
            <label>
              <span className="small">At</span>
              <select value={hour} onChange={(e) => setHour(Number(e.target.value))}>
                {HOURS.map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
              </select>
            </label>
            <label>
              <span className="small">Starting</span>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
          </div>
          {valid && last && (
            <p className="quiet small">
              {sessions.length} sessions of {perDay === 1 ? 'an hour' : `${perDay} hours`}, at your {pace} hours a week, ending
              around {last.start.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}. Each one names
              its stop and links to it.
            </p>
          )}
          <button className="btn btn-small" onClick={download} disabled={!valid || sessions.length === 0}>
            Download calendar file
          </button>
          <p className="quiet small">
            Google Calendar: Settings, then Import. Outlook and Apple Calendar open the file directly. If your route changes,
            download it again and delete the old events.
          </p>
        </>
      )}
    </section>
  );
}

export function ProgressLink({ progress }: { progress: Progress }) {
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const empty = progress.known.length + progress.done.length === 0 && !progress.background;

  const make = async () => {
    const url = new URL(location.href);
    url.hash = '';
    url.search = '';
    url.searchParams.set('progress', encodeProgress(progress));
    const text = url.toString();
    setLink(text);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false); // the link is shown below to copy by hand
    }
  };

  return (
    <section>
      <h2 className="side-heading">On another device</h2>
      {empty ? (
        <p className="quiet small">Once you tick or skip something, you can carry it to your phone or laptop with a link.</p>
      ) : (
        <>
          <p className="quiet small">
            Your progress is saved in this browser only. Send yourself this link and open it on the other device: your ticks,
            skips, background and study time come with it. No account needed.
          </p>
          <button className="btn btn-small" onClick={make}>Copy a link with my progress</button>
          {link && (
            <>
              <p className="small" role="status">{copied ? 'Copied. Paste it into a chat or email to yourself.' : 'Copy this link:'}</p>
              <input className="progress-link" readOnly value={link} onFocus={(e) => e.currentTarget.select()} aria-label="Link with your progress" />
            </>
          )}
        </>
      )}
    </section>
  );
}
