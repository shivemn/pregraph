// The panel that slides in when you open a stop: what it is, why it's on your
// route, and the three things to learn it from (a book, a video course, and
// practice). Details for every stop come from /stops.json, fetched once.
import { useEffect, useRef, useState, type ReactElement } from 'react';
import type { Source, StopDetail } from '../lib/stops';

type Medium = 'read' | 'watch' | 'practice';

let cache: Promise<Record<string, StopDetail>> | null = null;
const loadStops = () =>
  (cache ??= fetch('/stops.json').then((r) => {
    if (!r.ok) throw new Error(`stops.json: ${r.status}`);
    return r.json();
  }));

const ICONS: Record<Medium, ReactElement> = {
  read: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5.5C6 4 9 4 12 6c3-2 6-2 9-.5V19c-3-1.5-6-1.5-9 .5-3-2-6-2-9-.5z" /><path d="M12 6v13.5" /></svg>
  ),
  watch: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="1.5" /><path d="M10 9.2v5.6l4.6-2.8z" className="fill" /></svg>
  ),
  practice: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1.2-4.6L15.6 5a1.9 1.9 0 0 1 2.7 0l.7.7a1.9 1.9 0 0 1 0 2.7L8.6 18.8z" /><path d="M13.5 7l3.5 3.5" /></svg>
  ),
};

const LABEL: Record<Medium, string> = { read: 'Read', watch: 'Watch', practice: 'Practise' };
const MISSING: Record<Medium, string> = {
  read: 'No book or written guide picked yet.',
  watch: 'No video course picked yet.',
  practice: 'No practice set picked yet.',
};

interface Props {
  id: string;
  roleTitle: string;
  why: string;
  done: boolean;
  isTarget: boolean;
  areaTitle: (id: string) => string;
  titleOf: (id: string) => string;
  onClose: () => void;
  onOpen: (id: string) => void;
  onToggleDone: () => void;
  onSkip: () => void;
}

function Pick({ medium, source, stopTitle }: { medium: Medium; source?: Source; stopTitle: string }) {
  return (
    <div className={`pick${source ? '' : ' missing'}`}>
      <div className="pick-label">{ICONS[medium]}{LABEL[medium]}</div>
      {source ? (
        <div className="pick-body">
          <a className="pick-title" href={source.url} target="_blank" rel="noopener">{source.title}</a>
          <p className="faint">{source.author}</p>
          <p className="pick-use">{source.locator}</p>
          {source.why && <p className="quiet">{source.why}</p>}
          {(!source.free || !source.verified) && (
            <p className="flags">
              {!source.free && <span className="flag paid">Paid</span>}
              {!source.verified && <span className="flag" title="Nobody has opened it yet to confirm the chapter or lecture numbers.">Section not checked yet</span>}
            </p>
          )}
        </div>
      ) : (
        <div className="pick-body">
          <p className="quiet">{MISSING[medium]}</p>
          <a
            className="text-button"
            href={`https://github.com/shivemn/pregraph/issues/new?title=${encodeURIComponent(`${LABEL[medium]} pick for ${stopTitle}`)}`}
            target="_blank"
            rel="noopener"
          >
            Suggest one
          </a>
        </div>
      )}
    </div>
  );
}

export default function StopPanel(props: Props) {
  const { id, onClose } = props;
  const [stops, setStops] = useState<Record<string, StopDetail> | null>(null);
  const [failed, setFailed] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    loadStops().then(setStops, () => setFailed(true));
  }, []);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [id, onClose]);

  const stop = stops?.[id];

  return (
    <>
      <div className="panel-backdrop" onClick={onClose} />
      <aside className="panel" role="dialog" aria-labelledby="panel-title" data-area={stop?.area}>
        <button ref={closeRef} className="panel-close" onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>

        {!stop ? (
          <p className="quiet panel-loading">{failed ? 'Couldn’t load this stop. Check your connection and try again.' : 'Loading…'}</p>
        ) : (
          <>
            <p className="panel-chips">
              <span className="area-chip">{props.areaTitle(stop.area)}</span>
              {stop.kind !== 'concept' && <span className="kind">{stop.kind === 'tool' ? 'Tool' : 'Project'}</span>}
            </p>
            <h2 id="panel-title">{stop.title}</h2>
            <p className="panel-summary">{stop.summary}</p>
            <p className="quiet small">
              About {stop.hours} hours{stop.kind === 'project' ? ' to build' : ''}. {props.why}
            </p>

            <section className="picks" aria-label="Where to learn it">
              {(['read', 'watch', 'practice'] as Medium[]).map((m) => (
                <Pick key={m} medium={m} source={stop.picks[m]} stopTitle={stop.title} />
              ))}
            </section>

            {stop.others.length > 0 && (
              <details className="others">
                <summary>{stop.others.length} more {stop.others.length === 1 ? 'option' : 'options'}</summary>
                <ul>
                  {stop.others.map((s, i) => (
                    <li key={i}>
                      <a href={s.url} target="_blank" rel="noopener">{s.title}</a>
                      <span className="faint"> ({LABEL[s.medium].toLowerCase()}{s.role === 'deep-dive' ? ', to go deeper' : ''}{s.free ? '' : ', paid'})</span>
                      <br />
                      <span className="quiet">{s.locator}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {(stop.requires.length > 0 || stop.unlocks.length > 0) && (
              <div className="links">
                {stop.requires.length > 0 && (
                  <p>
                    <span className="links-label">Needs</span>
                    {stop.requires.map((r) => (
                      <button key={r} className="link-chip" onClick={() => props.onOpen(r)}>{props.titleOf(r)}</button>
                    ))}
                  </p>
                )}
                {stop.unlocks.length > 0 && (
                  <p>
                    <span className="links-label">Opens up</span>
                    {stop.unlocks.map((r) => (
                      <button key={r} className="link-chip" onClick={() => props.onOpen(r)}>{props.titleOf(r)}</button>
                    ))}
                  </p>
                )}
              </div>
            )}

            <div className="panel-actions">
              <button className="btn" onClick={props.onToggleDone}>
                {props.done ? 'Mark as not done' : 'Mark as done'}
              </button>
              {!props.isTarget && <button className="text-button" onClick={props.onSkip}>Skip it, I know this</button>}
              <a className="text-button" href={`/concepts/${stop.id}`}>Full page</a>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
