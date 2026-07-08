# @auraone/sdk

Build Node.js and TypeScript integrations for the AuraOne hosted API without hand-writing REST, auth, polling, or service wrappers.

[![npm version](https://img.shields.io/npm/v/%40auraone%2Fsdk.svg)](https://www.npmjs.com/package/@auraone/sdk)
[![npm downloads](https://img.shields.io/npm/dm/%40auraone%2Fsdk.svg)](https://www.npmjs.com/package/@auraone/sdk)
[![license](https://img.shields.io/npm/l/%40auraone%2Fsdk.svg)](./LICENSE)
[![CI](https://github.com/auraoneai/sdk-typescript/actions/workflows/ci.yml/badge.svg)](https://github.com/auraoneai/sdk-typescript/actions/workflows/ci.yml)
[![TypeScript types](https://img.shields.io/npm/types/%40auraone%2Fsdk.svg)](https://www.npmjs.com/package/@auraone/sdk)

- Start evaluation runs, poll for completion, and fetch hosted AuraOne results from typed TypeScript methods.
- Use API key, JWT token, or environment-based authentication without building request headers yourself.
- Work with REST services, the GraphQL endpoint, and LangChain or LlamaIndex adapter shims from one package.
- Ship both ESM and CommonJS consumers with bundled `.d.ts` declarations.

## Install

```bash
npm install @auraone/sdk
pnpm add @auraone/sdk
yarn add @auraone/sdk
bun add @auraone/sdk
```

## Quickstart

```typescript
import { AuraOneClient } from "@auraone/sdk";

const apiKey = process.env.AURAONE_API_KEY;
if (!apiKey) {
  throw new Error("Set AURAONE_API_KEY");
}

const client = AuraOneClient.withApiKey(apiKey);

const templates = await client.evaluations.listTemplates({
  domain: "web",
  per_page: 5,
});

console.log(templates.map((template) => template.id));
```

## Run An Evaluation

```typescript
import { AuraOneClient } from "@auraone/sdk";

const apiKey = process.env.AURAONE_API_KEY;
if (!apiKey) {
  throw new Error("Set AURAONE_API_KEY");
}

const client = AuraOneClient.withApiKey(apiKey);

const run = await client.evaluations.create({
  template_id: "rubric.web.qa",
  agent_bundle_url: "s3://your-bucket/agent-bundle.zip",
  wait: false,
});

console.log(run.id, run.status);
```

## What You Can Build

- Hosted evaluation dashboards that create runs, poll status, and display scores or artifacts.
- Agent and model QA pipelines that submit bundles to AuraOne templates from CI or backend jobs.
- Internal operations tools for analytics, training export, billing, governance, labs, and integrations.
- Framework integrations that bridge AuraOne workflows into LangChain or LlamaIndex projects.
- Typed GraphQL calls for API operations that are easier to express as a query.

## Why @auraone/sdk?

- **Less request plumbing.** The SDK owns base URLs, headers, idempotency keys for evaluation creation, retries, and timeouts.
- **Typed hosted API calls.** Service methods return TypeScript types for evaluations, templates, reward specs, analytics, training, and more.
- **Auth in one place.** Use `withApiKey`, `withToken`, `fromEnvironment`, or `AuthProvider` instead of scattering credential handling through your app.
- **REST and GraphQL together.** Use service classes for common workflows and `client.graphql.request<T>()` when a GraphQL query is the right shape.
- **Framework adapter shims.** Import LangChain and LlamaIndex helpers from the package instead of maintaining local glue code.

## Compared With Alternatives

| Need | `@auraone/sdk` | Alternative |
| --- | --- | --- |
| Call the AuraOne hosted API from TypeScript | Typed client methods, auth helpers, and generated bundles for npm consumers | Raw `fetch` or a generic HTTP client requires custom headers, paths, retries, and response typing |
| Run local, no-account evaluation utilities | Use [`auraone-evalkit`](https://pypi.org/project/auraone-evalkit/) instead | `@auraone/sdk` is intentionally for hosted AuraOne API access |
| Use AuraOne from Python | Use the Python SDK package instead | This package targets Node.js and TypeScript applications |
| Mix REST services and GraphQL | Includes both service wrappers and a `GraphQLClient` | A plain GraphQL client does not cover hosted REST services or auth conventions |

## API Usage

### Client Creation

```typescript
import { AuraOneClient } from "@auraone/sdk";

const apiKey = process.env.AURAONE_API_KEY;
if (!apiKey) {
  throw new Error("Set AURAONE_API_KEY");
}

const token = process.env.AURAONE_TOKEN;
if (!token) {
  throw new Error("Set AURAONE_TOKEN");
}

const apiKeyClient = AuraOneClient.withApiKey(apiKey);
const tokenClient = AuraOneClient.withToken(token);
const envClient = AuraOneClient.fromEnvironment();
```

### Evaluations

```typescript
const templates = await envClient.evaluations.listTemplates({ domain: "web" });

const run = await envClient.evaluations.create({
  template_id: templates[0]?.id ?? "rubric.web.qa",
  agent_bundle_url: "s3://your-bucket/agent-bundle.zip",
  wait: true,
  timeoutSeconds: 300,
});

console.log(run.status, run.score);
```

### GraphQL

```typescript
const ping = await envClient.graphql.request<{ __typename: string }>(`
  query Ping {
    __typename
  }
`);

console.log(ping.__typename);
```

### Service Areas

`AuraOneClient` exposes hosted API service groups for:

- `auth`
- `analytics`
- `training`
- `billing`
- `collaboration`
- `robotics`
- `evaluations`
- `graphql`
- `labs`
- `governance`
- `integrations`

The package also exports domain services for biology, chemistry, materials, environmental workflows, astronomy, climate, spatial 3D, finance, manufacturing, medical imaging, physics, and genomics.

## Examples And Links

- Hosted API reference: https://www.auraone.ai/developers
- Tutorials: https://www.auraone.ai/resources/tutorials
- Deployment guide: https://www.auraone.ai/resources/docs/deployment
- Changelog: [CHANGELOG.md](./CHANGELOG.md)
- Security policy: [SECURITY.md](./SECURITY.md)
- Contributing guide: [CONTRIBUTING.md](./CONTRIBUTING.md)

## Compatibility And Limitations

- Requires Node.js 18 or newer.
- Supports ESM `import` and CommonJS `require` through the package `exports` map.
- Ships TypeScript declarations at `dist/index.d.ts`.
- Targets the hosted AuraOne API at `https://api.auraone.ai` by default.
- Requires an AuraOne account and API key or token for hosted API calls.
- Browser builds are not a primary target because parts of the SDK use Node APIs.
- Use [`auraone-evalkit`](https://pypi.org/project/auraone-evalkit/) from [`auraoneai/open`](https://github.com/auraoneai/open) for local, no-account evaluation tooling such as rubric validation, scoring, judge calibration, IAA, drift, and leakage audits.

## Development

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build
```

## Contributing

Bug reports, documentation fixes, type refinements, and SDK convenience methods are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).

## License

MIT. See [LICENSE](./LICENSE).
