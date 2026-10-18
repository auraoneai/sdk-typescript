import { randomUUID } from "node:crypto";
import type { HttpClient, RequestConfig } from "../types/api";

export type OptimizationJobStatus =
  | "pending"
  | "created"
  | "queued"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "stopped"
  | "cancelled";

/** `POST .../jobs/{id}/{action}` — the legal lifecycle verbs. */
export type OptimizationJobAction = "start" | "pause" | "resume" | "stop";

export interface OptimizationJob {
  id: string;
  orgId: string;
  workflowId?: string | null;
  runId?: string | null;
  jobType: string;
  status: string;
  payload?: Record<string, unknown>;
  result?: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface OptimizationJobListResponse {
  data: OptimizationJob[];
  jobs: OptimizationJob[];
  meta: { count: number; orgId: string };
}

export interface OptimizationSummary {
  data: {
    latestJob: OptimizationJob | null;
    byStatus: Record<string, number>;
  };
}

export interface CreateOptimizationJobRequest {
  orgId?: string;
  workflowId?: string;
  runId?: string;
  jobType?: string;
  payload?: Record<string, unknown>;
  name?: string;
  description?: string;
  strategy?: string;
  parameterSpace?: Record<string, unknown>;
  budget?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface UpdateOptimizationJobRequest {
  status?: "pending" | "running" | "completed" | "failed" | "cancelled";
  result?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  name?: string;
  strategy?: string;
  parameterSpace?: Record<string, unknown>;
  budget?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface OptimizationTrial {
  parameters: Record<string, number | string>;
  score: number | null;
  metrics?: Record<string, number>;
  ts?: string;
  [key: string]: unknown;
}

export interface OptimizationHistoryPage {
  history: OptimizationTrial[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

/** Flat `{ param: value }` map returned by `GET .../suggest`. */
export type OptimizationSuggestion = Record<string, number | string>;

export interface OptimizationSuggestionAck {
  ok: boolean;
  suggestion: OptimizationSuggestion;
  /** Sampler's next proposal after the suggestion was recorded. */
  proposal: OptimizationSuggestion | null;
}

export interface OptimizationTrialPoint {
  x: number;
  y: number;
  score: number | null;
  index: number;
  parameters: Record<string, number | string>;
  ts?: string;
}

export interface OptimizationVisualization {
  data: OptimizationTrialPoint[];
}

export interface OptimizationSurfaceResponse {
  surface: {
    parameterX: string;
    parameterY: string;
    resolution: number;
    /** `resolution x resolution` grid of interpolated objective values. */
    data: number[][];
    generatedAt: string;
  };
  contours: unknown[];
}

export interface OptimizationJobMetrics {
  jobId: string;
  status: string;
  startTime: string;
  endTime: string;
  duration: number;
  hyperparameters: Record<string, unknown>;
  performance: {
    bestScore: number | null;
    currentScore: number | null;
    iterations: number;
    convergence: unknown;
  };
  history: unknown[];
  resources: { cpuUsage: number; memoryUsage: number; gpuUsage: number };
  statistics: {
    totalTrials: number;
    successfulTrials: number;
    failedTrials: number;
    avgTrialDuration: number;
  };
}

export interface OptimizationDraftParameter {
  id: string;
  name?: string;
  type: "float" | "int" | "categorical";
  min?: number;
  max?: number;
  step?: number;
  values?: string[];
  logScale?: boolean;
  description?: string;
}

export interface OptimizationDraft {
  name?: string;
  description?: string;
  objectiveMetric?: string;
  metricGoal?: "maximize" | "minimize";
  strategy?: string;
  maxIterations?: number;
  parallelism?: number;
  warmStart?: boolean;
  autoTune?: boolean;
  params?: OptimizationDraftParameter[];
  [key: string]: unknown;
}

export interface OptimizationRequestOptions {
  /** Sent as `Idempotency-Key`; auto-generated when omitted on mutations. */
  idempotencyKey?: string;
}

function id(value: string): string {
  return encodeURIComponent(value);
}

/**
 * Client for the `/api/v1/optimization` routes — the job lifecycle plus
 * the readmission P0-02 trial-data routes (`history`, `suggest`,
 * `visualization`, `visualization/surface`, `metrics`) and per-user wizard
 * `drafts`.
 *
 * Every call is org-scoped server-side: the organization comes from the
 * credential, and a configured client `orgId` is asserted as `?orgId=`.
 */
export class OptimizationService {
  constructor(
    private readonly http: HttpClient,
    private readonly requestConfig: RequestConfig = {},
  ) {}

  private mutationConfig(options?: OptimizationRequestOptions): RequestConfig {
    return {
      ...this.requestConfig,
      headers: {
        ...this.requestConfig.headers,
        "Idempotency-Key": options?.idempotencyKey ?? randomUUID(),
      },
    };
  }

  /** GET /api/v1/optimization — latest job + per-status counts. */
  getSummary(): Promise<OptimizationSummary> {
    return this.http.get<OptimizationSummary>(
      "/api/v1/optimization",
      this.requestConfig,
    );
  }

  /** GET /api/v1/optimization/jobs — up to 100 most recent jobs. */
  listJobs(orgId?: string): Promise<OptimizationJobListResponse> {
    const query = orgId ? `orgId=${encodeURIComponent(orgId)}` : "";
    return this.http.get<OptimizationJobListResponse>(
      `/api/v1/optimization/jobs${query ? `?${query}` : ""}`,
      this.requestConfig,
    );
  }

  /** POST /api/v1/optimization/jobs — create a job (idempotent). */
  createJob(
    payload: CreateOptimizationJobRequest,
    options?: OptimizationRequestOptions,
  ): Promise<OptimizationJob> {
    return this.http.post<OptimizationJob>(
      "/api/v1/optimization/jobs",
      payload,
      this.mutationConfig(options),
    );
  }

  /** GET /api/v1/optimization/jobs/{jobId}. */
  getJob(jobId: string): Promise<OptimizationJob> {
    return this.http.get<OptimizationJob>(
      `/api/v1/optimization/jobs/${id(jobId)}`,
      this.requestConfig,
    );
  }

  /** PATCH /api/v1/optimization/jobs/{jobId} (idempotent). */
  updateJob(
    jobId: string,
    patch: UpdateOptimizationJobRequest,
    options?: OptimizationRequestOptions,
  ): Promise<OptimizationJob> {
    return this.http.patch<OptimizationJob>(
      `/api/v1/optimization/jobs/${id(jobId)}`,
      patch,
      this.mutationConfig(options),
    );
  }

  /**
   * DELETE /api/v1/optimization/jobs/{jobId} — only terminal-state jobs
   * (completed/failed/cancelled) can be deleted; active jobs answer 400.
   */
  deleteJob(jobId: string): Promise<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(
      `/api/v1/optimization/jobs/${id(jobId)}`,
      this.requestConfig,
    );
  }

  /**
   * POST /api/v1/optimization/jobs/{jobId}/{action} — `start`, `pause`,
   * `resume`, or `stop`. Illegal transitions reject with 409 and
   * `code: "ILLEGAL_TRANSITION"`.
   */
  runJobAction(
    jobId: string,
    action: OptimizationJobAction,
    options?: OptimizationRequestOptions,
  ): Promise<OptimizationJob> {
    return this.http.post<OptimizationJob>(
      `/api/v1/optimization/jobs/${id(jobId)}/${action}`,
      undefined,
      this.mutationConfig(options),
    );
  }

  startJob(jobId: string, options?: OptimizationRequestOptions) {
    return this.runJobAction(jobId, "start", options);
  }

  pauseJob(jobId: string, options?: OptimizationRequestOptions) {
    return this.runJobAction(jobId, "pause", options);
  }

  resumeJob(jobId: string, options?: OptimizationRequestOptions) {
    return this.runJobAction(jobId, "resume", options);
  }

  stopJob(jobId: string, options?: OptimizationRequestOptions) {
    return this.runJobAction(jobId, "stop", options);
  }

  /** GET /api/v1/optimization/jobs/{jobId}/history — paginated trials. */
  getJobHistory(
    jobId: string,
    options: { page?: number; pageSize?: number } = {},
  ): Promise<OptimizationHistoryPage> {
    const params = new URLSearchParams();
    if (options.page !== undefined) params.set("page", String(options.page));
    if (options.pageSize !== undefined) {
      params.set("pageSize", String(options.pageSize));
    }
    const suffix = params.toString();
    return this.http.get<OptimizationHistoryPage>(
      `/api/v1/optimization/jobs/${id(jobId)}/history${suffix ? `?${suffix}` : ""}`,
      this.requestConfig,
    );
  }

  /**
   * GET /api/v1/optimization/jobs/{jobId}/suggest — the job's sampler,
   * seeded with recorded trials, proposes the next flat parameter set.
   * 409 when the job has no usable parameter space.
   */
  getJobSuggestion(jobId: string): Promise<OptimizationSuggestion> {
    return this.http.get<OptimizationSuggestion>(
      `/api/v1/optimization/jobs/${id(jobId)}/suggest`,
      this.requestConfig,
    );
  }

  /**
   * POST /api/v1/optimization/jobs/{jobId}/suggest — record an
   * operator-proposed parameter set; validated against the job's parameter
   * space and merged into the running engine's next batch.
   */
  submitJobSuggestion(
    jobId: string,
    suggestion: OptimizationSuggestion,
  ): Promise<OptimizationSuggestionAck> {
    return this.http.post<OptimizationSuggestionAck>(
      `/api/v1/optimization/jobs/${id(jobId)}/suggest`,
      suggestion,
      this.requestConfig,
    );
  }

  /**
   * GET /api/v1/optimization/jobs/{jobId}/visualization — recorded trial
   * points (`{x, y, score, index, parameters, ts}`) for landscape plots.
   */
  getJobVisualization(jobId: string): Promise<OptimizationVisualization> {
    return this.http.get<OptimizationVisualization>(
      `/api/v1/optimization/jobs/${id(jobId)}/visualization`,
      this.requestConfig,
    );
  }

  /**
   * GET /api/v1/optimization/jobs/{jobId}/visualization/surface?x=&y= —
   * IDW-interpolated objective surface over two numeric parameters plus
   * contour lines. 400 for non-numeric params, 409 with <3 usable trials.
   */
  getJobSurface(
    jobId: string,
    options: { x: string; y: string; resolution?: number },
  ): Promise<OptimizationSurfaceResponse> {
    const params = new URLSearchParams({ x: options.x, y: options.y });
    if (options.resolution !== undefined) {
      params.set("resolution", String(options.resolution));
    }
    return this.http.get<OptimizationSurfaceResponse>(
      `/api/v1/optimization/jobs/${id(jobId)}/visualization/surface?${params.toString()}`,
      this.requestConfig,
    );
  }

  /** GET /api/v1/optimization/jobs/{jobId}/metrics. */
  getJobMetrics(jobId: string): Promise<{ data: OptimizationJobMetrics }> {
    return this.http.get<{ data: OptimizationJobMetrics }>(
      `/api/v1/optimization/jobs/${id(jobId)}/metrics`,
      this.requestConfig,
    );
  }

  /** GET /api/v1/optimization/drafts — the caller's wizard draft. */
  getDraft(orgId?: string): Promise<OptimizationDraft> {
    const query = orgId ? `orgId=${encodeURIComponent(orgId)}` : "";
    return this.http.get<OptimizationDraft>(
      `/api/v1/optimization/drafts${query ? `?${query}` : ""}`,
      this.requestConfig,
    );
  }

  /** POST /api/v1/optimization/drafts — persist the caller's wizard draft. */
  saveDraft(draft: OptimizationDraft): Promise<OptimizationDraft> {
    return this.http.post<OptimizationDraft>(
      "/api/v1/optimization/drafts",
      draft,
      this.requestConfig,
    );
  }
}
