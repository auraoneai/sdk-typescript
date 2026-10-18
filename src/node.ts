import { AuraOneClient } from "./client/AuraOneClient";
import type { ClientConfig } from "./types/api";

export const RUNTIME_TARGET = "node" as const;

export * from "./index";
export { AuraOneClient as default } from "./client/AuraOneClient";

/**
 * Create a Node.js AuraOne client with explicit config overriding
 * `AURAONE_API_KEY`, `AURAONE_TOKEN`, `AURAONE_BASE_URL`, and `AURAONE_ORG_ID`.
 */
export function createNodeClient(config: ClientConfig = {}): AuraOneClient {
  const apiKey = config.apiKey ?? process.env.AURAONE_API_KEY;
  const accessToken =
    config.accessToken ?? (!apiKey ? process.env.AURAONE_TOKEN : undefined);
  const refreshToken = config.refreshToken ?? process.env.AURAONE_REFRESH_TOKEN;
  const baseUrl = config.baseUrl ?? process.env.AURAONE_BASE_URL;
  const orgId = config.orgId ?? process.env.AURAONE_ORG_ID;

  return new AuraOneClient({
    ...config,
    apiKey,
    accessToken,
    refreshToken,
    ...(baseUrl ? { baseUrl } : {}),
    ...(orgId ? { orgId } : {}),
  });
}
