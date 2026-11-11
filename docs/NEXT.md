# Next session plan (agreed 9 November 2026)

Next working session: Friday. Read this file first.

## Ground rule

Nothing unverified goes on Terminus. Every fact, figure and link is opened
and checked against its source before it ships. If a source can't be
reached, the item waits; it is not published as "unverified".

## 1. Clear the 8 unverified sections (done 11 November 2026)

These are live today and must be verified or removed before anything else:

| Stop | Resource |
|---|---|
| project-platform-app | trailhead-admin |
| project-platform-integration | trailhead-admin, servicenow-dev |
| project-run-a-sprint | atlassian-agile |
| project-uat | atlassian-agile |
| project-agile-coaching | atlassian-agile |
| project-sap-process | sap-erp-processes |
| project-operations | mit-16660 |

Then make `npm run validate` fail on any `verified: false`.

## 2. Rebuild the Designs pages in the approved style

The approved page is `docs/prototypes/chat-design.html` (also published as a
Claude artifact). Build exactly that, as Astro components fed from YAML:

- **Diagram first, full width.** Hand-drawn SVG from a node/edge spec in each
  design's YAML; icons from Tabler (MIT); colour by kind (edge, service,
  data, outside). A flow switcher; each flow is numbered steps that light up
  their path on hover. Boxes link to the Terminus stop that teaches them.
- **Short text.** A 3 to 5 sentence gist, short feature and quality lists,
  one-line key decisions, three "what breaks first" lines, stop chips.
- **Numbers** labelled as our assumption, with a separate "At real scale"
  box of verified real figures (with years).
- **Right rail, sticky:** "How the real ones built it", one card per real
  product, each with a line on what's different and links to that company's
  own engineering posts or docs. Then "Other diagrams worth seeing", credited
  third-party links. Embed outside diagrams only if openly licensed.
- No copied images. Ideas can be redrawn; drawings can't be reused.

Order: convert the 9 existing designs first (chat is already written and
verified), then add the new ones.

## 3. New designs (23)

Apps: photo sharing (Instagram, Pinterest), video on demand (YouTube,
Netflix), music streaming (Spotify), video calls (Zoom, Google Meet), file
sync (Dropbox, Google Drive), editing together (Google Docs, Figma), search
and autocomplete, notifications, shopping and flash sales (Amazon, Flipkart),
hotel and travel booking (Airbnb, MakeMyTrip), maps and routing (Google
Maps), nearby search (Zomato, Yelp, Tinder), fantasy sports spikes (Dream11),
code runner (LeetCode, Codeforces), recommendations (Netflix, YouTube).

Infrastructure: message queue (Kafka), key-value store (DynamoDB,
Cassandra), distributed cache (Redis, Memcache at Facebook), web crawler,
metrics and logging, stock exchange matching (NSE, Zerodha), job scheduler,
ad-click counting.

Every real-company claim comes from that company's own post, talk or docs.

## 4. Deep, niche career paths

Add as routes, each checked against real job postings like the others:

- AI and ML infrastructure: inference engineer, ML compiler engineer, GPU
  kernel / CUDA performance engineer, distributed training engineer, AI
  accelerator architect, evals engineer, AI safety and alignment research
  engineer, AI red-teamer, interpretability researcher, search / ranking /
  recommendation engineer, speech engineer.
- Systems: database internals, Linux kernel and device drivers, performance
  engineer, low-latency C++ for trading, network and eBPF, distributed
  storage, browser / JavaScript engine, build and developer productivity,
  formal verification, embedded Linux / board support.
- Security: reverse engineer / malware analyst, vulnerability researcher,
  cryptography engineer, incident response / digital forensics, threat
  intelligence, hardware security, zero-knowledge proof engineer.
- Finance and quant: model validation / model risk, market microstructure,
  execution quant, XVA quant, fraud and payments data scientist.
- Science and data: experimentation / causal inference, geospatial,
  bioinformatics, healthcare data.
- Hardware and physical: quantum computing, photonics, semiconductor process
  / yield, GNC and flight software (space), perception / SLAM / motion
  planning, simulation / CFD.
- Facing people: forward-deployed engineer, solutions / sales engineer,
  developer advocate, technical program manager, trust and safety,
  accessibility engineer.

## Decided against

- The motion prototype (split-flap board, moving train, LED indicator).
  Keep the current, minimal UI.

## Housekeeping (Shi)

- Pull and push the latest bundle; enable GitHub Actions for the link checks.
- Rename the repo to `terminus`, move Cloudflare, then
  `git remote set-url origin https://github.com/shivemn/terminus.git`.
- Delete `terminus-postings-test.json` and the two `.tmp` files in Downloads.
