import { describe, expect, jest, test } from "@jest/globals";
import { readFileSync } from "node:fs";
import { AuthProvider } from "../auth/AuthProvider";
import { AuraOneClient } from "../client/AuraOneClient";
import { AuthenticationError } from "../types/api";

/**
 * Mirrors `apps/src/lib/security/api-keys.ts` generateAPIKey output shape:
 * `ak_<8 lowercase hex>_<64 lowercase hex>`.
 */
const VALID_KEY = `ak_${"a1b2c3d4"}_${"0123456789abcdef".repeat(4)}`;

describe("AuthProvider.isValidApiKey (shared platform key fixture)", () => {
  const fixture = JSON.parse(
    readFileSync(
      new URL("../../../fixtures/platform-api-key.json", import.meta.url),
      "utf8",
    ),
  ) as { pattern: string; valid: string[]; invalid: string[] };

  test("agrees with the issuer fixture on every case", () => {
    expect(new RegExp(fixture.pattern).source).toBe(
      /^ak_[a-f0-9]{8}_[a-f0-9]{64}$/.source,
    );
    for (const key of fixture.valid) expect(AuthProvider.isValidApiKey(key)).toBe(true);
    for (const key of fixture.invalid) expect(AuthProvider.isValidApiKey(key)).toBe(false);
  });
});

describe("AuthProvider.isValidApiKey (platform ak_ contract)", () => {
  test("accepts platform-issued ak_<8hex>_<64hex>", () => {
    expect(VALID_KEY).toMatch(/^ak_[a-f0-9]{8}_[a-f0-9]{64}$/);
    expect(AuthProvider.isValidApiKey(VALID_KEY)).toBe(true);
    // all-zeros hex is still valid hex
    expect(AuthProvider.isValidApiKey(`ak_${"0".repeat(8)}_${"f".repeat(64)}`)).toBe(true);
  });

  test("rejects legacy aura_ keys and malformed keys", () => {
    expect(AuthProvider.isValidApiKey(`aura_live_${"a".repeat(40)}`)).toBe(false);
    expect(AuthProvider.isValidApiKey(`aura_test_${"a".repeat(40)}`)).toBe(false);
    expect(AuthProvider.isValidApiKey("")).toBe(false);
    expect(AuthProvider.isValidApiKey("ak_short")).toBe(false);
    expect(
      AuthProvider.isValidApiKey(`ak_${"G".repeat(8)}_${"0".repeat(64)}`),
    ).toBe(false); // hex must be lowercase
    expect(AuthProvider.isValidApiKey(`ak_${"a".repeat(8)}_${ "0".repeat(63)}`)).toBe(false);
    expect(AuthProvider.isValidApiKey(`aoc_${"x".repeat(5)}`)).toBe(false);
    expect(
      AuthProvider.isValidApiKey(`aoc_${"abcdef12"}_${"k".repeat(40)}`),
    ).toBe(false);
    expect(
      AuthProvider.isValidApiKey(`aoc_${"G".repeat(8)}_${"x".repeat(40)}`),
    ).toBe(false);
  });

  test("rejects well-formed compute aoc_ keys for platform clients (R2)", () => {
    // aoc_<8hex>_<secret>: compute-authority keys are identified but not
    // accepted by the platform client validator.
    const computeKey = `aoc_${"a1b2c3d4"}_${"x".repeat(40)}`;
    expect(AuthProvider.isValidApiKey(computeKey)).toBe(false);
    expect(AuthProvider.isComputeApiKey(computeKey)).toBe(true);
    expect(AuthProvider.isComputeApiKey(VALID_KEY)).toBe(false);
  });

  test("withApiKey/setApiKey/validateConfig all enforce the same format", () => {
    expect(() => AuraOneClient.withApiKey(`aura_live_${"x".repeat(40)}`)).toThrow(
      AuthenticationError,
    );
    expect(() => AuraOneClient.withApiKey(VALID_KEY)).not.toThrow();

    const client = new AuraOneClient({ apiKey: VALID_KEY });
    expect(() => client.setApiKey("not-a-key")).toThrow(AuthenticationError);
    expect(() => client.setApiKey(VALID_KEY)).not.toThrow();
    expect(() => new AuraOneClient({ apiKey: `aoc_${"y".repeat(5)}` })).toThrow(
      AuthenticationError,
    );
  });
});

describe("AuthProvider.refreshAuthToken body contract", () => {
  test("posts { refreshToken } and unwraps tokens.accessToken", async () => {
    const calls: Array<{ path: string; body: unknown }> = [];
    const httpClient = {
      post: jest.fn(async (path: string, body: unknown) => {
        calls.push({ path, body });
        return {
          success: true,
          tokens: {
            accessToken: "access.jwt.new",
            refreshToken: "r".repeat(40),
            tokenType: "Bearer",
            expiresIn: 3600,
          },
        };
      }),
    };

    const provider = new AuthProvider({ apiKey: VALID_KEY });
    provider.setToken("old.jwt.token", "r".repeat(40));
    const refreshed = await provider.refreshAuthToken(
      "/api/auth/refresh",
      httpClient as never,
    );
    expect(refreshed).toBe(true);
    expect(calls[0]?.path).toBe("/api/auth/refresh");
    expect(calls[0]?.body).toEqual({ refreshToken: "r".repeat(40) });
    expect(httpClient.post).toHaveBeenCalledTimes(1);
  });
});
