# @auraone/sdk

Official TypeScript/JavaScript SDK for the AuraOne public API.

## Installation

```bash
npm install @auraone/sdk
```

## Authentication

Requests authenticate with a platform-issued API key:

```
ak_<8 lowercase hex>_<64 lowercase hex>
```

```ts
import { AuraOneClient } from "@auraone/sdk";

const client = new AuraOneClient({
  apiKey: process.env.AURAONE_API_KEY, // ak_...
  baseUrl: "https://api.auraone.ai",
  // Optional org assertion — must equal the key's organization;
  // the tenant is always derived from the key server-side.
  orgId: process.env.AURAONE_ORG_ID,
});
```

## Quickstart

```ts
// List templates
const templates = await client.evaluations.listTemplates();

// Create an evaluation — config.inputs is required
const evaluation = await client.evaluations.create({
  template_id: "tpl_your_template",
  config: { inputs: [{ prompt: "example", expected: "answer" }] },
});

// Poll + cancel
const detail = await client.evaluations.get(evaluation.id);
await client.evaluations.cancel(evaluation.id);
```

## Enterprise Intelligence

`client.enterpriseIntelligence` sends recurring work to AuraOne and reads
back finished, reviewed output. Software does the repeatable steps;
qualified people review exceptions.

Scopes: reads need `enterprise-intelligence.read`, writes need
`enterprise-intelligence.write`, and cancellation needs
`enterprise-intelligence.cancel`.

The flat methods are the customer surface. The grouped clients
(`workflows`, `runs`, `batches`, `deliveries`, `humanTasks`, `connectors`,
`toolBindings`, `contextSources`, `historicalSets`, `improvement`,
`regression`, `operations`, `registry`) cover every other route. Many of
those also check the role of the user who created the key. Each method's
doc comment names the role it needs.

### Run one unit of work

```ts
const ei = client.enterpriseIntelligence;

// Pick an input and an environment version this organization has used.
const inputs = await ei.getRunInputs();
const content = inputs.data.contents[0];
const environment = inputs.data.environments[0];

// Start the run. Keep the key: retrying with it returns the same run.
const run = await ei.createRun({
  workflowVersionId: "wfv_claims_intake",
  inputContentId: content.id,
  environmentVersion: environment.environmentVersion,
  idempotencyKey: "claims-2026-10-06-0001",
});

// Poll, then read the delivery.
const current = await ei.getRun(run.data.id);
if (current.data.status === "SUCCEEDED") {
  const delivery = await ei.getRunDelivery(run.data.id);
  console.log(delivery.data.delivery?.status);
}
```

### Resolve an exception

```ts
const tasks = await ei.humanTasks.list({ status: "PENDING" });
const task = tasks.data[0];
await ei.humanTasks.complete(task.id as string, {
  action: "REQUEST_INFORMATION",
  outputContentId: "content_reply",
  evidence: { note: "Capacity is blank. Needs supplier confirmation." },
  expectedLockVersion: task.lockVersion as number,
});
```

### Submit and accept a batch

```ts
const batch = await ei.batches.submit({
  workflowVersionId: "wfv_menu_update",
  inputContract: { format: "xlsx" },
  items: [
    {
      inputContentId: "content_1",
      inputDescriptor: { row: 1 },
      inputSha256: "<64 hex>",
    },
  ],
});
const batchId = (batch.data.batch as { id: string }).id;

const items = await ei.batches.listItems(batchId);
await ei.batches.decideAcceptance(batchId, {
  selections: [
    {
      itemId: items.data[0].itemId,
      deliveryId: "del_1",
      expectedDeliveryVersion: 1,
      decision: "accepted",
    },
  ],
});
```

`ei.batches.ingest(...)` uploads spreadsheets, photos and PDFs as
multipart form data. Files are sent in the order of `sources`.

### Idempotency

Every write sends an `idempotency-key` header. Pass `idempotencyKey` to
retry safely. Without one, a UUID is generated per call. Keys must be 8–255
characters.

### Lists

Lists return at most 100 records and have no cursor. `meta.total` counts
every match; `meta.loaded` counts what was returned. Use `isTruncated(meta)`
and narrow with `q` and `status`.

### When Enterprise Intelligence is not configured

Any `503` throws `EnterpriseIntelligenceUnavailableError`. The client
retries 5xx responses first, so this error arrives after the retry budget.

```ts
import { isEnterpriseIntelligenceUnavailable } from "@auraone/sdk";

try {
  await ei.listRuns();
} catch (error) {
  if (!isEnterpriseIntelligenceUnavailable(error)) throw error;
  // error.code is usually ENTERPRISE_COMPOSITION_UNAVAILABLE.
  // Show "not available yet" instead of retrying in a loop.
}
```

Other errors carry the route's `code` and `message`, for example
`NOT_FOUND` or `WORKFLOW_GRAPH_INVALID` (with the graph issues in
`details`).

Behavior change: errors now come from the nested error body
(`{ error: { code, message } }`) for every service. Earlier releases threw
`HTTP <status>` with no `code`. Match on `error.code` or the error class,
not on the message text. See `CHANGELOG.md`.

## Notes

- All requests target `https://api.auraone.ai/api/...`; there is no separate
  `/v1` host.
- Cookieless `ak_` requests are CSRF-exempt; browser session requests remain
  CSRF-protected.
- Launch-excluded surfaces (compute, GraphQL, robotics, synthetic research,
  rewards) are not part of this SDK.
