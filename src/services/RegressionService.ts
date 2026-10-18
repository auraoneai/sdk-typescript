import { randomUUID } from "node:crypto";
import type { HttpClient, RequestConfig } from "../types/api";

/**
 * A1 regression evaluation client — `POST /api/v1/regression` +
 * `GET /api/v1/regression/{replayId}`.
 *
 * A regression request replays a model against a baseline over a benchmark
 * suite and reports whether the candidate regressed.
 */

export interface RegressionRequest {
  model_id: string;
  baseline_model_id: string;
  benchmark_id?: string;
  environment_id?: string;
  task_ids?: string[];
}

export interface RegressionRequestOptions extends RegressionRequest {
  idempotencyKey?: string;
}

export interface RegressionStatus {
  replay_id: string;
  status: string;
  model_id: string;
  baseline_model_id: string;
  regressed: boolean | null;
  detail: Record<string, unknown> | null;
}

export class RegressionService {
  constructor(
    private readonly http: HttpClient,
    private readonly requestConfig: RequestConfig = {},
  ) {}

  /** Request a regression replay (Idempotency-Key carried per contract). */
  async run(options: RegressionRequestOptions): Promise<RegressionStatus> {
    const { idempotencyKey, ...request } = options;
    const body: Record<string, unknown> = {
      modelId: request.model_id,
      baselineModelId: request.baseline_model_id,
    };
    if (request.benchmark_id) body.benchmarkId = request.benchmark_id;
    if (request.environment_id) body.environmentId = request.environment_id;
    if (request.task_ids) body.taskIds = request.task_ids;

    const headers = {
      ...this.requestConfig.headers,
      "X-Idempotency-Key": idempotencyKey ?? randomUUID(),
    };
    const raw = await this.http.post<Record<string, unknown>>(
      "/api/v1/regression",
      body,
      { ...this.requestConfig, headers },
    );
    return this.toStatus(raw);
  }

  /** Poll a regression replay result. */
  async get(replayId: string): Promise<RegressionStatus> {
    const raw = await this.http.get<Record<string, unknown>>(
      `/api/v1/regression/${encodeURIComponent(replayId)}`,
      this.requestConfig,
    );
    return this.toStatus(raw);
  }

  private toStatus(raw: Record<string, unknown>): RegressionStatus {
    const row = (raw?.regression ?? raw?.replay ?? raw?.data ?? raw) as Record<
      string,
      unknown
    >;
    return {
      replay_id: String(row.replay_id ?? row.replayId ?? row.id ?? ""),
      status: String(row.status ?? ""),
      model_id: String(row.model_id ?? row.modelId ?? ""),
      baseline_model_id: String(
        row.baseline_model_id ?? row.baselineModelId ?? "",
      ),
      regressed:
        typeof row.regressed === "boolean" ? row.regressed : null,
      detail: (row.detail ?? row.results ?? null) as Record<
        string,
        unknown
      > | null,
    };
  }
}
