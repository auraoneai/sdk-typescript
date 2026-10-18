import { describe, expect, test } from "@jest/globals";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { EnterpriseIntelligenceService } from "../services/EnterpriseIntelligenceService";
import type { HttpClient, RequestConfig } from "../types/api";

const EI = "/api/v1/enterprise-intelligence";

interface Call {
  method: string;
  url: string;
  body?: unknown;
  config?: RequestConfig;
}

function recordingHttp(): { http: HttpClient; calls: Call[] } {
  const calls: Call[] = [];
  const http: HttpClient = {
    get: async <T>(url: string, config?: RequestConfig): Promise<T> => {
      calls.push({ method: "GET", url, config });
      return { data: {} } as T;
    },
    post: async <T>(
      url: string,
      body?: unknown,
      config?: RequestConfig,
    ): Promise<T> => {
      calls.push({ method: "POST", url, body, config });
      return { data: {} } as T;
    },
    put: async <T>(
      url: string,
      body?: unknown,
      config?: RequestConfig,
    ): Promise<T> => {
      calls.push({ method: "PUT", url, body, config });
      return { data: {} } as T;
    },
    patch: async <T>(
      url: string,
      body?: unknown,
      config?: RequestConfig,
    ): Promise<T> => {
      calls.push({ method: "PATCH", url, body, config });
      return { data: {} } as T;
    },
    delete: async <T>(
      url: string,
      config?: RequestConfig,
      body?: unknown,
    ): Promise<T> => {
      calls.push({ method: "DELETE", url, body, config });
      return { data: {} } as T;
    },
  };
  return { http, calls };
}

const blob = (text: string) => new Blob([text]);

/**
 * Every Enterprise Intelligence operation: the SDK call and the route
 * (method + path) it must hit. Paths use `{p}` for path parameters and are
 * compared after stripping the query string.
 */
const OPERATIONS: Array<
  [string, string, (ei: EnterpriseIntelligenceService) => Promise<unknown>]
> = [
  // workflows
  ["GET", "/workflows", (ei) => ei.workflows.list()],
  ["POST", "/workflows", (ei) => ei.workflows.create({ key: "k", name: "n" })],
  ["GET", "/workflows/{p}", (ei) => ei.workflows.get("w1")],
  [
    "POST",
    "/workflows/{p}/versions",
    (ei) => ei.workflows.createVersion("w1", {} as never),
  ],
  [
    "POST",
    "/workflows/{p}/versions/{p}/retire",
    (ei) =>
      ei.workflows.retireVersion("w1", "v1", {
        expectedVersion: 1,
        expectedDefinitionRevision: 1,
        reason: "replaced by v2",
      }),
  ],
  [
    "POST",
    "/workflows/{p}/versions/{p}/context-package",
    (ei) => ei.workflows.bindContextPackage("w1", "v1", {} as never),
  ],
  [
    "POST",
    "/workflows/{p}/approval-requests",
    (ei) =>
      ei.workflows.createApprovalRequest("w1", {
        versionId: "v1",
        evaluationEvidenceRef: "e1",
      }),
  ],
  [
    "GET",
    "/workflows/{p}/approval-requests/{p}",
    (ei) => ei.workflows.getApprovalRequest("w1", "r1"),
  ],
  [
    "POST",
    "/workflows/{p}/approval-requests/{p}/customer",
    (ei) =>
      ei.workflows.decideApprovalRequest("w1", "r1", "customer", {
        decision: "APPROVED",
        evidence: { note: "ok" },
      }),
  ],
  [
    "POST",
    "/workflows/{p}/approval-requests/{p}/auraone",
    (ei) =>
      ei.workflows.decideApprovalRequest("w1", "r1", "auraone", {
        decision: "REJECTED",
        evidence: { note: "no" },
      }),
  ],
  [
    "DELETE",
    "/workflows/{p}/approval-requests/{p}/customer",
    (ei) =>
      ei.workflows.revokeApprovalDecision("w1", "r1", "customer", {
        evidence: { why: "x" },
      }),
  ],
  [
    "DELETE",
    "/workflows/{p}/approval-requests/{p}/auraone",
    (ei) =>
      ei.workflows.revokeApprovalDecision("w1", "r1", "auraone", {
        evidence: { why: "x" },
      }),
  ],
  [
    "POST",
    "/workflows/{p}/activations",
    (ei) =>
      ei.workflows.activateVersion("w1", {
        versionId: "v1",
        approvalRequestId: "r1",
      }),
  ],
  [
    "POST",
    "/workflows/{p}/evaluations",
    (ei) => ei.workflows.recordEvaluation("w1", {} as never),
  ],
  [
    "POST",
    "/workflows/{p}/release-gate",
    (ei) =>
      ei.workflows.evaluateReleaseGate("w1", {
        workflowVersionId: "v1",
        evidenceId: "e1",
      }),
  ],
  // runs
  ["GET", "/runs", (ei) => ei.runs.list()],
  [
    "POST",
    "/runs",
    (ei) =>
      ei.runs.create({
        workflowVersionId: "v1",
        inputContentId: "c1",
        environmentVersion: "e1",
      }),
  ],
  ["GET", "/runs/{p}", (ei) => ei.runs.get("r1")],
  ["GET", "/runs/{p}/output", (ei) => ei.runs.getOutput("r1")],
  ["GET", "/runs/{p}/trace", (ei) => ei.runs.getTrace("r1")],
  ["GET", "/runs/{p}/delivery", (ei) => ei.runs.getDelivery("r1")],
  ["GET", "/run-inputs", (ei) => ei.runs.getInputs()],
  ["GET", "/runs/{p}/commercial", (ei) => ei.runs.getCommercial("r1")],
  [
    "POST",
    "/runs/{p}/acceptance",
    (ei) => ei.runs.decideAcceptance("r1", { decision: "accepted" }),
  ],
  ["POST", "/runs/{p}/cancel", (ei) => ei.runs.cancel("r1")],
  [
    "POST",
    "/runs/{p}/compensations",
    (ei) =>
      ei.runs.requestCompensation("r1", {
        sideEffectReceiptId: "s1",
        reason: "wrong record",
      }),
  ],
  [
    "POST",
    "/compensations/{p}/execute",
    (ei) => ei.runs.executeCompensation("c1"),
  ],
  [
    "POST",
    "/runs/{p}/incidents",
    (ei) => ei.runs.reportIncident("r1", {} as never),
  ],
  ["POST", "/runs/{p}/replay", (ei) => ei.runs.replay("r1", {} as never)],
  // batches
  ["GET", "/batches", (ei) => ei.batches.list()],
  ["POST", "/batches", (ei) => ei.batches.submit({} as never)],
  [
    "POST",
    "/batches/ingest",
    (ei) =>
      ei.batches.ingest({
        workflowVersionId: "v1",
        contract: {} as never,
        sources: [
          {
            sourceId: "s1",
            fileName: "a.csv",
            mediaType: "text/csv",
            content: blob("a,b"),
          },
        ],
      }),
  ],
  ["GET", "/batches/{p}", (ei) => ei.batches.get("b1")],
  ["GET", "/batches/{p}/items", (ei) => ei.batches.listItems("b1")],
  ["POST", "/batches/{p}/retry", (ei) => ei.batches.retry("b1")],
  ["POST", "/batches/{p}/cancel", (ei) => ei.batches.cancel("b1")],
  [
    "POST",
    "/batches/{p}/acceptance",
    (ei) => ei.batches.decideAcceptance("b1", { selections: [] }),
  ],
  // deliveries and human tasks
  ["GET", "/deliveries", (ei) => ei.deliveries.list()],
  ["GET", "/deliveries/{p}", (ei) => ei.deliveries.get("d1")],
  [
    "PATCH",
    "/deliveries/{p}",
    (ei) => ei.deliveries.dispose("d1", { action: "accept" }),
  ],
  ["GET", "/human-tasks", (ei) => ei.humanTasks.list()],
  ["GET", "/human-tasks/{p}", (ei) => ei.humanTasks.get("t1")],
  [
    "POST",
    "/human-tasks/{p}/complete",
    (ei) =>
      ei.humanTasks.complete("t1", {
        action: "APPROVE",
        outputContentId: "o1",
        evidence: null,
        expectedLockVersion: 0,
      }),
  ],
  // connectors
  ["GET", "/connectors", (ei) => ei.connectors.list()],
  [
    "POST",
    "/connectors",
    (ei) =>
      ei.connectors.create({
        name: "crm",
        provider: "hubspot",
        secretReferenceId: "sr1",
      }),
  ],
  ["GET", "/connectors/{p}", (ei) => ei.connectors.get("c1")],
  [
    "PATCH",
    "/connectors/{p}",
    (ei) => ei.connectors.applyAction("c1", { action: "revoke" }),
  ],
  [
    "POST",
    "/connectors/{p}/authorize",
    (ei) => ei.connectors.authorize("c1", { action: "REVOKE" }),
  ],
  ["POST", "/connectors/{p}/test", (ei) => ei.connectors.test("c1")],
  ["POST", "/connectors/{p}/revoke", (ei) => ei.connectors.revoke("c1")],
  ["GET", "/connectors/{p}/receipts", (ei) => ei.connectors.listReceipts("c1")],
  [
    "GET",
    "/connectors/{p}/receipts/{p}",
    (ei) => ei.connectors.getReceipt("c1", "x1"),
  ],
  // tool bindings
  ["GET", "/tool-bindings", (ei) => ei.toolBindings.list()],
  ["POST", "/tool-bindings", (ei) => ei.toolBindings.create({} as never)],
  ["GET", "/tool-bindings/{p}", (ei) => ei.toolBindings.get("tb1")],
  [
    "PATCH",
    "/tool-bindings/{p}",
    (ei) => ei.toolBindings.update("tb1", { enabled: false }),
  ],
  ["DELETE", "/tool-bindings/{p}", (ei) => ei.toolBindings.disable("tb1")],
  // context sources
  ["GET", "/context-sources", (ei) => ei.contextSources.list()],
  ["POST", "/context-sources", (ei) => ei.contextSources.register({} as never)],
  ["GET", "/context-sources/{p}", (ei) => ei.contextSources.get("s1")],
  [
    "POST",
    "/context-sources/{p}/retry",
    (ei) => ei.contextSources.ingest("s1", {} as never),
  ],
  [
    "POST",
    "/context-sources/{p}/withdraw",
    (ei) => ei.contextSources.withdraw("s1"),
  ],
  [
    "PATCH",
    "/context-sources/{p}",
    (ei) => ei.contextSources.applyAction("s1", { action: "delete" }),
  ],
  ["DELETE", "/context-sources/{p}", (ei) => ei.contextSources.delete("s1")],
  // historical sets
  ["GET", "/historical-sets", (ei) => ei.historicalSets.list()],
  ["POST", "/historical-sets", (ei) => ei.historicalSets.import({} as never)],
  ["GET", "/historical-sets/{p}", (ei) => ei.historicalSets.get("h1")],
  [
    "GET",
    "/historical-sets/{p}/examples",
    (ei) => ei.historicalSets.listExamples("h1"),
  ],
  [
    "POST",
    "/historical-sets/{p}/validate",
    (ei) => ei.historicalSets.validate("h1"),
  ],
  [
    "POST",
    "/historical-sets/{p}/accept",
    (ei) => ei.historicalSets.accept("h1"),
  ],
  [
    "POST",
    "/historical-sets/{p}/dataset",
    (ei) => ei.historicalSets.createDataset("h1", "EVALUATION"),
  ],
  [
    "GET",
    "/historical-sets/{p}/baseline",
    (ei) => ei.historicalSets.listBaselines("h1"),
  ],
  [
    "POST",
    "/historical-sets/{p}/baseline",
    (ei) => ei.historicalSets.prepareBaseline("h1", { split: "test" }),
  ],
  // improvement and regression
  ["GET", "/improvement-items", (ei) => ei.improvement.listItems()],
  [
    "POST",
    "/improvement-items",
    (ei) => ei.improvement.createItem({} as never),
  ],
  ["GET", "/evaluations", (ei) => ei.improvement.listEvaluations()],
  ["GET", "/regression-candidates", (ei) => ei.regression.listCandidates()],
  [
    "POST",
    "/regression-candidates",
    (ei) =>
      ei.regression.createCandidate({
        incidentId: "i1",
        evaluationSuiteId: "s1",
      }),
  ],
  [
    "POST",
    "/regression-candidates/{p}/review",
    (ei) =>
      ei.regression.reviewCandidate("rc1", {
        decision: "APPROVE",
        purpose: "EVALUATION",
        reason: "matches",
      }),
  ],
  ["GET", "/regression-suites", (ei) => ei.regression.listSuites()],
  [
    "POST",
    "/regression-suites/{p}/run",
    (ei) =>
      ei.regression.runSuite("rs1", {
        workflowVersionId: "v1",
        evidenceId: "e1",
      }),
  ],
  [
    "GET",
    "/regression-suites/{p}/export",
    (ei) => ei.regression.exportSuite("rs1"),
  ],
  // operations
  [
    "GET",
    "/operations/metrics",
    (ei) =>
      ei.operations.getMetrics({
        programId: "p",
        workflowId: "w",
        workflowVersionId: "v",
      }),
  ],
  [
    "GET",
    "/operations/slos",
    (ei) => ei.operations.listSlos({ programId: "p", workflowId: "w" }),
  ],
  ["POST", "/operations/slos", (ei) => ei.operations.createSlo({} as never)],
  [
    "POST",
    "/operations/slos/{p}/approve",
    (ei) => ei.operations.approveSlo("slo1"),
  ],
  [
    "POST",
    "/operations/slos/{p}/activate",
    (ei) =>
      ei.operations.activateSlo("slo1", {
        effectiveFrom: "2026-11-01T00:00:00Z",
      }),
  ],
  [
    "GET",
    "/operations/slos/release-gate",
    (ei) =>
      ei.operations.getSloReleaseGate({ programId: "p", workflowId: "w" }),
  ],
  // registry
  ["GET", "/registry/node-options", (ei) => ei.registry.getNodeOptions()],
  [
    "POST",
    "/registry/models",
    (ei) => ei.registry.models({ action: "create", key: "k", name: "n" }),
  ],
  [
    "POST",
    "/registry/policies",
    (ei) => ei.registry.policies({ action: "approve", versionId: "v" }),
  ],
  [
    "POST",
    "/registry/prompts",
    (ei) =>
      ei.registry.prompts({
        action: "create",
        key: "k",
        name: "n",
        purpose: "p",
      }),
  ],
  [
    "POST",
    "/registry/tools",
    (ei) => ei.registry.tools({ action: "create", key: "k", name: "n" }),
  ],
  // workspace
  ["GET", "/settings", (ei) => ei.getSettings()],
  ["GET", "/dashboard", (ei) => ei.getDashboard()],
  ["GET", "/health", (ei) => ei.getHealth()],
];

function template(url: string): string {
  const path = url.split("?")[0].slice(EI.length);
  // Known ids used above are replaced so the path compares as a template.
  return path.replace(
    /\/(w1|v1|r1|c1|x1|b1|d1|t1|tb1|s1|h1|rc1|rs1|slo1)(?=\/|$)/g,
    "/{p}",
  );
}

describe("Enterprise Intelligence route table", () => {
  test.each(OPERATIONS)("%s %s", async (method, path, call) => {
    const { http, calls } = recordingHttp();
    await call(new EnterpriseIntelligenceService(http));
    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe(method);
    expect(calls[0].url.startsWith(EI)).toBe(true);
    expect(template(calls[0].url)).toBe(path);

    const key = calls[0].config?.headers?.["idempotency-key"];
    if (method === "GET") {
      expect(key).toBeUndefined();
    } else {
      expect(typeof key).toBe("string");
      expect(key!.trim().length).toBeGreaterThanOrEqual(8);
    }
  });

  test("covers every method + route pair exactly once (except the shared baseline route)", () => {
    const pairs = OPERATIONS.map(([method, path]) => `${method} ${path}`);
    expect(new Set(pairs).size).toBe(pairs.length);
    // 96 operations across the documented families.
    expect(pairs.length).toBe(96);
  });

  test("every grouped client method is exercised by the route table", async () => {
    const { http } = recordingHttp();
    const ei = new EnterpriseIntelligenceService(http);
    const groups = [
      "workflows",
      "runs",
      "batches",
      "deliveries",
      "humanTasks",
      "connectors",
      "toolBindings",
      "contextSources",
      "historicalSets",
      "improvement",
      "regression",
      "operations",
      "registry",
    ] as const;
    const source = OPERATIONS.map(([, , call]) => call.toString()).join("\n");
    const missing: string[] = [];
    for (const group of groups) {
      const proto = Object.getPrototypeOf(ei[group]);
      for (const name of Object.getOwnPropertyNames(proto)) {
        if (name === "constructor") continue;
        // evaluateBaseline shares prepareBaseline's route; tested separately.
        if (name === "evaluateBaseline") continue;
        if (!source.includes(`ei.${group}.${name}(`))
          missing.push(`${group}.${name}`);
      }
    }
    expect(missing).toEqual([]);
  });

  test("every operation maps to a platform route file exporting that method", () => {
    const root = join(
      dirname(fileURLToPath(import.meta.url)),
      "../../../../apps/src/app/api/v1/enterprise-intelligence",
    );
    if (!existsSync(root)) return; // outside the monorepo checkout
    const missing: string[] = [];
    for (const [method, path] of OPERATIONS) {
      let dir = root;
      for (const segment of path.split("/").filter(Boolean)) {
        if (segment === "{p}") {
          const param = readdirSync(dir).find((name) =>
            /^\[[^.].*\]$/.test(name),
          );
          dir = param ? join(dir, param) : join(dir, "__missing__");
        } else {
          dir = join(dir, segment);
        }
      }
      const file = join(dir, "route.ts");
      const source = existsSync(file) ? readFileSync(file, "utf8") : "";
      const exported = new RegExp(
        `export\\s+(?:async\\s+)?(?:function|const)\\s+${method}\\b|export\\s*\\{[^}]*\\b${method}\\b`,
      );
      if (!exported.test(source)) missing.push(`${method} ${path}`);
    }
    expect(missing).toEqual([]);
  });

  test("path segments are URL-encoded", async () => {
    const { http, calls } = recordingHttp();
    await new EnterpriseIntelligenceService(http).workflows.getApprovalRequest(
      "wf/1",
      "req 2",
    );
    expect(calls[0].url).toBe(
      `${EI}/workflows/wf%2F1/approval-requests/req%202`,
    );
  });

  test("evaluateBaseline posts the evaluate body to the baseline route", async () => {
    const { http, calls } = recordingHttp();
    const body = {
      modelRef: "model-a",
      split: "validation" as const,
      outputs: [{ exampleId: "ex1", output: { total: 3 }, evidenceRef: "ev1" }],
    };
    await new EnterpriseIntelligenceService(
      http,
    ).historicalSets.evaluateBaseline("h1", body);
    expect(calls[0].method).toBe("POST");
    expect(calls[0].url).toBe(`${EI}/historical-sets/h1/baseline`);
    expect(calls[0].body).toEqual(body);
  });
});
