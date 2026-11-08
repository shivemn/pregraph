// Tiny search over the concept list. With a few hundred concepts a scored
// linear scan is instant, so there's no index library and nothing to load
// until someone actually types.

export interface SearchDoc {
  id: string;
  title: string;
  area: string;
  summary: string;
  /** Titles and authors of the resources that teach it, so "OSTEP" or "Strang" finds something. */
  sources: string;
  /** On the tools page, so results open the tool's own page. */
  tool?: boolean;
  /** Where the result goes, when it isn't a concept or tool page. */
  href?: string;
  /** Shown beside the title instead of the area, e.g. "Job". */
  label?: string;
}

export interface Hit {
  doc: SearchDoc;
  score: number;
}

export const normalise = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9+#]+/g, ' ').trim();

/** Every word in the query has to match somewhere. Title matches count most. */
export function search(docs: readonly SearchDoc[], query: string, limit = 8): Hit[] {
  const words = normalise(query).split(' ').filter(Boolean);
  if (words.length === 0) return [];
  const hits: Hit[] = [];
  for (const doc of docs) {
    const title = normalise(doc.title);
    const titleWords = title.split(' ');
    const sources = normalise(doc.sources);
    const summary = normalise(doc.summary);
    let score = 0;
    let all = true;
    for (const w of words) {
      if (titleWords.some((t) => t.startsWith(w))) score += 10;
      else if (title.includes(w)) score += 6;
      else if (sources.includes(w)) score += 3;
      else if (summary.includes(w)) score += 1;
      else {
        all = false;
        break;
      }
    }
    if (all) hits.push({ doc, score: score + (title.startsWith(words[0]!) ? 5 : 0) });
  }
  return hits.sort((a, b) => b.score - a.score || a.doc.title.localeCompare(b.doc.title)).slice(0, limit);
}
