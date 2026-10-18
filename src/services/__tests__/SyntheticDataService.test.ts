import { SyntheticDataService } from "../SyntheticDataService";
import type { HttpClient } from "../../types/api";
import { jest } from "@jest/globals";

function client() {
  const http = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  } as unknown as jest.Mocked<HttpClient>;
  return {
    http,
    service: new SyntheticDataService(http, {
      headers: { "X-Org-Id": "org-1" },
    }),
  };
}

describe("SyntheticDataService", () => {
  it("creates a generation job on the canonical v1 route", async () => {
    const { http, service } = client();
    http.post.mockResolvedValue({
      data: { job: { id: "job-1", status: "PENDING" } },
      requestId: "req-1",
    });

    await service.createJob(
      {
        generationType: "LLM",
        scenario: { prompt: "rows", parameters: {} },
        targetCount: 10,
        autoCreateCampaign: true,
      },
      { idempotencyKey: "gen-1", requestId: "req-client-1" },
    );

    expect(http.post).toHaveBeenCalledWith(
      "/api/v1/synthetic-data/generate",
      {
        generationType: "LLM",
        scenario: { prompt: "rows", parameters: {} },
        targetCount: 10,
        autoCreateCampaign: true,
      },
      {
        headers: {
          "X-Org-Id": "org-1",
          "Idempotency-Key": "gen-1",
          "X-Request-Id": "req-client-1",
        },
      },
    );
  });

  it("lists jobs with filters and reads a single job", async () => {
    const { http, service } = client();
    http.get.mockResolvedValue({ data: { jobs: [] }, requestId: "req-1" });

    await service.listJobs({ status: "COMPLETED", limit: 10 });
    await service.getJob("job/1");

    expect(http.get).toHaveBeenCalledWith(
      "/api/v1/synthetic-data/generate?limit=10&status=COMPLETED",
      { headers: { "X-Org-Id": "org-1" } },
    );
    expect(http.get).toHaveBeenCalledWith(
      "/api/v1/synthetic-data/jobs/job%2F1",
      { headers: { "X-Org-Id": "org-1" } },
    );
  });

  it("encodes identifiers on download, cancel and purge", async () => {
    const { http, service } = client();
    http.get.mockResolvedValue({ data: {}, requestId: "req-1" });
    http.delete.mockResolvedValue({ data: { success: true }, requestId: "r" });

    await service.downloadJobResult("job 7");
    await service.cancelJob("job/7", { idempotencyKey: "cancel-7" });
    await service.purgeJob("job/7", { idempotencyKey: "purge-7" });

    expect(http.get).toHaveBeenCalledWith(
      "/api/v1/synthetic-data/jobs/job%207/download",
      { headers: { "X-Org-Id": "org-1" } },
    );
    expect(http.delete).toHaveBeenNthCalledWith(
      1,
      "/api/v1/synthetic-data/jobs/job%2F7",
      { headers: { "X-Org-Id": "org-1", "Idempotency-Key": "cancel-7" } },
    );
    expect(http.delete).toHaveBeenNthCalledWith(
      2,
      "/api/v1/synthetic-data/jobs/job%2F7/purge",
      { headers: { "X-Org-Id": "org-1", "Idempotency-Key": "purge-7" } },
    );
  });

  it("routes preview, physics and review calls through v1", async () => {
    const { http, service } = client();
    http.post.mockResolvedValue({ data: {}, requestId: "req-1" });
    http.get.mockResolvedValue({ data: {}, requestId: "req-1" });

    await service.previewGeneration(
      { generationType: "PHYSICS", scenario: { prompt: "roll" }, count: 2 },
      { idempotencyKey: "prev-1" },
    );
    await service.executePhysicsSimulation(
      "sim/9",
      { iterations: 5 },
      { idempotencyKey: "exec-1" },
    );
    await service.reviewSlice(
      "slice 1",
      { decision: "approved" },
      { idempotencyKey: "rev-1" },
    );
    await service.getPhysicsEngineInfo("mujoco");

    expect(http.post).toHaveBeenNthCalledWith(
      1,
      "/api/v1/synthetic-data/preview",
      { generationType: "PHYSICS", scenario: { prompt: "roll" }, count: 2 },
      { headers: { "X-Org-Id": "org-1", "Idempotency-Key": "prev-1" } },
    );
    expect(http.post).toHaveBeenNthCalledWith(
      2,
      "/api/v1/synthetic-data/physics/simulations/sim%2F9/execute",
      { iterations: 5 },
      { headers: { "X-Org-Id": "org-1", "Idempotency-Key": "exec-1" } },
    );
    expect(http.post).toHaveBeenNthCalledWith(
      3,
      "/api/v1/synthetic-data/review/slice%201",
      { decision: "approved" },
      { headers: { "X-Org-Id": "org-1", "Idempotency-Key": "rev-1" } },
    );
    expect(http.get).toHaveBeenCalledWith(
      "/api/v1/synthetic-data/physics/mujoco",
      { headers: { "X-Org-Id": "org-1" } },
    );
  });

  it("covers the legacy /api/v1/synthetic surface", async () => {
    const { http, service } = client();
    http.get.mockResolvedValue({
      data: { data: [], success: true },
      requestId: "req-1",
    });
    http.post.mockResolvedValue({
      data: { data: {}, success: true },
      requestId: "req-1",
    });

    await service.listLegacyProfiles();
    await service.createLegacyAudit(
      { action: "generation" },
      { idempotencyKey: "audit-1" },
    );
    await service.getExperimentMethodology("exp/1");

    expect(http.get).toHaveBeenNthCalledWith(
      1,
      "/api/v1/synthetic/profiles",
      { headers: { "X-Org-Id": "org-1" } },
    );
    expect(http.post).toHaveBeenCalledWith(
      "/api/v1/synthetic/audits",
      { action: "generation" },
      { headers: { "X-Org-Id": "org-1", "Idempotency-Key": "audit-1" } },
    );
    expect(http.get).toHaveBeenNthCalledWith(
      2,
      "/api/v1/synthetic/experiments/exp%2F1/methodology",
      { headers: { "X-Org-Id": "org-1" } },
    );
  });

  it("preserves the complete public method contract", () => {
    const { service } = client();
    expect(
      Object.getOwnPropertyNames(Object.getPrototypeOf(service))
        .filter((name) => name !== "getConfig" && name !== "mutationConfig")
        .sort(),
    ).toMatchSnapshot();
  });
});
