// Builds a numbered test APK on this computer (no Expo cloud queue) and puts it on the Desktop.
//
//   npm run apk
//
// Each run bumps the build number (android.versionCode in app.json → shown in the app as
// "Settings → Version: 1.0.0 (02)"), builds a release APK for arm64 phones, and copies it to the
// Desktop as ThaiWeather-test-02.apk — so the file name and the installed app always match.
// A higher versionCode also lets Android install it over the previous build as an update.
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const appJsonPath = path.join(root, "app.json");
const gradlePath = path.join(root, "android", "app", "build.gradle");
const apkPath = path.join(root, "android", "app", "build", "outputs", "apk", "release", "app-release.apk");

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, { stdio: "inherit", shell: true, ...opts });
  return result.status === 0;
}

function desktopDir() {
  // Windows Desktop is often redirected into OneDrive, so ask Windows rather than guess.
  const r = spawnSync("powershell", ["-NoProfile", "-Command", "[Environment]::GetFolderPath('Desktop')"], {
    encoding: "utf8",
  });
  const dir = r.stdout?.trim();
  return dir && existsSync(dir) ? dir : path.join(os.homedir(), "Desktop");
}

const appJsonRaw = readFileSync(appJsonPath, "utf8");
const appJson = JSON.parse(appJsonRaw);
const previous = appJson.expo.android.versionCode ?? 1;
const build = previous + 1;
const label = String(build).padStart(2, "0");

console.log(`\n▶ Building test APK #${label} (versionCode ${previous} → ${build})\n`);
appJson.expo.android.versionCode = build;
writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + "\n");

// First run (or after deleting android/): generate the native project from app.json.
if (!existsSync(gradlePath)) {
  if (!run("npx", ["expo", "prebuild", "-p", "android", "--no-install"], { cwd: root })) {
    writeFileSync(appJsonPath, appJsonRaw);
    process.exit(1);
  }
}
const gradleRaw = readFileSync(gradlePath, "utf8");
writeFileSync(gradlePath, gradleRaw.replace(/versionCode \d+/, `versionCode ${build}`));

const env = {
  ...process.env,
  // Android Studio's bundled JDK — the one Gradle for this project is known to work with.
  JAVA_HOME:
    process.env.JAVA_HOME || path.join(process.env.ProgramFiles ?? "C:/Program Files", "Android", "Android Studio", "jbr"),
  ANDROID_HOME: process.env.ANDROID_HOME || path.join(process.env.LOCALAPPDATA ?? "", "Android", "Sdk"),
};
// Full path: cmd.exe doesn't always look in the working directory for executables.
const androidDir = path.join(root, "android");
const ok = run(
  `"${path.join(androidDir, "gradlew.bat")}"`,
  ["assembleRelease", "-PreactNativeArchitectures=arm64-v8a"],
  {
    cwd: androidDir,
    env,
  },
);

if (!ok) {
  // Don't burn a build number on a failed build.
  writeFileSync(appJsonPath, appJsonRaw);
  writeFileSync(gradlePath, gradleRaw);
  console.error(`\n✖ Build #${label} failed — build number left at ${String(previous).padStart(2, "0")}.`);
  process.exit(1);
}

const dest = path.join(desktopDir(), `ThaiWeather-test-${label}.apk`);
copyFileSync(apkPath, dest);
console.log(`\n✔ Build #${label} ready: ${dest}\n  (In the app: Settings → Version shows "(${label})")\n`);
