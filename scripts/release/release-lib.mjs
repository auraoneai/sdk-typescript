import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const REQUIRED_README_HEADINGS = [
  "## Hosted API Or Local EvalKit?",
  "## Install",
  "## First Typed Workflow",
  "## Package Exports",
  "## Credentials Stay On The Server",
  "## Errors And Retries",
  "## Runtime And TypeScript Support",
  "## Release And Source Proof",
  "## Limitations",
  "## Links",
  "## Next Action",
];

export const REQUIRED_README_MARKERS = [
  ["backend audience", "backend services"],
  ["hosted-client differentiator", "evaluation idempotency"],
  ["typed request", "CreateEvaluationOptions"],
  ["typed result", "EvaluationResult"],
  ["package metadata export", "@auraone/sdk/package.json"],
  ["browser credential boundary", "Do not bundle an AuraOne API key"],
  ["debug credential warning", "debug logging includes request headers and bodies"],
  ["not-found error", "NotFoundError"],
  ["registry publication check", "npm view @auraone/sdk version"],
  ["publication proof boundary", "not proof of publication"],
  ["zero-retry limitation", "`retries: 0`"],
];

export function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function extractSdkVersion(source) {
  return source.match(/SDK_VERSION\s*=\s*"([^"]+)"/)?.[1];
}

export function validateVersions(packageJson, packageLock, sdkSource) {
  const errors = [];
  const rootLockVersion = packageLock.version;
  const packageLockVersion = packageLock.packages?.[""]?.version;
  const sdkVersion = extractSdkVersion(sdkSource);

  for (const [label, version] of [
    ["package-lock.json version", rootLockVersion],
    ["package-lock.json root package version", packageLockVersion],
    ["src/version.ts SDK_VERSION", sdkVersion],
  ]) {
    if (version !== packageJson.version) {
      errors.push(
        `${label} must equal package.json version ${packageJson.version}; found ${String(version)}`,
      );
    }
  }

  return errors;
}

export function validatePackageMetadata(packageJson) {
  const errors = [];
  const description = packageJson.description ?? "";
  const descriptionLower = description.toLowerCase();

  if (packageJson.name !== "@auraone/sdk") {
    errors.push("package name must remain @auraone/sdk");
  }
  if (description.length < 100 || description.length > 180) {
    errors.push("package description must be 100-180 characters");
  }
  for (const term of [
    "typescript",
    "node.js",
    "hosted auraone api",
    "evaluations",
    "authentication",
    "retries",
    "polling",
  ]) {
    if (!descriptionLower.includes(term)) {
      errors.push(`package description must include ${term}`);
    }
  }
  if (packageJson.license !== "MIT") {
    errors.push("package license must be MIT");
  }
  if (
    packageJson.author?.name !== "AuraOne" ||
    packageJson.author?.url !== "https://www.auraone.ai"
  ) {
    errors.push("package author must identify AuraOne and its canonical URL");
  }
  if (packageJson.repository?.url !== "git+https://github.com/auraoneai/sdk-typescript.git") {
    errors.push("repository.url must point to auraoneai/sdk-typescript");
  }
  if (packageJson.bugs?.url !== "https://github.com/auraoneai/sdk-typescript/issues") {
    errors.push("bugs.url must point to the SDK issue tracker");
  }
  if (packageJson.homepage !== "https://www.auraone.ai/developers") {
    errors.push("homepage must point to AuraOne developer documentation");
  }
  if (packageJson.publishConfig?.access !== "public") {
    errors.push("publishConfig.access must be public");
  }
  if (packageJson.publishConfig?.provenance !== true) {
    errors.push("publishConfig.provenance must be true");
  }
  if (packageJson.engines?.node !== ">=18") {
    errors.push("engines.node must declare the supported Node.js 18+ range");
  }
  if (packageJson.peerDependencies?.typescript !== ">=4.0.0") {
    errors.push("peerDependencies.typescript must declare >=4.0.0");
  }
  if (packageJson.main !== "dist/index.cjs") {
    errors.push("main must point to the CommonJS bundle");
  }
  if (packageJson.module !== "dist/index.esm.js") {
    errors.push("module must point to the ESM bundle");
  }
  if (packageJson.types !== "dist/index.d.ts") {
    errors.push("types must point to the bundled declarations");
  }
  if (packageJson.sideEffects !== false) {
    errors.push("sideEffects must remain false");
  }

  const requiredFiles = ["dist", "README.md", "LICENSE"];
  for (const path of requiredFiles) {
    if (!packageJson.files?.includes(path)) {
      errors.push(`package files must include ${path}`);
    }
  }

  for (const condition of ["types", "import", "require"]) {
    if (!packageJson.exports?.["."]?.[condition]) {
      errors.push(`package exports must define the ${condition} condition`);
    }
  }
  if (packageJson.exports?.["."]?.types !== "./dist/index.d.ts") {
    errors.push("package exports types must point to ./dist/index.d.ts");
  }
  if (packageJson.exports?.["."]?.import !== "./dist/index.esm.js") {
    errors.push("package exports import must point to ./dist/index.esm.js");
  }
  if (packageJson.exports?.["."]?.require !== "./dist/index.cjs") {
    errors.push("package exports require must point to ./dist/index.cjs");
  }
  if (packageJson.exports?.["./package.json"] !== "./package.json") {
    errors.push("package exports must expose ./package.json");
  }

  const keywords = packageJson.keywords;
  if (!Array.isArray(keywords)) {
    errors.push("package keywords must be an array");
  } else {
    if (keywords.length < 8 || keywords.length > 12) {
      errors.push("package keywords must contain 8-12 focused terms");
    }
    if (new Set(keywords).size !== keywords.length) {
      errors.push("package keywords must not contain duplicates");
    }
    for (const keyword of keywords) {
      if (
        typeof keyword !== "string" ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(keyword)
      ) {
        errors.push(`invalid npm keyword: ${String(keyword)}`);
      }
    }
    for (const requiredKeyword of [
      "auraone",
      "typescript",
      "nodejs",
      "api-client",
      "hosted-api",
      "ai-evaluation",
      "graphql-client",
    ]) {
      if (!keywords.includes(requiredKeyword)) {
        errors.push(`package keywords must include ${requiredKeyword}`);
      }
    }
    for (const unexportedFramework of ["langchain", "llamaindex"]) {
      if (keywords.includes(unexportedFramework)) {
        errors.push(
          `package keywords must not advertise unexported ${unexportedFramework} integration`,
        );
      }
    }
  }

  return errors;
}

export function validateReadme(readme) {
  const errors = [];
  let previousIndex = -1;

  for (const heading of REQUIRED_README_HEADINGS) {
    const index = readme.indexOf(heading);
    if (index === -1) {
      errors.push(`README is missing required heading: ${heading}`);
      continue;
    }
    if (index < previousIndex) {
      errors.push(`README heading is out of order: ${heading}`);
    }
    previousIndex = index;
  }

  for (const [label, marker] of REQUIRED_README_MARKERS) {
    if (!readme.includes(marker)) {
      errors.push(`README is missing ${label}: ${marker}`);
    }
  }

  if (!readme.includes("rubric.web.qa")) {
    errors.push("README must use the canonical rubric.web.qa example");
  }
  if (!readme.includes("idempotencyKey")) {
    errors.push("README quickstart must demonstrate evaluation idempotency");
  }
  if (!readme.includes("timeoutSeconds") || !readme.includes("retries")) {
    errors.push("README must document timeout and retry behavior");
  }
  if (
    !readme.includes('import AuraOne, {') ||
    !readme.includes('require("@auraone/sdk")')
  ) {
    errors.push("README must document ESM default/named and CommonJS imports");
  }
  if (/npm install (?:--save-exact )?@auraone\/sdk@\d+\.\d+\.\d+/.test(readme)) {
    errors.push(
      "README install guidance must resolve publication status from npm instead of hard-coding a version",
    );
  }
  if (/(?:api[_-]?key|token)\s*[:=]\s*["'][A-Za-z0-9_-]{16,}/i.test(readme)) {
    errors.push("README appears to contain a key-shaped credential literal");
  }

  return errors;
}

export function validateReleasing(releasing) {
  const errors = [];
  const requiredMarkers = [
    ["registry publication authority", "not proof that the version is published"],
    ["trusted publishing", "npm trusted publishing"],
    ["pinned npm version", "npm `11.18.0`"],
    ["publication authorization", "OSS_PUBLICATION_AUTHORIZATION_TAG"],
    ["signed tag command", "git tag -s"],
    ["tag-push boundary", "A tag push does not publish to npm"],
    ["manual dispatch", "workflow_dispatch"],
    ["explicit publish input", "publish=true"],
    ["registry verification", "npm view \"@auraone/sdk@${version}\""],
    ["signature verification", "--verify-signatures"],
  ];

  for (const [label, marker] of requiredMarkers) {
    if (!releasing.includes(marker)) {
      errors.push(`RELEASING.md is missing ${label}: ${marker}`);
    }
  }

  if (releasing.includes("git tag -a ")) {
    errors.push("RELEASING.md must require signed tags with git tag -s");
  }
  if (/manual dispatch is always dry-run/i.test(releasing)) {
    errors.push(
      "RELEASING.md must not claim every manual dispatch is a dry run",
    );
  }

  return errors;
}

export function validateChangelog(changelog, version, requireReleaseSection) {
  const errors = [];

  if (!changelog.includes("## [Unreleased]")) {
    errors.push("CHANGELOG.md must contain an Unreleased section");
  }

  if (requireReleaseSection) {
    const escaped = version.replaceAll(".", "\\.");
    const releaseHeading = new RegExp(
      `^## \\[${escaped}\\] - \\d{4}-\\d{2}-\\d{2}$`,
      "m",
    );
    if (!releaseHeading.test(changelog)) {
      errors.push(
        `CHANGELOG.md must contain a dated ## [${version}] release section`,
      );
    }
  }

  return errors;
}

export function validateTag(tag, version) {
  if (!tag) return [];
  return tag === `v${version}`
    ? []
    : [`release tag ${tag} must equal package version tag v${version}`];
}

export function prepareChangelog(changelog, version, date) {
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
    throw new Error(`Invalid semantic version: ${version}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid release date: ${date}`);
  }
  if (changelog.includes(`## [${version}]`)) {
    throw new Error(`CHANGELOG.md already contains version ${version}`);
  }

  const match = changelog.match(
    /(^## \[Unreleased\]\s*\n)([\s\S]*?)(?=^## \[[^\]]+\])/m,
  );
  if (!match) {
    throw new Error("CHANGELOG.md has no promotable Unreleased section");
  }

  const unreleasedBody = match[2].trim();
  if (!unreleasedBody) {
    throw new Error("CHANGELOG.md Unreleased section is empty");
  }

  const promoted = [
    "## [Unreleased]",
    "",
    `## [${version}] - ${date}`,
    "",
    unreleasedBody,
    "",
  ].join("\n");

  return changelog.replace(match[0], promoted);
}

export function registryVersionExists(packageName, version, cwd) {
  try {
    execFileSync(
      "npm",
      ["view", `${packageName}@${version}`, "version", "--json"],
      { cwd, stdio: "pipe" },
    );
    return true;
  } catch (error) {
    const output = `${error.stdout ?? ""}\n${error.stderr ?? ""}`;
    if (output.includes("E404") || output.includes("404 Not Found")) {
      return false;
    }
    throw error;
  }
}

export function getChangedPaths(cwd) {
  const output = execFileSync(
    "git",
    ["status", "--porcelain", "--untracked-files=all"],
    { cwd, encoding: "utf8" },
  );
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function loadReleaseInputs(root) {
  return {
    packageJson: readJson(resolve(root, "package.json")),
    packageLock: readJson(resolve(root, "package-lock.json")),
    sdkSource: readFileSync(resolve(root, "src/version.ts"), "utf8"),
    readme: readFileSync(resolve(root, "README.md"), "utf8"),
    changelog: readFileSync(resolve(root, "CHANGELOG.md"), "utf8"),
    releasing: readFileSync(resolve(root, "RELEASING.md"), "utf8"),
  };
}
