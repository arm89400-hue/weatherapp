# Thailand Weather App

Realtime weather for all Thai provinces/districts, backed by the Thai Meteorological
Department (TMD) open data API. Expo/React Native mobile app frontend, Node/Express +
Socket.IO backend, Prisma/Postgres, Redis + BullMQ for scheduled ingestion, Docker Compose
for the backend services.

See [`HOW-IT-WORKS.md`](HOW-IT-WORKS.md) for the full architecture walkthrough.

## Prerequisites

- Docker Desktop (for the backend services)
- The Expo Go app on your phone (for running the frontend — no Android/iOS toolchain needed)
- A TMD API key — register at https://data.tmd.go.th to get a `uid`/`ukey` pair. Without
  this, everything runs except live weather data (auth, province/district browsing, and the
  UI all work against seeded reference data).

## Setup

```bash
cp .env.example .env
# edit .env: set real JWT_ACCESS_SECRET / JWT_REFRESH_SECRET (e.g. `openssl rand -hex 32`),
# and TMD_API_UID / TMD_API_UKEY once you have them (EXPO_ACCESS_TOKEN is optional — see the
# comment in .env.example)

docker compose up -d --build            # postgres, redis, backend, worker
docker compose exec backend npx tsx prisma/seed.ts   # loads all 77 provinces + districts
```

- Backend health check: http://localhost:4000/health
- Frontend: `cd frontend && cp .env.example .env` (set `EXPO_PUBLIC_API_URL` to this
  machine's LAN IP, e.g. `http://192.168.x.x:4000` — not `localhost`, which on a phone means
  the phone itself), then `npx expo start` and open the project in Expo Go.

Ingestion (station directory, current weather, 7-day forecast) runs on a schedule in the
`worker` service once `TMD_API_UID`/`TMD_API_UKEY` are set — restart the worker after adding
them (`docker compose restart worker`). To pull immediately instead of waiting for the
schedule, exec into the worker and call the job functions directly, or trigger via BullMQ.

## Local (non-Docker) backend development

```bash
npm install                    # installs both workspaces
npm run prisma:generate
npm run dev:backend            # API + WebSocket server, needs local Postgres/Redis
npm run dev:worker             # ingestion worker, separate process
```

## Notes / known gaps

- **Air Quality Index and UV Index** are not part of the TMD endpoints used here — fields
  exist in the schema but are left null pending a separate integration (e.g. Thailand's
  Air4Thai API for AQI).
- **District-level coordinates**: no reliable free dataset with per-district (amphoe)
  lat/lng was found, so districts have `lat`/`lng` as nullable and weather lookups for a
  district fall back to a station anywhere in its parent province. Provinces themselves are
  geocoded (via OpenStreetMap Nominatim).
- **TMD XML field names** in `backend/src/ingestion/tmdClient.ts` are best-effort — verify
  against a live response once you have real API credentials and adjust the mapping if tag
  names differ (the full raw payload is preserved in the `raw` column either way, so no data
  is lost even before that verification happens).
