import {
  afterAll,
  beforeAll,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import { AuraOneClient } from "../client/AuraOneClient";

/**
 * PR-19 T-P2-08 / F35: mocked-transport assertions for the already-`/api`-
 * prefixed services. Every call must land on the documented platform path,
 * carry the orgId query assertion, and authenticate via X-API-Key.
 */
describe("prefixed-service transport paths", () => {
  const API_KEY = `ak_${"ab12cd34"}_${"f".repeat(64)}`;
  const baseUrl = "http://localhost:9999";
  let originalFetch: typeof global.fetch;
  const calls: Array<{ url: URL; init?: RequestInit }> = [];

  const client = new AuraOneClient({
    apiKey: API_KEY,
    baseUrl,
    orgId: "org_contract",
  });

  beforeAll(() => {
    originalFetch = global.fetch;
    global.fetch = jest.fn(
      async (url: string | URL, init?: RequestInit): Promise<Response> => {
        const parsed = new URL(String(url));
        calls.push({ url: parsed, init });
        if (parsed.pathname === "/api/auth/refresh") {
          return new Response(
            JSON.stringify({
              tokens: { accessToken: "at", refreshToken: "rt" },
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
        return new Response("{}", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    ) as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  function lastCall() {
    return calls[calls.length - 1];
  }

  function expectContract(path: string) {
    const { url, init } = lastCall();
    expect(url.pathname).toBe(path);
    expect(url.searchParams.get("orgId")).toBe("org_contract");
    const headers = new Headers(init?.headers);
    expect(headers.get("x-api-key")).toBe(API_KEY);
    expect(headers.get("x-organization-id")).toBeNull();
  }

  test("analytics.submitEvent -> POST /api/analytics/events", async () => {
    await client.analytics.submitEvent({ event: "e" } as never);
    expectContract("/api/analytics/events");
  });

  test("auth.getSession -> GET /api/auth/session", async () => {
    await client.auth.getSession();
    expectContract("/api/auth/session");
  });

  test("auth.listAPIKeys -> GET /api/v1/api-keys", async () => {
    await client.auth.listAPIKeys();
    expectContract("/api/v1/api-keys");
  });

  test("auth.refreshToken posts {refreshToken} to /api/auth/refresh", async () => {
    await client.auth.refreshToken("r".repeat(40));
    const { url, init } = lastCall();
    expect(url.pathname).toBe("/api/auth/refresh");
    expect(JSON.parse(String(init?.body))).toEqual({
      refreshToken: "r".repeat(40),
    });
  });

  test("billing.getBillingInfo -> GET /api/billing", async () => {
    await client.billing.getBillingInfo();
    expectContract("/api/billing");
  });

  test("billing.subscribe -> POST /api/billing/subscribe", async () => {
    await client.billing.subscribe("pro");
    expectContract("/api/billing/subscribe");
  });

  test("collaboration.getActiveCollaborations -> GET /api/collaboration/active", async () => {
    await client.collaboration.getActiveCollaborations();
    expectContract("/api/collaboration/active");
  });

  test("training.getExportStats -> GET /api/training/export", async () => {
    await client.training.getExportStats("org_contract");
    const { url } = lastCall();
    expect(url.pathname).toBe("/api/training/export");
    expect(url.searchParams.get("orgId")).toBe("org_contract");
  });
});
