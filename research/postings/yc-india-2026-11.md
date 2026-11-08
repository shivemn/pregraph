# YC startups in India, November 2026

The receipts behind the "At startups" note on role pages. The data is in `content/startups/yc-india.json`.

## How it was collected

- On 8 November 2026, the YC startup directory filtered to companies headquartered in India and hiring (https://www.ycombinator.com/companies?regions=India&isHiring=true) listed 53 companies.
- Each company's public jobs page (`/companies/<slug>/jobs`) was read in a browser: the title, kind of job, experience asked for, skills named and pay of each posting. 245 postings in all.
- 132 engineering, product, design and finance postings were counted. Sales, marketing, operations, legal and healthcare roles were left out because Terminus doesn't have routes for them.
- Only the counts and each company's name, batch, one-liner and city are kept. The postings themselves stay on YC, and the site links to each company's live jobs page.

## What it showed

- 23 of the 132 were open to new graduates (16) or were internships (7). 46 asked for 3+ years, 32 for 1+ year, 27 for 6+ years.
- The skills named most: Python 27, AWS 16, React 13, JavaScript 12, React Native, PostgreSQL, Figma and Angular 8 each, SQL 7, Node.js 6. Only 70 postings named any skills.
- Full stack (30), product (22) and backend (18) were the most common kinds of job.

## Job-site addresses

Checked the same day in a browser, for every job role:

- AmbitionBox salary pages, `/profile/<name>-salary`: a made-up name returns 404, so every name in `content/job-sites.yaml` is a real page. Frontend is `front-end-developer` and UI/UX is `ux-designer`.
- Wellfound, `/role/l/<name>/india`: pages exist for 30 of the 41 roles; the rest have no Wellfound page and are left out.
- Glassdoor India, `/Job/<words>-jobs-SRCH_KO0,<length>.htm`, works for any search.
- Internshala, `/jobs/keywords-<words>/` and `/internships/keywords-<words>/`, works for any search.
- YC, `/jobs/role/<category>/india`: categories are software-engineer, product-manager, designer, operations, support, science, marketing, sales-manager and recruiting-hr. Anything else falls back to software engineering, so only these are used.
