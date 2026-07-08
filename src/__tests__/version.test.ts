import { afterAll, beforeAll, describe, expect, test } from "@jest/globals";
import packageJson from "../../package.json";
import { AuraOneClient, VERSION } from "../index";
import { FetchHttpClient } from "../utils/HttpClient";

describe("public package version surfaces", () => {
  let originalFetch: typeof global.fetch;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  test("match package metadata", async () => {
    expect(VERSION).toBe(packageJson.version);
    expect(new AuraOneClient().getConfig().version).toBe(packageJson.version);

    let userAgent: string | undefined;
    global.fetch = async (_url: string | URL | Request, init?: RequestInit) => {
      if (
        init?.headers &&
        typeof init.headers === "object" &&
        !Array.isArray(init.headers) &&
        "User-Agent" in init.headers
      ) {
        const descriptor = Object.getOwnPropertyDescriptor(
          init.headers,
          "User-Agent",
        );
        if (typeof descriptor?.value === "string") {
          userAgent = descriptor.value;
        }
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const client = new FetchHttpClient({
      baseUrl: "http://localhost:9999",
      retries: 0,
    });
    await client.get("/version-check");

    expect(userAgent).toBe(`@auraone/sdk/${packageJson.version}`);
  });
});
