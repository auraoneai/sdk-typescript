# Changelog

All notable changes to `@auraone/sdk` are documented here. This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-10-18

Published to npm on 2026-10-18 from the AuraOne monorepo release commit
`9b9548c1993477b792f8000a93854a6313cfe450`, which npm records as the package
`gitHead`. This repository mirrors that package source: the `v1.0.0` tag
carries the same files as `sdks/typescript` at that commit.

### Breaking

- API keys must be platform-issued `ak_<8 hex>_<64 hex>` keys; `aura_live_*`,
  `aura_test_*`, and `aoc_*` keys are rejected.
- All requests target the deployed `/api/...` contract on
  `https://api.auraone.ai`; the bare `/v1/*` and `/graphql` paths used by
  0.x were removed.
- Organization is derived from the API key record server-side. A configured
  `orgId` is sent as a `?orgId=` assertion (a mismatch returns 403), never as
  a trusted header. The `"public"` org default is gone.
- `EvaluationsService.cancel` posts to `/api/v1/evaluations/{id}/cancel`;
  statuses include `pending` and `cancelled`; `metrics` parses the platform's
  `[{name, value, timestamp}]` array.
- `AuthService.refreshToken` sends `{ refreshToken }`, matching the platform
  schema.
- Removed from the package exports: `AstronomyService`, `BiologyService`,
  `ChemistryService`, `ClimateService`, `EnvironmentalService`,
  `FinancialService`, `GenomicsService`, `ManufacturingService`,
  `MaterialsService`, `MedicalImagingService`, `PhysicsService`,
  `RoboticsService` (with `ROBOTICS_INTERNAL_SERIALIZER_FORMATS` and
  `ROBOTICS_PUBLIC_EXPORT_FORMATS`), and `Spatial3DService`. The
  `EvaluationsService` and `EvaluationStatus` named exports were also removed;
  evaluations remain available as `client.evaluations`.

### Behavior change

- Errors now come from the nested error body. When a route answers
  `{ error: { code, message } }`, the thrown error's `message` and `code` are
  the route's values, for every service. Before, `message` was
  `HTTP <status>` and `code` was empty. Code that matched on `"HTTP 404"` or
  on an empty `code` must match on `error.code` or the error class
  (`NotFoundError`, `ValidationError`, ...) instead. Status codes and error
  classes are unchanged. Extra envelope keys, such as graph `issues`, go to
  `details`; a body with no error fields is kept as `details`.

### Added

- `@auraone/sdk/node` and `@auraone/sdk/browser` entry points with
  `createNodeClient` and `createBrowserClient`, alongside the root export.
- Enterprise Intelligence covers every route under
  `api/v1/enterprise-intelligence` (96 operations) through grouped clients:
  `workflows`, `runs`, `batches`, `deliveries`, `humanTasks`, `connectors`,
  `toolBindings`, `contextSources`, `historicalSets`, `improvement`,
  `regression`, `operations`, `registry`, plus `getSettings` and
  `getDashboard`. Request types follow the route schemas.
- `EnterpriseIntelligenceUnavailableError` and
  `isEnterpriseIntelligenceUnavailable` for any `503`; `isTruncated(meta)` for
  capped lists. Enterprise Intelligence path ids are URL-encoded, and
  idempotency keys outside 8-255 characters fail locally with
  `ValidationError`.
- Services for attention, autopilot, benchmarks, capacity, certification,
  environments, optimization, regression, and visualization routes;
  `GraphQLService` (also exported as `GraphQLClient`) with
  `GRAPHQL_PERSISTED_QUERIES`; integration connector clients for the
  namespaces in `SUPPORTED_CONNECTOR_NAMESPACES`.
- `getBaseUrl()` public accessor; `SDK_VERSION` exported (injected from
  `package.json` at build).
- `HttpClient.delete(url, config, data?)` sends an optional body.

### Notes

- `src/__tests__/auth.test.ts` and `src/__tests__/evaluations.contract.test.ts`
  read shared fixtures from the AuraOne monorepo (`sdks/fixtures/` and
  `sdks/contract-fixtures/`), which are not part of this repository, so they
  do not run standalone here.
- The published type declarations declare `VERSION` and `SDK_VERSION` with the
  literal type `"__SDK_VERSION__"`; the runtime value is `"1.0.0"`.
- This release was built and published from the monorepo, not by this
  repository's `release-npm.yml` workflow. It has no npm provenance
  attestation and no GitHub Release assets.

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
