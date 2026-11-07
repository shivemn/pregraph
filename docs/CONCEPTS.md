# Concepts you'll learn building Pregraph

Every technique the project uses, in the order you'll meet it. Each entry says **what it is**, **where it shows up in Pregraph**, and **where to learn it** (free first).

Fittingly, this list is itself a small prerequisite graph: Part A comes before B, and B before C.

---

## Part A — The engine (graph theory you already half-know)

### A1. Directed graphs, DAGs and adjacency lists
**What:** A directed graph is a set of nodes and arrows. A *DAG* (directed acyclic graph) has no cycles. An *adjacency list* stores, for each node, the nodes it points to: `Map<id, id[]>`.
**In Pregraph:** concepts are nodes; "A must come before B" is the arrow `A → B`. `src/lib/graph.ts` builds two adjacency lists: forward (*what does this unlock?*) and reverse (*what does this need?*).
**Maths link:** a DAG is exactly a strict partial order; the transitive closure gives the full "comes before" relation.
**Learn from:**
- Sedgewick & Wayne, *Algorithms* 4e — [§4.2 Directed Graphs](https://algs4.cs.princeton.edu/42digraph/) (free site)
- CLRS — "Elementary Graph Algorithms" (ch. 22 in 3e, ch. 20 in 4e)

### A2. Graph traversal: DFS and BFS
**What:** two systematic ways to visit every reachable node: depth-first (go deep, back up) and breadth-first (layer by layer).
**In Pregraph:** step 1 of the engine walks *backwards* from your goals with an explicit stack (iterative DFS), stopping at concepts you already know. That pruned walk is what makes a path personal.
**Learn from:**
- [MIT 6.006 (Spring 2020)](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/) — the BFS and DFS lectures
- algs4 §4.2 (as above)

### A3. Topological sorting (Kahn's algorithm)
**What:** list the nodes of a DAG so every arrow points forward. Kahn's algorithm repeatedly removes a node with no incoming arrows.
**In Pregraph:** step 2 of the engine. When several concepts are ready at once, a tie-break rule picks one (stay in the same area → shorter first → alphabetical), so the output is stable and testable.
**Learn from:**
- [Wikipedia — Topological sorting](https://en.wikipedia.org/wiki/Topological_sorting) (both Kahn's and the DFS method)
- algs4 §4.2, "Topological sort"

### A4. Cycle detection
**What:** a DFS that colours nodes white / grey / black finds a cycle the moment it meets a grey node, i.e. one still on the current path.
**In Pregraph:** `npm run validate` refuses content with a prerequisite cycle and prints it (`a → b → c → a`). Without this, a single bad edit could make every plan impossible.
**Learn from:** CLRS DFS section ("white-path theorem", edge classification); algs4 `DirectedCycle.java`.

### A5. Complexity analysis in practice
**What:** big-O for real decisions, not exams.
**In Pregraph:** the engine is O(V² + E) because of the tie-break scan, and the design doc argues why that's fine for hundreds of nodes and when it stops being fine. Practise writing that argument.
**Learn from:** MIT 6.006 lectures 1–2; Skiena, *The Algorithm Design Manual*, ch. 2 (paid).

### A6. Testing: unit tests and property-based tests
**What:** unit tests check examples you chose. Property-based tests generate hundreds of random inputs and check a rule that must always hold.
**In Pregraph:** `tests/graph.test.ts`. Example properties: *for every random DAG, every concept in the plan appears after all its hard prerequisites*, and *nothing you marked as known appears in the plan*. That is a theorem statement turned into code.
**Learn from:** [Vitest](https://vitest.dev/guide/); [fast-check](https://fast-check.dev/) (property-based testing for JS/TS).

---

## Part B — The website (making it fast and free)

### B1. TypeScript
**What:** JavaScript with static types. Coming from Java, it'll feel familiar, but the types are structural (shape-based), not nominal.
**In Pregraph:** everything. `type Concept = { id: string; requires: string[]; … }`.
**Learn from:** [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html), especially "Everyday Types" and "Narrowing".

### B2. Schema validation and "content as code"
**What:** describe the shape of your data once, then check every file against it. Store content in Git so every change is a reviewable diff.
**In Pregraph:** `src/lib/schema.ts` uses **zod**. A typo like `requiers:` fails the build with a clear message instead of silently producing a broken path.
**Learn from:** [zod docs](https://zod.dev/).

### B3. Rendering strategies: static vs server vs client
**What:** pages can be built once at deploy time (static generation), on every request (server-side rendering), or in the browser (single-page app). Each trades freshness against speed and cost.
**In Pregraph:** content changes rarely, so every page is static. This one decision is why the site costs ₹0 and loads in milliseconds.
**Learn from:** [patterns.dev — rendering patterns](https://www.patterns.dev/); [web.dev — Rendering on the Web](https://web.dev/articles/rendering-on-the-web).

### B4. Islands architecture (Astro + React)
**What:** a mostly-HTML page with small interactive "islands" that load JavaScript. Everything else ships zero JS.
**In Pregraph:** the planner (`PathPlanner.tsx`) is the only island. Concept pages are plain HTML.
**Learn from:** [Astro docs — Islands](https://docs.astro.build/en/concepts/islands/); [react.dev/learn](https://react.dev/learn) for React itself (state, effects, props).

### B5. CDNs and HTTP caching
**What:** a CDN keeps copies of your files on servers worldwide; cache headers tell browsers and CDNs how long to keep them.
**In Pregraph:** Cloudflare Pages serves the built site from the edge. Learn why built JS files get long-lived cache headers (their names contain a content hash) while HTML is revalidated.
**Learn from:** [Cloudflare — What is a CDN?](https://www.cloudflare.com/learning/cdn/what-is-a-cdn/); [MDN — HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching).

### B6. Browser storage and offline-first
**What:** `localStorage` saves small key-value data in the browser. "Offline-first" means the app works without the network and syncs later.
**In Pregraph:** your ticked concepts live in localStorage in v0, so there's no login and nothing to lose if a server is down. Wrap every read in `try/catch`: private windows can block storage.
**Learn from:** [MDN — Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API).

### B7. CI/CD with GitHub Actions
**What:** run checks on every push; deploy automatically when they pass.
**In Pregraph:** `.github/workflows/ci.yml` runs validate → test → build. Later, Cloudflare Pages deploys each push to `main`, with a preview URL for every branch.
**Learn from:** [GitHub Actions docs](https://docs.github.com/en/actions).

### B8. Drawing graphs: layered layout
**What:** placing a DAG's nodes in layers so arrows mostly point one way and cross as little as possible (the Sugiyama method). Minimising crossings is NP-hard, so real tools use heuristics. Good maths here.
**In Pregraph:** the week-5 graph view. Likely tools: dagre or ELK for layout, React Flow for rendering.
**Learn from:** [Wikipedia — Layered graph drawing](https://en.wikipedia.org/wiki/Layered_graph_drawing); [React Flow](https://reactflow.dev/).

### B9. Client-side search
**What:** searching without a server, using an index built at deploy time.
**In Pregraph:** search across concepts and resources on a static site.
**Learn from:** [Pagefind](https://pagefind.app/) (built for static sites, works with Astro).

---

## Part C — v1 and beyond (backend, data, maths)

### C1. Serverless and edge functions
**What:** small functions that run on demand on the CDN's servers. No machine to manage, no idle sleep.
**In Pregraph:** the v1 progress API on Cloudflare Workers.
**Learn from:** [Cloudflare Workers docs](https://developers.cloudflare.com/workers/).

### C2. Relational modelling and recursive SQL
**What:** designing tables, keys and constraints; `WITH RECURSIVE` walks a graph inside the database.
**In Pregraph:** the `progress` table uses a composite primary key `(user_id, concept_id)`. If content ever moves into Postgres, prerequisite closure becomes one recursive query.
**Learn from:** [PostgreSQL — WITH queries](https://www.postgresql.org/docs/current/queries-with.html); [CMU 15-445 Database Systems](https://15445.courses.cs.cmu.edu/) (lectures on YouTube).

### C3. Authentication
**What:** proving who a user is: sessions, cookies, OAuth ("Sign in with Google"), magic links.
**In Pregraph:** v1 sign-in for sync. Use a library; never roll your own crypto.
**Learn from:** [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html).

### C4. Sync and conflict resolution
**What:** when the same data changes on two devices, decide which version wins. "Last writer wins" per record is the simplest correct-enough rule.
**In Pregraph:** merge localStorage and server progress by newest `updated_at` per concept.
**Learn from:** Kleppmann, *Designing Data-Intensive Applications*, ch. 5 "Replication" (paid; worth owning).

### C5. Scheduled jobs
**What:** code that runs on a timer (cron).
**In Pregraph:** a weekly GitHub Actions job checks every resource URL and flags dead ones.
**Learn from:** GitHub Actions docs — `on: schedule`.

### C6. Knowledge Space Theory — the diagnostic (v2)
**What:** a mathematical theory (Doignon & Falmagne) that models what a learner knows as a *feasible set* in a prerequisite structure. If you know X, you very likely know X's prerequisites; if you fail X, you likely don't know what X unlocks. So each question rules out large parts of the graph, and a diagnostic can be short. This is the theory behind the ALEKS adaptive tutoring system.
**In Pregraph:** "Test me instead of making me tick 80 boxes." Choose questions that split the remaining possibilities roughly in half, much like a binary search over the graph.
**Learn from:** [Wikipedia — Knowledge space](https://en.wikipedia.org/wiki/Knowledge_space); Doignon & Falmagne, *Knowledge Spaces* (Springer, 1999).

### C7. Item Response Theory (v2+)
**What:** statistical models of how likely a person of ability θ is to answer an item of difficulty *b* correctly, e.g. the logistic model P = 1 / (1 + e^−(θ−b)). Used in GRE/GMAT-style adaptive tests.
**In Pregraph:** calibrating question difficulty from real answers.
**Learn from:** [Wikipedia — Item response theory](https://en.wikipedia.org/wiki/Item_response_theory).

---

## Part D — Product skills (not taught in any CS course)

- **Talking to users** without leading them: Rob Fitzpatrick, *The Mom Test* (short, paid).
- **SEO basics**, since static pages are how people will find you: [Google's SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide).
- **Privacy-friendly analytics**: Cloudflare Web Analytics (free, no cookies).
- **Scoping**: the design doc's "Not in v0" list is a skill. Defend it.
