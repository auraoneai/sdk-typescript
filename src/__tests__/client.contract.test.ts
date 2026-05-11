import { afterAll, beforeAll, describe, expect, jest, test } from "@jest/globals";
import { AuraClient, EvaluationStatus } from "../client";
import { ComplianceFrameworkId } from "../types/api";

describe("AuraClient contracts", () => {
  const baseUrl = "http://localhost:9999";
  let originalFetch: typeof global.fetch;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  test("create/list/get/cancel evaluation (API shape variations)", async () => {
    const client = new AuraClient({ baseUrl });

    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const mockFetch = jest.fn(
      async (url: string, init?: RequestInit): Promise<Response> => {
        calls.push({ url, init });
        if (url.endsWith("/v1/evaluations") && init?.method === "POST") {
          return new Response(
            JSON.stringify({ id: "eval_1", state: "queued" }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
        if (
          url.endsWith("/v1/evaluations/eval_1") &&
          (!init || init.method === "GET")
        ) {
          return new Response(
            JSON.stringify({
              id: "eval_1",
              state: "completed",
              score: 0.99,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
        if (url.endsWith("/v1/evaluations/eval_1:cancel")) {
          return new Response(
            JSON.stringify({ success: true }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
        return new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    );

    global.fetch = mockFetch as unknown as typeof global.fetch;

    const created = await client.evaluate("tpl_1", "bundle://agent", {
      wait: false,
    });
    expect(created.id).toBe("eval_1");
    expect(created.status).toBe(EvaluationStatus.QUEUED);

    const got = await client.getEvaluation("eval_1");
    expect(got.status).toBe(EvaluationStatus.COMPLETED);
    expect(got.score).toBe(0.99);

    const cancelled = await client.cancelEvaluation("eval_1");
    expect(cancelled.id).toBe("eval_1");
  });

  test("templates list/get unwraps payloads", async () => {
    const client = new AuraClient({ baseUrl });
    const mockFetch = jest.fn(
      async (url: string): Promise<Response> => {
        if (url.includes("/v1/templates?")) {
          return new Response(
            JSON.stringify({
              success: true,
              templates: [{ id: "t1", name: "T1", version: "1.0.0" }],
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
        if (url.endsWith("/v1/templates/t1")) {
          return new Response(
            JSON.stringify({
              success: true,
              template: { id: "t1", name: "T1", version: "1.0.0" },
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
        return new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    );

    global.fetch = mockFetch as unknown as typeof global.fetch;

    const list = await client.listTemplates();
    expect(list).toHaveLength(1);
    const t = await client.getTemplate("t1");
    expect(t.id).toBe("t1");
  });

  test("retry/backoff logic avoids retry on 4xx", async () => {
    const client = new AuraClient({ baseUrl });
    let hit = 0;
    const mockFetch = jest.fn(async () => {
      hit++;
      return new Response(JSON.stringify({ detail: "Bad Request" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    });

    global.fetch = mockFetch as unknown as typeof global.fetch;

    await expect(client.listTemplates()).rejects.toThrow();
    expect(hit).toBe(1);
  });

  test("labs service normalizes evaluations and bundles", async () => {
    const client = new AuraClient({ baseUrl });
    let evaluationPolls = 0;
    const mockFetch = jest.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/v1/labs/evals") && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            id: "labs_eval_1",
            status: "queued",
            suite_id: "suite-1",
            queue: { position: 1, estimated_wait_seconds: 5 },
            created_at: "2024-01-01T00:00:00Z",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.includes("/v1/labs/evals/") && (!init || init.method === "GET")) {
        evaluationPolls++;
        if (evaluationPolls === 1) {
          return new Response(
            JSON.stringify({ id: "labs_eval_1", status: "running" }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response(
          JSON.stringify({
            id: "labs_eval_1",
            status: "completed",
            suite_id: "suite-1",
            metrics: [{ metricName: "latency_ms", value: 123 }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.endsWith("/v1/labs/bundles") && (!init || init.method === "GET")) {
        return new Response(
          JSON.stringify({
            data: [
              {
                id: "bundle-1",
                orgId: "org_1",
                domain: "robotics",
                name: "Robotics Pilot",
                status: "ready",
                createdAt: "2024-01-01T00:00:00Z",
                updatedAt: "2024-01-02T00:00:00Z",
              },
            ],
            templates: [
              {
                id: "tpl",
                domain: "robotics",
                name: "Default Robotics",
                defaultPolicies: {},
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    global.fetch = mockFetch as unknown as typeof global.fetch;

    const evaluation = await client.labs.createEvaluation({
      suiteId: "suite-1",
      inputs: [{ prompt: "Hello" }],
      waitForCompletion: true,
      pollIntervalMs: 0,
    });
    expect(evaluation.status).toBe("completed");
    expect(evaluation.suiteId).toBe("suite-1");
    expect(evaluation.metrics?.[0]?.name).toBe("latency_ms");

    const bundles = await client.labs.listBundles();
    expect(bundles.bundles).toHaveLength(1);
    expect(bundles.templates).toHaveLength(1);
  });

  test("governance service lists evidence and frameworks", async () => {
    const client = new AuraClient({ baseUrl });
    const mockFetch = jest.fn(async (url: string, init?: RequestInit) => {
      if (url.includes("/v1/compliance/evidence")) {
        return new Response(
          JSON.stringify({
            items: [
              {
                id: "evidence-1",
                orgId: "org_1",
                standard: "SOC2",
                status: "active",
                last_audit: "2024-02-01T00:00:00Z",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.startsWith(`${baseUrl}/v1/compliance/frameworks`) && (!init || init.method === "GET")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: [
              {
                id: "fw-1",
                organizationId: "org_1",
                framework: ComplianceFrameworkId.SOC2,
                version: "2024",
                status: "COMPLIANT",
                scope: ["all"],
                createdAt: "2024-01-01T00:00:00Z",
                updatedAt: "2024-01-02T00:00:00Z",
                riskAssessments: [{ overallScore: 0.9, assessedAt: "2024-01-02T00:00:00Z" }],
              },
            ],
            pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.endsWith("/v1/compliance/frameworks") && init?.method === "POST") {
        const body = JSON.parse(String(init.body));
        return new Response(
          JSON.stringify({
            data: {
              id: "fw-2",
              organizationId: "org_1",
              framework: body.framework,
              version: body.version,
              status: "PENDING",
              scope: body.scope,
              createdAt: "2024-03-01T00:00:00Z",
              updatedAt: "2024-03-01T00:00:00Z",
            },
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    global.fetch = mockFetch as unknown as typeof global.fetch;

    const evidence = await client.governance.listEvidence(50);
    expect(evidence[0]?.standard).toBe("SOC2");

    const frameworks = await client.governance.listFrameworks({ framework: ComplianceFrameworkId.SOC2 });
    expect(frameworks.items[0]?.framework).toBe(ComplianceFrameworkId.SOC2);

    const created = await client.governance.createFramework({
      framework: ComplianceFrameworkId.GDPR,
      version: "2025",
      scope: ["eu"],
    });
    expect(created.framework).toBe(ComplianceFrameworkId.GDPR);
  });

  test("integrations service covers health and registry operations", async () => {
    const client = new AuraClient({ baseUrl });
    const mockFetch = jest.fn(async (url: string, init?: RequestInit) => {
      if (url.startsWith(`${baseUrl}/v1/integration/health`) && (!init || init.method === "GET")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              status: "healthy",
              timestamp: "2024-04-01T00:00:00Z",
              components: 3,
              healthy: 3,
              degraded: 0,
              unhealthy: 0,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.endsWith("/v1/integration/health/test") && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            data: [{ component: "database", status: "healthy", timestamp: "now" }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.startsWith(`${baseUrl}/v1/integration/registry`) && (!init || init.method === "GET")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: [
              {
                id: "int-1",
                name: "github",
                displayName: "GitHub",
                provider: "github",
                category: "ci_cd",
                type: "webhook",
                version: "1.0.0",
                tags: [],
                capabilities: [],
                isVerified: true,
                isActive: true,
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.endsWith("/v1/integration/registry") && init?.method === "POST") {
        const body = JSON.parse(String(init.body));
        return new Response(
          JSON.stringify({
            data: {
              id: "int-2",
              name: body.name,
              displayName: body.displayName,
              provider: body.provider,
              category: body.category,
              type: body.type,
              version: body.version ?? "1.0.0",
              tags: body.tags ?? [],
              capabilities: body.capabilities ?? [],
              isVerified: false,
              isActive: true,
            },
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    global.fetch = mockFetch as unknown as typeof global.fetch;

    const health = await client.integrations.getHealth();
    expect(health.status).toBe("healthy");

    const testResults = await client.integrations.runHealthTest({ components: ["database"] });
    expect(testResults[0]?.component).toBe("database");

    const registry = await client.integrations.listRegistry();
    expect(registry).toHaveLength(1);

    const created = await client.integrations.registerIntegration({
      name: "custom-int",
      displayName: "Custom Integration",
      provider: "custom",
      category: "ci_cd",
      type: "api",
      configuration: {},
      authentication: {},
    });
    expect(created.name).toBe("custom-int");
  });
});
