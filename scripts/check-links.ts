/**
 * `npm run check-links` — tries every resource URL and lists the ones that
 * fail. Run it on your own machine (it needs the open internet). Some sites
 * block scripts or need a browser, so treat a failure as "check by hand",
 * not "definitely dead".
 */
import { loadContent } from '../src/lib/content';

const c = loadContent();
const urls = [...new Map(c.resources.map((r) => [r.url, r])).values()];
const TIMEOUT = 15_000;

async function check(url: string): Promise<string | null> {
  for (const method of ['HEAD', 'GET']) {
    try {
      const res = await fetch(url, {
        method,
        redirect: 'follow',
        signal: AbortSignal.timeout(TIMEOUT),
        headers: { 'User-Agent': 'Mozilla/5.0 (link check for Pregraph)' },
      });
      if (res.ok) return null;
      if (method === 'GET') return `HTTP ${res.status}`;
    } catch (err) {
      if (method === 'GET') return (err as Error).name === 'TimeoutError' ? 'timed out' : (err as Error).message;
    }
  }
  return 'unknown';
}

const failures: string[] = [];
let done = 0;
const queue = [...urls];
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (queue.length) {
      const r = queue.shift()!;
      const problem = await check(r.url);
      done++;
      if (problem) failures.push(`${problem.padEnd(14)} ${r.id}  ${r.url}`);
      process.stdout.write(`\rChecked ${done}/${urls.length}`);
    }
  }),
);
console.log(failures.length ? `\n\n${failures.length} to look at:\n${failures.sort().join('\n')}` : '\n\nAll links answered.');
