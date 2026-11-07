# Changelog

## Week 7, later: new heading font

- Signs, headings and station names now use Teko, by the Indian Type Foundry, in place of Anek Latin. Mukta stays for reading text. Teko is self-hosted with a corrected size and vertical metrics, and fonts are now about 80 KB on a first visit instead of about 165 KB.

## Week 7: more roles, three picks per stop, and a new look

- **Six new roles:** data scientist, AI/LLM engineer, cloud engineer, application support engineer, security analyst (SOC) and embedded engineer. That's sixteen roles plus GATE. They brought 18 new concepts, tools and projects (LLMs and RAG, cloud networking and IAM, incident handling, log analysis, threat detection, microcontrollers and RTOS, and more) and a new Security area.
- **Read, watch, practise.** Every resource now says whether you read it, watch it or practise with it, and every stop shows one pick of each. New video sources include NPTEL courses (Madhavan Mukund's PDSA, Naveen Garg's DSA, IIT Kharagpur's DBMS, networks and Java, Y. N. Srikant's compilers, Sorav Bansal's OS, Balaraman Ravindran's ML), MIT 6.0001 and 6.042, CS50P, CS50W, Kurose's networking lectures, 3Blue1Brown and Karpathy. Practice comes from CSES, Exercism, Kaggle Learn, SQLBolt, Learn Git Branching, OverTheWire, picoCTF and PortSwigger's Web Security Academy. Missing picks say so and link to a pre-filled issue.
- **Stop panel.** Click any stop, in the list or on the map, to open a panel with the three picks, why it's on your route, what it needs and leads to, and done/skip buttons. Its data loads from `/stops.json` on first use. Links can point straight at one stop.
- **New look, based on the Mumbai local:** yellow station boards for page names, a ticket-style From/To picker, routes drawn as train lines, and type by Ek Type (Anek Latin and Mukta). Overpass is gone.
- `npm run validate -- --gaps` lists stops without a pick.

## Week 6: roles

Pregraph now starts from a job instead of a subject: "I'm a maths graduate and I'm aiming for Backend engineer."

- Ten tech roles plus GATE CS, in families (software, data, infrastructure, exams). Each role lists what it needs in three tiers: to get hired, first year on the job, and good to have. A "How far" switch picks the tier.
- Four starting points: maths graduate, engineering graduate (not CS), CS or IT graduate, and starting from zero.
- The graph grew to 57 concepts, 14 tools and 8 projects, with 68 resources. New areas: web development, infrastructure and operations, and mobile.
- Your ticks and skips are now shared across every role. The tier and view are remembered per role. Background and tier are kept in the link.
- Concept pages show which roles ask for each concept, and at which tier. Tools and projects are labelled, and projects are drawn as squares on the map.
- Every role is marked as a draft until it's backed by job postings. `docs/ROLES.md` describes how to collect them, and `npm run evidence -- <role>` counts them and suggests tiers.
- The old Maths to CS and From zero pages are gone; the roles replace them.

## Week 5: map and search

- Map view of the route. Stops sit in rows, each row below what it depends on. Selecting a stop lights up its whole chain. The layout is written from scratch in `src/lib/layout.ts` (longest-path rows, dummy nodes, barycentre sweeps, neighbour pull) and tested on random graphs.
- The map code only downloads when someone opens the map.
- Search in the header. It covers concept titles, summaries and the resources behind them, including the names people actually use (OSTEP, CLRS, 6.006). Press `/` to jump to it. It's plain TypeScript and costs about 1 KB per page.

## Week 4: redesign and planner

- New look based on transit maps. Each area is a coloured line, each concept a stop, and the route fills in as you finish stops. Overpass is self-hosted, and the light and dark themes were checked separately.
- Switch between a route's goals. The choice is kept in the URL, so a link opens the same plan.
- "Why?" on each stop says what needs it and what it opens up.
- Skip a stop you already know, and put it back later.
- Progress by area.
- New home page with a live preview of the route, reworked concept pages, and a 404 page.

## Weeks 2–3: the graph

- Grew from 15 to 40 concepts across seven areas, with 31 free resources.
- Goals: Core CS, GATE CS and Machine learning. Routes: Maths to CS, and CS from zero.
- Better ordering. Shortest-first put Git and Big-O before learning to program. Concepts are now picked by critical path, and the planner stays in the same area when something there is at least half as urgent.
- Areas moved into `content/areas.yaml`, so adding one is a content change.

## Week 1: start

- Design notes, the concepts guide, and the path engine (pruned backward walk, topological sort, cycle detection) with unit and property tests.
- Content schema and validator, a sample graph, a first version of the site, and CI.
