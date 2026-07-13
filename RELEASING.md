# Releasing `@auraone/sdk`

This repository publishes `@auraone/sdk` to npm through `.github/workflows/release-npm.yml`. The workflow uses npm trusted publishing through GitHub Actions OIDC; it does not read a long-lived `NPM_TOKEN`.

The npm registry is the publication authority. A version in `package.json`, `src/version.ts`, `package-lock.json`, `CHANGELOG.md`, a branch, or a Git tag is not proof that the version is published.

## Release Guarantees

The current release path is designed to:

- Require one exact, signed, immutable `v<version>` source tag.
- Keep package, lockfile, source, changelog, and tag versions aligned.
- Run type checking, lint, unit tests, release-metadata tests, production dependency audit, and package-consumer smoke tests on Node.js 18, 20, and 22.
- Build one npm tarball, a SHA-256 checksum, and a CycloneDX SBOM.
- Consume the packed tarball through ESM, CommonJS, and TypeScript before publication.
- Publish the exact verified tarball with public access and npm provenance.
- Verify registry metadata, registry signatures, and available provenance attestations after publication.
- Attach the matching tarball, checksum, and SBOM to a GitHub Release.

## One-Time Setup

Configure the `@auraone/sdk` package on npm with this trusted publisher:

| Setting | Value |
| --- | --- |
| Provider | GitHub Actions |
| Organization or user | `auraoneai` |
| Repository | `sdk-typescript` |
| Workflow | `release-npm.yml` |
| Environment | `npm` |
| Allowed action | Publish |

Create a protected GitHub environment named `npm`. Limit deployment access to authorized release operators and require approval according to repository policy.

The publish job uses a GitHub-hosted runner, Node.js `22.14.0`, npm `11.18.0`, and `id-token: write`. The npm trusted-publisher configuration must match the repository, workflow filename, and environment exactly.

Set the GitHub Actions variable `OSS_PUBLICATION_AUTHORIZATION_TAG` to the approved, signed publication-authorization tag in `auraoneai/open`. The workflow verifies that tag, its signer, its source commit, and the authorization record before npm publication.

The authorized release signer must have the AuraOne Open release key configured locally. The workflow accepts fingerprint `F909806D13D9CD4CF403FA3C8C61E177EB6329E7`; a tag signed by a different key will fail.

After trusted publishing is tested, remove obsolete npm write tokens from repository and organization secrets.

## Prepare A Release

1. Choose the next version using Semantic Versioning.
2. Put complete user-facing notes under `## [Unreleased]` in `CHANGELOG.md`.
3. Install the exact locked development dependencies:

```bash
npm ci
```

4. Prepare package metadata, lockfile metadata, `src/version.ts`, and the dated changelog section together:

```bash
next_version="<next-semantic-version>"
npm run release:prepare -- "${next_version}"
```

Use `--date YYYY-MM-DD` only when the release date must differ from the current UTC date.

5. Update README install guidance, runtime support, examples, limitations, migration notes, and npm discovery metadata when package behavior or positioning changed.
6. Run the complete local gate:

```bash
npm run release:preflight
```

The preflight validates repository metadata and version agreement, audits production dependencies, runs type checking and lint, executes unit and release tests, builds Rollup outputs, inspects the npm tarball contents, and consumes that tarball through ESM, CommonJS, and TypeScript.

At this point the source tree contains a release candidate. Do not describe it as published until `npm view "@auraone/sdk@<version>" version` succeeds.

## Validate The Release Commit

Commit the prepared release, then run:

```bash
version="$(node -p "require('./package.json').version")"
node scripts/release/validate-release.mjs \
  --tag "v${version}" \
  --require-clean \
  --check-registry
```

This rejects a mismatched version or tag, dirty worktree, missing dated changelog section, invalid README/package metadata, or a version already present on npm.

Push the release commit through the normal review path. CI must pass on Node.js 18, 20, and 22 before tagging.

## Create The Signed Source Tag

Create a signed annotated tag with the authorized AuraOne Open release key:

```bash
version="$(node -p "require('./package.json').version")"
tag="v${version}"
git tag -s "${tag}" -m "@auraone/sdk ${version}"
git verify-tag "${tag}"
git push origin "${tag}"
```

The tag must resolve to the reviewed release commit and must never be moved or recreated.

A tag push does not publish to npm. It runs the workflow's preflight and immutable-artifact build path, then uploads the tarball, checksum, and SBOM as a temporary GitHub Actions artifact. Confirm that run succeeds before requesting publication.

## Authorize Publication

Coordinate the matching publication authorization in `auraoneai/open` and set `OSS_PUBLICATION_AUTHORIZATION_TAG` to its signed tag. The authorization record must name:

- Repository: `auraoneai-sdk-typescript`
- Source commit: the commit resolved by the SDK release tag
- Package: `@auraone/sdk`
- Version: the exact package version
- Channel: `npm`

The publish job stops before npm access if this authorization is missing, unsigned, signed by the wrong key, or does not match the release inputs.

## Publish From The Existing Tag

Publishing is an explicit `workflow_dispatch` operation against the already-pushed immutable tag. A manual dispatch with `publish=false` is a dry run. A manual dispatch with `publish=true` can publish after environment approval and authorization checks.

Using GitHub CLI:

```bash
version="$(node -p "require('./package.json').version")"
tag="v${version}"
gh workflow run release-npm.yml \
  --ref main \
  -f release_tag="${tag}" \
  -f publish=true
```

The publication run:

1. Checks out the exact release tag and reruns validation on Node.js 18, 20, and 22.
2. Verifies the tag is signed by the authorized fingerprint and resolves to the checked-out commit.
3. Rebuilds and verifies one tarball, checksum, and SBOM.
4. Verifies the coordinated publication authorization from `auraoneai/open`.
5. Checks whether the exact package version already exists.
6. Publishes the verified tarball with npm trusted publishing and provenance when the version is absent.
7. Accepts an existing version only when its registry integrity matches the verified tarball byte-for-byte.
8. Verifies clean installs, ESM, CommonJS, TypeScript, registry signatures, and available provenance attestations on Node.js 18, 20, and 22.
9. Creates or updates the matching GitHub Release with the tarball, checksum, and SBOM.

## Verify The Published Release

The workflow performs registry verification automatically. An operator can repeat the essential checks:

```bash
version="$(node -p "require('./package.json').version")"
npm view "@auraone/sdk@${version}" \
  version dist.integrity repository.url gitHead --json
node scripts/release/verify-package.mjs \
  --spec "@auraone/sdk@${version}" \
  --expected-version "${version}" \
  --registry-retries 6 \
  --verify-signatures
```

Compare the published source commit with the immutable tag:

```bash
version="$(node -p "require('./package.json').version")"
tag_commit="$(git rev-parse "v${version}^{}")"
registry_commit="$(npm view "@auraone/sdk@${version}" gitHead)"
test "${tag_commit}" = "${registry_commit}"
```

On npm, confirm that the version page shows the expected repository and, for releases made by this workflow, a provenance indicator tied to the expected workflow and source commit. On GitHub, confirm that the Release tag and attached checksums match the npm tarball.

## Failure And Rollback

- Before a tag is pushed, amend the release commit as needed and recreate the local tag.
- After a tag is pushed, preserve it. Fix the problem in a new commit and prepare a new package version and tag.
- If npm publication succeeds but later verification fails, do not overwrite the version. Deprecate it with an actionable message and publish a corrected patch release.
- If the GitHub Release job fails after npm succeeds, rerun the failed job for the same immutable tag and artifacts.
- If the registry already contains the version with different tarball bytes, stop. Never attempt to replace the published version.
- If a credential, signer, authorization, or source-integrity issue is suspected, stop the workflow, preserve logs and attestations, rotate affected credentials, and follow `SECURITY.md`.
