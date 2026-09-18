# How This App Works

A plain-language guide to the tech stack and what each part of the code does.

## The tech stack (what + why)

| Tool | What it does | Why we used it |
|---|---|---|
| **TypeScript** | JavaScript + types, compiles to JS | Catches bugs before running the code |
| **Node.js + Express** | Runs the backend server | Standard, well-supported JS server framework |
| **React Native + Expo** | Builds the actual mobile app | One codebase compiles to a real Android (and iOS) app; Expo Go lets you see changes on your phone instantly, no rebuild needed |
| **Expo Router** | Decides which screen shows for which "page" | File-based routing — a file in `src/app/` becomes a screen, same idea as pages in a website |
| **NativeWind** | Lets you style components with Tailwind-style classes (`className="..."`) | Same fast styling workflow as regular Tailwind, translated to real native styles under the hood |
| **PostgreSQL** | The actual database | Stores users, weather data, provinces/districts |
| **Prisma** | Talks to the database from code | Lets you write `prisma.user.findMany()` instead of raw SQL |
| **Redis** | In-memory fast storage | Powers the job queue and real-time message passing |
| **BullMQ** | Job scheduler (built on Redis) | Runs "pull weather every 20 min" on a timer |
| **Socket.IO** | Real-time push to the app | Live weather updates without the user refreshing anything |
| **Docker / Docker Compose** | Packages the backend into containers | So the database, API server, and worker all start with one command |
| **lucide-react-native** | Icon set | The same Lucide icons the app used before, as ready-made native components |
| **web-push** | Sends push notifications | Powered the severe-weather alerts on the old web version — currently dormant, see note below |

**Note on the frontend rewrite:** this app used to be a website (Vite + React + Tailwind) wrapped in a shell called Capacitor to make it installable on Android. That setup broke often — the shell loaded a live tunnel URL that changed every time the tunnel restarted, requiring a full rebuild to fix. The frontend has since been rewritten from scratch as a real Expo/React Native app instead, which fixed that problem: `npx expo start` + the Expo Go app on your phone gives instant reload for any code change, no rebuild ever needed for normal development. The backend didn't need to change for this (see the one small exception below).

**Note on push notifications:** the old website's "notify me about severe weather" feature used the browser's Web Push API, which doesn't exist in a native app. That feature is temporarily disabled in the app (shows a "coming soon" message) until it's rebuilt using Expo's own notification system — a separate piece of work. (A first attempt at this used `expo-notifications`, but Expo Go on Android turned out to have removed that module's functionality entirely in SDK 53 — even importing it crashes the app — so it was reverted; a real dev/production build, not Expo Go, will be required whenever this is attempted again.)

## Backend (`backend/src/`) — the server

**`server.ts`** — the actual entrypoint. Starts the web server and attaches the WebSocket layer.

**`worker.ts`** — a *separate* process from the server. Its only job is running scheduled background tasks (pulling weather data) so a slow data-fetch never blocks someone using the app.

**`app.ts`** — wires together all the pieces: enables CORS (which sites are allowed to call this API), parses incoming JSON, and mounts every route group (`/api/auth`, `/api/weather`, etc.).

**`config/env.ts`** — reads and validates all the settings from `.env` (database URL, secret keys, etc.) at startup, so the app fails fast with a clear error if something's misconfigured, instead of breaking mysteriously later.

**`modules/`** — one folder per feature, each with routes (what URLs exist) and services (the actual logic):
- `auth/` — register, login, logout, refresh tokens (how you stay logged in). `auth.routes.ts` now also returns the refresh token directly in its response body (not just as a browser cookie) and accepts it the same way on `/refresh` and `/logout` — a native app has no browser cookie jar, so the mobile app stores this token itself instead (see `expo-secure-store` below).
- `geo/` — the province/district list, plus "find nearest province to this GPS coordinate"
- `weather/` — reads saved weather data and returns it to the app
- `savedLocations/` — a logged-in user's list of saved locations (province + optional district) for quick access — what the location-picker sheet's list is built from
- `push/` — stores a push subscription and sends alerts to it. Currently unused by the app (see push notifications note above) — kept in place for when that feature comes back.
- `users/` — lets a logged-in user set their favorite province
- `stations/` — the list of weather stations behind the scenes

**`ingestion/`** — the part that actually *gets* weather data from the outside world:
- `openMeteoClient.ts` — calls the free Open-Meteo weather API
- `tmdClient.ts` — calls Thailand's official weather API (dormant until you get that API key)
- `jobs/` — the actual "pull weather now" tasks that BullMQ runs on a schedule
- `weatherAlerts.ts` — decides if a reading is "severe" (thunderstorm, heavy rain, extreme temp) and triggers a push notification if so
- `scheduler.ts` — registers the repeating timers ("run this every 20 minutes")

**`websocket/`** — the real-time layer. `gateway.ts` sets up the live connection; `rooms.ts` handles "only send Bangkok updates to people watching Bangkok."

**`lib/`** — small reusable helpers: database connection, Redis connection, logging, sunrise/sunset math, wind-speed-to-compass-direction conversion, etc.

**`middleware/`** — code that runs on *every* request before it reaches your route: `authGuard.ts` checks you're logged in, `errorHandler.ts` catches crashes and returns a clean error instead of exposing internals.

**`prisma/schema.prisma`** — the database blueprint: defines every table (User, Province, WeatherReading, etc.) and how they relate to each other.

## Frontend (`frontend/src/`) — the Expo app

**`app/`** — Expo Router's screen files. Each file here becomes a screen: `index.tsx` is the main Dashboard, `login.tsx` and `register.tsx` are the auth screens, `_layout.tsx` wraps every screen in the shared providers (React Query, settings, auth) plus the gradient background and status bar style. These files stay thin — they just render the matching screen from `screens/`.

**`screens/`** — the actual screen content: `DashboardScreen.tsx` (the main weather view — location header, weather hero, forecast, stat tiles, sun arc, and three bottom sheets), `LoginScreen.tsx`, `RegisterScreen.tsx`.

**`components/`** — reusable UI pieces the screens are built from:
- `WeatherHero.tsx` — the big temperature display
- `ForecastList.tsx` — the 7-day list
- `StatTile.tsx` — the small precipitation/wind/humidity cards
- `SunArc.tsx` — the sunrise/sunset arc, drawn with `react-native-svg`
- `GlassCard.tsx` — the frosted-glass card look used everywhere (replaces a CSS trick called `backdrop-filter` that only works on the web — this uses a real blur effect from `expo-blur` instead)
- `ScreenBackground.tsx` — the dark blue gradient behind every screen
- `Sheet.tsx` — the bottom-sheet popup pattern used for the location/account/settings menus (a native modal that slides up from the bottom)
- `SelectSheet.tsx` — a searchable list-in-a-sheet, used anywhere the app needs you to pick one option from a list (province, district, favorite province) — phones have no dropdown menu like a website does, so this is the replacement
- `LocationPrompt.tsx` — the "use my location?" ask
- `SavedLocationsList.tsx` — the location sheet's main view: the device's current location pinned first, then the signed-in user's saved locations, each showing a live weather preview fetched in one batched request
- `LocationCard.tsx` — one row in that list (name, temperature, condition, delete button)
- `LocationPicker.tsx` — the "add a new saved location" sub-flow (province + district picker) reached from the `+` button in `SavedLocationsList.tsx`
- `AccountPanel.tsx`, `SettingsPanel.tsx` — the content shown inside the account/settings bottom sheets
- `conditionIcon.tsx` — picks a weather icon based on the condition text (not a component itself, just a helper function)

**`hooks/`** — reusable logic (not visual), named `use...`:
- `useDeviceLocationProvince.ts` — GPS → nearest province, using Expo's location API
- `useWeatherSocket.ts` — keeps the live connection open, pausing it on cellular data when the "Update with Mobile Data" setting is off
- `useNetworkType.ts` — asks the phone "is this device on Wi-Fi or cellular?"

**`api/`** — one file per backend feature, each just wrapping HTTP calls: `client.ts` (the shared setup — attaches your login token to every request, and automatically refreshes it when it expires, storing the refresh token securely on-device via `expo-secure-store`), `auth.ts`, `weather.ts`, `geo.ts`, `users.ts`, `savedLocations.ts`.

**`context/AuthContext.tsx`** — holds "who's logged in" in one place so any screen can check it without passing it down manually through every level. Your session survives closing and reopening the app, restored from the securely-stored refresh token.

**`context/SettingsContext.tsx`** — holds the three settings that work without an account (temperature unit, language, mobile-data updates). Saved on-device only, via `AsyncStorage` — never sent to the backend — so they apply instantly with no login needed.

**`i18n/translations.ts`** — the English/Thai dictionary: one string key (e.g. `"stat.wind"`) mapped to its English and Thai text. Add a language by adding another top-level entry here.

**`i18n/useTranslation.ts`** — the hook components call to get translated text: `t("some.key")` looks up the current language's string (falling back to English if a Thai one is missing), plus helpers to translate weather condition text and region names, which come back from the backend as fixed English words.

**`lib/temperature.ts`** — converts a Celsius value to Fahrenheit and formats it with the ° symbol, based on the user's chosen unit. The backend always stores/sends Celsius; conversion only happens here, right before display.

**`lib/localizedName.ts`** — picks a province/district's English or Thai name depending on the current language (both names already exist in the database for every province and district).

## Running and sharing the app

**`app.json`** — the app's identity: its name ("Thai Weather"), icon, splash screen, and Android package id, plus which native permissions it needs (location, for the "use my current location" feature).

**Local development** — `npx expo start` from `frontend/` starts a dev server; scanning the QR code (or picking the project) in the **Expo Go** app on a phone loads the app live, with instant reload on every code change. The phone needs `EXPO_PUBLIC_API_URL` (set in `frontend/.env`) to be able to reach this computer's backend — usually this computer's local network address, since a phone can't resolve `localhost` to mean itself.

**Sharing with others** — Expo Go only loads whatever this computer's dev server is currently serving, so it's not a way to hand someone a permanent app. A real standalone install (an APK someone can download and keep) is built separately via `eas build`, Expo's cloud build service.
