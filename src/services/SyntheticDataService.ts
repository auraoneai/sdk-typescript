import type { HttpClient, RequestConfig } from "../types/api";
import type {
  LegacySyntheticAudit,
  LegacySyntheticEnvelope,
  LegacySyntheticProfile,
  SyntheticDataGenerationType,
  SyntheticDataJobListResponse,
  SyntheticDataJobResponse,
  SyntheticDataListOptions,
  SyntheticDataPayload,
  SyntheticDataPipeline,
  SyntheticDataPreviewResult,
  SyntheticDataReadOptions,
  SyntheticDataRequestOptions,
  SyntheticDataRun,
  SyntheticDataScenario,
  SyntheticDataSlice,
  SyntheticDataTemplate,
  SyntheticPhysicsSimulation,
  SyntheticPrivacyProfile,
  SyntheticQualityAlert,
  SyntheticQualityReport,
  SyntheticSliceReview,
} from "../types/synthetic-data";

const BASE = "/api/v1/synthetic-data";
const LEGACY_BASE = "/api/v1/synthetic";

function query(options: SyntheticDataListOptions = {}): string {
  const values = new URLSearchParams();
  if (options.cursor) values.set("cursor", options.cursor);
  if (options.limit !== undefined) values.set("limit", String(options.limit));
  if (options.status) values.set("status", options.status);
  if (options.generationType)
    values.set("generationType", options.generationType);
  if (options.runId) values.set("runId", options.runId);
  if (options.experimentId) values.set("experimentId", options.experimentId);
  const encoded = values.toString();
  return encoded ? `?${encoded}` : "";
}

function id(value: string): string {
  return encodeURIComponent(value);
}

export interface CreateSyntheticDataJobInput {
  generationType: SyntheticDataGenerationType;
  scenario: SyntheticDataScenario;
  targetCount: number;
  campaignId?: string;
  autoCreateCampaign?: boolean;
  organizationId?: string;
  priority?: number;
  projectId?: string;
  experimentId?: string;
}

export interface PreviewSyntheticDataInput {
  generationType: SyntheticDataGenerationType;
  scenario: SyntheticDataScenario;
  count?: number;
}

/**
 * Client for the versioned Synthetic Data API (`/api/v1/synthetic-data/**`)
 * and the legacy `/api/v1/synthetic/*` compatibility surface.
 *
 * The job lifecycle is: `createJob` → poll `getJob` (or `downloadJobResult`
 * once COMPLETED) → `purgeJob` for tenant-scoped cleanup. Physics-backed
 * generation is submitted through the qualified remote sidecar — methods
 * return typed errors when the backend is unconfigured.
 */
export class SyntheticDataService {
  constructor(
    private readonly http: HttpClient,
    private readonly requestConfig: RequestConfig = {},
  ) {}

  private mutationConfig(
    options: SyntheticDataRequestOptions,
  ): RequestConfig {
    return {
      ...this.requestConfig,
      headers: {
        ...this.requestConfig.headers,
        "Idempotency-Key": options.idempotencyKey,
        ...(options.requestId ? { "X-Request-Id": options.requestId } : {}),
      },
    };
  }

  private getConfig(options?: SyntheticDataReadOptions): RequestConfig {
    return {
      ...this.requestConfig,
      headers: {
        ...this.requestConfig.headers,
        ...(options?.requestId ? { "X-Request-Id": options.requestId } : {}),
      },
    };
  }

  // ---------------------------------------------------------------------
  // Generation jobs
  // ---------------------------------------------------------------------

  /** POST /api/v1/synthetic-data/generate — create and enqueue a job. */
  createJob(
    payload: CreateSyntheticDataJobInput,
    options: SyntheticDataRequestOptions,
  ) {
    return this.http.post<SyntheticDataJobResponse>(
      `${BASE}/generate`,
      payload,
      this.mutationConfig(options),
    );
  }

  /** GET /api/v1/synthetic-data/generate — list generation jobs. */
  listJobs(options?: SyntheticDataListOptions) {
    return this.http.get<SyntheticDataJobListResponse>(
      `${BASE}/generate${query(options)}`,
      this.requestConfig,
    );
  }

  /** GET /api/v1/synthetic-data/jobs/{jobId} — job status and progress. */
  getJob(jobId: string, options?: SyntheticDataReadOptions) {
    return this.http.get<SyntheticDataJobResponse>(
      `${BASE}/jobs/${id(jobId)}`,
      this.getConfig(options),
    );
  }

  /** DELETE /api/v1/synthetic-data/jobs/{jobId} — cancel a pending/running job. */
  cancelJob(jobId: string, options: SyntheticDataRequestOptions) {
    return this.http.delete<SyntheticDataJobResponse>(
      `${BASE}/jobs/${id(jobId)}`,
      this.mutationConfig(options),
    );
  }

  /** GET /api/v1/synthetic-data/jobs/{jobId}/download — artifact bytes. */
  downloadJobResult(jobId: string, options?: SyntheticDataReadOptions) {
    return this.http.get<Blob | ArrayBuffer | unknown>(
      `${BASE}/jobs/${id(jobId)}/download`,
      this.getConfig(options),
    );
  }

  /** DELETE /api/v1/synthetic-data/jobs/{jobId}/purge — delete artifacts and row. */
  purgeJob(jobId: string, options: SyntheticDataRequestOptions) {
    return this.http.delete<{ success: boolean } | SyntheticDataJobResponse>(
      `${BASE}/jobs/${id(jobId)}/purge`,
      this.mutationConfig(options),
    );
  }

  /** POST /api/v1/synthetic-data/preview — non-persisted preview generation. */
  previewGeneration(
    payload: PreviewSyntheticDataInput,
    options: SyntheticDataRequestOptions,
  ) {
    return this.http.post<SyntheticDataPreviewResult>(
      `${BASE}/preview`,
      payload,
      this.mutationConfig(options),
    );
  }

  // ---------------------------------------------------------------------
  // Runs and slice review
  // ---------------------------------------------------------------------

  listRuns(options?: SyntheticDataListOptions) {
    return this.http.get<{ runs: SyntheticDataRun[] } | SyntheticDataRun[]>(
      `${BASE}/runs${query(options)}`,
      this.requestConfig,
    );
  }

  getRun(runId: string, options?: SyntheticDataReadOptions) {
    return this.http.get<{ run: SyntheticDataRun } | SyntheticDataRun>(
      `${BASE}/runs/${id(runId)}`,
      this.getConfig(options),
    );
  }

  deleteRun(runId: string, options: SyntheticDataRequestOptions) {
    return this.http.delete<{ success: boolean } | SyntheticDataPayload>(
      `${BASE}/runs/${id(runId)}`,
      this.mutationConfig(options),
    );
  }

  listRunSlices(runId: string, options?: SyntheticDataListOptions) {
    return this.http.get<{ slices: SyntheticDataSlice[] } | SyntheticDataSlice[]>(
      `${BASE}/runs/${id(runId)}/slices${query(options)}`,
      this.getConfig(options),
    );
  }

  listSliceReviews(options?: SyntheticDataListOptions) {
    return this.http.get<
      { reviews: SyntheticSliceReview[] } | SyntheticSliceReview[]
    >(`${BASE}/review${query(options)}`, this.requestConfig);
  }

  reviewSlice(
    sliceId: string,
    payload: SyntheticDataPayload,
    options: SyntheticDataRequestOptions,
  ) {
    return this.http.post<{ review: SyntheticSliceReview } | SyntheticSliceReview>(
      `${BASE}/review/${id(sliceId)}`,
      payload,
      this.mutationConfig(options),
    );
  }

  // ---------------------------------------------------------------------
  // Privacy profiles
  // ---------------------------------------------------------------------

  listPrivacyProfiles(options?: SyntheticDataListOptions) {
    return this.http.get<
      { profiles: SyntheticPrivacyProfile[] } | SyntheticPrivacyProfile[]
    >(`${BASE}/privacy-profiles${query(options)}`, this.requestConfig);
  }

  createPrivacyProfile(
    payload: SyntheticPrivacyProfile & { name: string },
    options: SyntheticDataRequestOptions,
  ) {
    return this.http.post<{ profile: SyntheticPrivacyProfile } | SyntheticPrivacyProfile>(
      `${BASE}/privacy-profiles`,
      payload,
      this.mutationConfig(options),
    );
  }

  deletePrivacyProfile(
    profileId: string,
    options: SyntheticDataRequestOptions,
  ) {
    return this.http.delete<{ success: boolean }>(
      `${BASE}/privacy-profiles?id=${id(profileId)}`,
      this.mutationConfig(options),
    );
  }

  // ---------------------------------------------------------------------
  // Quality
  // ---------------------------------------------------------------------

  validateQuality(
    payload: SyntheticDataPayload,
    options: SyntheticDataRequestOptions,
  ) {
    return this.http.post<SyntheticQualityReport>(
      `${BASE}/quality/validate`,
      payload,
      this.mutationConfig(options),
    );
  }

  getQualityMetrics(options?: SyntheticDataListOptions) {
    return this.http.get<SyntheticQualityReport | SyntheticDataPayload>(
      `${BASE}/quality/metrics${query(options)}`,
      this.requestConfig,
    );
  }

  getQualityMonitor(options?: SyntheticDataReadOptions) {
    return this.http.get<SyntheticDataPayload>(
      `${BASE}/quality/monitor`,
      this.getConfig(options),
    );
  }

  getQualityPrivacy(options?: SyntheticDataListOptions) {
    return this.http.get<SyntheticDataPayload>(
      `${BASE}/quality/privacy${query(options)}`,
      this.requestConfig,
    );
  }

  getQualityRealism(options?: SyntheticDataListOptions) {
    return this.http.get<SyntheticDataPayload>(
      `${BASE}/quality/realism${query(options)}`,
      this.requestConfig,
    );
  }

  getQualityStatistical(options?: SyntheticDataListOptions) {
    return this.http.get<SyntheticDataPayload>(
      `${BASE}/quality/statistical${query(options)}`,
      this.requestConfig,
    );
  }

  getQualityTrends(options?: SyntheticDataListOptions) {
    return this.http.get<SyntheticDataPayload>(
      `${BASE}/quality/trends${query(options)}`,
      this.requestConfig,
    );
  }

  listQualityAlerts(options?: SyntheticDataListOptions) {
    return this.http.get<
      { alerts: SyntheticQualityAlert[] } | SyntheticQualityAlert[]
    >(`${BASE}/quality/alerts${query(options)}`, this.requestConfig);
  }

  getQualityAlert(alertId: string, options?: SyntheticDataReadOptions) {
    return this.http.get<{ alert: SyntheticQualityAlert } | SyntheticQualityAlert>(
      `${BASE}/quality/alerts/${id(alertId)}`,
      this.getConfig(options),
    );
  }

  acknowledgeQualityAlert(
    alertId: string,
    options: SyntheticDataRequestOptions,
  ) {
    return this.http.post<{ alert: SyntheticQualityAlert } | SyntheticQualityAlert>(
      `${BASE}/quality/alerts/${id(alertId)}/acknowledge`,
      {},
      this.mutationConfig(options),
    );
  }

  // ---------------------------------------------------------------------
  // Templates and pipelines
  // ---------------------------------------------------------------------

  listTemplates(options?: SyntheticDataListOptions) {
    return this.http.get<
      { templates: SyntheticDataTemplate[] } | SyntheticDataTemplate[]
    >(`${BASE}/templates${query(options)}`, this.requestConfig);
  }

  createTemplate(
    payload: SyntheticDataTemplate & { name: string },
    options: SyntheticDataRequestOptions,
  ) {
    return this.http.post<{ template: SyntheticDataTemplate } | SyntheticDataTemplate>(
      `${BASE}/templates`,
      payload,
      this.mutationConfig(options),
    );
  }

  listPipelines(options?: SyntheticDataListOptions) {
    return this.http.get<
      { pipelines: SyntheticDataPipeline[] } | SyntheticDataPipeline[]
    >(`${BASE}/pipelines${query(options)}`, this.requestConfig);
  }

  createPipeline(
    payload: SyntheticDataPipeline & { name: string },
    options: SyntheticDataRequestOptions,
  ) {
    return this.http.post<{ pipeline: SyntheticDataPipeline } | SyntheticDataPipeline>(
      `${BASE}/pipelines`,
      payload,
      this.mutationConfig(options),
    );
  }

  // ---------------------------------------------------------------------
  // Exports
  // ---------------------------------------------------------------------

  listExports(options?: SyntheticDataListOptions) {
    return this.http.get<SyntheticDataPayload>(
      `${BASE}/exports${query(options)}`,
      this.requestConfig,
    );
  }

  createExport(
    payload: SyntheticDataPayload,
    options: SyntheticDataRequestOptions,
  ) {
    return this.http.post<SyntheticDataPayload>(
      `${BASE}/exports`,
      payload,
      this.mutationConfig(options),
    );
  }

  // ---------------------------------------------------------------------
  // Generative-model lanes
  // ---------------------------------------------------------------------

  generateWithGan(payload: SyntheticDataPayload, options: SyntheticDataRequestOptions) {
    return this.http.post<SyntheticDataPayload>(
      `${BASE}/generators/gan`,
      payload,
      this.mutationConfig(options),
    );
  }

  generateWithDiffusion(payload: SyntheticDataPayload, options: SyntheticDataRequestOptions) {
    return this.http.post<SyntheticDataPayload>(
      `${BASE}/generators/diffusion`,
      payload,
      this.mutationConfig(options),
    );
  }

  generateWithVae(payload: SyntheticDataPayload, options: SyntheticDataRequestOptions) {
    return this.http.post<SyntheticDataPayload>(
      `${BASE}/generators/vae`,
      payload,
      this.mutationConfig(options),
    );
  }

  generateWithHybrid(payload: SyntheticDataPayload, options: SyntheticDataRequestOptions) {
    return this.http.post<SyntheticDataPayload>(
      `${BASE}/generators/hybrid`,
      payload,
      this.mutationConfig(options),
    );
  }

  // ---------------------------------------------------------------------
  // Physics simulations (remote sidecar)
  // ---------------------------------------------------------------------

  listPhysicsSimulations(options?: SyntheticDataListOptions) {
    return this.http.get<
      | { simulations: SyntheticPhysicsSimulation[] }
      | SyntheticPhysicsSimulation[]
    >(`${BASE}/physics/simulations${query(options)}`, this.requestConfig);
  }

  getPhysicsSimulation(simulationId: string, options?: SyntheticDataReadOptions) {
    return this.http.get<
      { simulation: SyntheticPhysicsSimulation } | SyntheticPhysicsSimulation
    >(`${BASE}/physics/simulations/${id(simulationId)}`, this.getConfig(options));
  }

  executePhysicsSimulation(
    simulationId: string,
    payload: SyntheticDataPayload,
    options: SyntheticDataRequestOptions,
  ) {
    return this.http.post<SyntheticDataPayload>(
      `${BASE}/physics/simulations/${id(simulationId)}/execute`,
      payload,
      this.mutationConfig(options),
    );
  }

  exportPhysicsSimulation(simulationId: string, options?: SyntheticDataReadOptions) {
    return this.http.get<Blob | ArrayBuffer | unknown>(
      `${BASE}/physics/simulations/${id(simulationId)}/export`,
      this.getConfig(options),
    );
  }

  callPhysicsEngine(
    engine: "mujoco" | "pybullet" | "unity",
    payload: SyntheticDataPayload,
    options: SyntheticDataRequestOptions,
  ) {
    return this.http.post<SyntheticDataPayload>(
      `${BASE}/physics/${engine}`,
      payload,
      this.mutationConfig(options),
    );
  }

  getPhysicsEngineInfo(
    engine: "mujoco" | "pybullet" | "unity",
    options?: SyntheticDataReadOptions,
  ) {
    return this.http.get<SyntheticDataPayload>(
      `${BASE}/physics/${engine}`,
      this.getConfig(options),
    );
  }

  visualizePhysics(payload: SyntheticDataPayload, options: SyntheticDataRequestOptions) {
    return this.http.post<SyntheticDataPayload>(
      `${BASE}/physics/visualize`,
      payload,
      this.mutationConfig(options),
    );
  }

  // ---------------------------------------------------------------------
  // Enterprise and integration
  // ---------------------------------------------------------------------

  getCompliance(options?: SyntheticDataReadOptions) {
    return this.http.get<SyntheticDataPayload>(
      `${BASE}/enterprise/compliance`,
      this.getConfig(options),
    );
  }

  complianceAction(payload: SyntheticDataPayload, options: SyntheticDataRequestOptions) {
    return this.http.post<SyntheticDataPayload>(
      `${BASE}/enterprise/compliance`,
      payload,
      this.mutationConfig(options),
    );
  }

  listIntegrations(options?: SyntheticDataReadOptions) {
    return this.http.get<SyntheticDataPayload>(
      `${BASE}/enterprise/integrations`,
      this.getConfig(options),
    );
  }

  integrationAction(payload: SyntheticDataPayload, options: SyntheticDataRequestOptions) {
    return this.http.post<SyntheticDataPayload>(
      `${BASE}/enterprise/integrations`,
      payload,
      this.mutationConfig(options),
    );
  }

  getCache(options?: SyntheticDataReadOptions) {
    return this.http.get<SyntheticDataPayload>(
      `${BASE}/enterprise/cache`,
      this.getConfig(options),
    );
  }

  distribute(payload: SyntheticDataPayload, options: SyntheticDataRequestOptions) {
    return this.http.post<SyntheticDataPayload>(
      `${BASE}/enterprise/distribute`,
      payload,
      this.mutationConfig(options),
    );
  }

  getPerformance(options?: SyntheticDataReadOptions) {
    return this.http.get<SyntheticDataPayload>(
      `${BASE}/enterprise/performance`,
      this.getConfig(options),
    );
  }

  composeIntegration(payload: SyntheticDataPayload, options: SyntheticDataRequestOptions) {
    return this.http.post<SyntheticDataPayload>(
      `${BASE}/integration/compose`,
      payload,
      this.mutationConfig(options),
    );
  }

  integrationPipelines(options?: SyntheticDataListOptions) {
    return this.http.get<SyntheticDataPayload>(
      `${BASE}/integration/pipelines${query(options)}`,
      this.requestConfig,
    );
  }

  trainIntegration(payload: SyntheticDataPayload, options: SyntheticDataRequestOptions) {
    return this.http.post<SyntheticDataPayload>(
      `${BASE}/integration/train`,
      payload,
      this.mutationConfig(options),
    );
  }

  integrationVersions(options?: SyntheticDataReadOptions) {
    return this.http.get<SyntheticDataPayload>(
      `${BASE}/integration/version`,
      this.getConfig(options),
    );
  }

  // ---------------------------------------------------------------------
  // Legacy `/api/v1/synthetic/*` compatibility surface
  // ---------------------------------------------------------------------

  /** POST /api/v1/synthetic/generate — legacy generation request. */
  legacyGenerate(payload: SyntheticDataPayload, options: SyntheticDataRequestOptions) {
    return this.http.post<SyntheticDataPayload>(
      `${LEGACY_BASE}/generate`,
      payload,
      this.mutationConfig(options),
    );
  }

  listLegacyProfiles(options?: SyntheticDataListOptions) {
    return this.http.get<LegacySyntheticEnvelope<LegacySyntheticProfile[]>>(
      `${LEGACY_BASE}/profiles${query(options)}`,
      this.requestConfig,
    );
  }

  createLegacyProfile(
    payload: SyntheticDataPayload,
    options: SyntheticDataRequestOptions,
  ) {
    return this.http.post<LegacySyntheticEnvelope<LegacySyntheticProfile>>(
      `${LEGACY_BASE}/profiles`,
      payload,
      this.mutationConfig(options),
    );
  }

  listLegacyAudits(options?: SyntheticDataListOptions) {
    return this.http.get<LegacySyntheticEnvelope<LegacySyntheticAudit[]>>(
      `${LEGACY_BASE}/audits${query(options)}`,
      this.requestConfig,
    );
  }

  createLegacyAudit(
    payload: SyntheticDataPayload,
    options: SyntheticDataRequestOptions,
  ) {
    return this.http.post<LegacySyntheticEnvelope<LegacySyntheticAudit>>(
      `${LEGACY_BASE}/audits`,
      payload,
      this.mutationConfig(options),
    );
  }

  /**
   * GET /api/v1/synthetic/experiments/{id}/methodology — follows the
   * permanent redirect to the canonical Synthetic Research run methodology
   * endpoint automatically (HTTP clients follow 308).
   */
  getExperimentMethodology(experimentId: string, options?: SyntheticDataReadOptions) {
    return this.http.get<SyntheticDataPayload>(
      `${LEGACY_BASE}/experiments/${id(experimentId)}/methodology`,
      this.getConfig(options),
    );
  }
}
