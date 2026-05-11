/**
 * RoboticsService
 *
 * TypeScript SDK client for robotics endpoints:
 * datasets, simulation runs, teleoperation, exports, quality, and safety.
 */

export interface RoboticsServiceConfig {
  baseUrl: string;
  apiKey: string;
  organizationId?: string;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
}

export interface RoboticsRequestOptions {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  signal?: AbortSignal;
}

export type RoboticsDataMode = "TELEOPERATION" | "HUMAN_DEMO" | "VLA";

export interface RoboticsDataset {
  id: string;
  name: string;
  description?: string;
  dataMode: RoboticsDataMode;
  robotPlatform: string;
  taskCategory: string;
  trajectoryCount: number;
  totalDurationSec?: number;
  qualityScore: number | null;
  createdAt?: string;
}

export interface ListDatasetsOptions extends RoboticsRequestOptions {
  labId?: string;
  dataMode?: RoboticsDataMode;
  page?: number;
  limit?: number;
}

export interface RoboticsDatasetListResponse {
  datasets: RoboticsDataset[];
  stats: Record<RoboticsDataMode, number>;
  total: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface SimulationRun {
  id: string;
  engine: "PYBULLET" | "MUJOCO" | "ISAAC_SIM";
  sceneName: string;
  taskDescription: string;
  datasetName?: string;
  trajectoryCount: number;
  successRate?: number;
  status: string;
  startTime: string;
  endTime: string | null;
  realWorldTested?: boolean;
  realWorldSuccessRate?: number | null;
}

export interface TeleoperationSession {
  id: string;
  status: string;
  controlMode: "VR_CONTROLLER" | "KEYBOARD" | "JOYSTICK";
  datasetName: string;
  startTime: string;
  endTime: string | null;
  latencyMs?: number | null;
  estopCount?: number;
  collisionCount?: number;
}

export interface TelemetryEvent {
  latencyMs?: number;
  videoStreamFps?: number;
  collision?: boolean;
  estop?: boolean;
  metadata?: Record<string, unknown>;
}

export type RoboticsExportFormat = "RLDS" | "OPENX" | "HDF5" | "BVH" | "JSON";
export const ROBOTICS_PUBLIC_EXPORT_FORMATS: RoboticsExportFormat[] = [
  "RLDS",
  "OPENX",
  "HDF5",
  "BVH",
  "JSON",
];
export const ROBOTICS_INTERNAL_SERIALIZER_FORMATS = [
  "MCAP",
  "ROSBAG",
  "PARQUET",
] as const;

export interface AsyncExportResult {
  contractVersion: string;
  mode: "async";
  status: "queued";
  jobId: string | number;
  datasetId: string;
  format: RoboticsExportFormat;
  createdAt: string;
  statusUrl: string;
  checksumAlgorithm: "sha256";
  message: string;
}

export interface SyncExportResult {
  contractVersion: string;
  mode: "sync";
  status: "completed";
  datasetId: string;
  format: RoboticsExportFormat;
  filename: string;
  contentType: string;
  trajectoryCount: number;
  sizeBytes: number;
  checksum: string;
  checksumAlgorithm: "sha256";
  nativeFormat: boolean;
  manifest: Record<string, unknown>;
  artifacts: Array<Record<string, unknown>>;
  download: {
    url: string;
    expiresAt: string;
    tokenType: "hmac-sha256";
  };
  downloadUrl: string;
}

export type CreateExportResult = AsyncExportResult | SyncExportResult;

export interface ExportStatusResponse {
  jobId: string | number;
  status: "queued" | "processing" | "completed" | "failed" | string;
  progress: number;
  datasetId?: string;
  format?: RoboticsExportFormat | string;
  createdAt?: string | null;
  completedAt?: string | null;
  downloadUrl?: string | null;
  fileSizeBytes?: number | null;
  nativeFormat?: boolean;
  artifactChecksum?: string | null;
  artifactContentType?: string | null;
  error?: string;
}

export interface ExportDownloadResult {
  data: ArrayBuffer;
  contentType: string | null;
  contentDisposition: string | null;
  checksum: string | null;
  contractVersion: string | null;
}

export interface QualityMetrics {
  kpis: {
    avgQualityScore: number | null;
    smoothnessScore: number | null;
    collisionRate: number | null;
    taskSuccessRate: number | null;
    qualityGatePassRate: number | null;
  };
  perDataset: Array<{
    id: string;
    name: string;
    trajectoryCount: number;
    avgQuality: number | null;
    avgSmoothness: number | null;
    taskSuccessRate: number | null;
    collisionRate: number | null;
    qualityGate: {
      pass: number;
      warn: number;
      fail: number;
    };
  }>;
  totalTrajectories: number;
  drift: Array<Record<string, unknown>> | null;
}

export interface SafetySnapshot {
  certifications: Array<{
    id: string;
    workerId: string;
    level: string;
    certifiedAt: string;
    expiresAt: string;
    examScore: number;
    practicalScore: number;
    platforms: string[];
    status: "ACTIVE" | "EXPIRING_SOON" | "EXPIRED";
  }>;
  stats: {
    certifiedWorkers: number;
    expiredCertifications: number;
    expiringSoon: number;
    safetyIncidents: number;
    avgEstopLatencyMs: number | null;
    estopEvents: number;
  };
  compliance: {
    summary: Record<string, unknown>;
    controlsByStandard: Record<string, unknown>;
  };
}

export interface RoboticsSettingsResponse {
  configured: boolean;
  settings: Record<string, unknown>;
  providerReadiness?: {
    status: "ready" | "degraded" | "blocked" | string;
    runtime: string;
    blockers: string[];
    checks: Array<Record<string, unknown>>;
  };
  updatedAt: string | null;
}

interface RequestInput {
  method: string;
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  options?: RoboticsRequestOptions;
}

export class RoboticsService {
  private baseUrl: string;
  private headers: Record<string, string>;
  private organizationId?: string;
  private defaultTimeoutMs: number;
  private defaultRetries: number;
  private defaultRetryDelayMs: number;

  constructor(config: RoboticsServiceConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.organizationId = config.organizationId;
    this.headers = {
      "Content-Type": "application/json",
      ...(config.apiKey ? { "X-API-Key": config.apiKey } : {}),
      ...(config.organizationId
        ? { "X-Organization-Id": config.organizationId }
        : {}),
    };
    this.defaultTimeoutMs = config.timeoutMs ?? 30_000;
    this.defaultRetries = config.retries ?? 3;
    this.defaultRetryDelayMs = config.retryDelayMs ?? 500;
  }

  private requireOrganizationId(orgId?: string): string {
    const resolvedOrgId = orgId ?? this.organizationId;
    if (!resolvedOrgId) {
      throw new Error(
        "organizationId is required for robotics workforce operations",
      );
    }

    return resolvedOrgId;
  }

  private buildUrl(
    path: string,
    query?: Record<string, string | number | boolean | undefined>,
  ): string {
    const params = new URLSearchParams();
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          params.set(key, String(value));
        }
      }
    }

    const qs = params.toString();
    return `${this.baseUrl}${path}${qs ? `?${qs}` : ""}`;
  }

  private isRetryableStatus(status: number): boolean {
    return status === 408 || status === 429 || status >= 500;
  }

  private retryDelay(attempt: number, configuredDelayMs: number): number {
    return Math.min(configuredDelayMs * 2 ** attempt, 30_000);
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private buildAbortSignal(
    options?: RoboticsRequestOptions,
  ): AbortSignal | undefined {
    const timeoutMs = options?.timeoutMs ?? this.defaultTimeoutMs;
    const externalSignal = options?.signal;

    if (typeof AbortController === "undefined") {
      return externalSignal;
    }

    if (!externalSignal && timeoutMs <= 0) {
      return undefined;
    }

    const controller = new AbortController();

    if (externalSignal) {
      if (externalSignal.aborted) {
        controller.abort();
      } else {
        externalSignal.addEventListener("abort", () => controller.abort(), {
          once: true,
        });
      }
    }

    if (timeoutMs > 0) {
      setTimeout(() => controller.abort(), timeoutMs);
    }

    return controller.signal;
  }

  private async requestResponse({
    method,
    path,
    query,
    body,
    options,
  }: RequestInput): Promise<Response> {
    const retries = options?.retries ?? this.defaultRetries;
    const retryDelayMs = options?.retryDelayMs ?? this.defaultRetryDelayMs;
    const url = this.buildUrl(path, query);

    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const response = await fetch(url, {
          method,
          headers: this.headers,
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: this.buildAbortSignal(options),
        });

        if (!response.ok) {
          if (attempt < retries && this.isRetryableStatus(response.status)) {
            const retryAfter = Number(response.headers.get("retry-after"));
            const delayMs =
              Number.isFinite(retryAfter) && retryAfter > 0
                ? retryAfter * 1000
                : this.retryDelay(attempt, retryDelayMs);
            await this.sleep(delayMs);
            continue;
          }

          const errorBody = await response.text().catch(() => "Unknown error");
          throw new Error(
            `Robotics API error (${response.status}): ${errorBody}`,
          );
        }

        return response;
      } catch (error) {
        lastError = error;

        const isAbort =
          error instanceof Error &&
          (error.name === "AbortError" || error.name === "TimeoutError");

        if (attempt >= retries || isAbort) {
          break;
        }

        await this.sleep(this.retryDelay(attempt, retryDelayMs));
      }
    }

    if (lastError instanceof Error) {
      throw lastError;
    }

    throw new Error("Robotics request failed");
  }

  private async request<T>(input: RequestInput): Promise<T> {
    const response = await this.requestResponse(input);
    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      return response.json() as Promise<T>;
    }

    const text = await response.text();
    return text as unknown as T;
  }

  // -- Datasets --

  async getStats(options?: RoboticsRequestOptions): Promise<Record<string, unknown>> {
    return this.request({
      method: "GET",
      path: "/api/v1/labs/robotics/stats",
      options,
    });
  }

  async listDatasets(
    options: ListDatasetsOptions = {},
  ): Promise<RoboticsDatasetListResponse> {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 20));

    const response = await this.request<{
      datasets: RoboticsDataset[];
      stats?: Partial<Record<RoboticsDataMode, number>>;
      total: number;
    }>({
      method: "GET",
      path: "/api/v1/robotics/datasets",
      query: {
        labId: options.labId,
        dataMode: options.dataMode,
        page,
        limit,
      },
      options,
    });

    const total = response.total ?? response.datasets.length;

    return {
      datasets: response.datasets,
      stats: {
        TELEOPERATION: response.stats?.TELEOPERATION ?? 0,
        HUMAN_DEMO: response.stats?.HUMAN_DEMO ?? 0,
        VLA: response.stats?.VLA ?? 0,
      },
      total,
      pagination: {
        page,
        limit,
        total,
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async *iterateDatasets(
    options: Omit<ListDatasetsOptions, "page"> = {},
  ): AsyncGenerator<RoboticsDataset, void, undefined> {
    let page = 1;

    while (true) {
      const result = await this.listDatasets({ ...options, page });

      for (const dataset of result.datasets) {
        yield dataset;
      }

      if (!result.pagination.hasNext) {
        return;
      }

      page += 1;
    }
  }

  async listAllDatasets(
    options: Omit<ListDatasetsOptions, "page"> = {},
  ): Promise<RoboticsDataset[]> {
    const datasets: RoboticsDataset[] = [];

    for await (const dataset of this.iterateDatasets(options)) {
      datasets.push(dataset);
    }

    return datasets;
  }

  async createDataset(
    data: {
      name: string;
      description?: string;
      dataMode: RoboticsDataMode;
      robotPlatform: string;
      taskCategory: string;
      labId?: string;
    },
    options?: RoboticsRequestOptions,
  ): Promise<RoboticsDataset> {
    return this.request({
      method: "POST",
      path: "/api/v1/robotics/datasets",
      body: data,
      options,
    });
  }

  async ingestData(
    datasetId: string,
    data:
      | {
          mode: "HUMAN_DEMO";
          startTime: string;
          endTime: string;
          taskDescription: string;
          taskSuccess: boolean;
          idempotencyKey?: string;
          workerId?: string;
          collisionCount?: number;
          videoUrl?: string;
          sensorDataUrl?: string;
          commandDataUrl?: string;
          metadataJson?: Record<string, unknown>;
        }
      | {
          mode: "VLA";
          startTime: string;
          endTime: string;
          instruction: string;
          actions: Array<{ t: number; action: Record<string, unknown> }>;
          taskSuccess: boolean;
          idempotencyKey?: string;
          workerId?: string;
          collisionCount?: number;
          videoUrl?: string;
          metadataJson?: Record<string, unknown>;
        },
    options?: RoboticsRequestOptions,
  ): Promise<{
    trajectoryId: string;
    datasetId: string;
    durationSec: number;
    mode: RoboticsDataMode;
    status: "ingested" | "already_exists";
  }> {
    return this.request({
      method: "POST",
      path: `/api/v1/robotics/datasets/${datasetId}/ingest`,
      body: data,
      options,
    });
  }

  // -- Simulators --

  async listSimulators(options?: RoboticsRequestOptions): Promise<{
    simulators: Array<{
      id: string;
      engine: string;
      name: string;
      description: string;
      features: string[];
      runCount: number;
      avgSuccessRate: number | null;
    }>;
    recentRuns: SimulationRun[];
  }> {
    return this.request({
      method: "GET",
      path: "/api/v1/robotics/simulators",
      options,
    });
  }

  async createSimulation(
    data: {
      engine: "PYBULLET" | "MUJOCO" | "ISAAC_SIM";
      sceneName: string;
      taskDescription: string;
      trajectoryCount: number;
      datasetId: string;
      seed?: number;
      maxSteps?: number;
      config?: Record<string, unknown>;
    },
    options?: RoboticsRequestOptions,
  ): Promise<{ data: SimulationRun; message: string }> {
    return this.request({
      method: "POST",
      path: "/api/v1/robotics/simulators",
      body: data,
      options,
    });
  }

  // -- Teleoperation --

  async listSessions(options?: RoboticsRequestOptions): Promise<{
    sessions: TeleoperationSession[];
    stats: {
      activeSessions: number;
      avgLatencyMs: number | null;
      totalTrajectories: number;
      estopEvents: number;
    };
  }> {
    return this.request({
      method: "GET",
      path: "/api/v1/robotics/teleoperation",
      options,
    });
  }

  async createSession(
    data: {
      datasetName: string;
      controlMode: "VR_CONTROLLER" | "KEYBOARD" | "JOYSTICK";
      workerId?: string;
    },
    options?: RoboticsRequestOptions,
  ): Promise<TeleoperationSession> {
    return this.request({
      method: "POST",
      path: "/api/v1/robotics/teleoperation",
      body: data,
      options,
    });
  }

  async sendTelemetry(
    sessionId: string,
    events: TelemetryEvent | { events: TelemetryEvent[] },
    options?: RoboticsRequestOptions,
  ): Promise<{
    accepted: number;
    sessionId: string;
    estopEvents: number;
    collisionEvents: number;
    timestamp: string;
  }> {
    return this.request({
      method: "POST",
      path: `/api/v1/robotics/teleoperation/${sessionId}/events`,
      body: events,
      options,
    });
  }

  async finalizeSession(
    sessionId: string,
    data: {
      taskDescription: string;
      taskSuccess: boolean;
      status?: "COMPLETED" | "ABORTED" | "ERROR";
      videoUrl?: string;
      sensorDataUrl?: string;
      commandDataUrl?: string;
      metadataJson?: Record<string, unknown>;
    },
    options?: RoboticsRequestOptions,
  ): Promise<{
    trajectoryId: string;
    sessionId: string;
    status: string;
    message: string;
  }> {
    return this.request({
      method: "POST",
      path: `/api/v1/robotics/teleoperation/${sessionId}/finalize`,
      body: data,
      options,
    });
  }

  // -- Exports --

  async createExport(
    data: {
      datasetId: string;
      format: RoboticsExportFormat;
      maxTrajectories?: number;
    },
    options?: RoboticsRequestOptions,
  ): Promise<CreateExportResult> {
    return this.request({
      method: "POST",
      path: "/api/v1/robotics/exports",
      body: data,
      options,
    });
  }

  async getSettings(
    options?: RoboticsRequestOptions,
  ): Promise<RoboticsSettingsResponse> {
    return this.request({
      method: "GET",
      path: "/api/v1/robotics/settings",
      options,
    });
  }

  async getExportStatus(
    jobId: string | number,
    options?: RoboticsRequestOptions,
  ): Promise<ExportStatusResponse> {
    return this.request({
      method: "GET",
      path: "/api/v1/robotics/exports/status",
      query: { jobId },
      options,
    });
  }

  async downloadExport(
    data: {
      datasetId?: string;
      format?: RoboticsExportFormat;
      downloadToken?: string;
    },
    options?: RoboticsRequestOptions,
  ): Promise<ExportDownloadResult> {
    const response = await this.requestResponse({
      method: "GET",
      path: "/api/v1/robotics/exports",
      query: {
        datasetId: data.datasetId,
        format: data.format,
        downloadToken: data.downloadToken,
      },
      options,
    });

    return {
      data: await response.arrayBuffer(),
      contentType: response.headers.get("content-type"),
      contentDisposition: response.headers.get("content-disposition"),
      checksum: response.headers.get("x-checksum-sha256"),
      contractVersion: response.headers.get("x-export-contract-version"),
    };
  }

  // -- Quality --

  async getQualityMetrics(
    options?: {
      datasetId?: string;
      drift?: boolean;
      driftWindow?: number;
      baselineWindow?: number;
    } & RoboticsRequestOptions,
  ): Promise<QualityMetrics> {
    return this.request({
      method: "GET",
      path: "/api/v1/robotics/quality",
      query: {
        datasetId: options?.datasetId,
        drift: options?.drift,
        driftWindow: options?.driftWindow,
        baselineWindow: options?.baselineWindow,
      },
      options,
    });
  }

  // -- Safety --

  async getSafetyMetrics(
    options?: RoboticsRequestOptions,
  ): Promise<SafetySnapshot> {
    return this.request({
      method: "GET",
      path: "/api/v1/robotics/safety",
      options,
    });
  }

  async issueCertification(
    data: {
      workerId: string;
      certificationLevel:
        | "ROBOTICS_BASIC"
        | "ROBOTICS_ADVANCED"
        | "ROBOTICS_EXPERT";
      robotPlatforms: string[];
      examScore: number;
      practicalScore: number;
      expiresAt: string;
    },
    options?: RoboticsRequestOptions,
  ): Promise<{
    id: string;
    workerId: string;
    level: string;
    certifiedAt: string;
    expiresAt: string;
    examScore: number;
    practicalScore: number;
    platforms: string[];
    compliance: {
      summary: Record<string, unknown>;
      controlsByStandard: Record<string, unknown>;
    };
  }> {
    return this.request({
      method: "POST",
      path: "/api/v1/robotics/safety",
      body: data,
      options,
    });
  }

  // -- Workforce Orchestration --

  async listWorkforce(
    options?: RoboticsRequestOptions & { orgId?: string },
  ): Promise<{
    operators: Array<{
      id: string;
      name: string;
      certified: boolean;
      certificationLevel: string | null;
    }>;
    throughput: {
      trajectoriesLastHour: number;
      trajectoriesPerMinute: number;
      certifiedWorkers: number;
      taskSuccessRate: number;
    };
  }> {
    const orgId = this.requireOrganizationId(options?.orgId);
    return this.request({
      method: "GET",
      path: "/api/v1/robotics/workforce",
      query: {
        orgId,
      },
      options,
    });
  }

  async assignOperator(
    data: {
      orgId?: string;
      operatorId: string;
      taskType: "teleoperation" | "quality_review" | "simulation_monitoring";
      priority?: "critical" | "high" | "normal" | "low";
      datasetId?: string;
    },
    options?: RoboticsRequestOptions,
  ): Promise<{
    assignment: {
      operatorId: string;
      taskType: string;
      status: string;
      assignedAt: string;
    };
  }> {
    const { orgId: orgIdInput, ...assignmentPayload } = data;
    const orgId = this.requireOrganizationId(orgIdInput);
    return this.request({
      method: "POST",
      path: "/api/v1/robotics/workforce",
      body: {
        action: "assign",
        orgId,
        ...assignmentPayload,
      },
      options,
    });
  }

  async batchAssign(
    tasks: Array<{
      taskType: "teleoperation" | "quality_review" | "simulation_monitoring";
      priority: "critical" | "high" | "normal" | "low";
      slaMinutes: number;
    }>,
    options?: RoboticsRequestOptions & { orgId?: string },
  ): Promise<{
    totalTasks: number;
    status: string;
    estimatedCompletionMin: number;
  }> {
    const orgId = this.requireOrganizationId(options?.orgId);
    return this.request({
      method: "POST",
      path: "/api/v1/robotics/workforce",
      body: {
        action: "batch_assign",
        orgId,
        tasks,
      },
      options,
    });
  }

  // -- Throughput SLOs --

  async getThroughputSLOs(
    options?: {
      tier?: "starter" | "professional" | "enterprise";
    } & RoboticsRequestOptions,
  ): Promise<{
    evaluations: Array<{
      definition: { id: string; description: string; target: number };
      status: "healthy" | "at_risk" | "violated";
      errorBudget: {
        remaining: number;
        remainingPct: number;
        exhausted: boolean;
      };
    }>;
    summary: {
      totalSLOs: number;
      healthy: number;
      atRisk: number;
      violated: number;
      overallStatus: string;
    };
  }> {
    return this.request({
      method: "GET",
      path: "/api/v1/robotics/throughput",
      query: {
        tier: options?.tier,
      },
      options,
    });
  }

  async recordSLOMeasurement(
    data: {
      sloId: string;
      measurements: Array<{ indicator: string; value: number }>;
    },
    options?: RoboticsRequestOptions,
  ): Promise<{
    sloId: string;
    recorded: number;
    evaluation: {
      status: "healthy" | "at_risk" | "violated";
    };
  }> {
    return this.request({
      method: "POST",
      path: "/api/v1/robotics/throughput",
      body: data,
      options,
    });
  }
}
