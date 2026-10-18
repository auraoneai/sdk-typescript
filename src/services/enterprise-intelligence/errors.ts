import { AuraOneError } from "../../types/api";

/**
 * Error codes the Enterprise Intelligence routes return in their
 * `{ error: { code, message } }` envelope. The list is not closed: new codes
 * arrive as plain strings.
 */
export type EnterpriseIntelligenceErrorCode =
  | "ENTERPRISE_COMPOSITION_UNAVAILABLE"
  | "MALWARE_SCAN_UNAVAILABLE"
  | "UNAUTHENTICATED"
  | "PERMISSION_DENIED"
  | "ACCESS_DENIED"
  | "READ_ONLY_PRINCIPAL"
  | "CSRF_ORIGIN_DENIED"
  | "INVALID_REQUEST"
  | "NOT_FOUND"
  | "WORKFLOW_GRAPH_INVALID"
  | "WORKFLOW_VERSION_NOT_FOUND"
  | "REGRESSION_SUITE_NOT_FOUND"
  | "ENTERPRISE_CONTEXT_PACKAGE_REQUIRED"
  | "ENTERPRISE_CONTEXT_PACKAGE_MISMATCH"
  | "EI_ACCEPTANCE_IMMUTABLE"
  | "EI_ACCEPTANCE_IDEMPOTENCY_CONFLICT"
  | "PAYLOAD_TOO_LARGE"
  | "INTERNAL_ERROR"
  | (string & {});

/**
 * Thrown when an Enterprise Intelligence route answers 503: the runtime, or
 * one part of it (incidents, replay, improvement, regression, ingestion), is
 * not configured in this deployment.
 *
 * Detection keys on the status, not the code. One route answers 503 with
 * the code `ACCESS_DENIED`, so read `code` for detail only.
 *
 * The HTTP client retries 5xx responses before this error is thrown, so a
 * not-configured response costs the client's retry budget first.
 */
export class EnterpriseIntelligenceUnavailableError extends AuraOneError {
  constructor(
    message = "Enterprise Intelligence is not available in this deployment.",
    code: EnterpriseIntelligenceErrorCode = "ENTERPRISE_COMPOSITION_UNAVAILABLE",
    details?: unknown,
  ) {
    super(message, code, details, 503);
    this.name = "EnterpriseIntelligenceUnavailableError";
  }
}

/** True for any 503 raised by an Enterprise Intelligence call. */
export function isEnterpriseIntelligenceUnavailable(
  error: unknown,
): error is EnterpriseIntelligenceUnavailableError {
  return (
    error instanceof EnterpriseIntelligenceUnavailableError ||
    (error instanceof AuraOneError && error.statusCode === 503)
  );
}

/** Re-throws 503s as {@link EnterpriseIntelligenceUnavailableError}. */
export function toEnterpriseError(error: unknown): unknown {
  if (error instanceof EnterpriseIntelligenceUnavailableError) return error;
  if (error instanceof AuraOneError && error.statusCode === 503) {
    return new EnterpriseIntelligenceUnavailableError(
      error.message,
      error.code ?? "ENTERPRISE_COMPOSITION_UNAVAILABLE",
      error.details,
    );
  }
  return error;
}
