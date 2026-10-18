/**
 * Request types for runs, compensations, incidents, replay, batches and
 * deliveries. Each interface mirrors the zod schema of its route under
 * `apps/src/app/api/v1/enterprise-intelligence/`. Dates are ISO-8601 strings.
 */

import type {
  EnterpriseAcceptanceDecision,
  EnterpriseContentRights,
} from "./types";

/** `POST /runs/{runId}/acceptance`. A reason is required unless accepted. */
export interface EnterpriseRunAcceptanceRequest {
  decision: EnterpriseAcceptanceDecision;
  reason?: string;
}

/** `POST /runs/{runId}/compensations`. */
export interface EnterpriseCompensationRequest {
  sideEffectReceiptId: string;
  /** 8–2000 characters. */
  reason: string;
}

export type EnterpriseIncidentTrigger =
  | "CUSTOMER_REJECTION"
  | "OUTCOME_REOPENED"
  | "OUTCOME_REVERSED"
  | "POLICY_VIOLATION"
  | "TOOL_ACTION_FAILURE"
  | "HUMAN_OVERRIDE"
  | "DRIFT_ALERT"
  | "REGRESSION_ALERT";

export type EnterpriseIncidentEvidenceType =
  | "RUN_EVENT"
  | "CUSTOMER_DISPOSITION"
  | "HUMAN_DECISION"
  | "ALERT"
  | "TOOL_RECEIPT"
  | "EVALUATION_RESULT";

export interface EnterpriseIncidentEvidence {
  evidenceId: string;
  evidenceType: EnterpriseIncidentEvidenceType;
  referenceId: string;
  /** 64 hex characters. */
  sha256: string;
  /** ISO-8601. */
  observedAt: string;
}

/** `POST /runs/{runId}/incidents`. */
export interface EnterpriseIncidentRequest {
  workflowVersionId: string;
  trigger: EnterpriseIncidentTrigger;
  /** 1–4000 characters. */
  summary: string;
  rights: EnterpriseContentRights;
  /** 1–100 entries. */
  evidence: EnterpriseIncidentEvidence[];
}

export interface EnterpriseReplayLimits {
  /** 1–1000. */
  maxTurns: number;
  /** 1–10,000,000. */
  maxTokens: number;
  maxCostMicros: number;
  /** 1–3,600,000. */
  maxWallTimeMs: number;
}

/** `POST /runs/{runId}/replay`. Operator role required. */
export interface EnterpriseReplayRequest {
  workflowVersionId: string;
  /** Only `EVALUATION` is accepted; the default. */
  purpose?: "EVALUATION";
  limits: EnterpriseReplayLimits;
}

export interface EnterpriseBatchItemSubmission {
  inputContentId: string;
  inputDescriptor: unknown;
  /** Lower-case 64 hex characters. */
  inputSha256: string;
}

/** `POST /batches` (strict body). 1–10,000 items; each item becomes one run. */
export interface EnterpriseBatchSubmission {
  workflowVersionId: string;
  inputContract: unknown;
  items: EnterpriseBatchItemSubmission[];
}

/** `POST /batches/{batchId}/retry`. Omit `itemIds` to let the server select the retryable items. */
export interface EnterpriseBatchRetryRequest {
  itemIds?: string[];
}

export interface EnterpriseBatchAcceptanceSelection {
  itemId: string;
  deliveryId: string;
  /** The delivery version the decision was made against. */
  expectedDeliveryVersion: number;
  decision: EnterpriseAcceptanceDecision;
  reason?: string;
}

/** `POST /batches/{batchId}/acceptance`. */
export interface EnterpriseBatchAcceptanceRequest {
  selections: EnterpriseBatchAcceptanceSelection[];
}

export type EnterpriseIngestionMediaType =
  | "image/jpeg"
  | "image/png"
  | "application/pdf"
  | "text/csv"
  | "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  | "text/plain"
  | "application/json";

/** The `contract` field of `POST /batches/ingest`. */
export interface EnterpriseIngestionContract {
  schemaVersion: "auraone.enterprise-ingestion.v1";
  allowedMediaTypes: EnterpriseIngestionMediaType[];
  spreadsheetMode: "ROW_PER_ITEM" | "WHOLE_FILE";
  governance: {
    /** Upper-case code, for example `CONFIDENTIAL`. */
    dataClassification: string;
    trainingRights: EnterpriseContentRights;
    /** Future ISO-8601 instant in UTC (`Z`), or null. */
    retentionUntil: string | null;
    legalHold: boolean;
  };
}

export type EnterpriseIngestionContent =
  | Blob
  | ArrayBuffer
  | Uint8Array
  | string;

/** One uploaded source. Files are sent in this order. */
export interface EnterpriseIngestionSource {
  sourceId: string;
  fileName: string;
  mediaType: EnterpriseIngestionMediaType;
  content: EnterpriseIngestionContent;
}

/** `POST /batches/ingest` (multipart/form-data). */
export interface EnterpriseBatchIngestRequest {
  workflowVersionId: string;
  contract: EnterpriseIngestionContract;
  /** 1–25 sources (server limit). */
  sources: EnterpriseIngestionSource[];
}

/** `PATCH /deliveries/{deliveryId}` (Program deliveries only). */
export interface EnterpriseDeliveryDisposition {
  action: "accept" | "reject" | "rework";
  /** Up to 1000 characters. */
  note?: string;
  /** Used with `reject`. */
  taxonomyVersion?: string;
  /** Used with `reject`. */
  reasonCode?: string;
}

export interface EnterpriseBatchItemState {
  itemId: string;
  ordinal: number;
  runId: string | null;
  runtime: { status: string; attempt: number; failureCode: string | null };
  business: {
    operational: string;
    customer: string;
    reasonCodes: string[];
    recordId: string | null;
    billable: boolean;
  };
  delivery: unknown;
  acceptanceEventRef: string | null;
  invoiceStatus: string | null;
  [key: string]: unknown;
}
