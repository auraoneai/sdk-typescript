import { randomUUID } from "node:crypto";
import type { HttpClient, RequestConfig } from "../../types/api";
import { ValidationError } from "../../types/api";
import { toEnterpriseError } from "./errors";
import type { EnterpriseQueueQuery } from "./types";

export const IDEMPOTENCY_HEADER = "idempotency-key";
const IDEMPOTENCY_MIN = 8;
const IDEMPOTENCY_MAX = 255;

/**
 * Resolves the `idempotency-key` for a mutation.
 *
 * Precedence: the explicit argument, then a key already set in the request
 * config headers (any casing), then a generated UUID. The key must be 8–255
 * characters after trimming, the same rule the routes apply.
 */
export function resolveIdempotencyKey(
  explicit: string | undefined,
  headers: Record<string, string> | undefined,
): string {
  const existing = Object.keys(headers ?? {}).find(
    (name) => name.toLowerCase() === IDEMPOTENCY_HEADER,
  );
  const key =
    explicit ??
    (existing !== undefined ? headers?.[existing] : undefined) ??
    randomUUID();
  const length = key.trim().length;
  if (length < IDEMPOTENCY_MIN || length > IDEMPOTENCY_MAX) {
    throw new ValidationError(
      `idempotency key must be ${IDEMPOTENCY_MIN}-${IDEMPOTENCY_MAX} characters after trimming (got ${length})`,
      "INVALID_IDEMPOTENCY_KEY",
    );
  }
  return key;
}

/** Copies `config` with exactly one `idempotency-key` header. */
export function withIdempotencyKey(
  config: RequestConfig,
  explicit?: string,
): RequestConfig {
  const key = resolveIdempotencyKey(explicit, config.headers);
  const headers = Object.fromEntries(
    Object.entries(config.headers ?? {}).filter(
      ([name]) => name.toLowerCase() !== IDEMPOTENCY_HEADER,
    ),
  );
  return { ...config, headers: { ...headers, [IDEMPOTENCY_HEADER]: key } };
}

/** `?q=…&f.status=…` for the queue-backed collection reads. */
export function queueQueryString(query?: EnterpriseQueueQuery): string {
  const search = new URLSearchParams();
  if (query?.q) search.set("q", query.q);
  if (query?.status) search.set("f.status", query.status);
  const rendered = search.toString();
  return rendered ? `?${rendered}` : "";
}

/** `?key=value` for plain query parameters; undefined values are dropped. */
export function plainQueryString(
  params: Record<string, string | undefined | null>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, value);
    }
  }
  const rendered = search.toString();
  return rendered ? `?${rendered}` : "";
}

/** Encodes one path segment (ids are never trusted to be URL-safe). */
export function seg(value: string): string {
  return encodeURIComponent(value);
}

/**
 * Shared transport for every Enterprise Intelligence client. Reads send the
 * service request config unchanged; writes add the idempotency header. Any
 * 503 is re-thrown as `EnterpriseIntelligenceUnavailableError`.
 */
export class EnterpriseIntelligenceTransport {
  constructor(
    protected readonly http: HttpClient,
    protected readonly requestConfig: RequestConfig = {},
  ) {}

  protected async read<T>(path: string): Promise<T> {
    try {
      return await this.http.get<T>(path, this.requestConfig);
    } catch (error) {
      throw toEnterpriseError(error);
    }
  }

  protected async post<T>(
    path: string,
    body: unknown,
    idempotencyKey?: string,
  ): Promise<T> {
    const config = withIdempotencyKey(this.requestConfig, idempotencyKey);
    try {
      return await this.http.post<T>(path, body, config);
    } catch (error) {
      throw toEnterpriseError(error);
    }
  }

  protected async patch<T>(
    path: string,
    body: unknown,
    idempotencyKey?: string,
  ): Promise<T> {
    const config = withIdempotencyKey(this.requestConfig, idempotencyKey);
    try {
      return await this.http.patch<T>(path, body, config);
    } catch (error) {
      throw toEnterpriseError(error);
    }
  }

  protected async remove<T>(
    path: string,
    body: unknown,
    idempotencyKey?: string,
  ): Promise<T> {
    const config = withIdempotencyKey(this.requestConfig, idempotencyKey);
    try {
      return body === undefined
        ? await this.http.delete<T>(path, config)
        : await this.http.delete<T>(path, config, body);
    } catch (error) {
      throw toEnterpriseError(error);
    }
  }
}
