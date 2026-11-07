// Everything the stop panel needs, for every concept. Fetched the first time
// someone opens a stop on a role page, then cached by the browser.
import { content } from '../lib/site';
import { stopDetails } from '../lib/stops';

export function GET() {
  const details = stopDetails(content());
  return new Response(JSON.stringify(Object.fromEntries(details.map((d) => [d.id, d]))), {
    headers: { 'Content-Type': 'application/json' },
  });
}
