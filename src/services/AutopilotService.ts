import { randomUUID } from "node:crypto";
import type { HttpClient, RequestConfig } from "../types/api";

export interface AutopilotWorkflowSummary {
  id: string;
  description?: string;
  status: string;
  parsedDomain?: string | null;
  userAccepted?: boolean;
  userModified?: boolean;
  deployedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AutopilotRunSummary {
  id: string;
  workflowId: string;
  status: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  createdAt?: string;
}

/** `GET /api/v1/autopilot` — workflows + recent runs for the org. */
export interface AutopilotOverview {
  source: "database";
  status: "empty" | "ready";
  workflows: AutopilotWorkflowSummary[];
  runs: AutopilotRunSummary[];
  disabledActions: Array<{ action: string; reason: string }>;
}

export interface GenerateAutopilotWorkflowRequest {
  /** 10-8000 chars describing the evaluation workflow to draft. */
  description: string;
  /** Optional deterministic seed (3-64 chars). */
  seed?: string;
}

/** `POST /api/v1/autopilot/generate` (201). */
export interface AutopilotGenerateResult {
  workflowId: string;
  parsed?: Record<string, unknown>;
  draft?: Record<string, unknown>;
  qualityGates?: unknown[];
  draftSource?: "llm" | "deterministic";
  llm?: {
    provider?: string;
    model?: string;
    responseHash?: string;
  } | null;
  plan: Record<string, unknown>;
  planHash: string;
  elapsedMs: number;
  [key: string]: unknown;
}

export interface ApproveAutopilotWorkflowRequest {
  /** 10-4000 chars — recorded as the approval rationale. */
  rationale: string;
  /** Optional replacement plan validated before freezing. */
  editedPlan?: Record<string, unknown>;
}

export interface DeployAutopilotWorkflowRequest {
  modifications?: {
    templateId?: string;
    datasetId?: string;
    rubric?: Record<string, unknown>;
    qualityGates?: string[];
  };
}

export interface ExecuteAutopilotWorkflowRequest {
  seed?: string;
  /** When true the run executes inline; default queues a durable run. */
  sync?: boolean;
}

export interface ReviseAutopilotWorkflowRequest {
  /** Replacement plan object — validated before it is stored. */
  plan: Record<string, unknown>;
  rationale?: string;
}

export interface AutopilotRunStep {
  stepKey: string;
  stepKind: string;
  stepOrder: number;
  status: string;
  startedAt?: string | null;
  endedAt?: string | null;
  failureReason?: string | null;
  gates: Array<{
    gateType: string;
    passed: boolean;
    threshold?: number;
    observed?: number;
  }>;
}

/**
 * `GET /api/v1/autopilot/runs/{runId}` — a missing or cross-org id returns a
 * 200 envelope with `status: "empty"` rather than a 404.
 */
export interface AutopilotRunDetail {
  id: string;
  status?: string;
  seed?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  triggeredById?: string | null;
  incidentId?: string | null;
  failureReason?: string | null;
  metrics?: Record<string, unknown> | null;
  workflow?: Record<string, unknown> | null;
  version?: { id: string; versionNumber: number; planHash: string } | null;
  steps: AutopilotRunStep[];
  source?: string;
  disabledActions?: Array<{ action: string; reason: string }>;
}

export type AutopilotRunAction = "cancel" | "resume";

/** `POST /api/v1/autopilot/runs/{runId}` — `{id, status}` (202 on resume). */
export interface AutopilotRunActionResult {
  id: string;
  status: string;
}

/** Full prompt → plan → edits → approval → per-step events trail. */
export interface AutopilotRunAuditTrail {
  [key: string]: unknown;
}

export interface AutopilotRunEvent {
  sequence: number;
  eventType: string;
  stepKey?: string | null;
  actorId?: string | null;
  createdAt: string;
  payload?: Record<string, unknown>;
}

export interface AutopilotRunEventsPage {
  runId: string;
  runStatus: string;
  events: AutopilotRunEvent[];
  /** Last returned sequence — pass back as `after` for the next poll. */
  cursor: number;
}

export interface AutopilotMetrics {
  orgId: string;
  windowDays: number;
  generated: number;
  accepted: number;
  modified: number;
  deployed: number;
  rates: {
    acceptanceRatePct: number;
    modificationRatePct: number;
    deploymentRatePct: number;
  };
  timeToDeployMs: { p50: number; p95: number; samples: number };
  topDomains: Array<{ domain: string; count: number }>;
  generatedAt: string;
}

export interface AutopilotRequestOptions {
  /**
   * Sent as `Idempotency-Key`. The approve/deploy/execute/revise routes
   * reject calls without one; the SDK auto-generates a UUID when omitted.
   */
  idempotencyKey?: string;
}

function id(value: string): string {
  return encodeURIComponent(value);
}

/**
 * Client for the `/api/v1/autopilot` routes — natural-language drafting,
 * explicit approval gates, one-click deploy, and durable run inspection
 * (secondary-dashboards readmission P0-06..P0-08).
 */
export class AutopilotService {
  constructor(
    private readonly http: HttpClient,
    private readonly requestConfig: RequestConfig = {},
  ) {}

  private mutationConfig(options?: AutopilotRequestOptions): RequestConfig {
    return {
      ...this.requestConfig,
      headers: {
        ...this.requestConfig.headers,
        "Idempotency-Key": options?.idempotencyKey ?? randomUUID(),
      },
    };
  }

  /** GET /api/v1/autopilot — workflows + recent runs for the org. */
  list(orgId?: string): Promise<AutopilotOverview> {
    const query = orgId ? `orgId=${encodeURIComponent(orgId)}` : "";
    return this.http.get<AutopilotOverview>(
      `/api/v1/autopilot${query ? `?${query}` : ""}`,
      this.requestConfig,
    );
  }

  /**
   * POST /api/v1/autopilot/generate — draft a workflow plan from natural
   * language and freeze the canonical plan on the new workflow row.
   * LLM provider failures surface as 402/429/502 with `code`/`retryable`.
   */
  generate(
    request: GenerateAutopilotWorkflowRequest,
    options?: AutopilotRequestOptions,
  ): Promise<AutopilotGenerateResult> {
    return this.http.post<AutopilotGenerateResult>(
      "/api/v1/autopilot/generate",
      request,
      this.mutationConfig(options),
    );
  }

  /** GET /api/v1/autopilot/metrics?days= — adoption metrics (1-365d). */
  getMetrics(
    options: { orgId?: string; days?: number } = {},
  ): Promise<AutopilotMetrics> {
    const params = new URLSearchParams();
    if (options.orgId) params.set("orgId", options.orgId);
    if (options.days !== undefined) params.set("days", String(options.days));
    const suffix = params.toString();
    return this.http.get<AutopilotMetrics>(
      `/api/v1/autopilot/metrics${suffix ? `?${suffix}` : ""}`,
      this.requestConfig,
    );
  }

  /**
   * POST /api/v1/autopilot/{workflowId}/approve — freeze the draft plan into
   * an immutable attested version. Requires `autopilot:approve` (or an
   * approver role); re-approving the same plan is idempotent.
   */
  approve(
    workflowId: string,
    request: ApproveAutopilotWorkflowRequest,
    options?: AutopilotRequestOptions,
  ): Promise<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(
      `/api/v1/autopilot/${id(workflowId)}/approve`,
      request,
      this.mutationConfig(options),
    );
  }

  /**
   * POST /api/v1/autopilot/{workflowId}/deploy — one-click deploy of the
   * approved plan, optionally with bounded modifications.
   */
  deploy(
    workflowId: string,
    request: DeployAutopilotWorkflowRequest = {},
    options?: AutopilotRequestOptions,
  ): Promise<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(
      `/api/v1/autopilot/${id(workflowId)}/deploy`,
      request,
      this.mutationConfig(options),
    );
  }

  /**
   * POST /api/v1/autopilot/{workflowId}/execute — queue a durable run (202)
   * or run inline with `sync: true`. Requires `autopilot:execute`.
   */
  execute(
    workflowId: string,
    request: ExecuteAutopilotWorkflowRequest = {},
    options?: AutopilotRequestOptions,
  ): Promise<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(
      `/api/v1/autopilot/${id(workflowId)}/execute`,
      request,
      this.mutationConfig(options),
    );
  }

  /**
   * POST /api/v1/autopilot/{workflowId}/revise — replace the draft plan
   * after validation.
   */
  revise(
    workflowId: string,
    request: ReviseAutopilotWorkflowRequest,
    options?: AutopilotRequestOptions,
  ): Promise<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(
      `/api/v1/autopilot/${id(workflowId)}/revise`,
      request,
      this.mutationConfig(options),
    );
  }

  /** GET /api/v1/autopilot/runs/{runId} — run detail + ordered steps. */
  getRun(runId: string): Promise<AutopilotRunDetail> {
    return this.http.get<AutopilotRunDetail>(
      `/api/v1/autopilot/runs/${id(runId)}`,
      this.requestConfig,
    );
  }

  /**
   * POST /api/v1/autopilot/runs/{runId} — `cancel` marks the run CANCELLED
   * (observed at the next step boundary); `resume` re-queues a run parked
   * in AWAITING_APPROVAL. Requires `autopilot:execute`.
   */
  controlRun(
    runId: string,
    action: AutopilotRunAction,
    options?: AutopilotRequestOptions,
  ): Promise<AutopilotRunActionResult> {
    return this.http.post<AutopilotRunActionResult>(
      `/api/v1/autopilot/runs/${id(runId)}`,
      { action },
      this.mutationConfig(options),
    );
  }

  cancelRun(runId: string, options?: AutopilotRequestOptions) {
    return this.controlRun(runId, "cancel", options);
  }

  resumeRun(runId: string, options?: AutopilotRequestOptions) {
    return this.controlRun(runId, "resume", options);
  }

  /**
   * GET /api/v1/autopilot/runs/{runId}/audit — the full audit trail:
   * prompt → plan → edits → approval → per-step events.
   */
  getRunAudit(runId: string): Promise<AutopilotRunAuditTrail> {
    return this.http.get<AutopilotRunAuditTrail>(
      `/api/v1/autopilot/runs/${id(runId)}/audit`,
      this.requestConfig,
    );
  }

  /**
   * GET /api/v1/autopilot/runs/{runId}/events — ordered per-step events.
   * Pass the previous response's `cursor` as `after` to poll for more.
   */
  getRunEvents(
    runId: string,
    options: { after?: number; limit?: number } = {},
  ): Promise<AutopilotRunEventsPage> {
    const params = new URLSearchParams();
    if (options.after !== undefined) params.set("after", String(options.after));
    if (options.limit !== undefined) params.set("limit", String(options.limit));
    const suffix = params.toString();
    return this.http.get<AutopilotRunEventsPage>(
      `/api/v1/autopilot/runs/${id(runId)}/events${suffix ? `?${suffix}` : ""}`,
      this.requestConfig,
    );
  }
}
