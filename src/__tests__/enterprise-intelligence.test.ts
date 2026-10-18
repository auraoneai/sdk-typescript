import {
  afterAll,
  beforeAll,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import { AuraOneClient } from "../client/AuraOneClient";
import { EnterpriseIntelligenceService } from "../services/EnterpriseIntelligenceService";
import type { HttpClient } from "../types/api";

const API_KEY = `ak_${"ab12cd34"}_${"f".repeat(64)}`;
const EI_BASE = "/api/v1/enterprise-intelligence";

describe("EnterpriseIntelligenceService", () => {
  const baseUrl = "http://localhost:9999";
  let originalFetch: typeof global.fetch;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  test("service is exposed on the client and constructible standalone", () => {
    const client = new AuraOneClient({ apiKey: API_KEY, baseUrl });
    expect(client.enterpriseIntelligence).toBeInstanceOf(
      EnterpriseIntelligenceService,
    );
    const calls: string[] = [];
    const http: HttpClient = {
      get: async <T>(url: string): Promise<T> => {
        calls.push(`GET ${url}`);
        return {} as T;
      },
      post: async <T>(url: string): Promise<T> => {
        calls.push(`POST ${url}`);
        return {} as T;
      },
      put: async <T>(): Promise<T> => ({} as T),
      delete: async <T>(): Promise<T> => ({} as T),
      patch: async <T>(): Promise<T> => ({} as T),
    };
    const service = new EnterpriseIntelligenceService(http);
    void service;
  });

  test("reads hit the documented paths with queue query keys", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    global.fetch = jest.fn(
      async (url: string, init?: RequestInit): Promise<Response> => {
        calls.push({ url: String(url), init });
        const pathname = new URL(String(url)).pathname;
        const body =
          pathname === `${EI_BASE}/workflows/wf-1`
            ? { data: { id: "wf-1", key: "kyc", status: "ACTIVE" } }
            : pathname === `${EI_BASE}/runs/run-1/delivery`
              ? {
                  data: {
                    id: "run-1",
                    delivery: { id: "del-1", status: "AVAILABLE" },
                    signedAccess: [],
                  },
                }
              : pathname === `${EI_BASE}/health`
                ? {
                    status: "HEALTHY",
                    observedAt: "2026-10-02T00:00:00Z",
                    service: { status: "UP" },
                    worker: { status: "UP" },
                    dependencies: { database: { status: "UP" } },
                  }
                : {
                    data: [],
                    meta: {
                      total: 0,
                      loaded: 0,
                      limit: 100,
                      filtersApplied: { search: null, status: null },
                      scope: "server",
                    },
                  };
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    ) as unknown as typeof fetch;

    const client = new AuraOneClient({ apiKey: API_KEY, baseUrl });
    const ei = client.enterpriseIntelligence;

    const workflows = await ei.listWorkflows({ q: "kyc", status: "ACTIVE" });
    expect(workflows.data).toEqual([]);
    expect(workflows.meta?.scope).toBe("server");
    const lastList = calls[calls.length - 1];
    const listUrl = new URL(lastList.url);
    expect(listUrl.pathname).toBe(`${EI_BASE}/workflows`);
    expect(listUrl.searchParams.get("q")).toBe("kyc");
    expect(listUrl.searchParams.get("f.status")).toBe("ACTIVE");

    const workflow = await ei.getWorkflow("wf-1");
    expect(workflow.data.id).toBe("wf-1");
    expect(workflow.data.status).toBe("ACTIVE");

    await ei.listRuns({ status: "SUCCEEDED" });
    const runsUrl = new URL(calls[calls.length - 1].url);
    expect(runsUrl.pathname).toBe(`${EI_BASE}/runs`);
    expect(runsUrl.searchParams.get("f.status")).toBe("SUCCEEDED");

    await ei.getRun("run-1");
    expect(new URL(calls[calls.length - 1].url).pathname).toBe(
      `${EI_BASE}/runs/run-1`,
    );

    await ei.getRunOutput("run-1");
    expect(new URL(calls[calls.length - 1].url).pathname).toBe(
      `${EI_BASE}/runs/run-1/output`,
    );

    await ei.getRunTrace("run-1");
    expect(new URL(calls[calls.length - 1].url).pathname).toBe(
      `${EI_BASE}/runs/run-1/trace`,
    );

    const runDelivery = await ei.getRunDelivery("run-1");
    expect(runDelivery.data.delivery?.id).toBe("del-1");

    await ei.getRunInputs({ q: "sha" });
    const inputsUrl = new URL(calls[calls.length - 1].url);
    expect(inputsUrl.pathname).toBe(`${EI_BASE}/run-inputs`);
    expect(inputsUrl.searchParams.get("q")).toBe("sha");

    await ei.listDeliveries({ status: "AVAILABLE" });
    const deliveriesUrl = new URL(calls[calls.length - 1].url);
    expect(deliveriesUrl.pathname).toBe(`${EI_BASE}/deliveries`);
    expect(deliveriesUrl.searchParams.get("f.status")).toBe("AVAILABLE");

    await ei.getDelivery("del-1");
    expect(new URL(calls[calls.length - 1].url).pathname).toBe(
      `${EI_BASE}/deliveries/del-1`,
    );

    await ei.listConnectorReceipts("conn-1", { runId: "run-1" });
    const receiptsUrl = new URL(calls[calls.length - 1].url);
    expect(receiptsUrl.pathname).toBe(
      `${EI_BASE}/connectors/conn-1/receipts`,
    );
    expect(receiptsUrl.searchParams.get("runId")).toBe("run-1");

    await ei.getConnectorReceipt("conn-1", "rcpt-1", { workflowId: "wf-1" });
    const receiptUrl = new URL(calls[calls.length - 1].url);
    expect(receiptUrl.pathname).toBe(
      `${EI_BASE}/connectors/conn-1/receipts/rcpt-1`,
    );
    expect(receiptUrl.searchParams.get("workflowId")).toBe("wf-1");

    const health = await ei.getHealth();
    expect(health.status).toBe("HEALTHY");
    expect(health.dependencies.database.status).toBe("UP");
    expect(new URL(calls[calls.length - 1].url).pathname).toBe(
      `${EI_BASE}/health`,
    );
  });

  test("createRun posts the strict body with an idempotency-key header", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    global.fetch = jest.fn(
      async (url: string, init?: RequestInit): Promise<Response> => {
        calls.push({ url: String(url), init });
        return new Response(
          JSON.stringify({
            data: { id: "run-9", status: "QUEUED" },
            links: { self: `${EI_BASE}/runs/run-9` },
            permissions: { canMutate: true },
          }),
          { status: 202, headers: { "Content-Type": "application/json" } },
        );
      },
    ) as unknown as typeof fetch;

    const client = new AuraOneClient({ apiKey: API_KEY, baseUrl });
    const created = await client.enterpriseIntelligence.createRun({
      workflowVersionId: "wfv-1",
      inputContentId: "content-1",
      environmentVersion: "env-1",
      deadlineAt: "2026-10-09T00:00:00Z",
      idempotencyKey: "contract-key-1234",
    });

    expect(created.data.id).toBe("run-9");
    expect(created.links?.self).toBe(`${EI_BASE}/runs/run-9`);

    const { url, init } = calls[0];
    expect(new URL(url).pathname).toBe(`${EI_BASE}/runs`);
    expect(init?.method).toBe("POST");
    const sentHeaders = new Headers(init?.headers);
    expect(sentHeaders.get("idempotency-key")).toBe("contract-key-1234");
    expect(JSON.parse(String(init?.body))).toEqual({
      workflowVersionId: "wfv-1",
      inputContentId: "content-1",
      environmentVersion: "env-1",
      deadlineAt: "2026-10-09T00:00:00Z",
    });
  });

  test("createRun auto-generates a valid idempotency key when omitted", async () => {
    const calls: Array<{ init?: RequestInit }> = [];
    global.fetch = jest.fn(
      async (_url: string, init?: RequestInit): Promise<Response> => {
        calls.push({ init });
        return new Response(JSON.stringify({ data: { id: "run-1" } }), {
          status: 202,
          headers: { "Content-Type": "application/json" },
        });
      },
    ) as unknown as typeof fetch;

    const client = new AuraOneClient({ apiKey: API_KEY, baseUrl });
    await client.enterpriseIntelligence.createRun({
      workflowVersionId: "wfv-1",
      inputContentId: "content-1",
      environmentVersion: "env-1",
    });

    const key = new Headers(calls[0].init?.headers).get("idempotency-key");
    expect(key).toBeTruthy();
    // Platform schema: 8–255 characters.
    expect(key!.length).toBeGreaterThanOrEqual(8);
    expect(key!.length).toBeLessThanOrEqual(255);
  });
});
