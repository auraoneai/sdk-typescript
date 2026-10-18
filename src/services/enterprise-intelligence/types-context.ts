/**
 * Request types for connectors, tool bindings, context sources and
 * historical sets. Each interface mirrors the zod schema of its route under
 * `apps/src/app/api/v1/enterprise-intelligence/`. Dates are ISO-8601 strings.
 */

import type { EnterpriseContentRights } from "./types";
import type { EnterprisePermissionRules } from "./types-workflows";

/** `POST /connectors`. Administrator role required. */
export interface EnterpriseConnectorCreateRequest {
  /** 1–128 characters; unique per organization. */
  name: string;
  /** The supported CRM provider identifier. */
  provider: "hubspot";
  /** Defaults to SANDBOX. */
  environment?: "SANDBOX" | "PRODUCTION";
  /** Reference to a secret already stored in the platform secret store. */
  secretReferenceId: string;
}

/** `POST /connectors/{connectorId}/authorize`, START step. */
export interface EnterpriseConnectorAuthorizeStart {
  action: "START";
  /** HTTPS only. */
  redirectUri: string;
  /** PKCE challenge, 43–128 URL-safe characters. */
  codeChallenge: string;
  /** 1–50 scopes of the form `name:read` or `name:write`. */
  scopes: string[];
}

/** `POST /connectors/{connectorId}/authorize`, CALLBACK step. */
export interface EnterpriseConnectorAuthorizeCallback {
  action: "CALLBACK";
  /** HTTPS only. */
  redirectUri: string;
  state: string;
  code: string;
  codeVerifier: string;
}

export type EnterpriseConnectorAuthorizeRequest =
  | EnterpriseConnectorAuthorizeStart
  | EnterpriseConnectorAuthorizeCallback
  | { action: "REVOKE" };

export interface EnterpriseConnectorReceiptQuery {
  workflowId?: string;
  runId?: string;
}

export type EnterpriseToolSideEffect =
  | "READ_ONLY"
  | "REVERSIBLE_WRITE"
  | "IRREVERSIBLE";

/** `POST /tool-bindings`. Administrator role required. */
export interface EnterpriseToolBindingCreateRequest {
  /** 1–128 characters. */
  name: string;
  /** Canonical connector reference: must equal `connector:v1/{connectorId}/{toolVersionId}`. */
  implementationRef: string;
  connectorId: string;
  toolVersionId: string;
  toolId: string;
  toolVersion: string;
  workflowVersionId: string;
  provider: string;
  secretReferenceId: string;
  requiredScopes: string[];
  defaultObject: string;
  allowedObjects: string[];
  allowedFields: Record<string, string[]>;
  allowedActions: string[];
  sideEffect: EnterpriseToolSideEffect;
  /** Defaults to false. */
  approvalRequired?: boolean;
  idempotency: "NONE" | "REQUIRED";
  rateLimitPerMinute: number;
  /** Defaults to 1. */
  maxConcurrency?: number;
  /** Defaults to false. */
  callbackRequired?: boolean;
  /** HTTPS only. */
  endpoint: string;
  /** Defaults to 30000; at most 120000. */
  timeoutMs?: number;
  /** HTTPS only. */
  sandboxProbeEndpoint?: string;
  allowedHosts?: string[];
}

/** `PATCH /tool-bindings/{bindingId}`. Identity fields cannot change. */
export type EnterpriseToolBindingUpdateRequest = Partial<
  Omit<
    EnterpriseToolBindingCreateRequest,
    "implementationRef" | "connectorId" | "toolVersionId"
  >
> & { enabled?: boolean };

export type EnterpriseContextSourceType =
  | "FILE"
  | "STRUCTURED_EXPORT"
  | "POLICY"
  | "HISTORICAL_CASES";

export type EnterpriseDataClassification =
  | "PUBLIC"
  | "INTERNAL"
  | "CONFIDENTIAL"
  | "RESTRICTED";

export type EnterpriseImprovementPurpose =
  | "EVALUATION"
  | "CUSTOMER_MODEL_IMPROVEMENT"
  | "AURAONE_MODEL_IMPROVEMENT";

/** `POST /context-sources`. Owner, administrator or operator role required. */
export interface EnterpriseContextSourceRegisterRequest {
  programId: string;
  sourceType: EnterpriseContextSourceType;
  classification: EnterpriseDataClassification;
  /** The customer confirms processing rights; must be true. */
  processingRights: true;
  objectReference: string;
  storageReceiptId: string;
  /** 64 hex characters. */
  sha256: string;
  /** Defaults to application/json. */
  mediaType?: string;
  byteSize: number;
  /** Defaults to the calling actor. */
  customerOwnerId?: string;
  improvementPurposes?: EnterpriseImprovementPurpose[];
  /** ISO-8601 or null. */
  retentionUntil?: string | null;
  deletionPolicy?: "ON_REQUEST" | "AT_RETENTION_END";
  permissions?: EnterprisePermissionRules;
}

export interface EnterpriseNormalizationField {
  sourceField: string;
  type: "string" | "number" | "boolean";
  required: boolean;
}

/** `POST /context-sources/{sourceId}/retry` (ingest and normalize). */
export interface EnterpriseContextSourceIngestRequest {
  /** Defaults to the latest version. */
  sourceVersionId?: string;
  normalization: {
    version: string;
    recordType: string;
    fields: Record<string, EnterpriseNormalizationField>;
  };
}

export interface EnterpriseHistoricalRecord {
  input: unknown;
  acceptedOutput: unknown;
  modelOutput?: unknown;
  failureLabel?: string;
  humanCorrection?: unknown;
  qualityStandardRef?: string;
}

interface EnterpriseHistoricalImportBase {
  workflowDefinitionId?: string | null;
  taskDescriptor: unknown;
  sourceDeclaration: unknown;
  rights: EnterpriseContentRights;
  splitSeed?: string | null;
}

/**
 * `POST /historical-sets`. Supply either `records` (1–10,000) or both
 * `sourceText` and `format`.
 */
export type EnterpriseHistoricalImportRequest =
  | (EnterpriseHistoricalImportBase & { records: EnterpriseHistoricalRecord[] })
  | (EnterpriseHistoricalImportBase & {
      sourceText: string;
      format: "csv" | "jsonl";
    });

export type EnterpriseDatasetPurpose =
  | "EVALUATION"
  | "CUSTOMER_MODEL"
  | "AURAONE_MODEL";

export type EnterpriseHeldOutSplit = "validation" | "test";

/** `POST /historical-sets/{setId}/baseline`, prepare step. */
export interface EnterpriseBaselinePrepareRequest {
  split: EnterpriseHeldOutSplit;
}

export interface EnterpriseBaselineOutput {
  exampleId: string;
  output: unknown;
  evidenceRef: string;
}

/**
 * `POST /historical-sets/{setId}/baseline`, evaluate step. `outputs` must
 * cover every example of the split exactly once.
 */
export interface EnterpriseBaselineEvaluateRequest {
  modelRef: string;
  split: EnterpriseHeldOutSplit;
  outputs: EnterpriseBaselineOutput[];
}
