// The route drawn as a map: stops in rows, each row below everything it
// depends on. Select a stop to light up its whole chain, before and after.
import { useMemo, useState } from 'react';
import type { PlanStep } from '../lib/graph';
import { curvePath, layeredLayout } from '../lib/layout';

type State = 'done' | 'ready' | 'waiting';

interface Props {
  steps: PlanStep[];
  stateOf: (s: PlanStep) => State;
  areaTitle: (id: string) => string;
  onToggle: (id: string) => void;
  kindOf: (id: string) => string;
}

/** Projects are drawn as squares, so the label can drop its "Project:" prefix. */
const label = (title: string) => {
  const t = title.replace(/^Project:\s*/, '');
  return t.charAt(0).toUpperCase() + t.slice(1);
};

const NODE_WIDTH = 138;

/** Up to two lines of about `max` characters, breaking at spaces. */
function wrap(text: string, max = 17): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    if (line && (line + ' ' + word).length > max) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  lines.push(line);
  return lines.length <= 2 ? lines : [lines[0]!, `${lines.slice(1).join(' ').slice(0, max - 1)}…`];
}

/** Lines leave from under a stop's label and arrive at the top of the next dot. */
function trim(points: Array<[number, number]>, fromTitle: string): Array<[number, number]> {
  const out = points.map(([x, y]) => [x, y] as [number, number]);
  out[0]![1] += wrap(fromTitle).length === 1 ? 38 : 53;
  out[out.length - 1]![1] -= 12;
  return out;
}

export default function RouteMap({ steps, stateOf, areaTitle, onToggle, kindOf }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const byId = useMemo(() => new Map(steps.map((s) => [s.id, s])), [steps]);
  const layout = useMemo(() => {
    const edges = steps.flatMap((s) => s.waitingOn.map((p) => [p, s.id] as const));
    return layeredLayout(steps.map((s) => s.id), edges, { nodeWidth: NODE_WIDTH, rowGap: 124 });
  }, [steps]);

  // Everything upstream and downstream of the focused stop.
  const focus = hovered ?? selected;
  const related = useMemo(() => {
    if (!focus || !byId.has(focus)) return null;
    const seen = new Set([focus]);
    const walk = (id: string, next: (s: PlanStep) => string[]) => {
      for (const n of next(byId.get(id)!)) {
        if (!seen.has(n)) {
          seen.add(n);
          walk(n, next);
        }
      }
    };
    walk(focus, (s) => s.waitingOn);
    const up = new Set(seen);
    seen.clear();
    seen.add(focus);
    walk(focus, (s) => s.unlocks);
    return new Set([...up, ...seen]);
  }, [focus, byId]);

  const picked = selected ? byId.get(selected) : undefined;

  return (
    <div className="route-map">
      <div className="map-detail" aria-live="polite">
        {picked ? (
          <>
            <div data-area={picked.area}>
              <a className="map-detail-title" href={`/concepts/${picked.id}`}>{picked.title}</a>
              <p className="quiet small">
                <span className="area-name">{areaTitle(picked.area)}</span>, about {picked.hours} hours.
                {picked.waitingOn.length > 0 ? ` Needs ${picked.waitingOn.length} earlier ${picked.waitingOn.length === 1 ? 'stop' : 'stops'}.` : ' Nothing before it.'}
                {picked.unlocks.length > 0 && ` Opens up ${picked.unlocks.length}.`}
              </p>
            </div>
            <div className="map-detail-tools">
              <button className="text-button" onClick={() => onToggle(picked.id)}>
                {stateOf(picked) === 'done' ? 'Mark as not done' : 'Mark as done'}
              </button>
              <button className="text-button" onClick={() => setSelected(null)}>Clear</button>
            </div>
          </>
        ) : (
          <p className="faint small">Select a stop to light up what it needs and what it leads to. Each row only depends on rows above it. Squares are projects.</p>
        )}
      </div>

      <div className="map-scroll">
        <svg
          width={layout.width}
          height={layout.height + 40}
          // Shrink to fit if it's only a little too wide; past that, scroll instead.
          style={{ width: '100%', maxWidth: layout.width, minWidth: Math.round(layout.width * 0.8), height: 'auto' }}
          viewBox={`0 0 ${layout.width} ${layout.height + 40}`}
          role="group"
          aria-label="Map of the route"
          className={related ? 'has-focus' : undefined}
        >
          <g className="map-edges">
            {layout.edges.map((e) => (
              <path
                key={`${e.from}>${e.to}`}
                d={curvePath(trim(e.points, label(byId.get(e.from)!.title)))}
                className={related && related.has(e.from) && related.has(e.to) ? 'on' : undefined}
              />
            ))}
          </g>
          {layout.layers.flat().map((id) => {
            const s = byId.get(id)!;
            const p = layout.nodes.get(id)!;
            const lines = wrap(label(s.title));
            return (
              <g
                key={id}
                className={`map-stop${related?.has(id) ? ' on' : ''}${selected === id ? ' picked' : ''}`}
                data-area={s.area}
                data-state={stateOf(s)}
                transform={`translate(${p.x},${p.y})`}
                tabIndex={0}
                role="button"
                aria-pressed={selected === id}
                aria-label={`${s.title}, ${stateOf(s) === 'done' ? 'done' : 'not done'}`}
                onClick={() => setSelected(selected === id ? null : id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelected(selected === id ? null : id);
                  }
                }}
                onMouseEnter={() => setHovered(id)}
                onMouseLeave={() => setHovered(null)}
              >
                <circle className="halo" r="17" />
                {kindOf(id) === 'project' ? (
                  <rect className="dot" x="-9" y="-9" width="18" height="18" rx="3" />
                ) : (
                  <circle className="dot" r="9" />
                )}
                <text y="30" textAnchor="middle">
                  {lines.map((l, i) => (
                    <tspan key={i} x="0" dy={i === 0 ? 0 : 15}>{l}</tspan>
                  ))}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
