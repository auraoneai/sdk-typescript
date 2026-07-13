# @auraone/sdk

The TypeScript SDK for Node.js backends that call the hosted AuraOne API. Use it in backend services, workers, CI jobs, and internal tools to create and monitor evaluation runs or call AuraOne REST and GraphQL APIs.

`@auraone/sdk` centralizes API-key and JWT headers, organization scope, request timeouts, retry backoff, evaluation idempotency and polling, typed responses, and normalized HTTP errors. It is a hosted API client, not a local evaluation engine or a supported browser credential client.

[![npm version](https://img.shields.io/npm/v/%40auraone%2Fsdk.svg)](https://www.npmjs.com/package/@auraone/sdk)
[![Node.js](https://img.shields.io/node/v/%40auraone%2Fsdk.svg)](https://www.npmjs.com/package/@auraone/sdk)
[![CI](https://github.com/auraoneai/sdk-typescript/actions/workflows/ci.yml/badge.svg)](https://github.com/auraoneai/sdk-typescript/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/%40auraone%2Fsdk.svg)](./LICENSE)

## Hosted API Or Local EvalKit?

Choose this SDK when your TypeScript or JavaScript application needs an authenticated client for AuraOne's hosted services.

| Need | Use |
| --- | --- |
| Create, poll, cancel, or inspect hosted AuraOne evaluation runs | `@auraone/sdk` |
| Call hosted AuraOne REST services or GraphQL from a Node.js backend | `@auraone/sdk` |
| Run local, no-account rubric validation, scoring, calibration, agreement, drift, or leakage checks | [`auraone-evalkit`](https://pypi.org/project/auraone-evalkit/) |
| Call AuraOne from browser UI code | Your own backend endpoint; keep the SDK and credentials server-side |

The differentiator from raw `fetch` is not a new evaluation engine. It is one typed client that applies AuraOne authentication and organization headers, request retry behavior, evaluation idempotency and polling, service response types, and REST/GraphQL conventions.

## Install

The supported package path is Node.js 18 or newer:

```bash
npm install @auraone/sdk
```

For a new TypeScript project, install a compiler and Node.js declarations at versions selected by your application:

```bash
npm install --save-dev "typescript@>=4" @types/node
```

The package declares a `typescript >=4.0.0` peer range and ships declarations in `dist/index.d.ts`. Repository release tests compile a clean packed-package consumer with the lockfile-pinned TypeScript compiler. See [Runtime And TypeScript Support](#runtime-and-typescript-support) for the distinction between declared and continuously tested versions.

## First Typed Workflow

This backend example creates a hosted evaluation, waits for a terminal state, and preserves an idempotency key that can be reused if the surrounding job is retried. Set `AURAONE_API_KEY` in the process environment through a secret manager before running it.

Replace the template ID and bundle URL with values available to your AuraOne account:

```typescript
import { randomUUID } from "node:crypto";
import {
  AuraOneClient,
  EvaluationStatus,
  type CreateEvaluationOptions,
  type EvaluationResult,
} from "@auraone/sdk";

const client = AuraOneClient.fromEnvironment({
  timeout: 30_000,
  retries: 3,
});

const request: CreateEvaluationOptions = {
  template_id: "rubric.web.qa",
  agent_bundle_url: "s3://example-evaluation-inputs/web-agent-v3.zip",
  idempotencyKey:
    process.env.AURAONE_IDEMPOTENCY_KEY ?? randomUUID(),
  wait: true,
  timeoutSeconds: 300,
  pollIntervalMs: 2_000,
};

const evaluation: EvaluationResult =
  await client.evaluations.create(request);

if (evaluation.status !== EvaluationStatus.COMPLETED) {
  throw new Error(
    `Evaluation ${evaluation.id} ended with status ${evaluation.status}`,
  );
}

console.log({
  id: evaluation.id,
  status: evaluation.status,
  score: evaluation.score,
  artifactsUrl: evaluation.artifacts_url,
});
```

With `wait: true`, the method returns when the run reaches `completed`, `failed`, or `cancelled`. Scores, metrics, artifact URLs, attestations, cost fields, and completion timestamps are optional because availability depends on the selected template and API response.

Illustrative completed output:

```text
{
  id: 'eval_01J...',
  status: 'completed',
  score: 0.94,
  artifactsUrl: 'https://api.auraone.ai/v1/evaluations/eval_01J.../artifacts'
}
```

For a worker-owned polling loop, create without waiting and persist the returned ID:

```typescript
const queued = await client.evaluations.create({
  ...request,
  wait: false,
});

const terminal = await client.evaluations.waitForCompletion(
  queued.id,
  300,
  2_000,
);
```

Other client surfaces include `auth`, `analytics`, `training`, `billing`, `collaboration`, `robotics`, `evaluations`, `graphql`, `labs`, `governance`, and `integrations`. Domain service classes for astronomy, biology, chemistry, climate, environmental workflows, finance, genomics, manufacturing, materials, medical imaging, physics, and spatial 3D are also exported from the package root.

## Package Exports

The public npm export map has two entry points. Deep imports from `src/` or `dist/` are not public API.

| Import | Package target |
| --- | --- |
| ESM `import ... from "@auraone/sdk"` | `dist/index.esm.js` |
| CommonJS `require("@auraone/sdk")` | `dist/index.cjs` |
| TypeScript declarations | `dist/index.d.ts` |
| `@auraone/sdk/package.json` | Package metadata from the installed tarball |

The default export and named `AuraOneClient` export refer to the same client:

```typescript
import AuraOne, {
  AuraOneClient,
  EvaluationStatus,
  VERSION,
  type EvaluationResult,
} from "@auraone/sdk";

const client: AuraOneClient = AuraOne.fromEnvironment();
console.log(VERSION, EvaluationStatus.QUEUED);
```

CommonJS consumers use the same package root:

```javascript
const {
  AuraOneClient,
  EvaluationStatus,
  VERSION,
} = require("@auraone/sdk");

const client = AuraOneClient.fromEnvironment();
console.log(VERSION, EvaluationStatus.QUEUED, client.getConfig().baseUrl);
```

The root also exports service classes, API types, `AuthProvider`, `FetchHttpClient`, `buildQueryString`, error classes, `VERSION`, `API_VERSION`, and `DEFAULT_CONFIG`. Use root exports so package export-map changes remain enforceable.

## Credentials Stay On The Server

`AuraOneClient.fromEnvironment()` reads `AURAONE_API_KEY`, `AURAONE_TOKEN`, and the optional `AURAONE_REFRESH_TOKEN`. Set one primary API key or access token in a backend secret manager. You can also construct a client explicitly with `AuraOneClient.withApiKey(...)` or `AuraOneClient.withToken(...)`.

Do not bundle an AuraOne API key, service token, or refresh token into browser JavaScript. The supported architecture is:

1. Browser or mobile UI calls an authenticated endpoint you control.
2. Your Node.js backend reads AuraOne credentials from its secret store.
3. The backend uses `@auraone/sdk` and returns only the data the UI is allowed to see.

The package root uses Node APIs including `node:crypto`, `process.env`, and `Buffer`, and browser compatibility is neither a declared nor a release-tested target. The client keeps credentials in memory and sends them in `X-API-Key` or `Authorization` request headers; it does not write credentials to disk or browser storage.

`debug` defaults to `false`. Current debug logging includes request headers and bodies, so do not enable it where logs could expose credentials, regulated data, bundle locations, or request payloads.

The client uses request-scoped fetch calls and has no `close()` method. Application-owned analytics batch trackers should be flushed before shutdown:

```typescript
const tracker = client.createAnalyticsBatch();

try {
  tracker.track({
    name: "evaluation_reviewed",
    category: "user",
    properties: { evaluationId: "eval_01J..." },
  });
} finally {
  await tracker.flush();
}
```

## Errors And Retries

Requests default to a 30-second timeout and up to three retries after the initial attempt. Network failures, HTTP 408, HTTP 429, and HTTP 5xx responses are retried with exponential backoff. HTTP 400, 401, and 404 responses are not retried.

| Error | Typical source |
| --- | --- |
| `ValidationError` | HTTP 400 request rejection |
| `AuthenticationError` | Missing, malformed, expired, or rejected credentials; HTTP 401 |
| `NotFoundError` | HTTP 404 |
| `RateLimitError` | HTTP 429 after retry handling |
| `AuraOneError` | Network failure, timeout, or another non-success HTTP response |
| Plain `Error` | Evaluation polling timeout or a malformed response missing required fields |

```typescript
import {
  AuraOneError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  ValidationError,
} from "@auraone/sdk";

try {
  await client.evaluations.create(request);
} catch (error: unknown) {
  if (error instanceof AuthenticationError) {
    throw new Error("AuraOne credentials were rejected", { cause: error });
  }

  if (error instanceof RateLimitError) {
    console.error("Rate limited", error.code, error.details);
    throw error;
  }

  if (
    error instanceof ValidationError ||
    error instanceof NotFoundError
  ) {
    console.error(error.name, error.code, error.details);
    throw error;
  }

  if (error instanceof AuraOneError) {
    console.error("AuraOne request failed", {
      code: error.code,
      statusCode: error.statusCode,
      details: error.details,
    });
    throw error;
  }

  throw error;
}
```

When a caller retries evaluation creation outside the SDK, reuse the same `idempotencyKey`. Generating a new key can create a distinct hosted run.

## Runtime And TypeScript Support

| Surface | Declared support | Release verification |
| --- | --- | --- |
| Node.js | `>=18` | CI and packed-package consumption on Node.js 18, 20, and 22 |
| TypeScript | Peer range `>=4.0.0` | Clean consumer compilation with the lockfile-pinned compiler |
| Modules | ESM and CommonJS | Clean `import` and `require` smoke tests against the packed tarball |
| Browser | Not supported | No browser build or browser credential test |
| Default API | `https://api.auraone.ai`, API version `1.0` | Client constants and package tests |

The package ships JavaScript source maps and bundled declarations. Applications pinned to a TypeScript compiler other than the release-test version should compile the package in their own CI before upgrading.

## Release And Source Proof

The npm registry is the authority for whether a version is published. A version in `package.json`, a changelog section, a branch, or a source tag is not proof of publication.

Check the registry before installing or announcing a release:

```bash
version="$(npm view @auraone/sdk version)"
npm view "@auraone/sdk@${version}" \
  version dist.integrity repository.url gitHead --json
```

Install an exact version when reproducibility matters, then verify available registry signatures and provenance attestations:

```bash
npm install --save-exact "@auraone/sdk@${version}"
npm audit signatures
```

For a source comparison, resolve the matching repository tag and compare it with the registry `gitHead`:

```bash
git fetch --force origin "refs/tags/v${version}:refs/tags/v${version}"
git rev-parse "v${version}^{}"
npm view "@auraone/sdk@${version}" gitHead
```

The release workflow in this repository validates version agreement across package metadata, lockfile, source, changelog, and tag; runs type checking, lint, unit tests, metadata tests, production audit, and package-consumer smoke tests; builds one npm tarball and SBOM; and verifies the registry artifact before creating a matching GitHub Release. See [RELEASING.md](./RELEASING.md) for the exact operator flow and provenance boundaries.

## Limitations

- The SDK requires access to AuraOne's hosted API and an AuraOne API key or access token. It does not provide offline hosted-service emulation.
- Evaluation creation requires a template ID and an `agent_bundle_url` already accessible to the hosted service. This SDK does not upload the bundle in the first workflow.
- Browser execution is not supported. Keep credentials and SDK calls in a Node.js backend.
- A refresh token can be supplied, but automatic refresh is not currently wired into the client's request interceptor.
- `retries: 0` does not currently disable retries through `AuraOneClient` configuration; the client falls back to its default retry count.
- Evaluation polling timeout errors are plain `Error` instances rather than `AuraOneError`.
- Optional evaluation fields are not guaranteed for every template or terminal status.
- The package is pre-`1.0.0`; minor releases can include changes that would be major after stabilization. Review the changelog and compile your consumer before upgrading.

Use [`auraone-evalkit`](https://pypi.org/project/auraone-evalkit/) from [`auraoneai/open`](https://github.com/auraoneai/open) when the job is local, no-account evaluation analysis rather than hosted API integration.

## Links

- [AuraOne developer documentation](https://www.auraone.ai/developers)
- [Source repository](https://github.com/auraoneai/sdk-typescript)
- [npm package](https://www.npmjs.com/package/@auraone/sdk)
- [Changelog](./CHANGELOG.md)
- [Release process](./RELEASING.md)
- [Security policy](./SECURITY.md)
- [Contributing guide](./CONTRIBUTING.md)
- [Issue tracker](https://github.com/auraoneai/sdk-typescript/issues)

The SDK is available under the MIT License. See [LICENSE](./LICENSE).

## Next Action

Confirm the current published version and install it exactly:

```bash
version="$(npm view @auraone/sdk version)"
npm install --save-exact "@auraone/sdk@${version}"
```

Then place an AuraOne credential in your backend secret manager, replace the template ID and bundle URL in [First Typed Workflow](#first-typed-workflow), and run that workflow from a Node.js service, worker, or CI job.
