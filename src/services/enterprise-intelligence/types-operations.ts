/**
 * Request types for improvement items, regression candidates, operations
 * (metrics and SLOs) and the registry. Each interface mirrors the zod schema
 * of its route under `apps/src/app/api/v1/enterprise-intelligence/`.
 */

import type { EnterpriseContentRights } from "./types";
import type { EnterpriseDatasetPurpose } from "./types-context";
import type { EnterpriseToolSideEffect } from "./types-context";

/** `POST /improvement-items`. The idempotency key travels as a header only. */
export interface EnterpriseImprovementItemCreateRequest {
  incidentId: string;
  regressionCandidateId?: string | null;
  /** 1–10,000 characters. */
  proposedChange: string;
  ownerId: string;
  sourceWorkflowVersionId: string;
  targetWorkflowVersionId: string;
  targetPromptVersionId?: string | null;
  targetModelVersionId?: string | null;
  requiredEvaluationSuiteId: string;
  requiredEvaluationVersion: string;
  /** 0–1. */
  requiredEvaluationThreshold: number;
  evaluationResultId?: string | null;
  /** 0–1 or null. */
  evaluationScore?: number | null;
  expectedMetric: {
    name: string;
    baseline: number;
    expected: number;
    unit: string;
  };
  releaseDisposition: "HOLD" | "REJECT" | "SHIP" | "ROLLBACK";
}

/** `POST /regression-candidates`. */
export interface EnterpriseRegressionCandidateCreateRequest {
  incidentId: string;
  evaluationSuiteId: string;
}

/** `POST /regression-candidates/{candidateId}/review`. Reviewer role required. */
export interface EnterpriseRegressionCandidateReview {
  decision: "APPROVE" | "DENY";
  purpose: EnterpriseDatasetPurpose;
  /** 1–4000 characters. */
  reason: string;
}

/** `GET /operations/metrics`. All three labels are required. */
export interface EnterpriseMetricsQuery {
  programId: string;
  workflowId: string;
  workflowVersionId: string;
}

/** `GET /operations/slos`. */
export interface EnterpriseSloQuery {
  programId: string;
  workflowId: string;
}

/** `GET /operations/slos/release-gate`. */
export interface EnterpriseSloReleaseGateQuery extends EnterpriseSloQuery {
  /** ISO-8601 instant to evaluate at; defaults to now. */
  at?: string;
}

export type EnterpriseSloArea =
  | "CONTROL_PLANE"
  | "QUEUE"
  | "WORKFLOW"
  | "HUMAN_TASK"
  | "CONNECTOR"
  | "DELIVERY";

export interface EnterpriseSloThreshold {
  metric: string;
  operator: "LTE" | "GTE";
  /** Finite, non-negative. */
  value: number;
  unit: "MS" | "RATE" | "COUNT";
}

/** `POST /operations/slos`. Every area needs at least one threshold. */
export interface EnterpriseSloCreateRequest extends EnterpriseSloQuery {
  thresholds: Record<EnterpriseSloArea, EnterpriseSloThreshold[]>;
  serviceCreditPolicy?: {
    offered: boolean;
    policyRef?: string;
    /** 0–10,000. */
    creditBasisPoints?: number;
    /** 0–10,000. */
    maximumCreditBasisPoints?: number;
  };
}

/** `POST /operations/slos/{sloId}/activate`. */
export interface EnterpriseSloActivateRequest {
  /** ISO-8601. */
  effectiveFrom: string;
}

/** `POST /registry/models`. */
export type EnterpriseRegistryModelRequest =
  | { action: "create"; key: string; name: string }
  | {
      action: "create-version";
      deploymentId: string;
      provider: string;
      providerModelName: string;
      immutableProviderRef: string;
      parameters: unknown;
      region: string;
      dataPolicy: unknown;
    }
  | { action: "release"; versionId: string; evaluationEvidence: unknown };

/** `POST /registry/policies`. */
export type EnterpriseRegistryPolicyRequest =
  | {
      action: "create-version";
      key: string;
      policy: unknown;
      trainingRights: EnterpriseContentRights;
      /** 1–3650. */
      retentionDays?: number;
      legalHoldRequired?: boolean;
    }
  | { action: "approve"; versionId: string };

/** `POST /registry/prompts`. */
export type EnterpriseRegistryPromptRequest =
  | { action: "create"; key: string; name: string; purpose: string }
  | {
      action: "create-version";
      promptDefinitionId: string;
      template: string;
      variableSchema: unknown;
      modelCompatibility: unknown;
    }
  | { action: "approve"; versionId: string; evaluationEvidence: unknown };

/** `POST /registry/tools`. */
export type EnterpriseRegistryToolRequest =
  | { action: "create"; key: string; name: string }
  | {
      action: "create-version";
      toolDefinitionId: string;
      inputSchema: unknown;
      outputSchema: unknown;
      /** Up to 64 scopes. */
      requiredScopes: string[];
      sideEffect: EnterpriseToolSideEffect;
      reversibility: unknown;
      dataClassification: string;
      /** At most 300,000. */
      timeoutMs: number;
      rateLimit: unknown;
      implementationRef: string;
    }
  | { action: "approve"; versionId: string; sandboxEvidence: unknown };
