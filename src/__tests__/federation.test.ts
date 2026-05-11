import { afterEach, describe, expect, jest, test } from "@jest/globals";
import { AuraClient } from "../client";

describe("TS SDK Federation wrappers", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  test("getFederationNodes calls correct endpoint", async () => {
    let called = "";
    const mockFetch = jest.fn(async (url: string): Promise<Response> => {
      called = url;
      return new Response(JSON.stringify({ nodes: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    global.fetch = mockFetch as unknown as typeof global.fetch;
    const client = new AuraClient({
      baseUrl: "http://localhost:8000",
      apiKey: "test",
    });
    await client.getFederationNodes("org-1");
    expect(called).toContain("/v1/organizations/org-1/federation/nodes");
  });
});
