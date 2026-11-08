/**
 * `npm run check-sections` sorts the chapter and lecture references that
 * nobody has checked yet, so a person only has to open the doubtful ones.
 * Run it on your own machine (it needs the open internet).
 *
 * For each unchecked section it loads the resource's page and looks for the
 * names in the locator ("Accessing Data with JPA", "Sorted sets"). It can't
 * tell whether "Chapter 5" is about recursion, so references that are only
 * numbers always go to a person. Nothing is marked verified automatically:
 * the report says where to look, and `verified: true` stays a human decision.
 */
import { loadContent } from '../src/lib/content';

const c = loadContent();
const resources = new Map(c.resources.map((r) => [r.id, r]));
const TIMEOUT = 20_000;

// Words that say where something is rather than what it is.
const STOP = new Set(
  ('the then and with from into onto that this your their every each start finish whole full course video videos ' +
    'playlist lecture lectures chapter chapters part parts section sections week weeks track lesson lessons unit units ' +
    'module modules first last before after alongside about through including only also more most until up end ' +
    'book guide notes slides exercises problems problem sets set intro introduction overview basics tutorial tutorials ' +
    'pick dataset care build publish page one two three own same other read watch practise practice ' +
    'order series later free time levels getting started units').split(' '),
);

const norm = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9+#]+/g, ' ').trim();

/** The words in a locator that name something, rather than count or point. */
function names(locator: string): string[] {
  return [...new Set(norm(locator).split(' ').filter((w) => w.length >= 4 && !STOP.has(w) && !/^\d+$/.test(w)))];
}

function textOf(html: string): string {
  return norm(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&#39;|&rsquo;|&#x27;/g, "'")
      .replace(/&[a-z#0-9]+;/gi, ' '),
  );
}

const YOUTUBE = /^https:\/\/www\.youtube\.com\/(watch|playlist)/;

async function pageText(url: string): Promise<string> {
  // YouTube pages are built by script; oEmbed gives the title and channel.
  const target = YOUTUBE.test(url) ? `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}` : url;
  const res = await fetch(target, {
    redirect: 'follow',
    signal: AbortSignal.timeout(TIMEOUT),
    headers: { 'User-Agent': 'Mozilla/5.0 (section check for Pregraph)' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.text();
  if (YOUTUBE.test(url)) {
    const j = JSON.parse(body) as { title?: string; author_name?: string };
    return norm(`${j.title ?? ''} ${j.author_name ?? ''}`);
  }
  return textOf(body);
}

interface Item {
  concept: string;
  resource: string;
  locator: string;
  url: string;
}
const items: Item[] = c.concepts.flatMap((x) =>
  x.resources
    .filter((s) => !s.verified)
    .map((s) => ({ concept: x.id, resource: s.resource, locator: s.locator, url: resources.get(s.resource)!.url })),
);

const pages = new Map<string, Promise<string>>();
const load = (url: string) => {
  if (!pages.has(url)) pages.set(url, pageText(url));
  return pages.get(url)!;
};

const found: string[] = [];
const partly: string[] = [];
const numbers: string[] = [];
const failed: string[] = [];
const line = (i: Item, extra = '') => `  ${i.concept} / ${i.resource}: "${i.locator}"${extra}\n    ${i.url}`;

let done = 0;
const queue = [...items];
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (queue.length) {
      const item = queue.shift()!;
      const wanted = names(item.locator);
      try {
        const text = await load(item.url);
        if (wanted.length === 0) numbers.push(line(item));
        else {
          const missing = wanted.filter((w) => !text.includes(w));
          if (missing.length === 0) found.push(line(item));
          else if (missing.length < wanted.length) partly.push(line(item, `  (not on the page: ${missing.join(', ')})`));
          else partly.push(line(item, '  (none of its names are on the page)'));
        }
      } catch (err) {
        failed.push(line(item, `  (${(err as Error).message})`));
      }
      done++;
      process.stdout.write(`\rChecked ${done}/${items.length}`);
    }
  }),
);

console.log('\n');
const section = (title: string, lines: string[]) =>
  lines.length > 0 && console.log(`${title} (${lines.length})\n${lines.sort().join('\n')}\n`);
section('Names found on the page. A quick look, then set verified: true', found);
section('Some names missing. Open these and fix the locator', partly);
section('Only numbers, so a person has to open the book or course', numbers);
section("Page didn't load from a script. Open it in a browser", failed);
console.log(`${items.length} unchecked sections in all. Linked pages are often only the front page, so "missing" can`);
console.log('mean the table of contents is somewhere else. Nothing is marked verified automatically.');
