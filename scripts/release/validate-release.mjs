#!/usr/bin/env node

import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  getChangedPaths,
  loadReleaseInputs,
  registryVersionExists,
  validateChangelog,
  validatePackageMetadata,
  validateReadme,
  validateReleasing,
  validateTag,
  validateVersions,
} from "./release-lib.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const args = new Set(process.argv.slice(2));
const tagArgument = process.argv
  .slice(2)
  .find((argument) => argument.startsWith("--tag="));
const explicitTagIndex = process.argv.indexOf("--tag");
const explicitTag =
  tagArgument?.slice("--tag=".length) ??
  (explicitTagIndex >= 0 ? process.argv[explicitTagIndex + 1] : undefined);
const githubTag =
  process.env.GITHUB_REF_TYPE === "tag" ? process.env.GITHUB_REF_NAME : undefined;
const tag = explicitTag ?? githubTag;

const {
  packageJson,
  packageLock,
  sdkSource,
  readme,
  changelog,
  releasing,
} = loadReleaseInputs(root);

const errors = [
  ...validateVersions(packageJson, packageLock, sdkSource),
  ...validatePackageMetadata(packageJson),
  ...validateReadme(readme),
  ...validateReleasing(releasing),
  ...validateChangelog(changelog, packageJson.version, Boolean(tag)),
  ...validateTag(tag, packageJson.version),
];

if (args.has("--require-clean")) {
  const changedPaths = getChangedPaths(root);
  if (changedPaths.length > 0) {
    errors.push(`worktree must be clean:\n${changedPaths.join("\n")}`);
  }
}

if (args.has("--check-registry")) {
  if (registryVersionExists(packageJson.name, packageJson.version, root)) {
    errors.push(
      `${packageJson.name}@${packageJson.version} already exists on npm`,
    );
  }
}

if (errors.length > 0) {
  console.error("Release validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(
  `Release metadata valid for ${packageJson.name}@${packageJson.version}` +
    (tag ? ` (${tag})` : ""),
);
