// Every job route and its hiring list, for "Closest jobs from where you are".
// Fetched on demand, so role pages stay small.
import { content } from '../lib/site';

export function GET() {
  const c = content();
  const routes = c.roles
    .filter((r) => r.kind !== 'exam' && !r.variantOf)
    .map((r) => ({ id: r.id, title: r.title, hire: r.tiers.hire }));
  return new Response(JSON.stringify(routes), { headers: { 'Content-Type': 'application/json' } });
}
