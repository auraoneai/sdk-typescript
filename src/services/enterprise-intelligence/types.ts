/**
 * Shared Enterprise Intelligence envelope and record types.
 *
 * Response records are projections of platform rows; the routes do not
 * publish response schemas, so record types name the fields callers rely on
 * and keep an index signature for the rest.
 */

export interface EnterpriseIntelligenceQueueMeta {
  /** Records matching the organization scope and applied filters. */
  total: number;
  /** Records returned in this response (bounded by `limit`). */
  loaded: number;
  limit: number;
  filtersApplied: { search: string | null; status: string | null };
  /** Server-side filtering covers every matching record, not just the page. */
  scope: "server";
}

export interface EnterpriseIntelligencePermissions {
  canMutate: boolean;
}

export interface EnterpriseIntelligenceList<T> {
  data: T[];
  meta?: EnterpriseIntelligenceQueueMeta;
  permissions?: EnterpriseIntelligencePermissions;
}

export interface EnterpriseIntelligenceRecord<T> {
  data: T;
  links?: { self?: string };
  permissions?: EnterpriseIntelligencePermissions;
}

/** Loose record used where the route returns an unschematized projection. */
export type EnterpriseRecord = Record<string, unknown>;

/**
 * Collection reads return at most `meta.limit` (100) records and have no
 * cursor. When this is true, narrow the read with `q` / `status` instead.
 */
export function isTruncated(
  meta: EnterpriseIntelligenceQueueMeta | undefined | null,
): boolean {
  return Boolean(meta && meta.loaded < meta.total);
}

export interface EnterpriseQueueQuery {
  /** `q` search parameter (server-side filter). */
  q?: string;
  /** `f.status` filter; values outside the route's allow-list are dropped. */
  status?: string;
}

/** Idempotency options accepted by every mutation. */
export interface EnterpriseMutationOptions {
  /**
   * 8–255 characters after trimming. When omitted, an `idempotency-key`
   * header already present in the service request config is reused, and
   * otherwise a UUID is generated. Reuse the same key to retry safely.
   */
  idempotencyKey?: string;
}

export interface EnterpriseWorkflow {
  id: string;
  key?: string;
  name?: string;
  description?: string;
  /** Presented status of the latest version: DRAFT | ACTIVE | RETIRED. */
  status?: string;
  [key: string]: unknown;
}

export type EnterpriseRunStatus =
  | "QUEUED"
  | "RUNNING"
  | "WAITING_FOR_HUMAN"
  | "WAITING_FOR_EXTERNAL"
  | "RETRYING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED"
  | "COMPENSATING";

export interface EnterpriseRun {
  id: string;
  status?: EnterpriseRunStatus | string;
  workflowVersionId?: string;
  environmentVersion?: string;
  deliveryId?: string | null;
  deadlineAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface EnterpriseRunCreateRequest {
  workflowVersionId: string;
  inputContentId: string;
  environmentVersion: string;
  /** ISO-8601 deadline; optional. */
  deadlineAt?: string;
}

export interface EnterpriseRunCreateOptions extends EnterpriseRunCreateRequest {
  /** 8–255 characters; auto-generated when omitted. */
  idempotencyKey?: string;
}

export type EnterpriseDeliveryStatus =
  | "DRAFT"
  | "SEALED"
  | "AVAILABLE"
  | "ACCEPTED"
  | "REJECTED"
  | "SUPERSEDED"
  | "REVOKED";

export interface EnterpriseDelivery {
  id: string;
  programId?: string;
  status?: EnterpriseDeliveryStatus | string;
  /** Set only when exactly one run resolves to the delivery. */
  runId?: string | null;
  runResolution?: "UNIQUE" | "MISSING" | "AMBIGUOUS";
  manifestConfigured?: boolean;
  files?: Array<Record<string, unknown>>;
  events?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

/** Run record plus its delivery projection and per-file access grants. */
export interface EnterpriseRunDelivery {
  delivery: EnterpriseDelivery | null;
  signedAccess?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

/** Connector receipt projection (secret/request material already redacted). */
export interface EnterpriseConnectorReceipt {
  id: string;
  connectorId: string;
  provider: string;
  providerRequestId?: string | null;
  requestSha256?: string | null;
  toolId?: string | null;
  toolVersion?: string | null;
  actorId?: string | null;
  runId?: string | null;
  stepId?: string | null;
  responseStatus?: number | null;
  resultingObjectId?: string | null;
  resultingObjectVersion?: string | null;
  createdAt: string;
  /** Detail-only fields (present on getConnectorReceipt, deeply redacted). */
  response?: unknown;
  beforeEvidence?: unknown;
  afterEvidence?: unknown;
  [key: string]: unknown;
}

export interface EnterpriseRunInputContent {
  id: string;
  sha256: string;
  mediaType: string;
  byteSize: number;
  dataClassification: string;
  legalHold: boolean;
  retentionUntil?: string | null;
  createdAt: string;
}

export interface EnterpriseRunInputEnvironment {
  environmentVersion: string;
  runCount: number;
  lastUsedAt: string;
}

export interface EnterpriseRunInputs {
  contents: EnterpriseRunInputContent[];
  environments: EnterpriseRunInputEnvironment[];
}

export interface EnterpriseRunInputsMeta {
  contentTotal: number;
  contentLoaded: number;
  limit: number;
  search: string | null;
}

export type EnterpriseHealthStatus =
  | "UP"
  | "DOWN"
  | "DEGRADED"
  | "UNAVAILABLE"
  | (string & {});

export interface EnterpriseHealth {
  status: EnterpriseHealthStatus;
  observedAt: string;
  service: { status: EnterpriseHealthStatus };
  worker: { status: EnterpriseHealthStatus };
  dependencies: Record<string, { status: EnterpriseHealthStatus }>;
}

export interface EnterpriseWorkflowCreateOptions {
  key: string;
  name: string;
  description?: string;
  /** 8–255 characters; auto-generated when omitted. */
  idempotencyKey?: string;
}

export type EnterpriseHumanTaskAction =
  | "APPROVE"
  | "REJECT"
  | "CORRECT"
  | "REQUEST_INFORMATION"
  | "RETRY_AUTOMATION"
  | "ESCALATE";

export interface EnterpriseHumanTaskCompletion {
  action: EnterpriseHumanTaskAction;
  outputContentId: string;
  /** Any JSON value; required (send `null` explicitly if there is none). */
  evidence: unknown;
  expectedLockVersion: number;
  correction?: unknown;
}

export interface EnterpriseRegressionSuiteRunRequest {
  workflowVersionId: string;
  evidenceId: string;
}

/** Training/use rights carried by content, incidents and historical sets. */
export type EnterpriseContentRights =
  | "NO_TRAINING"
  | "EVALUATION_ONLY"
  | "CUSTOMER_MODEL_ONLY"
  | "AURAONE_MODEL_ALLOWED";

/** Customer disposition used by run and batch acceptance. */
export type EnterpriseAcceptanceDecision = "accepted" | "rejected" | "rework";

export interface EnterpriseSettings {
  id: string;
  key: string;
  version: number;
  status: string;
  policy: unknown;
  trainingRights: EnterpriseContentRights | string;
  retentionDays?: number | null;
  legalHoldRequired?: boolean;
  approvedAt?: string | null;
  createdAt: string;
  [key: string]: unknown;
}
