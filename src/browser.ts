import { AnalyticsService } from "./services/AnalyticsService";
import { CollaborationService } from "./services/CollaborationService";
import { EvaluationsService } from "./services/EvaluationsService";
import { GraphQLService } from "./services/GraphQLService";
import {
  AuraOneError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  ValidationError,
  type HttpClient,
  type RequestConfig,
} from "./types/api";
import { FetchHttpClient, buildQueryString } from "./utils/HttpClient";
import { SDK_VERSION } from "./version";

export const RUNTIME_TARGET = "browser" as const;
export const VERSION = SDK_VERSION;

export {
  AuraOneError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  ValidationError,
  FetchHttpClient,
  buildQueryString,
  AnalyticsService,
  CollaborationService,
  EvaluationsService,
  GraphQLService,
};

export interface BrowserClientConfig {
  /** Scoped JWT session token or short-lived browser token (never a server ak_ key). */
  accessToken?: string;
  /** Alias for accessToken when using a short-lived browser token. */
  browserToken?: string;
  /** Explicit non-wildcard scopes permitted for this browser session. */
  allowedScopes: readonly string[];
  /** Explicit AuraOne API base URL (defaults to https://api.auraone.ai). */
  baseUrl?: string;
  /** Optional organization assertion (?orgId=). */
  orgId?: string;
  timeout?: number;
  retries?: number;
  debug?: boolean;
}

const SERVER_KEY_PREFIX_PATTERN = /^(ak_|aoc_|aura_(?:live|test)_)/i;
const FORBIDDEN_BROWSER_SCOPES = new Set(["*", "admin", "admin:*", "admin.write"]);

function validateBrowserConfig(
  config: BrowserClientConfig & { apiKey?: unknown },
): { token: string; scopes: readonly string[]; baseUrl: string } {
  if (config && typeof config === "object" && "apiKey" in config && config.apiKey) {
    throw new AuthenticationError(
      "Server API keys (ak_*) are forbidden in browser clients; pass a scoped accessToken or browserToken.",
    );
  }

  const rawToken = (config?.accessToken ?? config?.browserToken ?? "").trim();
  if (!rawToken) {
    throw new AuthenticationError(
      "AuraOneBrowserClient requires a scoped accessToken or browserToken.",
    );
  }

  if (SERVER_KEY_PREFIX_PATTERN.test(rawToken)) {
    throw new AuthenticationError(
      "Server API keys (ak_*) are forbidden in browser clients; pass a scoped accessToken or browserToken.",
    );
  }

  if (!Array.isArray(config.allowedScopes) || config.allowedScopes.length === 0) {
    throw new AuthenticationError(
      "AuraOneBrowserClient requires a non-empty allowedScopes list.",
    );
  }

  const normalizedScopes = config.allowedScopes
    .map((scope) => (typeof scope === "string" ? scope.trim() : ""))
    .filter((scope) => scope.length > 0);

  if (normalizedScopes.length === 0) {
    throw new AuthenticationError(
      "AuraOneBrowserClient requires a non-empty allowedScopes list.",
    );
  }

  for (const scope of normalizedScopes) {
    if (FORBIDDEN_BROWSER_SCOPES.has(scope.toLowerCase()) || scope.endsWith(":*")) {
      throw new AuthenticationError(
        `Wildcard or admin scope "${scope}" is not permitted in AuraOneBrowserClient.`,
      );
    }
  }

  const baseUrl = config.baseUrl ?? "https://api.auraone.ai";
  try {
    new URL(baseUrl);
  } catch {
    throw new Error("Invalid baseUrl provided");
  }

  return { token: rawToken, scopes: Object.freeze(normalizedScopes), baseUrl };
}

/**
 * Browser-safe AuraOne SDK client.
 *
 * Rejects server `ak_` / `aoc_` keys, never reads `process.env`, and enforces
 * explicit non-wildcard `allowedScopes` before issuing requests.
 */
export class AuraOneBrowserClient {
  public readonly runtime = "browser" as const;
  public readonly analytics: AnalyticsService;
  public readonly evaluations: EvaluationsService;
  public readonly graphql: GraphQLService;
  public readonly collaboration: CollaborationService;

  private readonly fetchClient: FetchHttpClient;
  private readonly httpClient: HttpClient;
  private readonly allowedScopes: ReadonlySet<string>;
  private readonly baseUrl: string;

  constructor(config: BrowserClientConfig) {
    const validated = validateBrowserConfig(
      config as BrowserClientConfig & { apiKey?: unknown },
    );
    this.allowedScopes = new Set(validated.scopes);
    this.baseUrl = validated.baseUrl;

    this.fetchClient = new FetchHttpClient({
      baseUrl: validated.baseUrl,
      timeout: config.timeout ?? 30000,
      retries: config.retries ?? 2,
      debug: config.debug ?? false,
      orgId: config.orgId,
      defaultHeaders: {
        Authorization: `Bearer ${validated.token}`,
        "X-AuraOne-Client-Runtime": "browser",
        "X-AuraOne-Scoped-Permissions": [...this.allowedScopes].join(","),
      },
    });
    this.httpClient = this.createScopedHttpClient(this.fetchClient);

    this.analytics = new AnalyticsService(this.httpClient);
    this.evaluations = new EvaluationsService(this.httpClient);
    this.graphql = new GraphQLService(this.httpClient);
    this.collaboration = new CollaborationService(this.httpClient);
  }

  getAllowedScopes(): readonly string[] {
    return [...this.allowedScopes];
  }

  hasScope(scope: string): boolean {
    const normalized = scope.trim();
    const colonAlias = normalized.replace(".", ":");
    const dotAlias = normalized.replace(":", ".");
    return (
      this.allowedScopes.has(normalized) ||
      this.allowedScopes.has(colonAlias) ||
      this.allowedScopes.has(dotAlias)
    );
  }

  assertScope(scope: string): void {
    if (!this.hasScope(scope)) {
      throw new AuthenticationError(
        `Browser credential is missing required scope "${scope}".`,
      );
    }
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  private inferScopeForPath(method: string, path: string): string {
    const isWrite = method !== "GET";
    if (path.includes("/analytics/")) {
      return isWrite ? "analytics:write" : "analytics:read";
    }
    if (path.includes("/evaluations") || path.includes("/templates")) {
      return isWrite ? "evaluations:write" : "evaluations:read";
    }
    if (path === "/api/graphql") {
      return "api:read";
    }
    if (path.includes("/collaboration/")) {
      return isWrite ? "collaboration:write" : "collaboration:read";
    }
    return isWrite ? "api:write" : "api:read";
  }

  private createScopedHttpClient(inner: HttpClient): HttpClient {
    const guard = (method: string, path: string) => {
      const required = this.inferScopeForPath(method, path);
      if (!this.hasScope(required) && !this.hasScope("api:read")) {
        throw new AuthenticationError(
          `Browser credential is missing required scope "${required}" for ${method} ${path}.`,
        );
      }
    };
    return {
      get: <T>(path: string, config?: RequestConfig) => {
        guard("GET", path);
        return inner.get<T>(path, config);
      },
      post: <T>(path: string, data?: unknown, config?: RequestConfig) => {
        guard("POST", path);
        return inner.post<T>(path, data, config);
      },
      put: <T>(path: string, data?: unknown, config?: RequestConfig) => {
        guard("PUT", path);
        return inner.put<T>(path, data, config);
      },
      delete: <T>(path: string, config?: RequestConfig) => {
        guard("DELETE", path);
        return inner.delete<T>(path, config);
      },
      patch: <T>(path: string, data?: unknown, config?: RequestConfig) => {
        guard("PATCH", path);
        return inner.patch<T>(path, data, config);
      },
    };
  }
}

export function createBrowserClient(
  config: BrowserClientConfig,
): AuraOneBrowserClient {
  return new AuraOneBrowserClient(config);
}

export default AuraOneBrowserClient;
