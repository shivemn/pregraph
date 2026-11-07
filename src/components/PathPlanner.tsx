// The planner: the only interactive part of a path page. It re-runs the path
// engine in the browser whenever you change something, and remembers your
// choices in localStorage (no account needed yet).
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { indexConcepts, planPath, type ConceptNode, type PlanStep } from '../lib/graph';

// The map pulls in the layout code, so it only loads when someone opens it.
const RouteMap = lazy(() => import('./RouteMap'));

interface Named { id: string; title: string }
interface Goal extends Named { description: string; targets: string[] }

interface Props {
  slug: string;
  concepts: ConceptNode[];
  areas: Named[];
  goals: Goal[];
  backgroundTitle: string;
  backgroundKnows: string[];
}

interface Saved {
  goal?: string;
  view?: 'list' | 'map';
  /** Concepts you said you already know. They leave the plan, along with anything only they needed. */
  known: string[];
  /** Concepts you've finished. They stay in the plan, ticked. */
  done: string[];
}

const empty: Saved = { known: [], done: [] };

function load(key: string): Saved {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? 'null') as Partial<Saved> | null;
    return { goal: parsed?.goal, view: parsed?.view, known: parsed?.known ?? [], done: parsed?.done ?? [] };
  } catch {
    return empty; // private browsing, blocked storage or a corrupt value
  }
}

function save(key: string, value: Saved) {
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

export default function PathPlanner({ slug, concepts, areas, goals, backgroundTitle, backgroundKnows }: Props) {
  const key = `pregraph:${slug}`;
  const index = useMemo(() => indexConcepts(concepts), [concepts]);
  const areaTitle = useMemo(() => new Map(areas.map((a) => [a.id, a.title])), [areas]);
  const titleOf = (id: string) => index.get(id)?.title ?? id;

  const [saved, setSaved] = useState<Saved>(empty);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  // Read storage and the URL after the first render, so the server HTML and
  // the first client render match.
  useEffect(() => {
    const fromStorage = load(key);
    const fromUrl = new URLSearchParams(location.search).get('goal');
    if (fromUrl && goals.some((g) => g.id === fromUrl)) fromStorage.goal = fromUrl;
    setSaved(fromStorage);
    setLoaded(true);
  }, [key, goals]);

  useEffect(() => {
    if (!loaded) return;
    save(key, saved);
    const url = new URL(location.href);
    if (saved.goal && saved.goal !== goals[0]!.id) url.searchParams.set('goal', saved.goal);
    else url.searchParams.delete('goal');
    history.replaceState(null, '', url);
  }, [key, saved, loaded, goals]);

  const goal = goals.find((g) => g.id === saved.goal) ?? goals[0]!;
  const view = saved.view ?? 'list';
  const known = useMemo(() => new Set([...backgroundKnows, ...saved.known]), [backgroundKnows, saved.known]);
  const done = useMemo(() => new Set(saved.done), [saved.done]);
  const plan = useMemo(() => planPath(index, goal.targets, known), [index, goal, known]);

  const why = (s: PlanStep) => {
    const others = s.neededFor.filter((t) => t !== s.id).map(titleOf);
    if (goal.targets.includes(s.id)) {
      return others.length > 0
        ? `It's one of the targets for ${goal.title}, and ${listOf(others)} also needs it.`
        : `It's one of the targets for ${goal.title}.`;
    }
    return `${listOf(others)} ${others.length === 1 ? 'needs' : 'need'} it, on the way to ${goal.title}.`;
  };

  const stateOf = (s: PlanStep): 'done' | 'ready' | 'waiting' =>
    done.has(s.id) ? 'done' : s.waitingOn.every((p) => done.has(p)) ? 'ready' : 'waiting';

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
    setSaved((s) => ({ ...s, done: s.done.includes(id) ? s.done.filter((x) => x !== id) : [...s.done, id] }));
  const skip = (id: string) => {
    setOpen(null);
    setSaved((s) => ({ ...s, known: [...s.known, id], done: s.done.filter((x) => x !== id) }));
  };
  const unskip = (id: string) => setSaved((s) => ({ ...s, known: s.known.filter((x) => x !== id) }));
  const chooseGoal = (id: string) => setSaved((s) => ({ ...s, goal: id }));

  return (
    <div className={view === 'map' ? 'planner is-map' : 'planner'}>
      <div className="planner-main">
        <div className="goal-picker">
          <span className="goal-label" id="goal-label">I want to reach</span>
          <div className="segmented" role="group" aria-labelledby="goal-label">
            {goals.map((g) => (
              <button key={g.id} aria-pressed={g.id === goal.id} onClick={() => chooseGoal(g.id)}>
                {g.title}
              </button>
            ))}
          </div>
          <p className="goal-description quiet">{goal.description}</p>
        </div>

        <p className="summary" aria-live="polite">
          {left === 0 ? (
            <>You've finished every stop on this route.</>
          ) : (
            <>
              <strong className="num">{left}</strong> {left === 1 ? 'stop' : 'stops'} to go, about{' '}
              <strong className="num">{hoursLeft}</strong> hours of study.
              {finished.length > 0 && <> You've finished {finished.length}.</>}
            </>
          )}
        </p>
        <div className="segmented view-switch" role="group" aria-label="View">
          <button aria-pressed={view === 'list'} onClick={() => setSaved((s) => ({ ...s, view: 'list' }))}>List</button>
          <button aria-pressed={view === 'map'} onClick={() => setSaved((s) => ({ ...s, view: 'map' }))}>Map</button>
        </div>

        {view === 'map' ? (
          <Suspense fallback={<p className="faint map-loading">Drawing the map…</p>}>
            <RouteMap
              steps={plan.steps}
              stateOf={stateOf}
              areaTitle={(id) => areaTitle.get(id) ?? id}
              onToggle={toggleDone}
            />
          </Suspense>
        ) : (
        <>
        <p className="hint faint">Click a stop's circle when you've finished it. Use "Why?" to see what a stop leads to, or to skip it if you already know it.</p>

        <ol className="route">
          {plan.steps.map((s) => {
            const state = stateOf(s);
            const isOpen = open === s.id;
            const status =
              state === 'done'
                ? 'Done.'
                : state === 'ready'
                  ? 'Ready to start.'
                  : `After ${listOf(s.waitingOn.filter((p) => !done.has(p)).map(titleOf))}.`;
            return (
              <li key={s.id} className="stop" data-area={s.area} data-state={state}>
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
                    <a className="stop-title" href={`/concepts/${s.id}`}>{s.title}</a>
                    <span className="stop-hours">{s.hours} h</span>
                  </div>
                  <p className="stop-sub">
                    <span className="area-name">{areaTitle.get(s.area)}</span>. {status}{' '}
                    <button
                      className="why-toggle"
                      aria-expanded={isOpen}
                      aria-label={`Why is ${s.title} on this route?`}
                      onClick={() => setOpen(isOpen ? null : s.id)}
                    >
                      Why?
                    </button>
                  </p>
                  {isOpen && (
                    <div className="why">
                      <p>{why(s)}</p>
                      {s.unlocks.length > 0 && <p>Opens up {listOf(s.unlocks.map(titleOf))}.</p>}
                      <div className="stop-tools">
                        <a className="text-button" href={`/concepts/${s.id}`}>Where to learn it</a>
                        <button className="text-button" onClick={() => skip(s.id)}>Skip it, I already know this</button>
                      </div>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        {plan.steps.length > 0 && <p className="route-end">That's the whole route for {goal.title}.</p>}
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
          <p className="quiet small">
            As a {backgroundTitle.toLowerCase()} you already know {listOf(backgroundKnows.map(titleOf))}.
          </p>
          {saved.known.length > 0 && (
            <ul className="skipped">
              {saved.known.map((id) => (
                <li key={id}>
                  {titleOf(id)} <button className="text-button" onClick={() => unskip(id)}>Put it back</button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {(saved.known.length > 0 || saved.done.length > 0) && (
          <button
            className="text-button start-over"
            onClick={() => {
              if (confirm('Clear your ticks and skips on this route?')) setSaved({ goal: saved.goal, known: [], done: [] });
            }}
          >
            Start this route over
          </button>
        )}
      </aside>
    </div>
  );
}
