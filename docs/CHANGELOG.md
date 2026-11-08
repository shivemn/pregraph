# Changelog

## Wider map, role boxes and any first language

- **The network map is wider.** It now uses up to 1500 px of the screen instead of the page column, with more room between lines and bigger station names.
- **All roles is a grid of boxes,** two to a row, with each family's line colour, a row of line chips at the top to jump to a family, and how many stops are on each role's hiring list.
- **"Coach 1, Coach 2" is gone** from the route. Each box is headed by the weeks it covers ("Weeks 1–3", or "Week 11" for one week), and the summary no longer counts coaches.
- **The end of a route no longer says it's everything you need to get hired.** It says it's the end of the hiring list, and that projects you can show and interview practice count too.
- **Programming basics in any language.** "Programming in Python" is now "Programming basics". The main picks still use Python, and Java (MOOC.fi), C++ (learncpp) and C# (Microsoft Learn) courses are listed as other options. On a route the stop has an "I already code in another language" button that skips it in one tap. Any concept can offer this with `skipLabel`.

## The network map and switching jobs

- **The home page now has a map of the whole network.** Each family of jobs is a line in its own colour, and every job is a terminus at the end of its line. A line stops at what most of its jobs need. Where two or more lines share a stop (Git, SQL, Python, spreadsheets, statistics) there's an interchange: that's where one career can change to another.
- Hover or focus a job and its stops light up. Pick where you're starting from in the ticket and what's already behind you turns grey.
- On a phone the map gives way to a list, with each line's colour down the side.
- **Switching jobs.** The From list has a new group, "Already working as". Pick your current job and the route leaves out that job's hiring and first-year lists and everything under them, and says how many stops are already behind you. It works on the home page ticket, every role page and every tool page.
- Exams get their own line of links under the map.

## What the job looks like

- **Every job role now ends with "What the job looks like".** Live searches on Naukri (freshers), LinkedIn and Indeed for that job, so you can read real openings today. A link under the role's summary jumps there.
- **Five roles summarise real listings:** software engineer, backend engineer, data analyst, data scientist and DevOps engineer. Each says what you'd do, the titles you'll see, the experience asked for, and how many of about 40 entry-level listings named each skill, written in our own words from Naukri in November 2026. The counts are in `research/postings/naukri-2026-11.md`.
- **Official descriptions** from O*NET on the software and data roles.

## Your train: study time, coaches and the terminus

- **Study time.** Pick how many hours a week you can give (5, 10, 15, 20 or full time). The route then says how long it takes in weeks or months and roughly when you'll arrive, instead of a bare number of hours.
- **The next stop comes first.** The summary leads with how long and when, then "Next stop", then the total as a range of hours, since the per-topic hours are estimates.
- **Coaches.** The route is split into coaches of about a month each at your pace, in order, with the weeks each one covers. A coach turns yellow when every stop in it is done. Coaches are worked out over the whole route, so ticking a stop never reshuffles them (`src/lib/coaches.ts`, with property tests).
- **The train.** A strip above the route shows the engine, a carriage per coach that fills in as you go, and the role's terminus board. Tap a carriage to jump to it.
- **The terminus.** The route ends at a station board with the role's name.
- A line explains why it takes longer than a YouTube course promises: the video is in there too, and the rest is practice.
- The home page preview gives months at 10 hours a week instead of total hours.
- The header now shows the end-of-the-line mark; the browser tab keeps the T.

## Pregraph is now Terminus

- New name: Terminus, after the station every Mumbai local runs towards, and the job at the end of your route. The site now lives at terminus.pages.dev and the repository at github.com/shivemn/terminus.
- New logo: a T on a yellow station board. On a metro map a terminus is a line meeting a bar, which is the shape of a T. It's the favicon too, and the share image has the new tagline: "Roadmaps are the same for everyone. This one starts from you."
- Progress saved in the browser carries over: the planner reads the old saved keys if it doesn't find the new ones.

## Practice, hosting and eighteen more roles

- **A practice page** at `/practice`: 43 free places to practise in eleven groups (coding, SQL and data, ML, web, systems from scratch, DevOps, security, maths and quant puzzles, finance, design, embedded). Each lists the stops it tests, worked out from the graph. "Practice" is in the header.
- **23 new practice sets,** including LeetCode's Top Interview 150 and SQL 50, Codeforces, Project Euler, PostgreSQL Exercises, Frontend Mentor, Type Challenges, MIT's xv6 and distributed systems labs, BusTub, Maelstrom, TryHackMe, Khan Academy, Brainstellar, Kaggle competitions, TidyTuesday, QuantConnect, Wokwi, GitHub Skills and Daily UI. Practice picks now cover 83 of 191 stops, up from 60.
- **A hosting and deployment shelf** on the tools page: GitHub Pages, Cloudflare Pages and Workers, Vercel, Netlify, Render, Neon, Supabase and Firebase. Project pages point to it.
- **Databricks** on the data engineering shelf and **Hugging Face** on the ML shelf.
- **A new Product and design area:** Agile and Scrum, product management, UX and UI design, and technical writing.
- **Eighteen new roles:** iOS developer, Salesforce administrator/developer, ServiceNow developer, MLOps engineer, BI developer, analytics engineer, product analyst, platform engineer, system administrator, database administrator, penetration tester, security engineer, solutions architect, product manager, UI/UX designer, business analyst, technical writer, and scrum master.

## Deep learning, finance and more exams

- **Dark mode fixes.** Dropdown lists now use the dark colours instead of light grey on white, the route preview's header is readable, and finished stops show their tick.
- **Deep learning in depth.** The single deep learning stop is now nine: neural networks and backpropagation, convolutional networks, RNNs and LSTMs, attention and transformers, computer vision, NLP, generative models (VAEs, GANs, flows, diffusion), reinforcement learning, and deep learning in practice. Picks include Dive into Deep Learning, Understanding Deep Learning and its notebooks, 3Blue1Brown, Karpathy, Stanford CS231n, CS224n and CS236, MIT 6.S191, fast.ai, Sutton and Barto, and David Silver's course.
- **A new Economics and finance area** and the maths under it: calculus, multivariable calculus, optimisation, stochastic processes and stochastic calculus, real analysis, time series, Bayesian statistics, mathematical statistics, linear models and multivariate analysis; micro and macroeconomics, econometrics, financial markets, accounting, corporate finance and valuation, derivatives, portfolio theory and risk management, plus two projects. Picks include MIT 18.S096, Aswath Damodaran, Robert Shiller, CORE Econ, Zerodha Varsity (with Hindi versions), OpenStax, Hyndman's forecasting book, Statistical Rethinking and Penn State's statistics courses.
- **Seven new roles:** deep learning engineer, quant researcher, quant developer, risk analyst, financial analyst, economist and statistician.
- **Four new exams,** mapped from their official syllabi: GATE data science and AI, GATE statistics, IIT JAM mathematical statistics, and UGC NET computer science. GATE CS now includes its engineering maths and follows the GATE 2027 syllabus.
- **Classical AI** (search, logic, Bayes nets) from Berkeley's CS 188 and Mausam's NPTEL course, for GATE DA and UGC NET.
- **Economics graduates** are a new starting point. Starting points now know calculus where the degree covers it, and commerce graduates know accounting.

## Every common tool

- **The tools page now has 68 tools on eleven shelves:** languages, web frameworks, mobile, data science and ML libraries, databases and search, BI and data engineering, DevOps, cloud, testing, security, and workplace platforms. A row of links at the top jumps to each shelf.
- **35 new tools:** C#, PHP, Swift and iOS, R, Django, FastAPI, ASP.NET Core, Angular, Vue, Next.js, Flutter, React Native, scikit-learn, TensorFlow and Keras, Elasticsearch, dbt, Snowflake, Jenkins, Ansible, Nginx, Microsoft Azure, Google Cloud, Selenium, Postman, JUnit, pytest, Wireshark, Nmap, Burp Suite, Splunk, Jira, Figma, Salesforce administration and ServiceNow. Each has a free book or official guide and a video course, opened and checked first. PHP and Angular also have CodeWithHarry's Hindi courses, and Excel has Rishabh Mishra's.
- Spreadsheets and observability now have video picks.
- A new area, Workplace tools, for platforms like Jira, Figma, Salesforce and ServiceNow.
- Some of the new tools are on role lists too: Selenium and Postman for QA, Wireshark and Splunk for security analysts, dbt and Snowflake for data engineers, Azure and Google Cloud for cloud engineers, ServiceNow for application support.

## No assumed background

- Nothing is preselected any more. The ticket and every planner start at "Select your background", and until you choose, the route is the full one from the very beginning, with a note saying so.
- Seven starting points in three groups: a science, tech, engineering or maths degree (CS or IT, maths or stats, engineering, science), another degree (commerce or business, arts or anything else), or no degree yet. Science and commerce graduates are new.
- The route preview on the home page now re-plans as you change the ticket, in the browser, from the same engine.

## Tools

- **A tools page** at `/tools`, for people who need one thing rather than a whole job: 33 languages, frameworks, databases, BI and DevOps tools on five shelves, each showing its hours, which picks it has and what comes first. "Tools" is in the header next to "All roles".
- **A page for each tool** with its three picks and the route to it from your background, worked out by the same planner as the role pages. Progress is shared, so Java ticked on a role page counts on the Spring Boot page.
- **Nine new tools:** Go, C++, Rust, Redis, MongoDB, Spring Boot, Node.js and Express, Tableau and PyTorch. Every pick was opened and checked first. C++ also has CodeWithHarry's Hindi playlist as an alternative. Dashboards and BI tools is now Power BI, with Alex The Analyst's course, and message queues is now Kafka and message queues. Redis is on the backend engineer's good-to-have list.
- **`npm run check-sections`** loads each unchecked resource and looks for the names in its chapter or lecture reference, then sorts them into likely fine, worth a look, numbers only, and didn't load. It never marks anything checked on its own.
- Every pick list now ends with a link for reporting a wrong chapter or a dead link.
- Licences: MIT for the code, CC BY-SA 4.0 for the content.

## Checked links and more practice

- **Links.** `npm run check-links` now sorts what it finds into broken links, sites that block scripts (401, 403, 429) and certificate problems, so a 403 from a site that works fine in a browser no longer looks like a dead link. Linux Journey now redirects to a paid site, so the Linux pick is the Linux Upskill Challenge. The AWS Cloud Practitioner link moved, and the NPTEL course authors were corrected after checking each course page.
- **Checked sections.** 61 chapter and lecture references were opened and checked against the source, mostly for the stops that the most roles share: Think Python, CS50x, CS50P, CS50W, MIT 6.0001, MIT 6.006, Open Data Structures, Pro Git, Software Engineering at Google, OSTEP, Nand to Tetris, MIT 6.042 and the Missing Semester. Checked sections no longer show "Section not checked yet". The Missing Semester references now use the 2026 lecture names.
- **Sixteen more stops have somewhere to practise:** Nand to Tetris projects, the OSTEP homework simulators, MIT 6.042 problem sets, 18.06SC's Check Yourself problems, Cryptopals, Killercoda's Kubernetes labs, and freeCodeCamp's Responsive Web Design and Back-End courses.
- **Four more video picks:** Docker and Kubernetes from TechWorld with Nana, Corey Schafer's pandas playlist, and freeCodeCamp's TypeScript course.

## Ready to deploy

- Sitemap, `robots.txt`, canonical URLs and social share tags with a preview image (`public/og.png`), so a shared link shows a proper card on LinkedIn or WhatsApp.
- `public/_headers` caches built assets for a year and the JSON data for an hour.
- `npm run check-links` tries every resource URL from your own machine and lists the ones to look at.

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
