# What building Terminus teaches

These are the techniques the project uses, roughly in the order you meet them in the code. For each one there's a line on what it is, where it shows up here, and where to learn it, with free sources first.

The list is a small prerequisite graph of its own: part A before B, B before C.

## A. The engine

### A1. Directed graphs and DAGs

A directed graph is nodes plus arrows. A DAG (directed acyclic graph) has no way to follow arrows back to where you started. The usual way to store one is an adjacency list, `Map<id, id[]>`.

In Terminus, concepts are nodes and "learn A before B" is an arrow from A to B. `src/lib/graph.ts` builds lookups in both directions: what a concept needs, and what it unlocks.

If you've done order theory, a DAG is a strict partial order in disguise, and its transitive closure is the full "comes before" relation.

Learn it from: Sedgewick and Wayne, [Algorithms §4.2 Directed Graphs](https://algs4.cs.princeton.edu/42digraph/) (free site); CLRS, "Elementary Graph Algorithms" (ch. 22 in the 3rd edition, ch. 20 in the 4th).

### A2. Depth-first and breadth-first search

These are the two systematic ways to visit everything reachable from a node.

In Terminus, step one of the engine is an iterative depth-first walk backwards from your goals, which stops at anything you already know. That early stop is what makes a plan personal.

Learn it from: [MIT 6.006, Spring 2020](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/), the BFS and DFS lectures.

### A3. Topological sort

This lists a DAG's nodes so that every arrow points forward. Kahn's algorithm repeatedly takes a node with nothing left pointing into it.

In Terminus, it's step two of the engine. The interesting part is choosing among several ready nodes (see A5).

Learn it from: [Wikipedia, Topological sorting](https://en.wikipedia.org/wiki/Topological_sorting), which covers Kahn's method and the DFS method; algs4 §4.2.

### A4. Cycle detection

A depth-first search that colours nodes white (unseen), grey (on the current path) and black (finished) finds a cycle the moment it reaches a grey node.

In Terminus, `npm run validate` refuses content with a prerequisite cycle and prints the loop. One careless edit would otherwise make every plan impossible.

Learn it from: the DFS section of CLRS (edge classification); `DirectedCycle.java` on the algs4 site.

### A5. Critical paths and list scheduling

Give each task a weight and ask how long the longest chain of work behind it is. That's its critical path. Project planners use it to decide what to start first, and it's the core of "list scheduling", which comes from operating-system and factory scheduling.

In Terminus, the engine's first ordering rule (shortest first) put Git ahead of learning to program. Now each concept is scored by the hours of study waiting behind it, and a stay-in-the-same-area rule keeps the plan readable. Computing the scores is a memoised DFS. The trade-off between the two rules is one constant, `STAY_RATIO`.

Learn it from: [Wikipedia, Critical path method](https://en.wikipedia.org/wiki/Critical_path_method) and [List scheduling](https://en.wikipedia.org/wiki/List_scheduling).

### A6. Complexity in practice

This is using big-O to make real decisions, not for exams.

In Terminus, the design doc argues that the engine's O(V² + E) is fine at a few hundred concepts, and says what to change if it ever isn't. Practise writing that kind of argument.

Learn it from: MIT 6.006, lectures 1–2.

### A7. Unit tests and property-based tests

Unit tests check examples you picked. Property-based tests generate hundreds of random inputs and check a rule that must always hold, then shrink any failure to the smallest example.

In Terminus, `tests/` has both. Examples of properties: on any random DAG, every stop comes after its prerequisites; nothing you marked as known shows up; the map layout never has more crossings than it started with. These are theorem statements turned into code.

Learn it from: [Vitest](https://vitest.dev/guide/); [fast-check](https://fast-check.dev/).

## B. The site

### B1. TypeScript

TypeScript is JavaScript with types. Coming from Java it feels familiar, except that types are structural (they match by shape) rather than nominal.

Learn it from: the [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html), especially "Everyday Types" and "Narrowing".

### B2. Schema validation and content as code

You describe the shape of your data once, then check every file against it. Keeping content in Git means every change is a reviewable diff.

In Terminus, `src/lib/schema.ts` uses zod. A typo like `requiers:` fails the build with a clear message instead of quietly producing a broken route.

Learn it from: [zod.dev](https://zod.dev/).

### B3. Static, server and client rendering

Pages can be built once at deploy time, on every request, or in the browser. Each choice trades freshness against speed and cost.

In Terminus, content changes rarely, so every page is static. That single decision is why the site is free to host and quick to load.

Learn it from: [web.dev, Rendering on the Web](https://web.dev/articles/rendering-on-the-web); [patterns.dev](https://www.patterns.dev/).

### B4. Islands, and code splitting

An "island" page is mostly plain HTML with a few interactive pieces that load JavaScript. Code splitting goes further: even inside an island, rarely used parts load only when needed.

In Terminus, the planner is the one React island. The map is a separate chunk loaded with `React.lazy` the first time someone switches to it. Concept pages ship no framework at all.

Learn it from: [Astro docs, Islands](https://docs.astro.build/en/concepts/islands/); [react.dev, lazy](https://react.dev/reference/react/lazy); [react.dev/learn](https://react.dev/learn) for React in general.

### B5. CDNs and HTTP caching

A CDN keeps copies of your files on servers around the world, and cache headers tell browsers and CDNs how long to keep them.

In Terminus, built JavaScript files have a content hash in their names, so they can be cached for a long time. HTML is re-checked on each visit. That's why a deploy shows up immediately without anyone clearing a cache.

Learn it from: [Cloudflare, What is a CDN?](https://www.cloudflare.com/learning/cdn/what-is-a-cdn/); [MDN, HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching).

### B6. Browser storage and hydration

`localStorage` keeps small key-value data in the browser. Hydration is React attaching to HTML the server already rendered. If the first client render differs from that HTML, React complains and redraws.

In Terminus, progress lives in localStorage and is read in an effect after the first render, so server and client agree. Every read is wrapped in `try/catch`, because private windows can block storage.

Learn it from: [MDN, Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API); [react.dev, hydrateRoot](https://react.dev/reference/react-dom/client/hydrateRoot).

### B7. Drawing graphs: layered layout

Layered layout places a DAG's nodes in rows so that arrows point one way and cross as little as possible. This is the Sugiyama method. Minimising crossings exactly is NP-hard, so real tools use heuristics like the barycentre method.

In Terminus, `src/lib/layout.ts` is a small version written from scratch: longest-path rows, dummy nodes for long edges, barycentre sweeps that keep the best ordering seen, and a coordinate pass that straightens edges. This is the most mathematical code in the project.

Learn it from: [Wikipedia, Layered graph drawing](https://en.wikipedia.org/wiki/Layered_graph_drawing). For the real thing, see the papers behind dagre and ELK.

### B8. SVG

SVG is vector drawing in the browser: paths, circles and text, all styleable with CSS.

In Terminus, the map is SVG. Edges are cubic Bézier curves (`C` commands). Labels use `paint-order: stroke` to get a halo that keeps them readable over lines.

Learn it from: [MDN, SVG tutorial](https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial), especially the "Paths" page.

### B9. Search without a search engine

When there are only hundreds of records, a scored linear scan over a small JSON file beats any index library. Normalising text matters more than the algorithm: lower case, strip accents, split on punctuation.

In Terminus, it's `src/lib/search.ts`. The scoring rules are in the design doc.

### B10. Accessibility

Accessibility means building the site so it works with a keyboard and a screen reader, not only with a mouse.

In Terminus, the search box follows the ARIA combobox pattern (arrow keys, Enter, Escape). Map stops are focusable buttons. Station toggles have labels like "Mark Concurrency as done". Motion is turned off for people who ask for reduced motion.

Learn it from: the [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/), in particular its combobox pattern.

### B11. CI with GitHub Actions

CI runs checks on every push and stops a broken build from getting deployed.

In Terminus, `.github/workflows/ci.yml` runs validate, then tests, then build. From week 6, Cloudflare Pages will deploy every push to `main` and give each branch a preview URL.

Learn it from: [GitHub Actions docs](https://docs.github.com/en/actions).

## C. Later (v1 and v2)

### C1. Edge functions

These are small functions that run on the CDN's servers when called. There's no machine to manage and nothing to wake up.

In Terminus, the v1 progress API will run on Cloudflare Workers. Learn it from: [Cloudflare Workers docs](https://developers.cloudflare.com/workers/).

### C2. Relational modelling and recursive SQL

This covers tables, keys and constraints, plus `WITH RECURSIVE`, which walks a graph inside the database.

In Terminus, the `progress` table has a composite key `(user_id, concept_id)`. Learn it from: [PostgreSQL, WITH queries](https://www.postgresql.org/docs/current/queries-with.html); [CMU 15-445](https://15445.courses.cs.cmu.edu/).

### C3. Authentication

Authentication is proving who someone is: sessions, cookies, OAuth, magic links. Use a library, and don't write your own crypto. Learn it from: the [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html).

### C4. Sync and conflicts

When the same record changes on two devices, something has to decide which version wins. Last writer wins, per record, is the simplest rule that's correct enough here. Learn it from: Kleppmann, *Designing Data-Intensive Applications*, ch. 5 (paid).

### C5. Knowledge Space Theory

This is the maths behind the planned adaptive test. Doignon and Falmagne model what a learner knows as a "feasible set" in a prerequisite structure. If you know X, you probably know what X needs. If you fail X, you probably don't know what X unlocks. Each question therefore rules out a big part of the graph, a bit like binary search, so a test can be short. The ALEKS tutoring system is built on it.

Learn it from: [Wikipedia, Knowledge space](https://en.wikipedia.org/wiki/Knowledge_space); Doignon and Falmagne, *Knowledge Spaces* (Springer).

### C6. Item response theory

IRT models the chance that someone of ability θ answers a question of difficulty b correctly, for example P = 1 / (1 + e^−(θ−b)). Adaptive exams like the GRE use it. In Terminus, it would be used to calibrate questions from real answers. Learn it from: [Wikipedia, Item response theory](https://en.wikipedia.org/wiki/Item_response_theory).

## D. Things no course teaches

- **Talking to users without leading them.** Rob Fitzpatrick, *The Mom Test* (short, paid).
- **Being findable.** [Google's SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide). Static pages with real titles and descriptions do most of the work.
- **Measuring without tracking people.** Cloudflare Web Analytics is free and uses no cookies.
- **Saying no.** The "Next" and "Not planned" lists in the design doc are a skill in themselves.
