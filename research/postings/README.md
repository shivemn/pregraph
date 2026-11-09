# Job postings behind the routes

One CSV per route, `<route-id>.csv`: the entry-level listings it was checked
against, one row each, tagged with the Terminus stops each listing asks for.
`npm run evidence -- <route-id>` turns a file into shares per stop.

## November 2026: 25 routes, 749 listings

- **Where:** Naukri, India, searched with the experience filter at 0 years, on 9 November 2026. The search term is the route's usual title ("data analyst", "devops engineer", "soc analyst" for the security analyst route, "application support engineer" for support).
- **Which listings:** the first 30 results, skipping repeats of the same title at the same company. Ranking is Naukri's, so sponsored listings and large employers are over-represented.
- **How they were tagged:** each listing was opened and its key skills and description were matched against a fixed list of phrases for every stop ("Power BI", "Tableau" or "Looker" count as BI tools; "SIEM", "SOC" or "incident response" as threat detection). The phrase list is `phrases-2026-11.json` (regular expressions per stop) and is deliberately strict for vague words: "API", "reports" or "cloud" only count when they're listed as a key skill, not when they appear in the company blurb. Descriptions themselves were not copied.
- **What was thrown out:** the VLSI search returned mostly unrelated engineering jobs, so it isn't used. A "consulting" phrase matched company names rather than skills, so it was removed from every file. In the electrical and embedded files, "transformer" means the machine, not the AI model.
- **Limits:** a listing that doesn't name a skill may still test it (data structures in SDE interviews are the usual example), and 30 listings is a sample, not a census. Where a route keeps a stop against the numbers, its `evidence.note` in `content/roles.yaml` says why.

The earlier card-level counts are in `naukri-2026-11.md`.
