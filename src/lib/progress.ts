/**
 * Moving progress between devices without an account: everything you've
 * ticked, skipped and chosen, packed into a short code that rides in a link.
 */

export interface Progress {
  background?: string;
  known: string[];
  done: string[];
  pace?: number;
}

const PREFIX = 't1.';

function toBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): string {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

/** Short keys and comma lists keep the code small enough for a chat message. */
export function encodeProgress(p: Progress): string {
  const packed: Record<string, string | number> = {};
  if (p.background) packed.b = p.background;
  if (p.known.length) packed.k = p.known.join(',');
  if (p.done.length) packed.d = p.done.join(',');
  if (p.pace) packed.p = p.pace;
  return PREFIX + toBase64Url(JSON.stringify(packed));
}

const ID = /^[a-z0-9:-]+$/;

/** Undefined for anything that isn't a code this site made. Never throws. */
export function decodeProgress(code: string): Progress | undefined {
  try {
    if (!code.startsWith(PREFIX)) return undefined;
    const raw = JSON.parse(fromBase64Url(code.slice(PREFIX.length))) as Record<string, unknown>;
    const list = (v: unknown) => (typeof v === 'string' && v ? v.split(',').filter((x) => ID.test(x)) : []);
    const out: Progress = { known: list(raw.k), done: list(raw.d) };
    if (typeof raw.b === 'string' && ID.test(raw.b)) out.background = raw.b;
    if (typeof raw.p === 'number' && raw.p > 0 && raw.p <= 80) out.pace = raw.p;
    return out;
  } catch {
    return undefined;
  }
}

/** Adds what the link brought to what's already here; nothing is lost on either side. */
export function mergeProgress(here: Progress, incoming: Progress): Progress {
  const known = [...new Set([...here.known, ...incoming.known])];
  const done = [...new Set([...here.done, ...incoming.done])].filter((id) => !known.includes(id));
  return {
    background: incoming.background ?? here.background,
    known,
    done,
    pace: incoming.pace ?? here.pace,
  };
}
