import { describe, expect, it } from 'vitest';
import { normalise, search, type SearchDoc } from '../src/lib/search';
import { loadContent } from '../src/lib/content';

const c = loadContent();
const resources = new Map(c.resources.map((r) => [r.id, r]));
const docs: SearchDoc[] = c.concepts.map((x) => ({
  id: x.id,
  title: x.title,
  area: x.area,
  summary: x.summary,
  sources: x.resources.map((s) => { const r = resources.get(s.resource)!; return `${r.title} ${r.short ?? ''} ${r.author}`; }).join(' '),
}));
const top = (q: string) => search(docs, q)[0]?.doc.id;

describe('search', () => {
  it('ranks title matches first', () => {
    expect(top('graph')).toBe('graph-algorithms');
    expect(top('dynamic')).toBe('dynamic-programming');
  });

  it('finds concepts by the resources that teach them', () => {
    expect(search(docs, 'three easy pieces').map((h) => h.doc.id)).toContain('concurrency');
    // Strang wrote the linear algebra lectures and co-wrote the OpenStax calculus books.
    expect(search(docs, 'strang').map((h) => h.doc.id)).toEqual(expect.arrayContaining(['linear-algebra', 'calculus']));
    expect(search(docs, 'ostep').map((h) => h.doc.id)).toContain('file-systems');
    expect(search(docs, '6.006')).not.toEqual([]);
  });

  it('needs every word to match', () => {
    expect(search(docs, 'graph zebra')).toEqual([]);
  });

  it('ignores case, accents and punctuation', () => {
    expect(normalise('  Big-O, Running  TIME ')).toBe('big o running time');
    expect(top('BIG-o')).toBe('complexity-analysis');
  });

  it('returns nothing for an empty query', () => {
    expect(search(docs, '   ')).toEqual([]);
  });
});
