import crossFetch, { Response } from "cross-fetch";
import { stringify } from "qs";
import {
  HttpClient,
  RequestConfig,
  RetryConfig,
  RateLimitInfo,
  AuraOneError,
  AuthenticationError,
  RateLimitError,
  ValidationError,
  NotFoundError,
} from "../types/api";
import { traceHeaders } from "./trace";
import { createSDKLogger, type SDKLogger } from "./logger";
import { SDK_VERSION } from "../version";

export interface HttpClientOptions {
  baseUrl: string;
  timeout?: number;
  retries?: number;
  debug?: boolean;
  defaultHeaders?: Record<string, string>;
  retryConfig?: Partial<RetryConfig>;
  /**
   * Optional organization assertion. The organization a request runs in is
   * derived from the credential (the API key record); a configured orgId is
   * sent as a `?orgId=` query assertion and any mismatch is rejected with
   * 403. Org headers are never sent (the platform strips them inbound).
   */
  orgId?: string;
}

interface AbortSignalContext {
  signal?: AbortSignal;
  cleanup: () => void;
}

interface RequestContext {
  config: RequestInit;
  cleanup: () => void;
}

export class FetchHttpClient implements HttpClient {
  private baseUrl: string;
  private timeout: number;
  private retries: number;
  private debug: boolean;
  private logger: SDKLogger;
  private defaultHeaders: Record<string, string>;
  private retryConfig: RetryConfig;
  private orgId?: string;

  constructor(options: HttpClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, ""); // Remove trailing slash
    this.orgId = options.orgId;
    this.timeout = options.timeout || 30000; // 30 seconds default
    this.retries = options.retries || 3;
    this.debug = options.debug || false;
    this.logger = createSDKLogger(this.debug);
    this.defaultHeaders = {
      "Content-Type": "application/json",
      "User-Agent": `@auraone/sdk/${this.getVersion()}`,
      ...options.defaultHeaders,
    };

    this.retryConfig = {
      retries: this.retries,
      retryDelay: this.exponentialBackoff,
      retryCondition: this.shouldRetry,
      ...options.retryConfig,
    };
  }

  private getVersion(): string {
    return SDK_VERSION;
  }

  private exponentialBackoff = (attemptNumber: number): number => {
    return Math.min(1000 * Math.pow(2, attemptNumber), 30000);
  };

  private shouldRetry = (error: unknown): boolean => {
    const statusCode =
      typeof error === "object" && error !== null && "statusCode" in error
        ? (error as { statusCode?: number }).statusCode
        : undefined;

    if (typeof statusCode !== "number") {
      return true;
    }

    if (statusCode >= 500) return true; // Server error
    if (statusCode === 408) return true; // Request timeout
    if (statusCode === 429) return true; // Rate limit (with backoff)
    return false;
  };

  private async executeRequest<T>(
    method: string,
    url: string,
    data?: unknown,
    config?: RequestConfig,
  ): Promise<T> {
    const fullUrl = this.buildUrl(url);

    let lastError: unknown;

    for (let attempt = 0; attempt <= this.retryConfig.retries; attempt++) {
      const requestContext = this.buildRequestContext(method, data, config);

      this.logger.info(`${method.toUpperCase()} ${fullUrl}`, {
        headers: requestContext.config.headers,
        body: requestContext.config.body,
      });

      try {
        const response = await this.makeRequest(fullUrl, requestContext.config);
        return await this.handleResponse<T>(response);
      } catch (error) {
        lastError = error;

        if (
          attempt === this.retryConfig.retries ||
          !this.retryConfig.retryCondition(error)
        ) {
          break;
        }

        const delay = this.retryConfig.retryDelay(attempt);

        this.logger.info(
          `Retrying request in ${delay}ms (attempt ${attempt + 1}/${this.retryConfig.retries})`,
        );

        await this.sleep(delay);
      } finally {
        requestContext.cleanup();
      }
    }

    throw lastError;
  }

  private buildUrl(path: string): string {
    const cleanPath = path.startsWith("/") ? path.slice(1) : path;
    let url = `${this.baseUrl}/${cleanPath}`;
    if (this.orgId) {
      const separator = url.includes("?") ? "&" : "?";
      url = `${url}${separator}orgId=${encodeURIComponent(this.orgId)}`;
    }
    return url;
  }

  private buildRequestContext(
    method: string,
    data?: unknown,
    config?: RequestConfig,
  ): RequestContext {
    const headers = {
      ...this.defaultHeaders,
      ...traceHeaders(),
      ...config?.headers,
    };
    const abortContext = this.createAbortSignal(config?.timeout);

    const requestConfig: RequestInit = {
      method: method.toUpperCase(),
      headers,
      signal: abortContext.signal,
    };

    // DELETE carries a body only when the caller passes one (some routes,
    // e.g. approval-decision revocation, require `{ evidence }` on DELETE).
    if (
      typeof data !== "undefined" &&
      ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase())
    ) {
      if (typeof FormData !== "undefined" && data instanceof FormData) {
        requestConfig.body = data;
        // Remove Content-Type for FormData (browser will set it with boundary)
        delete headers["Content-Type"];
      } else if (typeof data === "object") {
        requestConfig.body = JSON.stringify(data);
      } else {
        // data is string, Blob, or other BodyInit-compatible type
        requestConfig.body = data as BodyInit;
      }
    }

    return {
      config: requestConfig,
      cleanup: abortContext.cleanup,
    };
  }

  private createAbortSignal(timeout?: number): AbortSignalContext {
    if (typeof AbortController === "undefined") {
      return {
        signal: undefined,
        cleanup: () => undefined,
      };
    }

    const controller = new AbortController();
    const timeoutMs = timeout || this.timeout;

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    return {
      signal: controller.signal,
      cleanup: () => clearTimeout(timeoutId),
    };
  }

  private async makeRequest(
    url: string,
    config: RequestInit,
  ): Promise<Response> {
    try {
      const fetchImpl =
        typeof globalThis !== "undefined" &&
        typeof globalThis.fetch === "function"
          ? (globalThis.fetch.bind(globalThis) as typeof crossFetch)
          : crossFetch;
      const response = await fetchImpl(url, config);
      return response;
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "name" in error &&
        (error as { name?: string }).name === "AbortError"
      ) {
        throw new AuraOneError("Request timeout", "TIMEOUT", null, 408);
      }
      throw new AuraOneError("Network error", "NETWORK_ERROR", error);
    }
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const rateLimitInfo = this.extractRateLimitInfo(response);

    if (rateLimitInfo && rateLimitInfo.remaining === 0) {
      this.logger.warn(
        "Rate limit exhausted",
        rateLimitInfo as unknown as Record<string, unknown>,
      );
    }

    if (!response.ok) {
      await this.handleErrorResponse(response, rateLimitInfo);
    }

    const contentType = response.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      return response.json() as Promise<T>;
    }

    if (contentType?.includes("application/x-jsonlines")) {
      const text = await response.text();
      return text as unknown as T;
    }

    if (contentType?.includes("text/")) {
      const text = await response.text();
      return text as unknown as T;
    }

    // For binary data or unknown content types
    const buffer = await response.arrayBuffer();
    return buffer as unknown as T;
  }

  private async handleErrorResponse(
    response: Response,
    rateLimitInfo?: RateLimitInfo,
  ): Promise<never> {
    let errorPayload: Record<string, unknown> = {};

    try {
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const parsed = await response.json();
        if (
          typeof parsed === "object" &&
          parsed !== null &&
          !Array.isArray(parsed)
        ) {
          errorPayload = parsed as Record<string, unknown>;
        } else {
          errorPayload = { error: parsed } as Record<string, unknown>;
        }
      } else {
        errorPayload = { error: await response.text() };
      }
    } catch {
      errorPayload = { error: `HTTP ${response.status}` };
    }

    const { message, code, details } = parseErrorPayload(
      errorPayload,
      response.status,
    );

    switch (response.status) {
      case 400:
        throw new ValidationError(message, code, details);
      case 401:
        throw new AuthenticationError(message, code, details);
      case 404:
        throw new NotFoundError(message, code, details);
      case 429: {
        const detailsWithRateInfo = rateLimitInfo
          ? this.mergeRateLimitInfo(details, rateLimitInfo)
          : details;
        throw new RateLimitError(message, code, detailsWithRateInfo);
      }
      default:
        throw new AuraOneError(message, code, details, response.status);
    }
  }

  private mergeRateLimitInfo(
    details: unknown,
    rateLimitInfo: RateLimitInfo,
  ): unknown {
    if (
      typeof details === "object" &&
      details !== null &&
      !Array.isArray(details)
    ) {
      return { ...details, rateLimitInfo };
    }

    return { details, rateLimitInfo };
  }

  private extractRateLimitInfo(response: Response): RateLimitInfo | undefined {
    const limit = response.headers.get("x-ratelimit-limit");
    const remaining = response.headers.get("x-ratelimit-remaining");
    const reset = response.headers.get("x-ratelimit-reset");
    const retryAfter = response.headers.get("retry-after");

    if (limit && remaining && reset) {
      return {
        limit: parseInt(limit, 10),
        remaining: parseInt(remaining, 10),
        reset: parseInt(reset, 10),
        retryAfter: retryAfter ? parseInt(retryAfter, 10) : undefined,
      };
    }

    return undefined;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  updateDefaultHeaders(headers: Record<string, string>): void {
    this.defaultHeaders = {
      ...this.defaultHeaders,
      ...headers,
    };
  }

  removeDefaultHeader(key: string): void {
    delete this.defaultHeaders[key];
  }

  // HttpClient interface implementation
  async get<T>(url: string, config?: RequestConfig): Promise<T> {
    return this.executeRequest<T>("GET", url, undefined, config);
  }

  async post<T>(
    url: string,
    data?: unknown,
    config?: RequestConfig,
  ): Promise<T> {
    return this.executeRequest<T>("POST", url, data, config);
  }

  async put<T>(
    url: string,
    data?: unknown,
    config?: RequestConfig,
  ): Promise<T> {
    return this.executeRequest<T>("PUT", url, data, config);
  }

  async delete<T>(
    url: string,
    config?: RequestConfig,
    data?: unknown,
  ): Promise<T> {
    return this.executeRequest<T>("DELETE", url, data, config);
  }

  async patch<T>(
    url: string,
    data?: unknown,
    config?: RequestConfig,
  ): Promise<T> {
    return this.executeRequest<T>("PATCH", url, data, config);
  }
}

/**
 * Reads the error fields from a failed response body.
 *
 * Two shapes are supported:
 * - flat: `{ error: "message", code?, details? }` (most platform routes);
 * - nested: `{ error: { code, message, details? } }` (Enterprise
 *   Intelligence and other envelope routes).
 *
 * When the body carries neither (for example the Enterprise Intelligence
 * health probe, which answers 503 with its health body), the body itself is
 * kept as `details` so callers can still read it.
 */
export function parseErrorPayload(
  payload: Record<string, unknown>,
  status: number,
): { message: string; code?: string; details?: unknown } {
  const nested = payload.error;
  if (typeof nested === "object" && nested !== null && !Array.isArray(nested)) {
    const envelope = nested as Record<string, unknown>;
    const extra = Object.fromEntries(
      Object.entries(envelope).filter(
        ([key]) => key !== "code" && key !== "message" && key !== "details",
      ),
    );
    const details =
      "details" in envelope
        ? envelope.details
        : Object.keys(extra).length > 0
          ? extra
          : undefined;
    return {
      message:
        typeof envelope.message === "string"
          ? envelope.message
          : `HTTP ${status}`,
      code: typeof envelope.code === "string" ? envelope.code : undefined,
      details,
    };
  }

  const messageCandidate = payload.error ?? payload.message;
  const hasErrorFields = "error" in payload || "message" in payload;
  return {
    message:
      typeof messageCandidate === "string"
        ? messageCandidate
        : `HTTP ${status}`,
    code: typeof payload.code === "string" ? payload.code : undefined,
    details:
      "details" in payload
        ? payload.details
        : !hasErrorFields && Object.keys(payload).length > 0
          ? payload
          : undefined,
  };
}

// Query string utilities
export function buildQueryString(params: Record<string, unknown>): string {
  const filtered = Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null,
    ),
  );

  return stringify(filtered, {
    arrayFormat: "comma",
    skipNulls: true,
    addQueryPrefix: true,
  });
}
