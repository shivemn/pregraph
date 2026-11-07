/**
 * The interactive planner — the only JavaScript island on the page.
 * Re-runs the path engine in the browser whenever you tick something, and
 * saves your choices in localStorage (no account needed in v0).
 */
import { useEffect, useMemo, useState } from 'react';
import { indexConcepts, planPath, type ConceptNode } from '../lib/graph';

interface Props {
  slug: string;
  concepts: ConceptNode[];
  goals: string[];
  backgroundKnows: string[];
}

interface Saved {
  /** Concepts you said you already know: removed from the plan (with anything only they needed). */
  known: string[];
  /** Concepts you finished while following the plan: stay in the list, ticked. */
  done: string[];
}

const empty: Saved = { known: [], done: [] };

function load(key: string): Saved {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<Saved>;
    return { known: parsed.known ?? [], done: parsed.done ?? [] };
  } catch {
    return empty; // private window, blocked storage, or corrupt JSON
  }
}

function save(key: string, value: Saved) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: progress lasts for this visit only */
  }
}

export default function PathPlanner({ slug, concepts, goals, backgroundKnows }: Props) {
  const key = `pregraph:${slug}`;
  const index = useMemo(() => indexConcepts(concepts), [concepts]);
  const [saved, setSaved] = useState<Saved>(empty);
  const [loaded, setLoaded] = useState(false);

  // Read storage after the first render so server HTML and client HTML match.
  useEffect(() => {
    setSaved(load(key));
    setLoaded(true);
  }, [key]);
  useEffect(() => {
    if (loaded) save(key, saved);
  }, [key, saved, loaded]);

  const known = useMemo(() => new Set([...backgroundKnows, ...saved.known]), [backgroundKnows, saved.known]);
  const done = useMemo(() => new Set(saved.done), [saved.done]);
  const plan = useMemo(() => planPath(index, goals, known), [index, goals, known]);

  const doneSteps = plan.steps.filter((s) => done.has(s.id));
  const hoursLeft = plan.steps.filter((s) => !done.has(s.id)).reduce((h, s) => h + s.hours, 0);
  const canStart = (id: string) => plan.steps.find((s) => s.id === id)!.waitingOn.every((p) => done.has(p));
  const nextUp = plan.steps.filter((s) => !done.has(s.id) && canStart(s.id));

  const toggleDone = (id: string) =>
    setSaved((s) => ({ ...s, done: s.done.includes(id) ? s.done.filter((x) => x !== id) : [...s.done, id] }));
  const markKnown = (id: string) =>
    setSaved((s) => ({ known: [...s.known, id], done: s.done.filter((x) => x !== id) }));
  const unmarkKnown = (id: string) => setSaved((s) => ({ ...s, known: s.known.filter((x) => x !== id) }));

  const pct = plan.steps.length === 0 ? 100 : Math.round((doneSteps.length / plan.steps.length) * 100);

  return (
    <div className="planner">
      <div className="stats">
        <div><strong>{plan.steps.length}</strong> steps</div>
        <div><strong>{hoursLeft}</strong> hours left</div>
        <div><strong>{pct}%</strong> done</div>
      </div>
      <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <span style={{ width: `${pct}%` }} />
      </div>

      {nextUp.length > 0 && (
        <p className="next">
          <span className="label">Start here</span>{' '}
          {nextUp.map((s, i) => (
            <span key={s.id}>
              {i > 0 && ' · '}
              <a href={`/concepts/${s.id}`}>{s.title}</a>
            </span>
          ))}
        </p>
      )}

      <ol className="steps">
        {plan.steps.map((s, i) => {
          const isDone = done.has(s.id);
          const ready = canStart(s.id);
          return (
            <li key={s.id} className={`step${isDone ? ' done' : ''}${!isDone && !ready ? ' waiting' : ''}`}>
              <label className="check">
                <input type="checkbox" checked={isDone} onChange={() => toggleDone(s.id)} aria-label={`Mark ${s.title} as done`} />
              </label>
              <div className="body">
                <div className="title">
                  <span className="num">{i + 1}</span>
                  <a href={`/concepts/${s.id}`}>{s.title}</a>
                </div>
                <div className="meta">
                  {s.area} · ~{s.hours}h
                  {s.waitingOn.length > 0 && (
                    <> · after {s.waitingOn.map((p) => index.get(p)!.title).join(', ')}</>
                  )}
                </div>
              </div>
              {goals.includes(s.id) ? (
                <span className="goal" title="One of this path's goals">Goal</span>
              ) : (
                <button className="ghost" onClick={() => markKnown(s.id)} title="Remove this and anything only it needed">
                  I know this
                </button>
              )}
            </li>
          );
        })}
      </ol>

      {saved.known.length > 0 && (
        <p className="muted small">
          You said you already know:{' '}
          {saved.known.map((id, i) => (
            <span key={id}>
              {i > 0 && ', '}
              {index.get(id)?.title ?? id}{' '}
              <button className="link" onClick={() => unmarkKnown(id)}>undo</button>
            </span>
          ))}
        </p>
      )}
      {(saved.known.length > 0 || saved.done.length > 0) && (
        <button className="ghost" onClick={() => setSaved(empty)}>Reset my progress</button>
      )}

      <style>{css}</style>
    </div>
  );
}

const css = `
.planner .stats { display: flex; gap: 24px; flex-wrap: wrap; font-size: 0.95rem; color: var(--muted); }
.planner .stats strong { font-family: var(--serif); font-size: 1.5rem; color: var(--ink); margin-right: 4px; }
.planner .bar { height: 6px; background: var(--line); border-radius: 99px; overflow: hidden; margin: 8px 0 16px; }
.planner .bar span { display: block; height: 100%; background: var(--accent); transition: width .25s; }
.planner .label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: .06em; color: var(--accent); font-weight: 600; }
.planner .steps { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
.planner .step { display: flex; align-items: center; gap: 12px; background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; }
.planner .step.done { opacity: .6; }
.planner .step.done .title a { text-decoration: line-through; }
.planner .step.waiting { border-style: dashed; }
.planner .check input { width: 20px; height: 20px; accent-color: var(--accent); }
.planner .body { flex: 1; min-width: 0; }
.planner .title { display: flex; gap: 8px; align-items: baseline; font-weight: 600; }
.planner .title a { color: var(--ink); text-decoration: none; }
.planner .title a:hover { color: var(--accent); text-decoration: underline; }
.planner .num { font-family: var(--serif); color: var(--muted); font-weight: 400; min-width: 1.5em; }
.planner .meta { font-size: 0.85rem; color: var(--muted); }
.planner .ghost { background: none; border: 1px solid var(--line); color: var(--muted); border-radius: 8px; padding: 4px 10px; font-size: 0.85rem; white-space: nowrap; }
.planner .ghost:hover { border-color: var(--accent); color: var(--accent); }
.planner .goal { font-size: 0.75rem; padding: 1px 8px; border-radius: 99px; background: var(--accent-soft); color: var(--accent); }
.planner .link { background: none; border: 0; padding: 0; color: var(--accent); text-decoration: underline; font-size: inherit; }
.planner .small { font-size: 0.875rem; }
@media (max-width: 520px) { .planner .step { flex-wrap: wrap; } .planner .ghost { margin-left: 32px; } }
`;
