// The planner: the interactive part of a role page. It re-runs the path engine
// in the browser whenever you change something, and remembers your choices in
// localStorage (no account needed yet).
//
// What you know and what you've finished belong to you, not to one role, so
// they're stored once and shared across every role page. The tier and view
// you picked are stored per role.
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { indexConcepts, planPath, type ConceptNode, type PlanStep } from '../lib/graph';

// The map pulls in the layout code, so it only loads when someone opens it.
const RouteMap = lazy(() => import('./RouteMap'));

interface Named { id: string; title: string }
interface Background extends Named { description: string; knows: string[] }
type TierId = 'hire' | 'firstYear' | 'extra';

interface Props {
  role: { id: string; title: string; tiers: Record<TierId, string[]> };
  concepts: ConceptNode[];
  areas: Named[];
  tiers: Array<{ id: TierId; title: string }>;
  backgrounds: Background[];
}

interface Me {
  background?: string;
  /** Things you said you already know. They leave every plan, along with anything only they needed. */
  known: string[];
  /** Things you've finished. They stay in the plan, ticked. */
  done: string[];
}

interface RoleState {
  tier?: TierId;
  view?: 'list' | 'map';
}

const ME_KEY = 'pregraph:me';

function read<T>(key: string, fallback: T): T {
  try {
    return { ...fallback, ...(JSON.parse(localStorage.getItem(key) ?? 'null') ?? {}) };
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

export default function RolePlanner({ role, concepts, areas, tiers, backgrounds }: Props) {
  const roleKey = `pregraph:role:${role.id}`;
  const index = useMemo(() => indexConcepts(concepts), [concepts]);
  const areaTitle = useMemo(() => new Map(areas.map((a) => [a.id, a.title])), [areas]);
  const titleOf = (id: string) => index.get(id)?.title ?? id;
  const usedTiers = tiers.filter((t) => role.tiers[t.id].length > 0);

  const [me, setMe] = useState<Me>({ known: [], done: [] });
  const [roleState, setRoleState] = useState<RoleState>({});
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  // Read storage and the URL after the first render, so the server HTML and
  // the first client render match.
  useEffect(() => {
    const m = read<Me>(ME_KEY, { known: [], done: [] });
    const r = read<RoleState>(roleKey, {});
    const params = new URLSearchParams(location.search);
    const from = params.get('from');
    const tier = params.get('tier');
    if (from && backgrounds.some((b) => b.id === from)) m.background = from;
    if (tier && usedTiers.some((t) => t.id === tier)) r.tier = tier as TierId;
    setMe(m);
    setRoleState(r);
    setLoaded(true);
  }, [roleKey]);

  useEffect(() => {
    if (!loaded) return;
    write(ME_KEY, me);
    write(roleKey, roleState);
    const url = new URL(location.href);
    url.searchParams.set('from', background.id);
    if (tier !== 'hire') url.searchParams.set('tier', tier);
    else url.searchParams.delete('tier');
    history.replaceState(null, '', url);
  }, [me, roleState, loaded]);

  const background = backgrounds.find((b) => b.id === me.background) ?? backgrounds[0]!;
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

  const known = useMemo(() => new Set([...background.knows, ...me.known]), [background, me.known]);
  const done = useMemo(() => new Set(me.done), [me.done]);
  const plan = useMemo(() => planPath(index, targets, known), [index, targets, known]);
  const tierTitle = (t: TierId) => tiers.find((x) => x.id === t)!.title.toLowerCase();

  const why = (s: PlanStep) => {
    const others = s.neededFor.filter((t) => t !== s.id).map(titleOf);
    const own = targetTier.get(s.id);
    if (own) {
      const list = own === 'hire' ? 'what it takes to get hired' : own === 'firstYear' ? 'what the first year expects' : 'the good-to-have list';
      return others.length > 0
        ? `It's part of ${list} as a ${role.title.toLowerCase()}, and ${listOf(others)} also ${others.length === 1 ? 'needs' : 'need'} it.`
        : `It's part of ${list} as a ${role.title.toLowerCase()}.`;
    }
    return `${listOf(others)} ${others.length === 1 ? 'needs' : 'need'} it.`;
  };

  const kindOf = (id: string) => index.get(id)?.kind ?? 'concept';

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
    setMe((m) => ({ ...m, done: m.done.includes(id) ? m.done.filter((x) => x !== id) : [...m.done, id] }));
  const skip = (id: string) => {
    setOpen(null);
    setMe((m) => ({ ...m, known: [...m.known, id], done: m.done.filter((x) => x !== id) }));
  };
  const unskip = (id: string) => setMe((m) => ({ ...m, known: m.known.filter((x) => x !== id) }));
  const setView = (v: 'list' | 'map') => setRoleState((r) => ({ ...r, view: v }));

  return (
    <div className={view === 'map' ? 'planner is-map' : 'planner'}>
      <div className="planner-main">
        <div className="controls">
          <label className="control">
            <span className="control-label">Starting as</span>
            <select value={background.id} onChange={(e) => setMe((m) => ({ ...m, background: e.target.value }))}>
              {backgrounds.map((b) => (
                <option key={b.id} value={b.id}>{b.title}</option>
              ))}
            </select>
          </label>
          {usedTiers.length > 1 && (
            <div className="control">
              <span className="control-label" id="tier-label">How far</span>
              <div className="segmented" role="group" aria-labelledby="tier-label">
                {usedTiers.map((t) => (
                  <button key={t.id} aria-pressed={t.id === tier} onClick={() => setRoleState((r) => ({ ...r, tier: t.id }))}>
                    {t.id === 'hire' ? t.title : `+ ${t.title.toLowerCase()}`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <p className="summary" aria-live="polite">
          {left === 0 ? (
            <>You've finished every stop on this route. Try the next tier, or another role.</>
          ) : (
            <>
              <strong className="num">{left}</strong> {left === 1 ? 'stop' : 'stops'} to go, about{' '}
              <strong className="num">{hoursLeft}</strong> hours of study.
              {finished.length > 0 && <> You've finished {finished.length}.</>}
            </>
          )}
        </p>
        <div className="segmented view-switch" role="group" aria-label="View">
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
                    {kindOf(s.id) !== 'concept' && <span className="kind">{kindOf(s.id) === 'tool' ? 'Tool' : 'Project'}</span>}
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
        {plan.steps.length > 0 && (
          <p className="route-end">
            That's everything for {tierTitle(tier)}.
            {tier !== usedTiers[usedTiers.length - 1]!.id && ' Switch "How far" to see what comes after.'}
          </p>
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
          <p className="quiet small">{background.description}</p>
          {background.knows.length === 0 ? (
            <p className="quiet small">Nothing is left out when you start from zero.</p>
          ) : background.knows.length <= 5 ? (
            <p className="quiet small">So {listOf(background.knows.map(titleOf))} {background.knows.length === 1 ? 'is' : 'are'} left out.</p>
          ) : (
            <details className="quiet small left-out">
              <summary>{background.knows.length} topics are left out</summary>
              <p>{listOf(background.knows.map(titleOf))}.</p>
            </details>
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

        {(me.known.length > 0 || me.done.length > 0) && (
          <button
            className="text-button start-over"
            onClick={() => {
              if (confirm('Clear everything you have ticked and skipped? This affects every role.')) {
                setMe((m) => ({ ...m, known: [], done: [] }));
              }
            }}
          >
            Clear my progress
          </button>
        )}
      </aside>
    </div>
  );
}
