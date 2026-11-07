// Built once at deploy time into /search.json. The search box fetches it the
// first time someone focuses it.
import type { SearchDoc } from '../lib/search';
import { content } from '../lib/site';

export function GET() {
  const c = content();
  const resources = new Map(c.resources.map((r) => [r.id, r]));
  const docs: SearchDoc[] = c.concepts.map((x) => ({
    id: x.id,
    title: x.title,
    area: x.area,
    summary: x.summary,
    sources: x.resources
      .map((s) => resources.get(s.resource)!)
      .map((r) => `${r.title} ${r.short ?? ''} ${r.author}`)
      .join(' '),
  }));
  return new Response(JSON.stringify(docs), { headers: { 'Content-Type': 'application/json' } });
}
