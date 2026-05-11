# @auraone/sdk

Official TypeScript SDK for the AuraOne hosted API.

This is the **hosted** SDK — it speaks to the AuraOne platform at `api.auraone.ai`. For local, no-account-required evaluation tooling (rubric validation, scoring, judge calibration, IAA, drift, leakage audits), use [`auraone-evalkit`](https://pypi.org/project/auraone-evalkit/) from the [`auraoneai/open`](https://github.com/auraoneai/open) repository instead.

## Install

```bash
npm install @auraone/sdk
# or
pnpm add @auraone/sdk
# or
yarn add @auraone/sdk
```

## Quick start

```typescript
import { AuraOneClient } from "@auraone/sdk";

const client = AuraOneClient.withApiKey(process.env.AURAONE_API_KEY!);

const run = await client.evaluations.create({
  template_id: "rubric.web.qa",
  agent_bundle_url: "s3://bundle.zip",
  wait: false,
});

console.log(run.id, run.status);
```

## What's in the SDK

- Domain services across evaluations, labs, training, analytics, collaboration, governance, billing, integrations, and more.
- Authentication via API key, scoped tokens, or OAuth (`AuthProvider`).
- Plugin shims for LangChain and LlamaIndex.
- GraphQL client alongside REST.
- Typed responses; the SDK ships its own `.d.ts` files.

## Two-SDK architecture

| Package | What it is | When to use |
| --- | --- | --- |
| `@auraone/sdk` (this package) | Hosted API client (npm) | You have an AuraOne account and want to call hosted services. |
| `auraone-sdk` (PyPI) | Same API surface, Python edition | You prefer Python and want hosted services. |
| `auraone-evalkit` (PyPI) | Local OSS evaluation tooling | You want rubric/score/agreement/drift utilities without an account. See [auraoneai/open](https://github.com/auraoneai/open). |

## Authentication

```typescript
import { AuraOneClient } from "@auraone/sdk";

// API key (simplest)
const client = AuraOneClient.withApiKey(process.env.AURAONE_API_KEY!);

// Custom AuthProvider for refresh tokens / OAuth / scoped credentials
import { AuthProvider } from "@auraone/sdk";
const authProvider = new AuthProvider({ /* ... */ });
const client2 = new AuraOneClient({ authProvider });
```

## Documentation

- Hosted API reference: https://www.auraone.ai/developers
- Tutorials: https://www.auraone.ai/resources/tutorials
- Deployment guide: https://www.auraone.ai/resources/docs/deployment

## Development

```bash
npm install
npm run build
npm test
```

## Versioning

This SDK is at v0.1.0. We follow [semantic versioning](https://semver.org/). Breaking changes will only land in a major release after v1.0.0.

## License

MIT — see [LICENSE](LICENSE).
