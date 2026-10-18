/**
 * Request types for workflow authoring, approval, activation, evaluation
 * and release gating. Each interface mirrors the zod schema of its route
 * under `apps/src/app/api/v1/enterprise-intelligence/workflows/`.
 * Dates are ISO-8601 strings.
 */

/** Any JSON value the route requires to be present (may be `null`). */
export type EnterpriseJsonValue =
  | Record<string, unknown>
  | unknown[]
  | string
  | number
  | boolean
  | null;

export interface EnterpriseHumanTaskDefinition {
  id: string;
  [key: string]: unknown;
}

/** `POST /workflows/{workflowId}/versions`. */
export interface EnterpriseWorkflowVersionCreateRequest {
  inputSchema: EnterpriseJsonValue;
  outputSchema: EnterpriseJsonValue;
  /** Validated server-side; an invalid graph returns 400 WORKFLOW_GRAPH_INVALID with `issues`. */
  graph: EnterpriseJsonValue;
  policyVersionId: string;
  promptVersionIds: string[];
  modelVersionIds: string[];
  toolVersionIds: string[];
  humanTaskDefinitions: EnterpriseHumanTaskDefinition[];
  retryPolicy: EnterpriseJsonValue;
  timeoutPolicy: EnterpriseJsonValue;
  toolsetVersion: string;
  programId: string;
  programBriefVersionId: string;
  pricingVersionId: string;
  rubricVersionRef: string;
  acceptanceContractVersion: string;
}

/** `POST /workflows/{workflowId}/versions/{versionId}/retire`. */
export interface EnterpriseWorkflowVersionRetireRequest {
  expectedVersion: number;
  expectedDefinitionRevision: number;
  /** 8–1000 characters. */
  reason: string;
}

export interface EnterprisePermissionRules {
  allowedActorIds: string[];
  allowedRoles: string[];
  allowedWorkflowVersionIds: string[];
}

/** `POST /workflows/{workflowId}/versions/{versionId}/context-package`. */
export interface EnterpriseContextPackageRequest {
  /** At least one context source version. */
  sourceVersionIds: string[];
  retrievalConfiguration?: Record<string, unknown>;
  /** At least one policy version. */
  policyVersionIds: string[];
  exclusions?: string[];
  permissionRules: EnterprisePermissionRules;
  historicalCaseSetVersion?: string | null;
  evaluationCaseSetVersion?: string | null;
}

/** `POST /workflows/{workflowId}/approval-requests`. */
export interface EnterpriseApprovalRequestCreate {
  versionId: string;
  evaluationEvidenceRef: string;
}

/** Which side of a dual approval a decision belongs to. */
export type EnterpriseApprovalSide = "customer" | "auraone";

/** `POST /workflows/{id}/approval-requests/{requestId}/{side}`. */
export interface EnterpriseApprovalDecision {
  decision: "APPROVED" | "REJECTED";
  /** Must contain at least one key. */
  evidence: Record<string, unknown>;
}

/** `DELETE /workflows/{id}/approval-requests/{requestId}/{side}`. */
export interface EnterpriseApprovalRevocation {
  /** Must contain at least one key. */
  evidence: Record<string, unknown>;
}

/** `POST /workflows/{workflowId}/activations`. */
export interface EnterpriseWorkflowActivationRequest {
  versionId: string;
  approvalRequestId: string;
}

export interface EnterpriseEvaluationCriterionResult {
  criterionId: string;
  /** 0–1. */
  score: number;
  /** 0–1. */
  confidence: number;
  evidenceIds: string[];
}

export interface EnterpriseEvaluationCaseResult {
  caseId: string;
  passed: boolean;
  criticalFailure: boolean;
  criteria: EnterpriseEvaluationCriterionResult[];
  /** Non-negative integer as a decimal string (micro-units). */
  costMicros: string;
  latencyMs: number;
  humanIntervention: boolean;
}

/** `POST /workflows/{workflowId}/evaluations` (strict body). */
export interface EnterpriseWorkflowEvaluationRequest {
  evidenceId: string;
  workflowVersionId: string;
  suiteId: string;
  /** ISO-8601. */
  expiresAt: string;
  results: EnterpriseEvaluationCaseResult[];
}

/** `POST /workflows/{workflowId}/release-gate` (strict body). */
export interface EnterpriseReleaseGateRequest {
  workflowVersionId: string;
  evidenceId: string;
  activeEvidenceId?: string | null;
  regressionSuiteId?: string | null;
  /** Defaults to false. */
  production?: boolean;
}
