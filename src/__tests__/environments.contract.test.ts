import {
  afterAll,
  beforeAll,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import { AuraClient } from "../client";

/**
 * Contract test for the `environments` namespace against the route schemas
 * in apps/src/app/api/{environments,versions,v1/environments,
 * v1/marketplace/environments}.
 *
 * Verifies each method emits the route contract's path, method and payload
 * keys — a drift between SDK calls and route schemas fails here.
 */
describe("AuraClient environments contracts (P1-15)", () => {
  const TEST_KEY = `ak_${"ab12cd34"}_${"f".repeat(64)}`;
  const baseUrl = "http://localhost:9999";
  let originalFetch: typeof global.fetch;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  function mockJson(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }

  test("list() GET /api/v1/environments and unwraps data", async () => {
    const client = new AuraClient({ apiKey: TEST_KEY, baseUrl });
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    global.fetch = jest.fn(
      async (url: string, init?: RequestInit): Promise<Response> => {
        calls.push({ url, init });
        return mockJson({ data: [{ id: "env_1", name: "FinOps" }] });
      },
    );

    const result = await client.environments.list();
    expect(calls[0]!.url).toBe(`${baseUrl}/api/v1/environments`);
    expect(calls[0]!.init?.method ?? "GET").toBe("GET");
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("env_1");
  });

  test("get() GET /api/environments/{id}", async () => {
    const client = new AuraClient({ apiKey: TEST_KEY, baseUrl });
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    global.fetch = jest.fn(
      async (url: string, init?: RequestInit): Promise<Response> => {
        calls.push({ url, init });
        return mockJson({ id: "env_1", name: "FinOps" });
      },
    );

    await client.environments.get("env_1");
    expect(calls[0]!.url).toBe(`${baseUrl}/api/environments/env_1`);
  });

  test("create() POST /api/environments with environmentCreateSchema keys", async () => {
    const client = new AuraClient({ apiKey: TEST_KEY, baseUrl });
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    global.fetch = jest.fn(
      async (url: string, init?: RequestInit): Promise<Response> => {
        calls.push({ url, init });
        return mockJson({ id: "env_2" }, 201);
      },
    );

    await client.environments.create({
      organization_id: "org_1",
      name: "Finance pack",
      prompt_template: "template",
      tags: ["finance"],
    });

    expect(calls[0]!.url).toBe(`${baseUrl}/api/environments`);
    expect(calls[0]!.init?.method).toBe("POST");
    const body = JSON.parse(calls[0]!.init?.body as string);
    expect(body.organization_id).toBe("org_1");
    expect(body.name).toBe("Finance pack");
    expect(body.prompt_template).toBe("template");
    // Idempotency key is auto-generated for mutation requests.
    const headers = calls[0]!.init?.headers as Record<string, string>;
    expect(headers["X-Idempotency-Key"]).toBeTruthy();
  });

  test("listVersions() GET /api/versions with orgId + environment params", async () => {
    const client = new AuraClient({ apiKey: TEST_KEY, baseUrl });
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    global.fetch = jest.fn(
      async (url: string): Promise<Response> => {
        calls.push({ url });
        return mockJson({
          success: true,
          versions: [{ id: "ver_1", version: "1.0.0" }],
          total: 1,
        });
      },
    );

    const result = await client.environments.listVersions("org_1", "env_1");
    expect(calls[0]!.url).toContain("/api/versions?");
    expect(calls[0]!.url).toContain("orgId=org_1");
    expect(calls[0]!.url).toContain("environment=env_1");
    expect(result.total).toBe(1);
  });

  test("publishVersion() POST /api/versions with createVersionSchema keys", async () => {
    const client = new AuraClient({ apiKey: TEST_KEY, baseUrl });
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    global.fetch = jest.fn(
      async (url: string, init?: RequestInit): Promise<Response> => {
        calls.push({ url, init });
        return mockJson({ version: { id: "ver_2" } }, 201);
      },
    );

    await client.environments.publishVersion({
      orgId: "org_1",
      environmentId: "env_1",
      version: "1.2.0",
      name: "v1.2.0",
      config: { reward: {} },
    });

    expect(calls[0]!.url).toBe(`${baseUrl}/api/versions`);
    expect(calls[0]!.init?.method).toBe("POST");
    const body = JSON.parse(calls[0]!.init?.body as string);
    expect(body.orgId).toBe("org_1");
    expect(body.environmentId).toBe("env_1");
    expect(body.version).toBe("1.2.0");
  });

  test("listEpisodes() GET episodes with cursor params and unwraps page", async () => {
    const client = new AuraClient({ apiKey: TEST_KEY, baseUrl });
    const calls: Array<{ url: string }> = [];
    global.fetch = jest.fn(
      async (url: string): Promise<Response> => {
        calls.push({ url });
        return mockJson({
          episodes: [{ id: "ep_1", status: "scored" }],
          nextCursor: "ep_1",
        });
      },
    );

    const page = await client.environments.listEpisodes("env_1", {
      limit: 25,
      status: "scored",
    });
    expect(calls[0]!.url).toContain("/api/environments/env_1/episodes?");
    expect(calls[0]!.url).toContain("limit=25");
    expect(calls[0]!.url).toContain("status=scored");
    expect(page.episodes).toHaveLength(1);
    expect(page.nextCursor).toBe("ep_1");
  });

  test("getEpisode() GET /api/environments/{id}/episodes/{ep}", async () => {
    const client = new AuraClient({ apiKey: TEST_KEY, baseUrl });
    const calls: Array<{ url: string }> = [];
    global.fetch = jest.fn(
      async (url: string): Promise<Response> => {
        calls.push({ url });
        return mockJson({ id: "ep_9" });
      },
    );

    await client.environments.getEpisode("env_1", "ep_9");
    expect(calls[0]!.url).toBe(
      `${baseUrl}/api/environments/env_1/episodes/ep_9`,
    );
  });

  test("createExport() POST exports with CreateEnvironmentExportSchema keys", async () => {
    const client = new AuraClient({ apiKey: TEST_KEY, baseUrl });
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    global.fetch = jest.fn(
      async (url: string, init?: RequestInit): Promise<Response> => {
        calls.push({ url, init });
        return mockJson({ export: { id: "exp_1", format: "harbor" } }, 201);
      },
    );

    const created = await client.environments.createExport("env_1", {
      versionId: "ver_1",
      format: "harbor",
      purpose: "EVALUATION",
    });

    expect(calls[0]!.url).toBe(`${baseUrl}/api/environments/env_1/exports`);
    expect(calls[0]!.init?.method).toBe("POST");
    const body = JSON.parse(calls[0]!.init?.body as string);
    expect(body.versionId).toBe("ver_1");
    expect(body.format).toBe("harbor");
    expect(body.purpose).toBe("EVALUATION");
    expect(created.id).toBe("exp_1");
  });

  test("listExports() GET exports list", async () => {
    const client = new AuraClient({ apiKey: TEST_KEY, baseUrl });
    const calls: Array<{ url: string }> = [];
    global.fetch = jest.fn(
      async (url: string): Promise<Response> => {
        calls.push({ url });
        return mockJson({ exports: [{ id: "exp_1" }] });
      },
    );

    const result = await client.environments.listExports("env_1");
    expect(calls[0]!.url).toBe(`${baseUrl}/api/environments/env_1/exports`);
    expect(result).toHaveLength(1);
  });

  test("runBaseline() POST baselines with RunBaselineSchema keys", async () => {
    const client = new AuraClient({ apiKey: TEST_KEY, baseUrl });
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    global.fetch = jest.fn(
      async (url: string, init?: RequestInit): Promise<Response> => {
        calls.push({ url, init });
        return mockJson({ baseline: { id: "base_1", status: "queued" } }, 201);
      },
    );

    const run = await client.environments.runBaseline("env_1", {
      environmentVersionId: "ver_1",
      seed: "seed-42",
      budgetCents: 500,
      toolCallBudget: null,
    });

    expect(calls[0]!.url).toBe(`${baseUrl}/api/environments/env_1/baselines`);
    const body = JSON.parse(calls[0]!.init?.body as string);
    expect(body.environmentVersionId).toBe("ver_1");
    expect(body.seed).toBe("seed-42");
    expect(body.budgetCents).toBe(500);
    expect(run.id).toBe("base_1");
  });

  test("listBaselines() GET baselines list", async () => {
    const client = new AuraClient({ apiKey: TEST_KEY, baseUrl });
    const calls: Array<{ url: string }> = [];
    global.fetch = jest.fn(
      async (url: string): Promise<Response> => {
        calls.push({ url });
        return mockJson({ baselines: [{ id: "base_1" }] });
      },
    );

    const result = await client.environments.listBaselines("env_1", 10);
    expect(calls[0]!.url).toContain("/api/environments/env_1/baselines");
    expect(calls[0]!.url).toContain("limit=10");
    expect(result).toHaveLength(1);
  });

  test("listMarketplace() GET /api/v1/marketplace/environments with filters", async () => {
    const client = new AuraClient({ apiKey: TEST_KEY, baseUrl });
    const calls: Array<{ url: string }> = [];
    global.fetch = jest.fn(
      async (url: string): Promise<Response> => {
        calls.push({ url });
        return mockJson({ environments: [{ id: "mkt_1", verified: true }] });
      },
    );

    const result = await client.environments.listMarketplace({
      category: "CRM",
      pricing: "PAY_PER_USE",
      search: "renewal",
    });
    expect(calls[0]!.url).toContain("/api/v1/marketplace/environments?");
    expect(calls[0]!.url).toContain("category=CRM");
    expect(calls[0]!.url).toContain("pricing=PAY_PER_USE");
    expect(result[0]!.id).toBe("mkt_1");
  });

  test("submitMarketplaceListing() POST with EnvironmentSubmissionSchema keys", async () => {
    const client = new AuraClient({ apiKey: TEST_KEY, baseUrl });
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    global.fetch = jest.fn(
      async (url: string, init?: RequestInit): Promise<Response> => {
        calls.push({ url, init });
        return mockJson({ accepted: true, warnings: [] });
      },
    );

    await client.environments.submitMarketplaceListing({
      name: "Renewal risk",
      description: "Salesforce renewal-risk tasks",
      category: "CRM",
      difficulty: "MEDIUM",
      pricing: "PAY_PER_USE",
      pricePerUse: 1.5,
      taskCount: 12,
      tags: ["salesforce"],
    });

    expect(calls[0]!.url).toBe(`${baseUrl}/api/v1/marketplace/environments`);
    expect(calls[0]!.init?.method).toBe("POST");
    const body = JSON.parse(calls[0]!.init?.body as string);
    expect(body.category).toBe("CRM");
    expect(body.difficulty).toBe("MEDIUM");
    expect(body.pricing).toBe("PAY_PER_USE");
    expect(body.pricePerUse).toBe(1.5);
    expect(body.taskCount).toBe(12);
    const headers = calls[0]!.init?.headers as Record<string, string>;
    expect(headers["X-Idempotency-Key"]).toBeTruthy();
  });

  test("marketplaceLeaderboard() GET leaderboard by environment key", async () => {
    const client = new AuraClient({ apiKey: TEST_KEY, baseUrl });
    const calls: Array<{ url: string }> = [];
    global.fetch = jest.fn(
      async (url: string): Promise<Response> => {
        calls.push({ url });
        return mockJson({ entries: [], sealed: true });
      },
    );

    await client.environments.marketplaceLeaderboard("slack-incident-response");
    expect(calls[0]!.url).toBe(
      `${baseUrl}/api/v1/marketplace/environments/slack-incident-response/leaderboard`,
    );
  });
});
