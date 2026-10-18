/** Machine contracts for the versioned Synthetic Research REST API. */
export type SyntheticResearchId = string;
export type SyntheticResearchJson =
  | null
  | boolean
  | number
  | string
  | SyntheticResearchJson[]
  | { [key: string]: SyntheticResearchJson };

export interface SyntheticResearchEnvelope<T> {
  data: T;
  requestId: string;
}

export interface SyntheticResearchPage<T> {
  data: T[];
  nextCursor: string | null;
  requestId: string;
}

export interface SyntheticResearchErrorDetail {
  fieldErrors?: Record<string, string[]>;
  formErrors?: string[];
  [key: string]: unknown;
}

export interface SyntheticResearchErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: SyntheticResearchErrorDetail;
    requestId: string;
  };
}

export interface SyntheticResearchRequestOptions {
  /** Required on every mutating operation. Reusing it safely replays that result. */
  idempotencyKey: string;
  /** Optional caller-generated trace identifier. */
  requestId?: string;
}

export interface SyntheticResearchReadOptions {
  /** Optional caller-generated trace identifier. */
  requestId?: string;
}

export interface SyntheticResearchListOptions {
  cursor?: string;
  limit?: number;
}

export interface SyntheticResearchResource {
  id: SyntheticResearchId;
  organizationId?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export type SyntheticSource = SyntheticResearchResource & {
  name?: string;
  sourceType?: string;
  rightsStatus?: string;
};
export type PriorSet = SyntheticResearchResource & { name?: string };
export type PriorVersion = SyntheticResearchResource & {
  priorSetId?: string;
  version?: number;
};
export type SyntheticPopulation = SyntheticResearchResource & {
  name?: string;
  mode?: string;
  rosterVersion?: number;
};
export type SyntheticPopulationMember = SyntheticResearchResource & {
  populationId?: string;
  personaId?: string;
  weight?: number;
  groundingGrade?: string;
};
export type IdentityReview = SyntheticResearchResource & {
  resolutionStatus?: string;
  candidates?: unknown[];
};
export type SyntheticStudy = SyntheticResearchResource & {
  name?: string;
  populationId?: string;
};
export type StudyInstrument = SyntheticResearchResource & {
  studyId?: string;
  version?: number;
  instrument?: Record<string, unknown>;
};
export type SyntheticStudyRun = SyntheticResearchResource & {
  studyId?: string;
  knowledgeCutoffAt?: string;
  progress?: Record<string, unknown>;
};
export type SyntheticAnswer = SyntheticResearchResource & {
  runId?: string;
  questionId?: string;
  respondentId?: string;
  answer?: unknown;
};
export type SyntheticResearchReport = SyntheticResearchResource & {
  runId?: string;
  format?: string;
  downloadUrl?: string;
};

export type SyntheticPersona = SyntheticResearchResource & {
  expertTwinId?: string;
  version?: number;
  groundingGrade?: string;
};
export type ExpertTwin = SyntheticResearchResource & {
  name?: string;
  title?: string;
  company?: string;
  activePersonaVersionId?: string;
};
export type ConsentRecord = SyntheticResearchResource & {
  subjectId?: string;
  scope?: string[];
  expiresAt?: string;
  withdrawnAt?: string;
};
export type EvidenceDiscoveryCandidate = SyntheticResearchResource & {
  subjectId?: string;
  sourceUrl?: string;
  approvalStatus?: string;
};
export type CalibrationResult = SyntheticResearchResource & {
  populationId?: string;
  datasetVersionId?: string;
  metrics?: Record<string, unknown>;
};
export type ValidationResult = SyntheticResearchResource & {
  runId?: string;
  passed?: boolean;
  metrics?: Record<string, unknown>;
};
export type SyntheticResearchSettings = Record<string, unknown>;
export type ReportShare = SyntheticResearchResource & {
  reportId?: string;
  expiresAt?: string;
  revokedAt?: string;
};

export type SyntheticResearchPayload = Record<string, unknown>;
