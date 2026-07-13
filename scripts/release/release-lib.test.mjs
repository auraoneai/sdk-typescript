import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  REQUIRED_README_HEADINGS,
  REQUIRED_README_MARKERS,
  extractSdkVersion,
  loadReleaseInputs,
  prepareChangelog,
  validateChangelog,
  validatePackageMetadata,
  validateReadme,
  validateReleasing,
  validateTag,
  validateVersions,
} from "./release-lib.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function readmeFixture(headings = REQUIRED_README_HEADINGS) {
  return [
    ...headings,
    ...REQUIRED_README_MARKERS.map(([, marker]) => marker),
    "rubric.web.qa idempotencyKey timeoutSeconds retries",
    'import AuraOne, { AuraOneClient } from "@auraone/sdk";',
    'require("@auraone/sdk");',
  ].join("\n");
}

describe("release metadata validation", () => {
  test("validates the repository documentation and npm metadata together", () => {
    const {
      packageJson,
      packageLock,
      sdkSource,
      readme,
      changelog,
      releasing,
    } = loadReleaseInputs(root);

    assert.deepEqual(
      [
        ...validateVersions(packageJson, packageLock, sdkSource),
        ...validatePackageMetadata(packageJson),
        ...validateReadme(readme),
        ...validateReleasing(releasing),
        ...validateChangelog(changelog, packageJson.version, true),
      ],
      [],
    );
  });

  test("extracts and compares all package version surfaces", () => {
    assert.equal(
      extractSdkVersion('export const SDK_VERSION = "1.2.3";'),
      "1.2.3",
    );
    assert.deepEqual(
      validateVersions(
        { version: "1.2.3" },
        { version: "1.2.3", packages: { "": { version: "1.2.3" } } },
        'export const SDK_VERSION = "1.2.3";',
      ),
      [],
    );
  });

  test("reports drift between package, lockfile, and source versions", () => {
    const errors = validateVersions(
      { version: "1.2.3" },
      { version: "1.2.2", packages: { "": { version: "1.2.1" } } },
      'export const SDK_VERSION = "1.2.0";',
    );
    assert.equal(errors.length, 3);
  });

  test("requires README sections in the shared SDK order", () => {
    const readme = readmeFixture();
    assert.deepEqual(validateReadme(readme), []);

    const reversed = readmeFixture([...REQUIRED_README_HEADINGS].reverse());
    assert.ok(
      validateReadme(reversed).some((error) =>
        error.includes("out of order"),
      ),
    );
  });

  test("rejects key-shaped credential literals in documentation", () => {
    const readme = [
      readmeFixture(),
      'apiKey = "abcdefghijklmnop1234"',
    ].join("\n");
    assert.ok(
      validateReadme(readme).some((error) =>
        error.includes("key-shaped credential"),
      ),
    );
  });

  test("rejects misleading or bloated package discovery metadata", () => {
    const { packageJson } = loadReleaseInputs(root);
    const fixture = JSON.parse(JSON.stringify(packageJson));
    fixture.keywords.push("langchain", "llamaindex", "ai-platform");

    const errors = validatePackageMetadata(fixture);
    assert.ok(
      errors.some((error) => error.includes("8-12 focused terms")),
    );
    assert.ok(
      errors.some((error) => error.includes("unexported langchain")),
    );
    assert.ok(
      errors.some((error) => error.includes("unexported llamaindex")),
    );
  });

  test("requires the signed-tag and explicit manual-publish boundaries", () => {
    const { releasing } = loadReleaseInputs(root);
    assert.deepEqual(validateReleasing(releasing), []);

    const unsafe = releasing
      .replace("git tag -s", "git tag -a")
      .replace(
        "A tag push does not publish to npm",
        "A tag push publishes to npm",
      );
    const errors = validateReleasing(unsafe);
    assert.ok(
      errors.some((error) => error.includes("signed tag command")),
    );
    assert.ok(
      errors.some((error) => error.includes("tag-push boundary")),
    );
    assert.ok(
      errors.some((error) => error.includes("git tag -s")),
    );
  });

  test("requires exact tags and dated release changelog sections", () => {
    assert.deepEqual(validateTag("v1.2.3", "1.2.3"), []);
    assert.equal(validateTag("v1.2.2", "1.2.3").length, 1);

    const changelog = [
      "## [Unreleased]",
      "## [1.2.3] - 2026-07-12",
    ].join("\n");
    assert.deepEqual(validateChangelog(changelog, "1.2.3", true), []);
    assert.equal(
      validateChangelog("## [Unreleased]", "1.2.3", true).length,
      1,
    );
  });

  test("promotes Unreleased notes into a dated release section", () => {
    const changelog = [
      "# Changelog",
      "",
      "## [Unreleased]",
      "",
      "### Added",
      "",
      "- Release automation.",
      "",
      "## [1.2.2] - 2026-07-01",
      "",
      "- Previous release.",
      "",
    ].join("\n");

    const prepared = prepareChangelog(changelog, "1.2.3", "2026-07-12");
    assert.match(
      prepared,
      /## \[Unreleased\]\n\n## \[1\.2\.3\] - 2026-07-12/,
    );
    assert.match(prepared, /### Added\n\n- Release automation\./);
    assert.equal(
      prepared.match(/- Release automation\./g)?.length,
      1,
    );
  });

  test("rejects invalid or duplicate release preparation", () => {
    assert.throws(
      () => prepareChangelog("## [Unreleased]\n\n- Change\n", "next", "2026-07-12"),
      /Invalid semantic version/,
    );
    assert.throws(
      () =>
        prepareChangelog(
          "## [Unreleased]\n\n- Change\n\n## [1.2.3] - 2026-07-12\n",
          "1.2.3",
          "2026-07-12",
        ),
      /already contains/,
    );
  });
});
