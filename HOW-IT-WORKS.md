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
| **expo-server-sdk** | Sends push notifications via Expo's push service | Backend-side counterpart to `expo-notifications` — takes each device's Expo push token and delivers the alert, no VAPID/keys needed |
| **expo-notifications** | Requests notification permission and gets this device's push token | The app-side half of severe-weather alerts (see note below) |

**Note on the frontend rewrite:** this app used to be a website (Vite + React + Tailwind) wrapped in a shell called Capacitor to make it installable on Android. That setup broke often — the shell loaded a live tunnel URL that changed every time the tunnel restarted, requiring a full rebuild to fix. The frontend has since been rewritten from scratch as a real Expo/React Native app instead, which fixed that problem: `npx expo start` + the Expo Go app on your phone gives instant reload for any code change, no rebuild ever needed for normal development. The backend didn't need to change for this (see the one small exception below).

**Note on `experiments.reactCompiler` (turned off, deliberately):** React Compiler miscompiles this app once the bundle is *minified*. The symptom is a blank screen on load and `find is not a function` thrown from `DashboardScreen`, where `provinces`/`districts` come back as something other than an array. Three builds isolate it: compiler on + minified is broken, compiler on + unminified is fine, compiler off + minified is fine. A per-component `"use no memo"` on `DashboardScreen` did *not* help, so it isn't confined to that one file, and `babel-plugin-react-compiler` is already at its latest (1.0.0) — there is no upgrade that fixes it.

This matters beyond web. Expo Go and dev builds don't minify, which is why nothing looked wrong during development, but **EAS release builds do** — so the same combination was a plausible blank-screen failure in a production APK. The flag costs only some automatic memoization, so it's off until a future SDK makes it safe. Re-test with the three-way comparison above before turning it back on.

**Note on push notifications:** the old website's "notify me about severe weather" feature used the browser's Web Push API, which doesn't exist in a native app. It's now rebuilt on Expo's own notification system instead: the "Weather alerts" switch on the Notifications page (`NotificationSettings.tsx`, reachable from both the Settings and Account sheets) requests permission and calls `Notifications.getExpoPushTokenAsync()` (see `frontend/src/lib/pushNotifications.ts`), sends that token to `POST /api/push/subscribe`, and the backend hands it to `expo-server-sdk` whenever `weatherAlerts.ts` decides a reading is alert-worthy — no VAPID/keys, no browser involved. The `PushSubscription` table and `push.service.ts` were reshaped around a single `expoPushToken` column instead of the old endpoint/p256dh/auth triple.

**Why this needs care around Expo Go:** Expo Go on Android removed `expo-notifications`' functionality entirely in SDK 53 — even *importing* the package there throws and crashes the app. `pushNotifications.ts` checks `Constants.executionEnvironment` (true in Expo Go) *before* ever importing `expo-notifications`, and only imports it — via a dynamic `import()`, so the `require()` is deferred until that check has passed — once it's confirmed this is a real dev/production build. In Expo Go, the switch in `NotificationSettings.tsx` is hidden (the row shows greyed out, with no explanation text). To actually test this feature you need a real build: `npx expo run:android` (or an EAS dev build), not `npx expo start` + Expo Go.

**Moving data between PCs: `scripts/db.mjs`.** The GitHub repo is public, so data is split in two:
- **`npm run db:snapshot`** writes the public data (provinces, districts, stations, weather readings, forecasts, migration history) to `db/init/01-weather-snapshot.sql`, which is committed. `docker-compose.yml` mounts `db/init/` into Postgres' `/docker-entrypoint-initdb.d`, so a **fresh PC with an empty volume loads it automatically**. It's kept byte-for-byte via `.gitattributes`, because Windows line endings would corrupt its data rows.
- **`npm run db:backup`** writes everything, including accounts, to `backups/` (git-ignored). **`npm run db:restore -- <file>`** loads a backup, stopping the backend and worker first and then starting them, so newer migrations apply on top of an older backup.

**Quickest test build: `npm run apk` (in `frontend/`).** Builds on this computer with no Expo queue (about 2 minutes after the first build) using `scripts/build-apk.mjs`. Each run bumps `android.versionCode` in `app.json`, which is the build number shown in the app as **Settings → Version: 1.0.0 (02)**. It builds a release APK for arm64 phones with Android Studio's bundled Java, and copies it to the Desktop as `ThaiWeather-test-02.apk`, so the file name and the installed app always match. A failed build doesn't use up a number. The first run generates `android/` (git-ignored) from `app.json`.

**Building a test APK to try notifications:** `npx eas-cli build -p android --profile preview` builds an installable APK in Expo's cloud and gives you a download link and QR code. Things to know:
- `.env` isn't uploaded to the cloud build, so the backend address comes from `EXPO_PUBLIC_API_URL` in `eas.json`'s `preview` profile. It's a LAN IP, so the phone must be on the same Wi-Fi as the backend, and a changed IP means a rebuild.
- Android push needs Firebase: `frontend/google-services.json` (referenced from `app.json`) plus an FCM V1 service-account key uploaded with `npx eas-cli credentials`.
- Once alerts are on, the Notifications page shows **Send test notification**. It calls `POST /api/push/test`, which pushes to every device on your account, so you can check the whole chain without waiting for real severe weather.

## Backend (`backend/src/`) — the server

**`server.ts`** — the actual entrypoint. Starts the web server and attaches the WebSocket layer.

**`worker.ts`** — a *separate* process from the server. Its only job is running scheduled background tasks (pulling weather data) so a slow data-fetch never blocks someone using the app.

**`app.ts`** — wires together all the pieces: enables CORS (which sites are allowed to call this API), parses incoming JSON, and mounts every route group (`/api/auth`, `/api/weather`, etc.).

**`config/env.ts`** — reads and validates all the settings from `.env` (database URL, secret keys, etc.) at startup, so the app fails fast with a clear error if something's misconfigured, instead of breaking mysteriously later.

**`modules/`** — one folder per feature, each with routes (what URLs exist) and services (the actual logic):
- `auth/` — register, login, logout, refresh tokens (how you stay logged in). `auth.routes.ts` now also returns the refresh token directly in its response body (not just as a browser cookie) and accepts it the same way on `/refresh` and `/logout` — a native app has no browser cookie jar, so the mobile app stores this token itself instead (see `expo-secure-store` below).
- `geo/` — the province/district list, plus "find nearest province to this GPS coordinate"
- `weather/` — reads saved weather data and returns it to the app
- `alertHistory/` — the app's **Alert history** and its red unread badge. Every push that reaches at least one device is recorded in the `AlertHistory` table (by `sendPushToUser` in `push.service.ts`, the single place all pushes go through, with `kind` = live / forecast / test). `GET /api/alert-history` returns the last 50 plus the unread count, `GET /api/alert-history/unread-count` is the lightweight call behind the badge, and `POST /api/alert-history/read` marks everything read. The app calls it when you open the history page
- `savedLocations/` — a logged-in user's list of saved locations (province + optional district) for quick access — what the location-picker sheet's list is built from. Saved locations also decide **which provinces send you alerts**. Each row has a `notify` flag (default on), and `PATCH /api/saved-locations/notify` with `{ provinceId, notify }` flips every saved location in one province together, since alerts are matched per province, not per district
- `push/` — stores a device's Expo push token and sends alerts to it (see push notifications note above)
- `alertPreferences/` — each user's own thresholds for what counts as severe (temperature high/low, rainfall). No saved row means the defaults apply, so this table only ever holds deliberate choices.
- `users/` — lets a logged-in user set their favorite province
- `stations/` — the list of weather stations behind the scenes

**`ingestion/`** — the part that actually *gets* weather data from the outside world:
- `openMeteoClient.ts` — calls the free Open-Meteo weather API
- `tmdClient.ts` — calls Thailand's official weather API (dormant until you get that API key)
- `jobs/` — the actual "pull weather now" tasks that BullMQ runs on a schedule
- `weatherAlerts.ts` — decides if a reading is "severe" and triggers a push notification if so. Since thresholds are per-user, "is this severe?" is asked once per subscriber rather than once per reading, and the state that stops an ongoing storm re-alerting every cycle is tracked per user per station (`UserStationAlert`) for the same reason — one station-level flag would let the first user's alert swallow the second's. Only users with a saved location in that province and `notify` on get the alert. The alert title names the province (e.g. "Thunderstorm warning · Chiang Mai"), because one user can follow several, and the push carries `provinceId` in its data so the app can open that province when tapped. `forecastAlerts.ts` does the same for tomorrow's forecast. The threshold rules themselves live in `lib/alertThresholds.ts`, kept free of Prisma so they're unit-tested without a database (`npm test --workspace backend`).
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
- `Sheet.tsx` — the bottom-sheet popup pattern used for the location/account/settings menus (a native modal that slides up from the bottom). It animates itself: the dark backdrop fades while the panel slides up, and closing plays in reverse before the popup is removed. Its content scrolls once it's taller than 75% of the screen, and an optional `onBack` shows a back arrow for sub-pages like Settings → Notifications
- `SelectSheet.tsx` — a searchable list-in-a-sheet, used anywhere the app needs you to pick one option from a list (province, district, favorite province) — phones have no dropdown menu like a website does, so this is the replacement
- `LocationPrompt.tsx` — the "use my location?" ask
- `SavedLocationsList.tsx` — the location sheet's main view: the device's current location pinned first, then the signed-in user's saved locations, each showing a live weather preview fetched in one batched request
- `LocationCard.tsx` — one row in that list (name, temperature, condition, delete button)
- `LocationPicker.tsx` — the "add a new saved location" sub-flow (province + district picker) reached from the `+` button in `SavedLocationsList.tsx`
- `Motion.tsx` + `lib/motion.ts` — the app's animation toolkit (built on `react-native-reanimated`). `lib/motion.ts` holds the shared timings and the rules they follow: every animation has a job, stays short (about 150–350ms), and animates only position, scale and opacity. It also respects the phone's "Reduce motion" setting automatically. `Motion.tsx` has the reusable pieces: `FadeInView` (staggered fade-and-rise when something appears), `PressableScale` (a button that shrinks slightly while held), `PageTransition` (slides sub-pages in from the right, and from the left going back), `Pulse` (breathing loading placeholder), and `LoadingDots` / `LoadingText` (three dots that hop left to right on repeat; `LoadingText` swaps the trailing "..." of a translated message like "Saving..." for them). `AppSplash.tsx` is the opening screen: the app icon floats while the first weather data loads. `DashboardScreen.tsx` holds it until there's something real to show, only once per launch, with a 12-second safety limit. **Gotcha:** never put `className` on a Reanimated `Animated.View`. NativeWind and Reanimated clash over the style object there, so animated views use `style` and wrap a normal className'd `View` inside
- `SettingsList.tsx` — shared building blocks for the settings-style screens: `SettingsSection` (a small uppercase caption over one rounded group of rows), `SettingsRow` (icon tile + label + value/chevron or a custom control on the right), `Toggle` (the app's pill switch) and `SegmentedControl` (e.g. °C | °F)
- `SettingsPanel.tsx` — the Settings sheet: General (temperature unit, language, mobile-data updates), Notifications (a row showing On/Off that opens the Notifications page) and About (report an issue, app version)
- `AccountPanel.tsx` — the Account sheet: a profile card, a Notifications row and Log out when signed in; sign-in / create-account buttons when not
- `AlertHistory.tsx` + `hooks/useUnreadAlertCount.ts` — Account → **Alert history** (past alerts, newest first, with a red dot on the ones that are new) and the red unread badge on the header's account icon and the history row. The count refreshes when the app returns to the foreground (React Query's `focusManager` is wired to `AppState` in `app/_layout.tsx`), when a push arrives while the app is open, and every minute. Opening the page marks everything read, which clears the badge
- `NotificationSettings.tsx` — the Notifications page, opened from either sheet: the master "Weather alerts" switch, a Provinces list with one switch per saved province (saved districts are grouped under their province; a muted-bell icon then shows on that province's cards in the location list), one switch per alert type (heat, cold, rain, thunderstorms) and a Mild / Moderate / Strict sensitivity picker. Every change saves straight away. Which page each sheet is showing is tracked in `DashboardScreen.tsx`; both sheets open the page inside themselves rather than jumping to the other sheet, because iOS can't open one popup while another is still closing
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
