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

export interface HttpClientOptions {
  baseUrl: string;
  timeout?: number;
  retries?: number;
  debug?: boolean;
  defaultHeaders?: Record<string, string>;
  retryConfig?: Partial<RetryConfig>;
}

export class FetchHttpClient implements HttpClient {
  private baseUrl: string;
  private timeout: number;
  private retries: number;
  private debug: boolean;
  private logger: SDKLogger;
  private defaultHeaders: Record<string, string>;
  private retryConfig: RetryConfig;

  constructor(options: HttpClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, ""); // Remove trailing slash
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
    // In a real implementation, this would come from package.json
    return "1.0.0";
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
    const requestConfig = this.buildRequestConfig(method, data, config);

    this.logger.info(`${method.toUpperCase()} ${fullUrl}`, {
      headers: requestConfig.headers,
      body: requestConfig.body,
    });

    let lastError: unknown;

    for (let attempt = 0; attempt <= this.retryConfig.retries; attempt++) {
      try {
        const response = await this.makeRequest(fullUrl, requestConfig);
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
      }
    }

    throw lastError;
  }

  private buildUrl(path: string): string {
    const cleanPath = path.startsWith("/") ? path.slice(1) : path;
    return `${this.baseUrl}/${cleanPath}`;
  }

  private buildRequestConfig(
    method: string,
    data?: unknown,
    config?: RequestConfig,
  ): RequestInit {
    const headers = {
      ...this.defaultHeaders,
      ...traceHeaders(),
      ...config?.headers,
    };

    const requestConfig: RequestInit = {
      method: method.toUpperCase(),
      headers,
      signal: this.createAbortSignal(config?.timeout),
    };

    if (typeof data !== "undefined" && ["POST", "PUT", "PATCH"].includes(method.toUpperCase())) {
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

    return requestConfig;
  }

  private createAbortSignal(timeout?: number): AbortSignal | undefined {
    if (typeof AbortController === "undefined") {
      return undefined; // AbortController not available in this environment
    }

    const controller = new AbortController();
    const timeoutMs = timeout || this.timeout;

    setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    return controller.signal;
  }

  private async makeRequest(
    url: string,
    config: RequestInit,
  ): Promise<Response> {
    try {
      const fetchImpl =
        typeof globalThis !== "undefined" && typeof globalThis.fetch === "function"
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
      this.logger.warn("Rate limit exhausted", rateLimitInfo as unknown as Record<string, unknown>);
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
        if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
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

    const messageCandidate = errorPayload.error ?? errorPayload.message;
    const message =
      typeof messageCandidate === "string"
        ? messageCandidate
        : `HTTP ${response.status}`;
    const code =
      typeof errorPayload.code === "string" ? errorPayload.code : undefined;
    const details = "details" in errorPayload ? errorPayload.details : undefined;

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
    if (typeof details === "object" && details !== null && !Array.isArray(details)) {
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

  async post<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.executeRequest<T>("POST", url, data, config);
  }

  async put<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.executeRequest<T>("PUT", url, data, config);
  }

  async delete<T>(url: string, config?: RequestConfig): Promise<T> {
    return this.executeRequest<T>("DELETE", url, undefined, config);
  }

  async patch<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.executeRequest<T>("PATCH", url, data, config);
  }
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
