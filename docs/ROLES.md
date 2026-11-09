# How roles get checked

Every role in `content/roles.yaml` starts as a draft: a list of what we think the job needs, split into three tiers. A draft is a guess. This page is how a guess becomes something you can defend.

## The tiers

- **To get hired** (`hire`): what a fresher needs to clear the interviews and be useful from week one.
- **First year on the job** (`firstYear`): what you'll be expected to pick up once you're in.
- **Good to have** (`extra`): asked about often, required rarely.

## Collecting evidence

1. **Pick the role, region and level.** For now that's India and 0–2 years of experience.
2. **Collect about 50 real postings**, by hand, from LinkedIn, Naukri and company career pages. Copy them one at a time. Don't scrape: most job sites forbid it in their terms, and 50 is an afternoon's work anyway.
3. **Tag each posting** with the concept ids it asks for, and save it as one row in `research/postings/<role-id>.csv`. Copy the header from `TEMPLATE.csv`. Translate the posting's words into our ids: "Spring Boot" is `backend-framework`, "REST" is `rest-apis`, "Docker/containers" is `docker`. Skip vague asks like "good communication".
4. **Run** `npm run evidence -- <role-id>`. It prints the share of postings asking for each concept, the tier it would suggest, and where that differs from the current list. It also flags tags that aren't concept ids yet, which usually means a missing concept.
5. **Decide, then write it down.** The suggestions use simple cut-offs: asked for by at least half the postings suggests `hire`, a fifth to a half `firstYear`, less than that `extra`. Treat them as a starting point, not a rule. Postings under-report some things. Almost no posting says "data structures and algorithms", yet nearly every SDE interview in India tests them. When you keep something in a tier against the numbers, say why in the `note`.
6. **Add the evidence block** to the role:

```yaml
  evidence:
    postings: 52
    region: India, 0–2 years
    collected: 2026-11
    note: DSA kept in "hire" although postings rarely list it; interview loops test it.
```

The role page then says "Checked against 52 entry-level Naukri listings in November 2026" instead of "Draft", with a link to the CSV. Job titles on that route say their route was checked.

The first 25 routes were checked this way in November 2026; how is in `research/postings/README.md`.

## Routes and job titles

A **route** is a set of skills with its own hiring list, in `content/roles.yaml`: backend engineer, data engineer, SOC analyst. A **job title** is what employers actually post, in `content/variants.yaml`: Java developer, Python developer, Power BI developer. Most titles are a route plus a tool or two, so a title only says what it adds and drops:

```yaml
- id: python-developer
  title: Python developer
  extends: backend-engineer
  drops: [java]
  adds: [programming-basics, django]
  summary: "Writes backend services, scripts and automation in Python, most often with Django or FastAPI."
```

The loader turns it into a full role: the route's tiers without `drops`, with `adds` on the hiring list. It gets its own page, planner, job searches and search entry, and appears under its route on the roles page. Only routes go on the home page map. Add a new route when a title needs skills no route has (SAP, mainframes, chip design); add a title when it's a route with a twist. A title's salary link is checked separately and lives in `content/job-sites.yaml`.

## What the job looks like

Every job role page ends with "What the job looks like". It always has live searches on Naukri, LinkedIn and Indeed, built from the role's title (or its `search` field when the title isn't what employers write), and an official description such as O*NET when `reference` is set.

A role can also carry a `posting` block: a short summary of real entry-level listings, written in our own words, with how many listings named each skill. It's lighter than the evidence above (titles, experience and card tags rather than full postings) and doesn't take a role out of draft. Say where the listings came from in `method`, and keep the counts in `research/postings/`. The first five are in `research/postings/naukri-2026-11.md`.

## Keeping it honest

- Re-collect once a year. Job markets move. A workflow (`.github/workflows/yearly-postings.yml`) opens a "Re-check routes against job listings" issue every 1 November, with a checklist of the checked routes and the drafts still waiting. Work through it with the steps above, then close it.
- Keep the CSVs in the repo. They're the receipts.
- Exams such as GATE use the official syllabus instead of postings.
- Every resource link is checked on the 1st of each month by `.github/workflows/link-check.yml`, which runs `scripts/check-links.ts` over resources and certifications. If anything is broken or moved, it comments on (or opens) one issue, "Broken links found by the monthly check", with the list. Fix the URL in `content/resources.yaml` or `content/certifications.yaml`; if the page moved and its chapters changed, re-check the locators that point at it. You can run the same check by hand from the Actions tab ("Run workflow") or locally with `npm run check-links`.
- Every resource section that existed in November 2026 was opened and its locator checked, so those are `verified: true`. A new section starts as `verified: false` and the concept page says "Section not checked yet" until someone has opened it.
- Every job route ends in a project, offered at three levels: `projects: {beginner, intermediate, advanced}` in `roles.yaml`. Exactly one of the three sits on the hiring list and is the default; the planner swaps it when someone picks another level, and always puts it last. A job title inherits its route's levels unless `variants.yaml` overrides some. `npm run validate` fails if a route is missing a level, uses one project twice, or has none on its hiring list. Each project has a brief: what to build, what it must show, what to add if you have time, and how to present it.
