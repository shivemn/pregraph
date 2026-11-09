// Links from a job role out to job sites. Every address pattern here was
// checked in a browser on 8 November 2026; content/job-sites.yaml holds the
// per-role page names that a plain search can't guess.
import type { JobSites, Role, Startups } from './schema';

export interface JobLink {
  name: string;
  note?: string;
  url: string;
}

export interface JobLinkGroup {
  title: string;
  links: JobLink[];
}

/** What employers call the job: the title before any "/" or "(", or the role's `search`. */
export function searchTerm(role: Pick<Role, 'title' | 'search'>): string {
  return (role.search ?? role.title.split(/[/(]/)[0]!).trim();
}

const ABBREVIATIONS: Record<string, string> = { ai: 'AI', ml: 'ML', sql: 'SQL', api: 'API', mis: 'MIS', ui: 'UI', ux: 'UX', qa: 'QA', it: 'IT', sdet: 'SDET', soc: 'SOC', iot: 'IoT', vapt: 'VAPT', nlp: 'NLP', llm: 'LLM', etl: 'ETL', dba: 'DBA', aws: 'AWS', gcp: 'GCP', fp: 'FP', mysql: 'MySQL', postgresql: 'PostgreSQL', mongodb: 'MongoDB', js: 'JS' };
/** "react-js-developer" → "React js developer", for saying whose salary page it is. */
function titleFromSlug(slug: string): string {
  const words = slug.split('-').map((w) => ABBREVIATIONS[w] ?? w);
  const s = words.join(' ');
  return /^[A-Z]{2}/.test(s) ? s : s.charAt(0).toUpperCase() + s.slice(1);
}
/** Close enough that the salary page is for this title: same words once spelled out. */
function sameTitle(slug: string, title: string): boolean {
  const norm = (x: string) => x.toLowerCase().replace(/c#/g, 'c sharp').replace(/c\+\+/g, 'c plus plus').replace(/\.net/g, 'dot net').replace(/\(.*\)/g, '').replace(/\bdba\b/g, 'database administrator').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '');
  return norm(slug) === norm(title) || norm(slug).replace(/engineer|developer|administrator/g, '') === norm(title).replace(/engineer|developer|administrator|admin|dba/g, '');
}

const slugOf = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function jobLinks(role: Pick<Role, 'title' | 'search'>, sites: JobSites | undefined): JobLinkGroup[] {
  const term = searchTerm(role);
  // "software engineer fresher" is a good Naukri search, but the other sites
  // have their own fresher filters, so they get the plain title.
  const plain = term.replace(/\s+fresher$/i, '');
  const q = encodeURIComponent(plain);
  const slug = slugOf(plain);
  const lower = plain.toLowerCase();

  const groups: JobLinkGroup[] = [
    {
      title: 'Job boards',
      links: [
        { name: 'Naukri', note: 'freshers', url: `https://www.naukri.com/${slugOf(term)}-jobs?experience=0` },
        { name: 'LinkedIn', url: `https://www.linkedin.com/jobs/search/?keywords=${q}&location=India` },
        { name: 'Glassdoor', url: `https://www.glassdoor.co.in/Job/${slug}-jobs-SRCH_KO0,${lower.length}.htm` },
        { name: 'Indeed', url: `https://in.indeed.com/jobs?q=${q}` },
      ],
    },
    {
      title: 'Freshers and interns',
      links: [
        { name: 'Internshala', note: 'jobs', url: `https://internshala.com/jobs/keywords-${slug}/` },
        { name: 'Internshala', note: 'internships', url: `https://internshala.com/internships/keywords-${slug}/` },
      ],
    },
  ];

  const startups: JobLink[] = [];
  if (sites?.wellfound) startups.push({ name: 'Wellfound', url: `https://wellfound.com/role/l/${sites.wellfound}/india` });
  if (sites?.yc) {
    startups.push({ name: 'YC startups', note: 'India', url: `https://www.ycombinator.com/jobs/role/${sites.yc}/india` });
    startups.push({ name: 'YC startups', note: 'remote', url: `https://www.ycombinator.com/jobs/role/${sites.yc}/remote` });
  }
  if (startups.length) groups.push({ title: 'Startups', links: startups });

  if (sites?.ambitionbox) {
    groups.push({
      title: 'Pay and reviews',
      links: [
        {
          name: 'AmbitionBox',
          // Some titles have no salary page of their own; say whose it is.
          note: sameTitle(sites.ambitionbox, plain) || sameTitle(sites.ambitionbox, role.title) ? 'salaries' : `salaries for ${titleFromSlug(sites.ambitionbox)}`,
          url: `https://www.ambitionbox.com/profile/${sites.ambitionbox}-salary`,
        },
      ],
    });
  }
  return groups;
}

/**
 * A job title uses its route's startup pages, which are about the kind of job
 * rather than the title. Salary pages are per title, so only its own count.
 */
export function sitesFor(all: Record<string, JobSites>, role: Pick<Role, 'id' | 'variantOf'>): JobSites | undefined {
  const own = all[role.id];
  const base = role.variantOf ? all[role.variantOf] : undefined;
  if (!base) return own;
  return {
    ...base,
    ambitionbox: own?.ambitionbox,
    wellfound: own?.wellfound ?? base.wellfound,
    yc: own?.yc ?? base.yc,
    kinds: own?.kinds.length ? own.kinds : base.kinds,
  };
}

/** Where candidates post the questions they were asked for this job. Both stay current on their own. */
export function interviewLinks(role: Pick<Role, 'title' | 'search'>, sites: JobSites | undefined): JobLink[] {
  const plain = searchTerm(role).replace(/\s+fresher$/i, '');
  const links: JobLink[] = [
    { name: 'Glassdoor', url: `https://www.glassdoor.co.in/Interview/${slugOf(plain)}-interview-questions-SRCH_KO0,${plain.length}.htm` },
  ];
  if (sites?.ambitionbox) links.push({ name: 'AmbitionBox', url: `https://www.ambitionbox.com/profiles/${sites.ambitionbox}/interview-questions` });
  return links;
}

/** The interview loop a role usually follows: its own, or its route's. */
export function loopFor<T extends { routes: string[] }>(loops: T[], role: Pick<Role, 'id' | 'variantOf'>): T | undefined {
  return loops.find((l) => l.routes.includes(role.id)) ?? (role.variantOf ? loops.find((l) => l.routes.includes(role.variantOf!)) : undefined);
}

/** How many YC startup postings in India matched this role when the snapshot was taken. */
export function startupMatch(sites: JobSites | undefined, s: Startups) {
  const kinds = (sites?.kinds ?? []).filter((k) => s.kinds[k]);
  if (kinds.length === 0) return undefined;
  const n = kinds.reduce((sum, k) => sum + s.kinds[k]!.n, 0);
  const newGrad = kinds.reduce((sum, k) => sum + s.kinds[k]!.newGrad, 0);
  const skills = new Map<string, number>();
  for (const k of kinds) for (const [skill, c] of s.kinds[k]!.top) skills.set(skill, (skills.get(skill) ?? 0) + c);
  const top = [...skills].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([skill]) => skill);
  const companies = s.companies.filter((c) => c.kinds.some((k) => kinds.includes(k))).length;
  return { kinds, n, newGrad, top, companies, collected: s.collected };
}
