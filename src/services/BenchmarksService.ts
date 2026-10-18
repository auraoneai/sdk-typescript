import { randomUUID } from "node:crypto";
import type { HttpClient, RequestConfig } from "../types/api";

/**
 * A1 Benchmarks, Model Certification and Leaderboards client.
 *
 * Wraps the public benchmarks, benchmark-evaluations and leaderboard
 * route families documented in
 * `docs/api/public-api-contract.md`. Public reads are unauthenticated;
 * submissions carry the client's API key and an Idempotency-Key.
 */

export interface BenchmarkSummary {
  id: string;
  name: string;
  description: string | null;
  version: string;
  category: string;
  task_count: number;
  sealed: boolean | null;
  methodology: string | null;
}

export interface BenchmarkDetail extends BenchmarkSummary {
  release_notes: string | null;
  avg_cost_credits: number | null;
  avg_latency_ms: number | null;
}

export interface LeaderboardEntry {
  benchmark_id: string;
  model_id: string;
  model_name: string;
  score: number | null;
  rank: number;
  cost_credits: number | null;
  latency_ms: number | null;
  evaluated_at: string | null;
}

export interface BenchmarkEvaluationStatus {
  evaluation_id: string;
  status: string;
  benchmark_id: string;
  model_id: string;
  task_count: number;
  rollout_count: number;
  reserved_credits?: number;
  run_ids?: string[];
}

export interface SubmitBenchmarkEvaluationRequest {
  environment_id?: string;
  benchmark_id?: string;
  model_id: string;
  task_ids?: string[];
}

export interface SubmitBenchmarkEvaluationOptions
  extends SubmitBenchmarkEvaluationRequest {
  idempotencyKey?: string;
}

export interface ReviewProtocol {
  rubric: unknown;
  severities: readonly string[];
  spot_check_rate: number;
  spot_check_rate_source: "env" | "default";
}

export type AssignReviewRequest =
  | {
      action: "sample-and-assign";
      reviewerId: string;
      reviewerNotes?: string;
      adjudication?: unknown;
      sampleSize?: number;
      environmentId?: string;
      idempotencyKey?: string;
    }
  | {
      action: "assign";
      itemRefs: string[];
      reviewers: unknown[];
      benchmarkId: string;
      dueAt?: string;
      idempotencyKey?: string;
    }
  | {
      action: "request-cluster-review";
      clusterId: string;
      benchmarkId: string;
      itemRefs: string[];
      reason?: string;
      idempotencyKey?: string;
    };

export class BenchmarksService {
  constructor(
    private readonly http: HttpClient,
    private readonly requestConfig: RequestConfig = {},
  ) {}

  /** List approved public benchmark suites. */
  async list(): Promise<BenchmarkSummary[]> {
    const raw = await this.http.get<Record<string, unknown>>(
      "/api/v1/benchmarks",
      this.requestConfig,
    );
    const rows = (raw?.benchmarks ?? raw?.data ?? []) as Array<
      Record<string, unknown>
    >;
    return rows.map((row) => this.toSummary(row));
  }

  /** Fetch one published benchmark suite by id. */
  async get(benchmarkId: string): Promise<BenchmarkDetail> {
    const raw = await this.http.get<Record<string, unknown>>(
      `/api/v1/benchmarks/${encodeURIComponent(benchmarkId)}`,
      this.requestConfig,
    );
    const row = (raw?.benchmark ?? raw?.data ?? raw) as Record<
      string,
      unknown
    >;
    return { ...this.toSummary(row), ...this.toDetail(row) };
  }

  /** Published leaderboard rows for a suite (snapshots only). */
  async leaderboard(benchmarkId: string): Promise<LeaderboardEntry[]> {
    const raw = await this.http.get<Record<string, unknown>>(
      `/api/v1/leaderboard/${encodeURIComponent(benchmarkId)}`,
      this.requestConfig,
    );
    const rows = (raw?.leaderboard ?? raw?.entries ?? raw?.data ?? []) as Array<
      Record<string, unknown>
    >;
    return rows.map((row) => ({
      benchmark_id: String(row.benchmark_id ?? row.benchmarkId ?? benchmarkId),
      model_id: String(row.model_id ?? row.modelId ?? ""),
      model_name: String(row.model_name ?? row.modelName ?? ""),
      score: toNullableNumber(row.score),
      rank: Number(row.rank ?? 0),
      cost_credits: toNullableNumber(row.cost_credits ?? row.costCredits),
      latency_ms: toNullableNumber(row.latency_ms ?? row.latencyMs),
      evaluated_at: (row.evaluated_at ?? row.evaluatedAt ?? null) as
        | string
        | null,
    }));
  }

  /** Org KPI target statistics (authenticated). */
  async statistics(): Promise<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(
      "/api/v1/benchmarks/statistics",
      this.requestConfig,
    );
  }

  /** KPI visualization series (authenticated). */
  async visualization(): Promise<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(
      "/api/v1/benchmarks/visualization",
      this.requestConfig,
    );
  }

  /**
   * Submit a model for a benchmark evaluation. Requires an A1 customer
   * credential; carries an Idempotency-Key per the public contract.
   */
  async submitEvaluation(
    options: SubmitBenchmarkEvaluationOptions,
  ): Promise<BenchmarkEvaluationStatus> {
    const { idempotencyKey, ...request } = options;
    const body: Record<string, unknown> = { modelId: request.model_id };
    if (request.environment_id) body.environmentId = request.environment_id;
    if (request.benchmark_id) body.benchmarkId = request.benchmark_id;
    if (request.task_ids) body.taskIds = request.task_ids;

    const headers = {
      ...this.requestConfig.headers,
      "X-Idempotency-Key": idempotencyKey ?? randomUUID(),
    };
    const raw = await this.http.post<Record<string, unknown>>(
      "/api/v1/benchmark-evaluations",
      body,
      { ...this.requestConfig, headers },
    );
    return this.toStatus(raw);
  }

  /** Status of a submitted benchmark evaluation (org-scoped). */
  async getEvaluation(
    evaluationId: string,
  ): Promise<BenchmarkEvaluationStatus> {
    const raw = await this.http.get<Record<string, unknown>>(
      `/api/v1/benchmark-evaluations/${encodeURIComponent(evaluationId)}`,
      this.requestConfig,
    );
    return this.toStatus(raw);
  }

  /** Human-review protocol (rubric, severities, configured rate). */
  async reviewProtocol(): Promise<ReviewProtocol> {
    const raw = await this.http.get<Record<string, unknown>>(
      "/api/v1/benchmarks/reviews",
      this.requestConfig,
    );
    return {
      rubric: raw?.rubric ?? null,
      severities: (raw?.severities ?? []) as readonly string[],
      spot_check_rate: Number(
        raw?.spotCheckRate ?? raw?.spot_check_rate ?? 0,
      ),
      spot_check_rate_source: (raw?.spotCheckRateSource === "env"
        ? "env"
        : "default") as "env" | "default",
    };
  }

  /** Assign or sample-assign a human reviewer to runs. */
  async assignReview(
    request: AssignReviewRequest,
  ): Promise<Record<string, unknown>> {
    const { idempotencyKey, ...body } = request;
    const headers = {
      ...this.requestConfig.headers,
      "X-Idempotency-Key": idempotencyKey ?? randomUUID(),
    };
    return this.http.post<Record<string, unknown>>(
      "/api/v1/benchmarks/reviews",
      body,
      { ...this.requestConfig, headers },
    );
  }

  private toSummary(row: Record<string, unknown>): BenchmarkSummary {
    return {
      id: String(row.id ?? ""),
      name: String(row.name ?? ""),
      description: (row.description ?? null) as string | null,
      version: String(row.version ?? ""),
      category: String(row.category ?? ""),
      task_count: Number(row.task_count ?? row.taskCount ?? 0),
      sealed: (row.sealed ?? null) as boolean | null,
      methodology: (row.methodology ?? null) as string | null,
    };
  }

  private toDetail(row: Record<string, unknown>): {
    release_notes: string | null;
    avg_cost_credits: number | null;
    avg_latency_ms: number | null;
  } {
    return {
      release_notes: (row.release_notes ?? row.releaseNotes ?? null) as
        | string
        | null,
      avg_cost_credits: toNullableNumber(
        row.avg_cost_credits ?? row.avgCostCredits,
      ),
      avg_latency_ms: toNullableNumber(
        row.avg_latency_ms ?? row.avgLatencyMs,
      ),
    };
  }

  private toStatus(raw: Record<string, unknown>): BenchmarkEvaluationStatus {
    const row = (raw?.evaluation ?? raw?.data ?? raw) as Record<
      string,
      unknown
    >;
    return {
      evaluation_id: String(row.evaluation_id ?? row.evaluationId ?? row.id ?? ""),
      status: String(row.status ?? ""),
      benchmark_id: String(row.benchmark_id ?? row.benchmarkId ?? ""),
      model_id: String(row.model_id ?? row.modelId ?? ""),
      task_count: Number(row.task_count ?? row.taskCount ?? 0),
      rollout_count: Number(row.rollout_count ?? row.rolloutCount ?? 0),
      reserved_credits: toNullableNumber(
        row.reserved_credits ?? row.reservedCredits,
      ) ?? undefined,
      run_ids: (row.run_ids ?? row.runIds) as string[] | undefined,
    };
  }
}

function toNullableNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}
