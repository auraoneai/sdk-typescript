# Changelog

All notable changes to `@auraone/sdk` are documented here. This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-07-12

### Added

- Added automated release metadata validation and packed-package smoke tests for ESM, CommonJS, and TypeScript consumers.
- Added a release preparation command that updates package, lockfile, source version, and dated changelog metadata together.
- Added a token-free npm trusted-publishing workflow with provenance, registry verification, supported-Node clean installs, and matching GitHub Release assets.
- Added a release operator runbook covering preflight, npm trusted-publisher configuration, verification, and rollback.

### Changed

- Rewrote the npm-facing README around the Node.js backend audience, hosted/local boundary, first typed evaluation workflow, package exports, server-side credential boundary, error behavior, source verification, limitations, and next action.
- Replaced key-shaped documentation snippets with an environment-based, idempotent hosted evaluation example and separated declared TypeScript compatibility from the release-tested toolchain.
- Focused npm discovery metadata on the hosted TypeScript evaluation client job, removed unexported framework keywords, and added canonical author, repository, documentation, and issue links.
- Expanded release validation to enforce the README, package metadata, release-runbook, export-map, and publication-proof contracts.

## [0.1.5] - 2026-07-08

### Fixed

- Published from the token-authenticated npm release workflow so the GitHub Actions release path is verified after the `0.1.4` security patch.

## [0.1.4] - 2026-07-07

### Security

- Updated the direct `qs` dependency to `^6.15.3` so production installs no longer report GHSA-q8mj-m7cp-5q26 under `npm audit --omit=dev`.

## [0.1.3] - 2026-07-07

### Fixed

- Runtime version surfaces now report the package version through the exported `VERSION`, `AuraOneClient.getConfig().version`, and HTTP User-Agent values.

## [0.1.2] - 2026-07-07

### Changed

- Reworked the README around installation, quickstart examples, hosted API use cases, compatibility, and trust links.
- Updated npm metadata with a more searchable package description, focused keywords, explicit package files, and a Node.js 18+ engine declaration.

### Fixed

- Build tooling now resolves the TypeScript entrypoint before Rollup parses it and explicitly treats `node:crypto` as external.

## [0.1.1] - 2026-05-11

### Fixed

- Packaging: the 0.1.0 wheel shipped `dist/index.js` as CJS while `package.json` had `"type": "module"`. Node refused to load it under ESM rules. 0.1.1 renames the CJS bundle to `dist/index.cjs` and adds a proper `exports` map so both `import` and `require` resolve correctly.

## [0.1.0] - 2026-05-11

Initial public release of the AuraOne TypeScript SDK.

### Added

- `AuraOneClient` with API-key and `AuthProvider`-based authentication.
- Domain services covering evaluations, training, analytics, collaboration, governance, billing, integrations, labs, and the science suite.
- LangChain and LlamaIndex plugin shims (`src/plugins/langchain.ts`, `src/plugins/llamaindex.ts`).
- GraphQL client alongside REST (`src/graphql/GraphQLClient.ts`).
- TypeScript types shipped in the package (`dist/index.d.ts`).

### Notes

- Requires an AuraOne account and API key.
- For local, no-account evaluation tooling, see [`auraone-evalkit`](https://pypi.org/project/auraone-evalkit/) and [`auraoneai/open`](https://github.com/auraoneai/open).
