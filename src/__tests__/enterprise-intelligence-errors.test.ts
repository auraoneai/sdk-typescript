import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import {
  EnterpriseIntelligenceService,
  EnterpriseIntelligenceUnavailableError,
  buildIngestForm,
  isEnterpriseIntelligenceUnavailable,
  isTruncated,
} from "../services/EnterpriseIntelligenceService";
import { resolveIdempotencyKey } from "../services/enterprise-intelligence/base";
import {
  AuraOneError,
  NotFoundError,
  ValidationError,
  type HttpClient,
} from "../types/api";
import { FetchHttpClient, parseErrorPayload } from "../utils/HttpClient";

const BASE = "http://ei.test";
const EI = "/api/v1/enterprise-intelligence";

interface Sent {
  url: string;
  init?: RequestInit;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function service(): EnterpriseIntelligenceService {
  const http = new FetchHttpClient({
    baseUrl: BASE,
    retryConfig: { retries: 0 },
  });
  return new EnterpriseIntelligenceService(http);
}

describe("Enterprise Intelligence errors and transport", () => {
  const originalFetch = global.fetch;
  let sent: Sent[];

  beforeEach(() => {
    sent = [];
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  function respondWith(response: () => Response): void {
    global.fetch = jest.fn(async (url: string, init?: RequestInit) => {
      sent.push({ url: String(url), init });
      return response();
    }) as unknown as typeof fetch;
  }

  test("nested error envelope surfaces the route code and message", async () => {
    respondWith(() =>
      json(404, {
        error: { code: "NOT_FOUND", message: "Workflow not found." },
      }),
    );
    const error = await service()
      .getWorkflow("wf-missing")
      .catch((e) => e);
    expect(error).toBeInstanceOf(NotFoundError);
    expect(error.code).toBe("NOT_FOUND");
    expect(error.message).toBe("Workflow not found.");
  });

  test("graph issues travel in details", async () => {
    respondWith(() =>
      json(400, {
        error: {
          code: "WORKFLOW_GRAPH_INVALID",
          message: "Workflow graph validation failed.",
          issues: [{ path: "nodes.0", message: "unknown node" }],
        },
      }),
    );
    const error = await service()
      .workflows.createVersion("wf-1", {} as never, {
        idempotencyKey: "graph-key-0001",
      })
      .catch((e) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.code).toBe("WORKFLOW_GRAPH_INVALID");
    expect(error.details).toEqual({
      issues: [{ path: "nodes.0", message: "unknown node" }],
    });
  });

  test("503 not-configured throws EnterpriseIntelligenceUnavailableError", async () => {
    respondWith(() =>
      json(503, {
        error: {
          code: "ENTERPRISE_COMPOSITION_UNAVAILABLE",
          message:
            "Enterprise Intelligence runtime composition is unavailable.",
        },
      }),
    );
    const error = await service()
      .listRuns()
      .catch((e) => e);
    expect(error).toBeInstanceOf(EnterpriseIntelligenceUnavailableError);
    expect(error).toBeInstanceOf(AuraOneError);
    expect(error.statusCode).toBe(503);
    expect(error.code).toBe("ENTERPRISE_COMPOSITION_UNAVAILABLE");
    expect(isEnterpriseIntelligenceUnavailable(error)).toBe(true);
  });

  test("503 detection keys on status, not code", async () => {
    respondWith(() =>
      json(503, {
        error: {
          code: "ACCESS_DENIED",
          message: "Organization access denied.",
        },
      }),
    );
    const error = await service()
      .connectors.authorize("c1", { action: "REVOKE" })
      .catch((e) => e);
    expect(error).toBeInstanceOf(EnterpriseIntelligenceUnavailableError);
    expect(error.code).toBe("ACCESS_DENIED");
  });

  test("health 503 keeps the health body in details", async () => {
    const body = {
      status: "UNAVAILABLE",
      observedAt: "2026-10-06T00:00:00Z",
      service: { status: "UP" },
      worker: { status: "DOWN" },
      dependencies: {},
    };
    respondWith(() => json(503, body));
    const error = await service()
      .getHealth()
      .catch((e) => e);
    expect(error).toBeInstanceOf(EnterpriseIntelligenceUnavailableError);
    expect(error.details).toEqual(body);
  });

  test("other statuses are not mapped to unavailable", async () => {
    respondWith(() =>
      json(500, {
        error: { code: "INTERNAL_ERROR", message: "Request failed." },
      }),
    );
    const error = await service()
      .listRuns()
      .catch((e) => e);
    expect(error).toBeInstanceOf(AuraOneError);
    expect(error).not.toBeInstanceOf(EnterpriseIntelligenceUnavailableError);
    expect(isEnterpriseIntelligenceUnavailable(error)).toBe(false);
  });

  test("flat error bodies keep their existing parsing", () => {
    expect(
      parseErrorPayload({ error: "bad", code: "X", details: { a: 1 } }, 400),
    ).toEqual({
      message: "bad",
      code: "X",
      details: { a: 1 },
    });
    expect(parseErrorPayload({ message: "gone" }, 410)).toEqual({
      message: "gone",
      code: undefined,
      details: undefined,
    });
  });

  test("DELETE sends the revocation evidence as the body", async () => {
    respondWith(() => json(200, { data: { revoked: true } }));
    await service().workflows.revokeApprovalDecision(
      "wf-1",
      "req-1",
      "customer",
      { evidence: { reason: "approver changed" } },
      { idempotencyKey: "revoke-key-0001" },
    );
    const { url, init } = sent[0];
    expect(new URL(url).pathname).toBe(
      `${EI}/workflows/wf-1/approval-requests/req-1/customer`,
    );
    expect(init?.method).toBe("DELETE");
    expect(JSON.parse(String(init?.body))).toEqual({
      evidence: { reason: "approver changed" },
    });
    expect(new Headers(init?.headers).get("idempotency-key")).toBe(
      "revoke-key-0001",
    );
  });

  test("DELETE without a body sends none", async () => {
    respondWith(() => json(200, { data: { status: "DISABLED" } }));
    await service().toolBindings.disable("tb-1");
    expect(sent[0].init?.method).toBe("DELETE");
    expect(sent[0].init?.body).toBeUndefined();
  });

  test("ingest sends multipart form data in source order", async () => {
    respondWith(() => json(202, { data: { receiptId: "rcpt-1" } }));
    await service().batches.ingest(
      {
        workflowVersionId: "wfv-1",
        contract: {
          schemaVersion: "auraone.enterprise-ingestion.v1",
          allowedMediaTypes: ["text/csv", "image/jpeg"],
          spreadsheetMode: "ROW_PER_ITEM",
          governance: {
            dataClassification: "CONFIDENTIAL",
            trainingRights: "NO_TRAINING",
            retentionUntil: null,
            legalHold: false,
          },
        },
        sources: [
          {
            sourceId: "sheet",
            fileName: "menu.csv",
            mediaType: "text/csv",
            content: "item,price\nsoup,6",
          },
          {
            sourceId: "photo",
            fileName: "menu.jpg",
            mediaType: "image/jpeg",
            content: new Uint8Array([255, 216]),
          },
        ],
      },
      { idempotencyKey: "ingest-key-0001" },
    );
    const { init } = sent[0];
    expect(init?.body).toBeInstanceOf(FormData);
    const headers = new Headers(init?.headers);
    // fetch sets the multipart boundary itself.
    expect(headers.get("content-type")).toBeNull();
    expect(headers.get("idempotency-key")).toBe("ingest-key-0001");
    const form = init?.body as FormData;
    expect(form.get("workflowVersionId")).toBe("wfv-1");
    expect(JSON.parse(String(form.get("sources")))).toEqual([
      { sourceId: "sheet", fileName: "menu.csv", mediaType: "text/csv" },
      { sourceId: "photo", fileName: "menu.jpg", mediaType: "image/jpeg" },
    ]);
    const files = form.getAll("file") as File[];
    expect(files.map((f) => [f.name, f.type])).toEqual([
      ["menu.csv", "text/csv"],
      ["menu.jpg", "image/jpeg"],
    ]);
    expect(await files[0].text()).toBe("item,price\nsoup,6");
  });

  test("ingest rejects an empty source list locally", () => {
    expect(() =>
      buildIngestForm({
        workflowVersionId: "v",
        contract: {} as never,
        sources: [],
      }),
    ).toThrow(TypeError);
  });
});

describe("Enterprise Intelligence idempotency keys", () => {
  function capture(): {
    http: HttpClient;
    headers: Array<Record<string, string> | undefined>;
  } {
    const headers: Array<Record<string, string> | undefined> = [];
    const record = async <T>(
      _url: string,
      _body?: unknown,
      config?: { headers?: Record<string, string> },
    ) => {
      headers.push(config?.headers);
      return {} as T;
    };
    return {
      headers,
      http: {
        get: async <T>(
          _url: string,
          config?: { headers?: Record<string, string> },
        ) => {
          headers.push(config?.headers);
          return {} as T;
        },
        post: record,
        put: record,
        patch: record,
        delete: async <T>(
          _url: string,
          config?: { headers?: Record<string, string> },
        ) => {
          headers.push(config?.headers);
          return {} as T;
        },
      },
    };
  }

  test("explicit key wins over a configured header", async () => {
    const { http, headers } = capture();
    const ei = new EnterpriseIntelligenceService(http, {
      headers: { "Idempotency-Key": "configured-key-01", "x-trace": "t" },
    });
    await ei.runs.cancel("r1", { idempotencyKey: "explicit-key-001" });
    expect(headers[0]).toEqual({
      "idempotency-key": "explicit-key-001",
      "x-trace": "t",
    });
  });

  test("a configured header is reused when no key is passed", async () => {
    const { http, headers } = capture();
    const ei = new EnterpriseIntelligenceService(http, {
      headers: { "Idempotency-Key": "configured-key-01" },
    });
    await ei.batches.retry("b1");
    expect(headers[0]).toEqual({ "idempotency-key": "configured-key-01" });
  });

  test("generated keys differ per call", async () => {
    const { http, headers } = capture();
    const ei = new EnterpriseIntelligenceService(http);
    await ei.historicalSets.validate("h1");
    await ei.historicalSets.validate("h1");
    expect(headers[0]?.["idempotency-key"]).not.toBe(
      headers[1]?.["idempotency-key"],
    );
  });

  test("reads never carry an idempotency key", async () => {
    const { http, headers } = capture();
    await new EnterpriseIntelligenceService(http).runs.get("r1");
    expect(headers[0]?.["idempotency-key"]).toBeUndefined();
  });

  test("keys outside 8-255 characters are rejected before sending", async () => {
    const { http, headers } = capture();
    const ei = new EnterpriseIntelligenceService(http);
    await expect(
      ei.runs.cancel("r1", { idempotencyKey: "  short " }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(() => resolveIdempotencyKey("x".repeat(256), undefined)).toThrow(
      ValidationError,
    );
    expect(resolveIdempotencyKey("x".repeat(255), undefined)).toHaveLength(255);
    expect(headers).toHaveLength(0);
  });
});

describe("queue meta", () => {
  test("isTruncated compares loaded with total", () => {
    const meta = {
      total: 140,
      loaded: 100,
      limit: 100,
      filtersApplied: { search: null, status: null },
      scope: "server" as const,
    };
    expect(isTruncated(meta)).toBe(true);
    expect(isTruncated({ ...meta, total: 100 })).toBe(false);
    expect(isTruncated(undefined)).toBe(false);
  });
});
