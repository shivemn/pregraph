// Built once at deploy time into /search.json. The search box fetches it the
// first time someone focuses it.
import type { SearchDoc } from '../lib/search';
import { content } from '../lib/site';

export function GET() {
  const c = content();
  const resources = new Map(c.resources.map((r) => [r.id, r]));
  const shelved = new Set(c.toolGroups.flatMap((g) => g.tools));
  const docs: SearchDoc[] = c.concepts.map((x) => ({
    id: x.id,
    title: x.title,
    area: x.area,
    summary: x.summary,
    sources: x.resources
      .map((s) => resources.get(s.resource)!)
      .map((r) => `${r.title} ${r.short ?? ''} ${r.author}`)
      .join(' ')
      // Tool ids double as the names people type: "cpp", "nodejs", "golang".
      .concat(shelved.has(x.id) ? ` ${x.id.replace(/-/g, ' ')}${x.id === 'go' ? ' golang' : ''}` : ''),
    ...(shelved.has(x.id) ? { tool: true } : {}),
  }));
  // Jobs too, so "java developer" or "soc analyst" finds its route.
  const family = new Map(c.families.map((f) => [f.id, f.title]));
  const title = new Map(c.roles.map((r) => [r.id, r.title]));
  for (const r of c.roles) {
    docs.push({
      id: r.id,
      title: r.title,
      area: '',
      summary: r.summary,
      sources: `${r.search ?? ''} ${r.variantOf ? title.get(r.variantOf) : ''} ${family.get(r.family) ?? ''} job role career`,
      href: `/roles/${r.id}`,
      label: r.kind === 'exam' ? 'Exam' : 'Job',
    });
  }
  // Designs, so "design whatsapp" or "upi" finds the worked design.
  for (const d of c.designs) {
    docs.push({
      id: `design-${d.id}`,
      title: d.title,
      area: '',
      summary: d.summary,
      sources: `${d.like} system design case study`,
      href: `/designs/${d.id}`,
      label: 'Design',
    });
  }
  return new Response(JSON.stringify(docs), { headers: { 'Content-Type': 'application/json' } });
}
