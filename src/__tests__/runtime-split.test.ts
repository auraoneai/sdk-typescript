import { describe, expect, test } from "@jest/globals";
import * as browserEntry from "../browser";
import * as nodeEntry from "../node";
import { AuthenticationError } from "../types/api";

const VALID_SERVER_KEY = `ak_${"a1b2c3d4"}_${"0123456789abcdef".repeat(4)}`;
const VALID_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzEifQ.sig";

describe("Node vs Browser runtime entry points (OSS-01)", () => {
  test("node entry point exposes RUNTIME_TARGET=node and accepts server ak_ keys", () => {
    expect(nodeEntry.RUNTIME_TARGET).toBe("node");
    const client = nodeEntry.createNodeClient({
      apiKey: VALID_SERVER_KEY,
      baseUrl: "https://api.auraone.ai",
      orgId: "org_node",
    });
    expect(client.getBaseUrl()).toBe("https://api.auraone.ai");
    expect(client.getAuthMethod()).toBe("apikey");
  });

  test("browser entry point exposes RUNTIME_TARGET=browser and rejects server ak_ keys", () => {
    expect(browserEntry.RUNTIME_TARGET).toBe("browser");

    expect(() =>
      browserEntry.createBrowserClient({
        accessToken: VALID_SERVER_KEY,
        allowedScopes: ["evaluations:read"],
      }),
    ).toThrow(AuthenticationError);

    expect(() =>
      browserEntry.createBrowserClient({
        // @ts-expect-error apiKey is forbidden on BrowserClientConfig
        apiKey: VALID_SERVER_KEY,
        accessToken: VALID_JWT,
        allowedScopes: ["evaluations:read"],
      }),
    ).toThrow(AuthenticationError);
  });

  test("browser entry point requires explicit non-wildcard allowedScopes", () => {
    expect(() =>
      browserEntry.createBrowserClient({
        accessToken: VALID_JWT,
        allowedScopes: [],
      }),
    ).toThrow(AuthenticationError);

    expect(() =>
      browserEntry.createBrowserClient({
        accessToken: VALID_JWT,
        allowedScopes: ["*"],
      }),
    ).toThrow(AuthenticationError);

    expect(() =>
      browserEntry.createBrowserClient({
        accessToken: VALID_JWT,
        allowedScopes: ["admin:*"],
      }),
    ).toThrow(AuthenticationError);
  });

  test("browser client enforces scoped permissions per capability", () => {
    const client = browserEntry.createBrowserClient({
      accessToken: VALID_JWT,
      allowedScopes: ["evaluations:read", "analytics:write"],
      baseUrl: "https://api.auraone.ai",
      orgId: "org_browser",
    });

    expect(client.runtime).toBe("browser");
    expect(client.getBaseUrl()).toBe("https://api.auraone.ai");
    expect(client.hasScope("evaluations:read")).toBe(true);
    expect(client.hasScope("evaluations.read")).toBe(true);
    expect(client.hasScope("evaluations:write")).toBe(false);
    expect(() => client.assertScope("evaluations:write")).toThrow(
      AuthenticationError,
    );
  });
});
