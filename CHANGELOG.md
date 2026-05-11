# Changelog

All notable changes to `@auraone/sdk` are documented here. This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
