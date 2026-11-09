/**
 * `npm run check-links` tries every resource and certificate URL and lists
 * the ones that fail. It needs the open internet: run it on your own machine,
 * or let the monthly GitHub workflow (.github/workflows/link-check.yml) run it.
 *
 * `npm run check-links -- --markdown report.md` also writes the result as
 * Markdown, which the workflow posts as an issue when something is broken.
 *
 * Two kinds of failure are usually false alarms, so they're listed separately:
 * - certificate problems: some university servers send an incomplete
 *   certificate chain. Browsers repair that themselves; Node doesn't.
 * - 403 / 429: the site blocks scripts but works fine in a browser.
 * Anything else is worth opening by hand.
 */
import { writeFileSync } from 'node:fs';
import { loadContent } from '../src/lib/content';

const c = loadContent();
const targets = [
  ...c.resources.map((r) => ({ id: r.id, url: r.url })),
  ...c.certifications.map((x) => ({ id: `certificate ${x.id}`, url: x.url })),
];
const urls = [...new Map(targets.map((r) => [r.url, r])).values()];
const TIMEOUT = 15_000;
const CERT = /CERT|SIGNATURE|SELF_SIGNED|ISSUER/i;

type Result = { kind: 'ok' } | { kind: 'cert' | 'blocked' | 'broken'; detail: string };

async function check(url: string): Promise<Result> {
  let last: Result = { kind: 'broken', detail: 'unknown' };
  for (const method of ['HEAD', 'GET']) {
    try {
      const res = await fetch(url, {
        method,
        redirect: 'follow',
        signal: AbortSignal.timeout(TIMEOUT),
        headers: { 'User-Agent': 'Mozilla/5.0 (link check for Terminus)' },
      });
      if (res.ok) return { kind: 'ok' };
      last = [401, 403, 429].includes(res.status)
        ? { kind: 'blocked', detail: `HTTP ${res.status}` }
        : { kind: 'broken', detail: `HTTP ${res.status}` };
    } catch (err) {
      const e = err as Error & { cause?: { code?: string; message?: string } };
      const code = e.cause?.code ?? e.cause?.message ?? e.name;
      last = CERT.test(code ?? '')
        ? { kind: 'cert', detail: code! }
        : { kind: 'broken', detail: e.name === 'TimeoutError' ? 'timed out' : (code ?? e.message) };
    }
  }
  return last;
}

const found: Record<'cert' | 'blocked' | 'broken', string[]> = { cert: [], blocked: [], broken: [] };
let done = 0;
const queue = [...urls];
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (queue.length) {
      const r = queue.shift()!;
      const res = await check(r.url);
      done++;
      if (res.kind !== 'ok') found[res.kind].push(`${res.detail.padEnd(32)} ${r.id}  ${r.url}`);
      process.stdout.write(`\rChecked ${done}/${urls.length}`);
    }
  }),
);

console.log('\n');
const section = (title: string, lines: string[]) => lines.length && console.log(`${title}\n${lines.sort().join('\n')}\n`);
section('Broken or moved. Open these and fix them:', found.broken);
section('Blocked scripts. Usually fine in a browser; worth a quick look:', found.blocked);
section('Certificate chain problems. These normally open fine in browsers:', found.cert);
if (!found.broken.length && !found.blocked.length && !found.cert.length) console.log('All links answered.');

const mdAt = process.argv.indexOf('--markdown');
if (mdAt !== -1 && process.argv[mdAt + 1]) {
  const list = (title: string, lines: string[]) =>
    lines.length ? `### ${title}\n\n${lines.sort().map((l) => `- \`${l.trim().replace(/\s+/g, ' ')}\``).join('\n')}\n\n` : '';
  const md =
    `Checked ${urls.length} links on ${new Date().toISOString().slice(0, 10)}.\n\n` +
    list('Broken or moved: open these and fix them in content/', found.broken) +
    list('Blocked scripts: usually fine in a browser, worth a quick look', found.blocked) +
    list('Certificate chain problems: these normally open fine in browsers', found.cert) +
    (found.broken.length + found.blocked.length + found.cert.length === 0 ? 'Every link answered.\n' : '');
  writeFileSync(process.argv[mdAt + 1], md);
}
// A non-zero exit marks the workflow run red when something is really broken.
if (found.broken.length) process.exitCode = 1;
