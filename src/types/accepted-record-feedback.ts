export type AcceptedRecordDispositionType =
  | "ACCEPTED"
  | "REJECTED"
  | "NEEDS_CORRECTION"
  | "SUPERSEDED";
export type AcceptedRecordFeedbackKind =
  | "MORE_LIKE_THIS"
  | "STILL_FAILING"
  | "INCORRECT"
  | "INCOMPLETE"
  | "POLICY_OR_SAFETY_CONCERN"
  | "FORMAT_OR_SCHEMA_ISSUE"
  | "OUTDATED"
  | "DUPLICATE"
  | "LATER_EVALUATION_FAILURE"
  | "CORRECTION_PROPOSED"
  | "CORRECTION_ACCEPTED"
  | "OTHER";
export type AcceptedRecordFeedbackStatus =
  | "OPEN"
  | "ACKNOWLEDGED"
  | "TRIAGED"
  | "RESOLVED"
  | "DISMISSED"
  | "SUPERSEDED";
export type AcceptedRecordFeedbackSeverity =
  | "INFO"
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";
export type AcceptedRecordFeedbackSource =
  | "CUSTOMER_PORTAL"
  | "API"
  | "IMPORT"
  | "OPERATOR_ON_BEHALF";

export interface CreateAcceptedRecordDispositionRequest {
  disposition: Exclude<AcceptedRecordDispositionType, "SUPERSEDED">;
  reasonTaxonomyVersion: string;
  reasonCode?: string;
  reasonDetail?: string;
  source: AcceptedRecordFeedbackSource;
  idempotencyKey: string;
  deliveryId?: string;
  deliveryVersion?: number;
  supersedesDispositionId?: string;
}

export interface AcceptedRecordDisposition extends CreateAcceptedRecordDispositionRequest {
  id: string;
  organizationId: string;
  programId: string;
  acceptedRecordId: string;
  submittedBySubjectId: string;
  submittedByRole: string;
  ledgerEventId: string;
  createdAt: string;
}

export interface CreateAcceptedRecordFeedbackRequest {
  kind: AcceptedRecordFeedbackKind;
  reasonTaxonomyVersion: string;
  reasonCode?: string;
  severity?: AcceptedRecordFeedbackSeverity;
  note?: string;
  expectedOutcome?: unknown;
  observedOutcome?: unknown;
  correctionPayload?: unknown;
  sourceChannel: AcceptedRecordFeedbackSource;
  sourceAt?: string;
  idempotencyKey: string;
  relatedSignalId?: string;
  supersedesSignalId?: string;
}

export interface AcceptedRecordFeedbackSignal extends CreateAcceptedRecordFeedbackRequest {
  id: string;
  organizationId: string;
  programId: string;
  acceptedRecordId: string;
  severity: AcceptedRecordFeedbackSeverity;
  status: AcceptedRecordFeedbackStatus;
  sourceSubjectId: string;
  sourceRole: string;
  resolutionCode?: string | null;
  resolutionNote?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  ledgerEventId: string;
  createdAt: string;
}

export interface TransitionAcceptedRecordFeedbackRequest {
  status: Exclude<AcceptedRecordFeedbackStatus, "OPEN">;
  resolutionCode?: string;
  resolutionNote?: string;
  /** Dispatch the structured safety/privacy/rights escalation while triaging. */
  escalate?: boolean;
  idempotencyKey: string;
}

export interface AcceptedRecordTimelineEntry {
  id: string;
  type: "DISPOSITION" | "FEEDBACK" | "CORRECTION" | "SUPERSESSION";
  occurredAt: string;
  data: Record<string, unknown>;
}

export type AcceptedRecordFailureLinkMethod =
  | "EXACT_DATASET_MEMBERSHIP"
  | "EXACT_CASE_REFERENCE"
  | "CONTENT_HASH"
  | "OPERATOR_CONFIRMED"
  | "HEURISTIC";
export type NextCycleRecommendationType =
  | "CREATE_TASK"
  | "ADD_EVALUATION_CASE"
  | "ADD_REGRESSION_CASE"
  | "REQUEST_CORRECTION"
  | "CHANGE_REVIEW_COVERAGE"
  | "REVIEW_EXPERT_SELECTION"
  | "REVIEW_QUALITY_RULE";
export type NextCycleRecommendationStatus =
  | "PROPOSED"
  | "NEEDS_REVIEW"
  | "APPROVED"
  | "DECLINED"
  | "EXPIRED"
  | "MATERIALIZED"
  | "FAILED";

export interface AcceptedRecordLibraryQuery {
  purpose:
    | "EVALUATION"
    | "CUSTOMER_MODEL"
    | "AURAONE_MODEL"
    | "TRAINING_CUSTOMER_MODEL"
    | "TRAINING_AURAONE_MODEL";
  cursor?: string;
  pageSize?: number;
  programIds?: string[];
  dispositions?: AcceptedRecordDispositionType[];
  feedbackKinds?: AcceptedRecordFeedbackKind[];
  feedbackStatuses?: AcceptedRecordFeedbackStatus[];
  modelVersionIds?: string[];
  evaluationRunIds?: string[];
  currentOnly?: boolean;
}

export interface AcceptedRecordLibraryItem {
  id: string;
  organizationId: string;
  programId: string;
  acceptedAt: string;
  dispositions?: AcceptedRecordDisposition[];
  feedbackSignals?: AcceptedRecordFeedbackSignal[];
  rights: Record<string, unknown>;
}

export interface AcceptedRecordLibraryPage {
  data: AcceptedRecordLibraryItem[];
  meta: {
    nextCursor: string | null;
    hasMore: boolean;
    watermark?: string;
    scannedRows?: number;
  };
}

export interface AcceptedRecordFailureLink {
  id: string;
  organizationId: string;
  acceptedRecordId: string;
  evaluationRunId: string;
  linkMethod: AcceptedRecordFailureLinkMethod;
  confidence: number | null;
  confirmedAt: string | null;
}

export interface QualityPerformanceView {
  subjectKind: "CONTRIBUTOR" | "REVIEWER" | "PROGRAM";
  subjectReference: string;
  sampleSize: number;
  insufficientData: boolean;
  uncertainty: Record<string, unknown>;
  sourceWatermark: string;
  metrics: Record<string, number | null>;
}

export interface NextCycleRecommendation {
  id: string;
  organizationId: string;
  programId: string;
  recommendationType: NextCycleRecommendationType;
  status: NextCycleRecommendationStatus;
  generatorVersion: string;
  configurationHash: string;
  deterministicKey: string;
  explanation: Record<string, unknown>;
  proposedPayload: Record<string, unknown>;
  expiresAt: string | null;
}

export interface RecommendationDecisionRequest {
  reason: string;
}
