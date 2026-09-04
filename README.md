# AI Travel Planner

An AI-powered trip planner that generates realistic, geographically-sensible multi-day itineraries — not by asking an LLM to guess a schedule, but by treating itinerary generation as a constrained optimization problem, with the LLM used only for what it's actually good at: natural-language descriptions.

**Live demo:** _[add your Vercel URL here]_
**Repo:** github.com/JiyaaGupta-14/ai-travel-planner

---

## The problem

Planning a trip means juggling a dozen sources — Maps for places, review sites for recommendations, a notes app to hold it together — and generic AI chatbots don't really fix this. Ask ChatGPT for a 4-day Milan itinerary and it will happily hallucinate a plausible-sounding plan that has you walking 8km across the city and back in a single afternoon, because an LLM has no real model of geography, walking time, or scheduling constraints — it's pattern-matching text, not solving a routing problem.

This project splits the two apart: a real optimization algorithm handles *where and when*, and the LLM only handles *how it's described*.

## How it works

User input (destination, budget, days)
│
▼
Destination classifier (Google Geocoding API)
— detects country vs. city, prompts for a
start/end city if a country is given
│
▼
Places layer (Google Places API)
— fetches real candidate attractions for
the destination on first search, cached
in Postgres afterward (auto-seeding)
│
▼
RAG layer (Gemini embeddings + pgvector)
— embeds place descriptions, retrieves the
most relevant places for the destination
via cosine similarity search
│
▼
Optimizer (custom TypeScript, no external
solver) — see below
│
▼
Narrative layer (Gemini 2.5 Flash-Lite)
— writes natural-language day descriptions
from the optimizer's structured output,
explicitly constrained from inventing
geographic details it wasn't given
│
▼
Next.js UI — itinerary display + save-trip
(Postgres via Prisma)



## The optimizer — the core of the project

Building a naive nearest-neighbor router was easy. Getting it to produce itineraries that don't crisscross a city or dump six attractions into one day and leave another nearly empty took several iterations, each fixing a specific, observable failure mode:

1. **Site merging** — co-located landmarks (a fountain and the plaza it sits in, a mall and its rooftop walkway) are merged into a single unit before clustering, so they can never be split across different days.
2. **K-Means++ initialization** — initial day-clusters are seeded using K-Means++ (each centroid chosen with probability proportional to its distance from existing centroids) instead of a naive sort, which was producing biased, uneven starting clusters.
3. **Balance-penalty assignment** — when deciding which day a place belongs to, the algorithm adds a cost penalty for assigning it to a day that's already over its fair share of stops, so it doesn't just default to "always pick the nearest day" and overload one cluster.
4. **Museum/duration-aware capacity limits** — each day respects a time budget (default 5.5 active hours) and a cap on heavy attractions (e.g. max 1-2 museums/day), inferred from category-based visit-duration estimates.
5. **Best-improvement local search rebalancing** — after initial clustering, the algorithm evaluates every possible move or swap of a site between two days and applies whichever single change most reduces total geographic cost, repeating until no improving move remains. (An earlier first-improvement version got stuck in order-dependent local optima — this was a genuine bug I diagnosed and fixed by switching strategies.)
6. **Minimum-workload enforcement** — a final safety-net pass detects any day left under-filled (e.g. a single 15-minute stop) and pulls the geographically nearest attraction from the most-loaded day to fill it out.
7. **2-opt route refinement** — within each day, after an initial nearest-neighbor ordering, the algorithm repeatedly tries reversing route segments to shorten total walking distance, which eliminates "walk in, walk back out" backtracking that pure greedy ordering leaves behind.
8. **Meal + travel-time insertion** — a lunch stop is inserted near the natural midpoint of each day's route, and every consecutive pair of stops shows real walking distance and estimated time (haversine distance at a 4 km/h walking pace).

This was built and iteratively corrected against a real 12-landmark Milan test case, catching (and fixing) issues like split site clusters, unbalanced day sizes, and route backtracking — a process that mirrors how a real-world routing/logistics feature would actually get built and debugged.

## RAG layer

Place descriptions are embedded with Gemini's `gemini-embedding-001` model and stored in Postgres via the `pgvector` extension. When a user searches a destination, results are retrieved by cosine similarity (`<=>` operator) rather than an LLM guessing recommendations from memory — this avoids hallucinated places and keeps results grounded in real, cached data. Destinations are auto-seeded on first search (fetched from Google Places, embedded, and cached), so any city works without manual pre-seeding, with a one-time slower first search per new destination.

## Tech stack

- **Frontend/API:** Next.js 16 (App Router), TypeScript, Tailwind CSS
- **Database:** PostgreSQL (Supabase) + pgvector, Prisma ORM
- **AI:** Google Gemini API (`gemini-embedding-001` for embeddings, `gemini-3.5-flash-lite` for narrative generation)
- **Places data:** Google Places API + Geocoding API
- **Deployment:** Vercel

## Setup

Requires Node.js 18+ and a Postgres database with the `vector` extension enabled (Supabase recommended).

```bash
git clone https://github.com/JiyaaGupta-14/ai-travel-planner.git
cd ai-travel-planner
npm install
```

Create a `.env.local` file:
GEMINI_API_KEY=your-gemini-api-key
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
DATABASE_URL=your-postgres-connection-string



```bash
npx prisma db push
npm run dev
```

Open `http://localhost:3000`.

## Known limitations

- **Multi-city country trips** currently generate an itinerary for a single chosen city rather than routing across multiple cities with inter-city travel days — a natural next feature, but a meaningfully larger scoping problem (transport, day-splitting across cities) than the current single-city optimizer.
- **Gemini's free-tier rate limits** (20 req/day on some models at time of writing) mean heavy testing can temporarily exhaust quota; the app is built to degrade with a clear error rather than fail silently.
- **The optimizer's constraints are heuristic**, not a formal solver (no true TSP/VRP solver) — this was a deliberate scope choice for a portfolio timeline, and is explained further in the optimizer section above.

## What I'd build next

- True multi-city itinerary routing for country-level trips
- User accounts / real auth (currently uses a single demo user for the save-trip feature)
- A budget-tracking view showing running cost against the trip's stated budget
- Caching Gemini narrative output per itinerary shape to reduce redundant API calls