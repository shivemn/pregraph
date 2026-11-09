// The planner: the interactive part of a role page. It re-runs the path engine
// in the browser whenever you change something, and remembers your choices in
// localStorage (no account needed yet).
//
// What you know and what you've finished belong to you, not to one role, so
// they're stored once and shared across every role page. The tier and view
// you picked are stored per role.
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { indexConcepts, planPath, withPrerequisites, type ConceptNode, type PlanStep } from '../lib/graph';
import { coaches, duration, hourRange } from '../lib/coaches';
import { decodeProgress, mergeProgress, type Progress } from '../lib/progress';
import { CalendarExport, ClosestJobs, ProgressLink } from './PlannerTools';
import { midSentence } from '../lib/text';

// The map pulls in the layout code, so it only loads when someone opens it.
const RouteMap = lazy(() => import('./RouteMap'));
import StopPanel from './StopPanel';

interface Named { id: string; title: string }
interface Background extends Named { description: string; knows: string[]; group: 'stem' | 'other' | 'none' }
type TierId = 'hire' | 'firstYear' | 'extra';

interface Props {
  role: { id: string; title: string; tiers: Record<TierId, string[]> };
  concepts: ConceptNode[];
  areas: Named[];
  tiers: Array<{ id: TierId; title: string }>;
  backgrounds: Background[];
  backgroundGroups: Array<{ id: Background['group']; title: string }>;
  /** Jobs you might be switching from, as "role:<id>", with what that job covers. */
  jobs?: Array<{ id: string; title: string; knows: string[] }>;
  /** A job role (the default), or a single tool picked from the tools page. */
  goal?: 'role' | 'tool';
}

interface Me {
  background?: string;
  /** Things you said you already know. They leave every plan, along with anything only they needed. */
  known: string[];
  /** Things you've finished. They stay in the plan, ticked. */
  done: string[];
  /** Hours of study a week. Turns hours into weeks, months and coaches. */
  pace?: number;
}

/** The study-time choices. 10 a week is the default: about an hour and a half a day. */
const PACES = [
  { hours: 5, label: '5 h a week' },
  { hours: 10, label: '10 h a week' },
  { hours: 15, label: '15 h a week' },
  { hours: 20, label: '20 h a week' },
  { hours: 40, label: '40 h a week (full time)' },
];
const DEFAULT_PACE = 10;

/** "Week 11" or "Weeks 1–3". */
const weeksLabel = ([a, b]: [number, number]) => (a === b ? `Week ${a}` : `Weeks ${a}–${b}`);

const monthYear = (weeksFromNow: number) =>
  new Date(Date.now() + weeksFromNow * 7 * 24 * 3600 * 1000).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

interface RoleState {
  tier?: TierId;
  view?: 'list' | 'map';
}

const ME_KEY = 'terminus:me';

function read<T>(key: string, fallback: T): T {
  try {
    // Progress saved before the rename lives under the old "pregraph:" keys.
    const saved = localStorage.getItem(key) ?? localStorage.getItem(key.replace(/^terminus:/, 'pregraph:'));
    return { ...fallback, ...(JSON.parse(saved ?? 'null') ?? {}) };
  } catch {
    return fallback; // private browsing, blocked storage or a corrupt value
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable: progress lasts for this visit only
  }
}

function listOf(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

const Tick = () => (
  <svg viewBox="0 0 12 12" aria-hidden="true">
    <path d="M2 6.5 5 9.2 10 3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function RolePlanner({ role, concepts, areas, tiers, backgrounds, backgroundGroups, jobs = [], goal = 'role' }: Props) {
  const roleKey = `terminus:role:${role.id}`;
  const index = useMemo(() => indexConcepts(concepts), [concepts]);
  const areaTitle = useMemo(() => new Map(areas.map((a) => [a.id, a.title])), [areas]);
  const titleOf = (id: string) => index.get(id)?.title ?? id;
  const usedTiers = tiers.filter((t) => role.tiers[t.id].length > 0);

  const [me, setMe] = useState<Me>({ known: [], done: [] });
  const [roleState, setRoleState] = useState<RoleState>({});
  const [loaded, setLoaded] = useState(false);
  /** Progress that arrived in a link from another device, waiting for a yes. */
  const [incoming, setIncoming] = useState<Progress | null>(null);
  /** The stop whose panel is open. Mirrored in the URL hash so it can be shared. */
  const [panel, setPanel] = useState<string | null>(null);

  useEffect(() => {
    const fromHash = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      setPanel(index.has(id) ? id : null);
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, [index]);

  const openPanel = (id: string | null) => {
    setPanel(id);
    const url = new URL(location.href);
    url.hash = id ?? '';
    history.replaceState(null, '', id ? url : url.pathname + url.search);
  };

  // Read storage and the URL after the first render, so the server HTML and
  // the first client render match.
  useEffect(() => {
    const m = read<Me>(ME_KEY, { known: [], done: [] });
    const r = read<RoleState>(roleKey, {});
    const params = new URLSearchParams(location.search);
    const from = params.get('from');
    const tier = params.get('tier');
    if (from && (backgrounds.some((b) => b.id === from) || jobs.some((j) => j.id === from))) m.background = from;
    if (tier && usedTiers.some((t) => t.id === tier)) r.tier = tier as TierId;
    const code = params.get('progress');
    if (code) {
      const p = decodeProgress(code);
      if (p) setIncoming(p);
      const url = new URL(location.href);
      url.searchParams.delete('progress');
      history.replaceState(null, '', url);
    }
    setMe(m);
    setRoleState(r);
    setLoaded(true);
  }, [roleKey]);

  useEffect(() => {
    if (!loaded) return;
    write(ME_KEY, me);
    write(roleKey, roleState);
    const url = new URL(location.href);
    if (background) url.searchParams.set('from', background.id);
    else url.searchParams.delete('from');
    if (tier !== 'hire') url.searchParams.set('tier', tier);
    else url.searchParams.delete('tier');
    history.replaceState(null, '', url);
  }, [me, roleState, loaded]);

  // Nothing is assumed: until you say where you're starting from, the route is the full one.
  const switchingFrom = jobs.find((j) => j.id === me.background && j.id !== `role:${role.id}`);
  const background: Background | undefined = useMemo(() => {
    const b = backgrounds.find((x) => x.id === me.background);
    if (b || !switchingFrom) return b;
    // Someone already doing a job knows its route, down to the foundations.
    return {
      id: switchingFrom.id,
      title: switchingFrom.title,
      group: 'other',
      description: `${switchingFrom.title} is your job now, so its hiring and first-year lists, and everything under them, are behind you.`,
      knows: [...withPrerequisites(index, switchingFrom.knows)],
    };
  }, [me.background, switchingFrom, index]);
  const tier: TierId = usedTiers.some((t) => t.id === roleState.tier) ? roleState.tier! : 'hire';
  const view = roleState.view ?? 'list';

  // Each target and the tier that asks for it, up to the chosen tier.
  const targetTier = useMemo(() => {
    const m = new Map<string, TierId>();
    for (const t of usedTiers) {
      for (const id of role.tiers[t.id]) m.set(id, t.id);
      if (t.id === tier) break;
    }
    return m;
  }, [role, tier]);
  const targets = useMemo(() => [...targetTier.keys()], [targetTier]);

  const known = useMemo(() => new Set([...(background?.knows ?? []), ...me.known]), [background, me.known]);
  const done = useMemo(() => new Set(me.done), [me.done]);
  const plan = useMemo(() => planPath(index, targets, known), [index, targets, known]);
  // For "switching from": how much of the full route the old job already covers.
  const fullLength = useMemo(
    () => (switchingFrom ? planPath(index, targets, new Set(me.known)).steps.length : 0),
    [switchingFrom, index, targets, me.known],
  );

  const why = (s: PlanStep) => {
    const others = s.neededFor.filter((t) => t !== s.id).map(titleOf);
    const own = targetTier.get(s.id);
    if (own && goal === 'tool') return "It's what you came to learn.";
    if (own) {
      const list = own === 'hire' ? 'hiring list' : own === 'firstYear' ? 'first-year list' : 'good-to-have list';
      return others.length > 0
        ? `It's on the ${list} for ${role.title}, and ${listOf(others)} also ${others.length === 1 ? 'needs' : 'need'} it.`
        : `It's on the ${list} for ${role.title}.`;
    }
    return `${listOf(others)} ${others.length === 1 ? 'needs' : 'need'} it.`;
  };

  const kindOf = (id: string) => index.get(id)?.kind ?? 'concept';

  const stateOf = (s: PlanStep): 'done' | 'ready' | 'waiting' =>
    done.has(s.id) ? 'done' : s.waitingOn.every((p) => done.has(p)) ? 'ready' : 'waiting';

  const pace = PACES.some((p) => p.hours === me.pace) ? me.pace! : DEFAULT_PACE;
  const train = useMemo(() => coaches(plan.steps, pace), [plan.steps, pace]);
  const nextStop = plan.steps.find((s) => !done.has(s.id) && s.waitingOn.every((p) => done.has(p)));
  const finished = plan.steps.filter((s) => done.has(s.id));
  const hoursLeft = plan.steps.filter((s) => !done.has(s.id)).reduce((h, s) => h + s.hours, 0);
  const left = plan.steps.length - finished.length;

  const byArea = areas
    .map((a) => {
      const steps = plan.steps.filter((s) => s.area === a.id);
      return { ...a, total: steps.length, done: steps.filter((s) => done.has(s.id)).length };
    })
    .filter((a) => a.total > 0);

  const toggleDone = (id: string) =>
    setMe((m) => ({ ...m, done: m.done.includes(id) ? m.done.filter((x) => x !== id) : [...m.done, id] }));
  const skip = (id: string) => {
    openPanel(null);
    setMe((m) => ({ ...m, known: [...m.known, id], done: m.done.filter((x) => x !== id) }));
  };
  const unskip = (id: string) => setMe((m) => ({ ...m, known: m.known.filter((x) => x !== id) }));
  const setView = (v: 'list' | 'map') => setRoleState((r) => ({ ...r, view: v }));

  const acceptIncoming = () => {
    if (incoming) setMe((m) => ({ ...m, ...mergeProgress(m, incoming) }));
    setIncoming(null);
  };
  const have = useMemo(() => new Set([...known, ...done]), [known, done]);

  return (
    <div className={view === 'map' ? 'planner is-map' : 'planner'}>
      {incoming && (
        <div className="incoming" role="dialog" aria-label="Progress from another device">
          <p>
            This link brings progress from another device: {incoming.done.length} {incoming.done.length === 1 ? 'stop' : 'stops'} done
            {incoming.known.length > 0 && `, ${incoming.known.length} skipped`}. Add it to this device? Nothing here is lost.
          </p>
          <div className="incoming-actions">
            <button className="btn btn-small" onClick={acceptIncoming}>Add it here</button>
            <button className="text-button" onClick={() => setIncoming(null)}>Ignore</button>
          </div>
        </div>
      )}
      <div className="planner-main">
        <div className="controls">
          <label className="control">
            <span className="control-label">Starting as</span>
            <select
              value={background?.id ?? ''}
              onChange={(e) => setMe((m) => ({ ...m, background: e.target.value || undefined }))}
              className={background ? undefined : 'unset'}
            >
              <option value="">Select your background</option>
              {backgroundGroups.map((g) => (
                <optgroup key={g.id} label={g.title}>
                  {backgrounds.filter((b) => b.group === g.id).map((b) => (
                    <option key={b.id} value={b.id}>{b.title}</option>
                  ))}
                </optgroup>
              ))}
              {jobs.length > 0 && (
                <optgroup label="Already working as">
                  {jobs.filter((j) => j.id !== `role:${role.id}`).map((j) => (
                    <option key={j.id} value={j.id}>{j.title}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </label>
          <label className="control">
            <span className="control-label">Study time</span>
            <select value={pace} onChange={(e) => setMe((m) => ({ ...m, pace: Number(e.target.value) }))}>
              {PACES.map((p) => (
                <option key={p.hours} value={p.hours}>{p.label}</option>
              ))}
            </select>
          </label>
          {usedTiers.length > 1 && (
            <div className="control">
              <span className="control-label" id="tier-label">How far</span>
              <div className="tabs" role="group" aria-labelledby="tier-label">
                {usedTiers.map((t) => (
                  <button key={t.id} aria-pressed={t.id === tier} onClick={() => setRoleState((r) => ({ ...r, tier: t.id }))}>
                    {t.id === 'hire' ? t.title : `+ ${t.title.toLowerCase()}`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {!background && loaded && (
          <p className="choose-bg">
            This is the full route, from the very beginning. Pick your background above and anything your degree
            already covers is left out.
          </p>
        )}
        {switchingFrom && loaded && (
          <p className="choose-bg switching">
            Switching from {switchingFrom.title}: {fullLength - plan.steps.length} of {fullLength} stops are already
            behind you, so this route is only what's new.
          </p>
        )}
        <div className="summary" aria-live="polite">
          {left === 0 ? (
            <p className="summary-main">
              {goal === 'tool'
                ? `You've finished every stop on this route, ${role.title} included.`
                : "You've finished every stop on this route. Try the next tier, or another role."}
            </p>
          ) : (
            <>
              <p className="summary-main">
                <strong>{duration(hoursLeft, pace)}</strong> at {pace} hours a week
                {loaded && <>, arriving around <strong>{monthYear(hoursLeft / pace)}</strong></>}.
              </p>
              {nextStop && (
                <p className="summary-next">
                  Next stop: <button className="link-button" onClick={() => openPanel(nextStop.id)}>{nextStop.title}</button>,{' '}
                  {duration(nextStop.hours, pace)}.
                </p>
              )}
              <p className="summary-small quiet">
                {left} {left === 1 ? 'stop' : 'stops'}, {hourRange(hoursLeft).join('–')} hours of study in all.
                {finished.length > 0 && <> You've finished {finished.length}.</>}
              </p>
            </>
          )}
        </div>
        <div className="tabs view-switch" role="group" aria-label="View">
          <button aria-pressed={view === 'list'} onClick={() => setView('list')}>List</button>
          <button aria-pressed={view === 'map'} onClick={() => setView('map')}>Map</button>
        </div>

        {view === 'map' ? (
          <Suspense fallback={<p className="faint map-loading">Drawing the map…</p>}>
            <RouteMap
              steps={plan.steps}
              stateOf={stateOf}
              areaTitle={(id) => areaTitle.get(id) ?? id}
              onToggle={toggleDone}
              kindOf={kindOf}
              onOpen={openPanel}
            />
          </Suspense>
        ) : (
        <>
        <p className="hint faint">
          Open a stop to see the book, the video course and the practice for it. Tick its circle when you've finished.
          Longer than a YouTube course promises? The video is in here too; the rest of the time is practice, which is
          what makes it stick.
        </p>

        <nav className="train" aria-label="Your train">
          <span className="engine" aria-hidden="true" />
          {train.map((c) => {
            const d = c.stops.filter((s) => done.has(s.id)).length;
            return (
              <a
                key={c.number}
                href={`#coach-${c.number}`}
                className={d === c.stops.length ? 'coach-chip is-done' : 'coach-chip'}
                title={`${weeksLabel(c.weeks)}: ${d} of ${c.stops.length} done`}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(`coach-${c.number}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                <span className="coach-fill" style={{ width: `${(d / c.stops.length) * 100}%` }} />
                <span className="coach-num">{c.number}</span>
              </a>
            );
          })}
          <span className="train-terminus">{role.title}</span>
        </nav>

        {train.map((c) => {
          const d = c.stops.filter((s) => done.has(s.id)).length;
          return (
            <section key={c.number} className="coach" id={`coach-${c.number}`} data-done={d === c.stops.length}>
              <header className="coach-head">
                <h3>{weeksLabel(c.weeks)}</h3>
                <span className="coach-count num">{d === c.stops.length ? 'Done' : `${d} of ${c.stops.length} done`}</span>
              </header>
              <ol className="route">
              {c.stops.map((s) => {
                const state = stateOf(s);
                const status =
                  state === 'done'
                    ? 'Done.'
                    : state === 'ready'
                      ? 'Ready to start.'
                      : `After ${listOf(s.waitingOn.filter((p) => !done.has(p)).map(titleOf))}.`;
                return (
                  <li key={s.id} className="stop" data-area={s.area} data-state={state} data-kind={kindOf(s.id)}>
                    <button
                      className="station"
                      aria-pressed={state === 'done'}
                      aria-label={state === 'done' ? `Mark ${s.title} as not done` : `Mark ${s.title} as done`}
                      title={state === 'done' ? 'Mark as not done' : 'Mark as done'}
                      onClick={() => toggleDone(s.id)}
                    >
                      <Tick />
                    </button>
                    <div className="stop-body">
                      <div className="stop-head">
                        <button className="stop-title" aria-haspopup="dialog" onClick={() => openPanel(s.id)}>{s.title}</button>
                        {kindOf(s.id) !== 'concept' && <span className="kind">{kindOf(s.id) === 'tool' ? 'Tool' : 'Project'}</span>}
                        <span className="stop-hours">{s.hours} h</span>
                      </div>
                      <p className="stop-sub">
                        <span className="area-name">{areaTitle.get(s.area)}</span>. {status}
                        {state !== 'done' && index.get(s.id)?.skipLabel && (
                          <>
                            {' '}
                            <button className="text-button skip-inline" onClick={() => skip(s.id)}>
                              {index.get(s.id)!.skipLabel}
                            </button>
                          </>
                        )}
                      </p>
                    </div>
                  </li>
                );
              })}
              </ol>
            </section>
          );
        })}
        {plan.steps.length > 0 && (
          <div className="terminus-end">
            <p className="terminus-board">
              <span className="terminus-label">Terminus</span>
              {role.title}
            </p>
            <p className="route-end">
              {goal === 'tool' ? (
                <>That's the whole route to {role.title}.</>
              ) : (
                <>
                  That's the end of the {tier === 'hire' ? 'hiring' : tier === 'firstYear' ? 'first-year' : 'good-to-have'} list
                  for {role.title}. The project is what you show at interviews, so finish it before you apply, then practise the interview rounds.
                  {tier !== usedTiers[usedTiers.length - 1]!.id && ' Switch "How far" to see what comes after.'}
                </>
              )}
            </p>
          </div>
        )}
        </>
        )}
      </div>

      <aside className="planner-side" aria-label="Progress">
        <section>
          <h2 className="side-heading">Progress by area</h2>
          <ul className="areas">
            {byArea.map((a) => (
              <li key={a.id} data-area={a.id}>
                <div className="area-row">
                  <span className="area-chip">{a.title}</span>
                  <span className="num faint">{a.done}/{a.total}</span>
                </div>
                <div className="area-bar"><span style={{ width: `${(a.done / a.total) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="side-heading">Left out</h2>
          {!background ? (
            <p className="quiet small">Nothing yet. Pick your background and what it covers is left out.</p>
          ) : (
          <>
          <p className="quiet small">{background.description}</p>
          {background.knows.length === 0 ? (
            <p className="quiet small">So nothing is left out. Skip anything you already know as you go.</p>
          ) : background.knows.length <= 5 ? (
            <p className="quiet small">So {listOf(background.knows.map(titleOf))} {background.knows.length === 1 ? 'is' : 'are'} left out.</p>
          ) : (
            <details className="quiet small left-out">
              <summary>{background.knows.length} topics are left out</summary>
              <p>{listOf(background.knows.map(titleOf))}.</p>
            </details>
          )}
          </>
          )}
          {me.known.length > 0 && (
            <ul className="skipped">
              {me.known.map((id) => (
                <li key={id}>
                  {titleOf(id)} <button className="text-button" onClick={() => unskip(id)}>Put it back</button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {goal === 'role' && (
          <ClosestJobs index={index} have={have} exclude={[role.id]} pace={pace} />
        )}
        <CalendarExport
          stops={plan.steps.filter((s) => !done.has(s.id)).map((s) => ({ id: s.id, title: s.title, hours: s.hours }))}
          pace={pace}
          goal={role.title}
          roleId={role.id}
          routePath={goal === 'tool' ? `/tools/${role.id}` : `/roles/${role.id}`}
        />
        <ProgressLink progress={{ background: me.background, known: me.known, done: me.done, pace: me.pace }} />

        {(me.known.length > 0 || me.done.length > 0) && (
          <button
            className="text-button start-over"
            onClick={() => {
              if (confirm('Clear everything you have ticked and skipped? This affects every role and tool.')) {
                setMe((m) => ({ ...m, known: [], done: [] }));
              }
            }}
          >
            Clear my progress
          </button>
        )}
      </aside>

      {panel && (
        <StopPanel
          id={panel}
          roleTitle={role.title}
          why={(() => {
            const step = plan.steps.find((x) => x.id === panel);
            if (step) return why(step);
            if (known.has(panel)) return "You've marked this as something you already know.";
            return goal === 'tool'
              ? `It isn't on your route to ${role.title}.`
              : `It isn't on your route for ${midSentence(role.title)} at this tier.`;
          })()}
          done={done.has(panel)}
          isTarget={targetTier.has(panel)}
          areaTitle={(id) => areaTitle.get(id) ?? id}
          titleOf={titleOf}
          onClose={() => openPanel(null)}
          onOpen={openPanel}
          onToggleDone={() => toggleDone(panel)}
          onSkip={() => skip(panel)}
        />
      )}
    </div>
  );
}
