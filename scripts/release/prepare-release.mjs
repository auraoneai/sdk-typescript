#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { prepareChangelog } from "./release-lib.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const version = process.argv[2];
const dateArgument = process.argv.find((argument) =>
  argument.startsWith("--date="),
);
const dateIndex = process.argv.indexOf("--date");
const releaseDate =
  dateArgument?.slice("--date=".length) ??
  (dateIndex >= 0 ? process.argv[dateIndex + 1] : undefined) ??
  new Date().toISOString().slice(0, 10);

if (!version || version.startsWith("--")) {
  console.error(
    "Usage: npm run release:prepare -- <version> [--date YYYY-MM-DD]",
  );
  process.exit(2);
}

const packageJson = JSON.parse(
  readFileSync(resolve(root, "package.json"), "utf8"),
);
if (packageJson.version === version) {
  console.error(`package.json is already at version ${version}`);
  process.exit(1);
}

const changelogPath = resolve(root, "CHANGELOG.md");
const changelog = readFileSync(changelogPath, "utf8");
const nextChangelog = prepareChangelog(changelog, version, releaseDate);

const versionPath = resolve(root, "src/version.ts");
const versionSource = readFileSync(versionPath, "utf8");
if (!/SDK_VERSION\s*=\s*"[^"]+"/.test(versionSource)) {
  throw new Error("src/version.ts does not contain SDK_VERSION");
}
const nextVersionSource = versionSource.replace(
  /SDK_VERSION\s*=\s*"[^"]+"/,
  `SDK_VERSION = "${version}"`,
);

execFileSync(
  "npm",
  ["version", version, "--no-git-tag-version", "--ignore-scripts"],
  { cwd: root, stdio: "inherit" },
);
writeFileSync(changelogPath, nextChangelog);
writeFileSync(versionPath, nextVersionSource);

console.log(`Prepared @auraone/sdk ${version} for ${releaseDate}`);
console.log("Run npm run release:preflight before committing or tagging.");
