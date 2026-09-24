// Moving database data between computers (Docker must be running: `docker compose up -d`).
//
//   npm run db:snapshot          Public weather data → db/init/01-weather-snapshot.sql (committed).
//                                A fresh PC's Postgres loads it automatically the first time it
//                                starts with an empty volume, so the app has data right away.
//   npm run db:backup            EVERYTHING incl. accounts → backups/weather-<date>.sql (git-ignored,
//                                private — copy it yourself by USB/Drive, never commit it).
//   npm run db:restore <file>    Replace this PC's database with a backup file, then restart the
//                                backend/worker so they apply any newer migrations.
//
// Why two kinds: this GitHub repo is public. Provinces, stations and weather are public data;
// users, tokens and alert history are not.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

// Personal tables: schema goes into the snapshot (so the database is complete), rows never do.
const PERSONAL_TABLES = [
  "User",
  "RefreshToken",
  "PushSubscription",
  "SavedLocation",
  "AlertPreference",
  "AlertHistory",
  "UserStationAlert",
  "UserForecastAlert",
];

function envValue(key, fallback) {
  if (process.env[key]) return process.env[key];
  const envPath = path.join(root, ".env");
  if (!existsSync(envPath)) return fallback;
  const line = readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim() : fallback;
}

const DB_USER = envValue("POSTGRES_USER", "weather");
const DB_NAME = envValue("POSTGRES_DB", "weather");

function compose(args, { capture = false } = {}) {
  const result = spawnSync("docker", ["compose", ...args], {
    cwd: root,
    stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
    maxBuffer: 1024 * 1024 * 1024,
  });
  if (result.status !== 0) {
    console.error(`\n✖ "docker compose ${args.join(" ")}" failed — is Docker running? Try: docker compose up -d`);
    process.exit(1);
  }
  return result.stdout; // Buffer — kept as raw bytes so Thai text survives untouched
}

function stamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

const [command, fileArg] = process.argv.slice(2);

if (command === "snapshot") {
  const excludes = PERSONAL_TABLES.map((t) => `--exclude-table-data=public."${t}"`);
  const dump = compose(
    ["exec", "-T", "postgres", "pg_dump", "-U", DB_USER, "-d", DB_NAME, "--no-owner", "--no-privileges", ...excludes],
    { capture: true },
  );
  const out = path.join(root, "db", "init", "01-weather-snapshot.sql");
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, dump);
  console.log(`✔ Snapshot (no personal data) → ${path.relative(root, out)} (${(dump.length / 1e6).toFixed(1)} MB)`);
  console.log("  Commit it so a fresh PC starts with this weather data.");
} else if (command === "backup") {
  const dump = compose(
    ["exec", "-T", "postgres", "pg_dump", "-U", DB_USER, "-d", DB_NAME, "--clean", "--if-exists", "--no-owner"],
    { capture: true },
  );
  const out = path.join(root, "backups", `weather-${stamp()}.sql`);
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, dump);
  console.log(`✔ Full backup (INCLUDES accounts — keep private) → ${path.relative(root, out)}`);
} else if (command === "restore") {
  if (!fileArg || !existsSync(fileArg)) {
    console.error("Usage: npm run db:restore -- backups/weather-YYYYMMDD-HHMM.sql");
    process.exit(1);
  }
  // Copy into the container rather than piping through the shell: PowerShell re-encodes piped
  // text and garbles Thai names.
  compose(["cp", path.resolve(fileArg), "postgres:/tmp/restore.sql"]);
  // Stopped first so their open connections can't block the restore's DROP TABLEs; starting them
  // again runs `prisma migrate deploy`, bringing an older backup up to the current schema.
  compose(["stop", "backend", "worker"]);
  compose(["exec", "-T", "postgres", "psql", "-U", DB_USER, "-d", DB_NAME, "-q", "-v", "ON_ERROR_STOP=1", "-f", "/tmp/restore.sql"]);
  compose(["up", "-d", "backend", "worker"]);
  console.log(`✔ Restored ${fileArg} — backend and worker restarted.`);
} else {
  console.log("Usage: npm run db:snapshot | npm run db:backup | npm run db:restore -- <file>");
  process.exit(1);
}
