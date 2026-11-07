# Changelog

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
