/** Machine contracts for the versioned Synthetic Data REST API. */

export type SyntheticDataJson =
  | null
  | boolean
  | number
  | string
  | SyntheticDataJson[]
  | { [key: string]: SyntheticDataJson };

export type SyntheticDataPayload = Record<string, unknown>;

export interface SyntheticDataRequestOptions {
  /** Required on every mutating operation. Reusing it safely replays that result. */
  idempotencyKey: string;
  /** Optional caller-generated trace identifier. */
  requestId?: string;
}

export interface SyntheticDataReadOptions {
  /** Optional caller-generated trace identifier. */
  requestId?: string;
}

export interface SyntheticDataListOptions extends SyntheticDataReadOptions {
  cursor?: string;
  limit?: number;
  /** Server-side filters the family supports (status, generationType, ...). */
  status?: SyntheticDataJobStatus;
  generationType?: SyntheticDataGenerationType;
  runId?: string;
  experimentId?: string;
}

export type SyntheticDataGenerationType =
  | "PROCEDURAL"
  | "PHYSICS"
  | "LLM"
  | "GAN"
  | "DIFFUSION"
  | "STABLE_DIFFUSION"
  | "CONTROLNET"
  | "LATENT_DIFFUSION"
  | "HYBRID"
  | "ENSEMBLE"
  | "VAEGAN"
  | "ADVANCED_LLM"
  | "VAE";

export type SyntheticDataJobStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELED";

export interface SyntheticDataScenario extends Record<string, unknown> {
  environment?: string;
  parameters?: Record<string, unknown>;
  duration?: number;
  prompt?: string;
  seeds?: number[];
  modality?: string;
  generator?: string;
  generatorOptions?: Record<string, unknown>;
  conditioning?: Record<string, unknown>;
  privacyProfileId?: string;
  privacyProfile?: Record<string, unknown>;
  physics?: {
    engine?: string;
    timestep?: number;
    iterations?: number;
    [key: string]: unknown;
  };
}

export interface SyntheticDataJob {
  id: string;
  campaignId: string;
  generationType: SyntheticDataGenerationType | string;
  scenario?: SyntheticDataScenario;
  targetCount: number;
  generatedCount: number;
  status: SyntheticDataJobStatus | string;
  priority?: number;
  computeHours?: string | number | null;
  outputFiles: string[];
  qualityMetrics?: Record<string, unknown> | null;
  createdAt: string;
  completedAt?: string | null;
  createdBy?: string | null;
  projectId?: string | null;
  experimentId?: string | null;
  /** Present on the single-job read. */
  progressPercent?: number;
  estimatedCompletion?: string | null;
  [key: string]: unknown;
}

export interface SyntheticDataProviderReadiness {
  status: "ready" | "unavailable";
  provider: string;
  requiredEnvironment: string[];
  missingProviders: string[];
}

export interface SyntheticDataJobListResponse {
  jobs: SyntheticDataJob[];
  meta?: {
    localBackendAvailable?: boolean;
    providerReadiness?: SyntheticDataProviderReadiness | null;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface SyntheticDataJobResponse {
  job: SyntheticDataJob;
  [key: string]: unknown;
}

export interface SyntheticDataDataPoint {
  id: string;
  data: unknown;
  metadata: Record<string, unknown>;
}

export interface SyntheticDataPreviewResult {
  dataPoints: SyntheticDataDataPoint[];
  environment?: Record<string, unknown>;
  metrics?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface SyntheticDataRun {
  id: string;
  jobId?: string;
  campaignId?: string;
  status?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface SyntheticDataSlice {
  id?: string;
  sliceKey?: string;
  modality?: string;
  [key: string]: unknown;
}

export interface SyntheticSliceReview {
  id: string;
  runId: string;
  sliceKey: string;
  modality: string;
  reviewerId?: string | null;
  decision: string;
  comment?: string | null;
  privacyScore?: number | null;
  decidedAt?: string | null;
  createdAt: string;
  [key: string]: unknown;
}

export interface SyntheticPrivacyProfile {
  id?: string;
  name?: string;
  kAnonymity?: number | null;
  lDiversity?: number | null;
  tCloseness?: number | null;
  epsilon?: number | null;
  delta?: number | null;
  quasiIdentifiers?: string[];
  sensitiveAttributes?: string[];
  maxReidentificationRisk?: number;
  [key: string]: unknown;
}

export interface SyntheticDataTemplate {
  id?: string;
  name?: string;
  generationType?: SyntheticDataGenerationType | string;
  scenario?: SyntheticDataScenario;
  [key: string]: unknown;
}

export interface SyntheticDataPipeline {
  id?: string;
  name?: string;
  stages?: unknown[];
  [key: string]: unknown;
}

export interface SyntheticQualityReport {
  overallScore?: number;
  grade?: string;
  statistical?: Record<string, unknown>;
  privacy?: Record<string, unknown>;
  realism?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface SyntheticQualityAlert {
  id: string;
  severity?: string;
  status?: string;
  metric?: string;
  message?: string;
  acknowledgedAt?: string | null;
  [key: string]: unknown;
}

export interface SyntheticPhysicsSimulation {
  id: string;
  engine?: string;
  status?: string;
  config?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Legacy `/api/v1/synthetic/*` response envelope (`{data, success}`). */
export interface LegacySyntheticEnvelope<T> {
  data: T;
  success: boolean;
  [key: string]: unknown;
}

export interface LegacySyntheticProfile {
  id: string;
  name?: string;
  [key: string]: unknown;
}

export interface LegacySyntheticAudit {
  id: string;
  action?: string;
  createdAt?: string;
  [key: string]: unknown;
}
