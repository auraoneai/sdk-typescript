/**
 * P1-14 — A1 SDK surface: BenchmarksService, CertificationService,
 * RegressionService. Each method is exercised against a mocked HttpClient
 * that records the exact path, body, and headers it receives.
 */

import { describe, expect, test, jest } from "@jest/globals";
import { BenchmarksService } from "../services/BenchmarksService";
import { CertificationService } from "../services/CertificationService";
import { RegressionService } from "../services/RegressionService";
import type { HttpClient, RequestConfig } from "../types/api";

interface Call {
  method: string;
  path: string;
  body?: unknown;
  config?: RequestConfig;
}

function mockHttp(respond: (call: Call) => unknown): { http: HttpClient; calls: Call[] } {
  const calls: Call[] = [];
  const record = (method: string) =>
    jest.fn(async (path: string, bodyOrConfig?: unknown, maybeConfig?: RequestConfig) => {
      const isBodyMethod = method === "post" || method === "put" || method === "patch";
      const call: Call = {
        method,
        path,
        body: isBodyMethod ? bodyOrConfig : undefined,
        config: (isBodyMethod ? maybeConfig : bodyOrConfig) as RequestConfig | undefined,
      };
      calls.push(call);
      return respond(call) as never;
    });
  const http: HttpClient = {
    get: record("get"),
    post: record("post"),
    put: record("put"),
    delete: record("delete"),
    patch: record("patch"),
  } as unknown as HttpClient;
  return { http, calls };
}

describe("BenchmarksService (P1-14)", () => {
  test("list/get/leaderboard hit the documented public routes and map snake_case", async () => {
    const { http, calls } = mockHttp((call) => {
      if (call.path === "/api/v1/benchmarks") {
        return {
          benchmarks: [
            {
              id: "bench-1",
              name: "Suite",
              version: "1.0",
              category: "web",
              taskCount: 40,
              sealed: true,
            },
          ],
        };
      }
      if (call.path === "/api/v1/benchmarks/bench-1") {
        return {
          data: {
            id: "bench-1",
            name: "Suite",
            version: "1.0",
            category: "web",
            taskCount: 40,
            avgCostCredits: 120,
            avgLatencyMs: 1900,
          },
        };
      }
      if (call.path === "/api/v1/leaderboard/bench-1") {
        return {
          leaderboard: [
            {
              benchmarkId: "bench-1",
              modelId: "m-1",
              modelName: "M",
              score: 0.8,
              rank: 1,
              costCredits: 10,
              latencyMs: 100,
              evaluatedAt: "2026-09-01T00:00:00Z",
            },
          ],
        };
      }
      return {};
    });
    const svc = new BenchmarksService(http);

    const list = await svc.list();
    expect(list).toHaveLength(1);
    expect(list[0].task_count).toBe(40);
    expect(list[0].sealed).toBe(true);

    const detail = await svc.get("bench-1");
    expect(detail.avg_cost_credits).toBe(120);
    expect(detail.avg_latency_ms).toBe(1900);

    const board = await svc.leaderboard("bench-1");
    expect(board[0]).toMatchObject({
      benchmark_id: "bench-1",
      model_id: "m-1",
      score: 0.8,
      rank: 1,
      cost_credits: 10,
    });

    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      "get /api/v1/benchmarks",
      "get /api/v1/benchmarks/bench-1",
      "get /api/v1/leaderboard/bench-1",
    ]);
  });

  test("statistics + visualization hit the authenticated routes", async () => {
    const { http, calls } = mockHttp(() => ({ ok: true }));
    const svc = new BenchmarksService(http);
    await svc.statistics();
    await svc.visualization();
    expect(calls.map((c) => c.path)).toEqual([
      "/api/v1/benchmarks/statistics",
      "/api/v1/benchmarks/visualization",
    ]);
  });

  test("submitEvaluation posts the platform payload with an Idempotency-Key", async () => {
    const { http, calls } = mockHttp(() => ({
      data: {
        evaluation_id: "ev-1",
        status: "queued",
        benchmark_id: "bench-1",
        model_id: "m-1",
        task_count: 40,
        rollout_count: 2,
      },
    }));
    const svc = new BenchmarksService(http);
    const status = await svc.submitEvaluation({
      benchmark_id: "bench-1",
      model_id: "m-1",
      task_ids: ["t-1"],
      idempotencyKey: "idem-123",
    });

    expect(calls).toHaveLength(1);
    const call = calls[0];
    expect(call.method).toBe("post");
    expect(call.path).toBe("/api/v1/benchmark-evaluations");
    expect(call.body).toEqual({
      modelId: "m-1",
      benchmarkId: "bench-1",
      taskIds: ["t-1"],
    });
    expect(call.config?.headers?.["X-Idempotency-Key"]).toBe("idem-123");
    expect(status.evaluation_id).toBe("ev-1");
  });

  test("submitEvaluation generates an Idempotency-Key when none is given", async () => {
    const { http, calls } = mockHttp(() => ({ data: { status: "queued" } }));
    const svc = new BenchmarksService(http);
    await svc.submitEvaluation({ model_id: "m-1" });
    const key = calls[0].config?.headers?.["X-Idempotency-Key"];
    expect(typeof key).toBe("string");
    expect((key as string).length).toBeGreaterThan(0);
  });

  test("getEvaluation reads the org-scoped status route", async () => {
    const { http, calls } = mockHttp(() => ({
      data: { evaluation_id: "ev-1", status: "complete" },
    }));
    const svc = new BenchmarksService(http);
    const status = await svc.getEvaluation("ev-1");
    expect(calls[0].path).toBe("/api/v1/benchmark-evaluations/ev-1");
    expect(status.status).toBe("complete");
  });

  test("reviewProtocol maps the configured spot-check rate + source", async () => {
    const { http } = mockHttp(() => ({
      rubric: { id: "rubric-1" },
      severities: ["critical", "major"],
      spotCheckRate: 0.5,
      spotCheckRateSource: "env",
    }));
    const svc = new BenchmarksService(http);
    const protocol = await svc.reviewProtocol();
    expect(protocol.spot_check_rate).toBe(0.5);
    expect(protocol.spot_check_rate_source).toBe("env");
    expect(protocol.severities).toContain("critical");
  });

  test("assignReview posts the action body with an Idempotency-Key", async () => {
    const { http, calls } = mockHttp(() => ({ assignedRunIds: ["r1"] }));
    const svc = new BenchmarksService(http);
    await svc.assignReview({
      action: "sample-and-assign",
      reviewerId: "rev-1",
      sampleSize: 2,
      idempotencyKey: "idem-rev",
    });
    const call = calls[0];
    expect(call.path).toBe("/api/v1/benchmarks/reviews");
    expect(call.body).toEqual({
      action: "sample-and-assign",
      reviewerId: "rev-1",
      sampleSize: 2,
    });
    expect(call.config?.headers?.["X-Idempotency-Key"]).toBe("idem-rev");
  });
});

describe("CertificationService (P1-14)", () => {
  test("get maps the certification decision, null evidence included", async () => {
    const { http, calls } = mockHttp(() => ({
      certification: {
        modelId: "m-1",
        status: "certified",
        evidence: null,
        contaminationCheckedAt: "2026-09-01T00:00:00Z",
      },
    }));
    const svc = new CertificationService(http);
    const cert = await svc.get("m-1");
    expect(calls[0].path).toBe("/api/v1/certification/m-1");
    expect(cert).toEqual({
      model_id: "m-1",
      certified: true,
      status: "certified",
      evidence: null,
      contamination_checked_at: "2026-09-01T00:00:00Z",
    });
  });

  test("getDetail hits the model certification route", async () => {
    const { http, calls } = mockHttp(() => ({ status: "not_certified" }));
    const svc = new CertificationService(http);
    await svc.getDetail("m-9");
    expect(calls[0].path).toBe("/api/v1/models/m-9/certification");
  });
});

describe("RegressionService (P1-14)", () => {
  test("run posts the regression request with an Idempotency-Key", async () => {
    const { http, calls } = mockHttp(() => ({
      replay: {
        replayId: "rep-1",
        status: "QUEUED",
        modelId: "m-2",
        baselineModelId: "m-1",
      },
    }));
    const svc = new RegressionService(http);
    const status = await svc.run({
      model_id: "m-2",
      baseline_model_id: "m-1",
      benchmark_id: "bench-1",
      idempotencyKey: "idem-reg",
    });
    const call = calls[0];
    expect(call.path).toBe("/api/v1/regression");
    expect(call.body).toEqual({
      modelId: "m-2",
      baselineModelId: "m-1",
      benchmarkId: "bench-1",
    });
    expect(call.config?.headers?.["X-Idempotency-Key"]).toBe("idem-reg");
    expect(status.replay_id).toBe("rep-1");
  });

  test("get polls the org-scoped replay route", async () => {
    const { http, calls } = mockHttp(() => ({
      data: { replayId: "rep-1", status: "PASSED", modelId: "m-2" },
    }));
    const svc = new RegressionService(http);
    const status = await svc.get("rep-1");
    expect(calls[0].path).toBe("/api/v1/regression/rep-1");
    expect(status.status).toBe("PASSED");
  });
});
