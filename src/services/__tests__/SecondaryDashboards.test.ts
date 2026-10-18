import { jest } from "@jest/globals";
import type { HttpClient } from "../../types/api";
import { AttentionService } from "../AttentionService";
import { OptimizationService } from "../OptimizationService";
import { AutopilotService } from "../AutopilotService";
import { VisualizationService } from "../VisualizationService";
import { CapacityService } from "../CapacityService";

function mockHttp() {
  return {
    get: jest.fn(async () => ({})),
    post: jest.fn(async () => ({})),
    put: jest.fn(async () => ({})),
    patch: jest.fn(async () => ({})),
    delete: jest.fn(async () => ({})),
  } as unknown as jest.Mocked<HttpClient>;
}

const CONFIG = { headers: { "X-Test": "1" } };

describe("AttentionService", () => {
  it("reads and ingests attention evidence on the canonical route", async () => {
    const http = mockHttp();
    const service = new AttentionService(http, CONFIG);

    await service.getEvidence({ modelId: "m1", runId: "r1", limit: 50 });
    await service.ingestEvidence([
      { modelId: "m1", layer: 2, head: 4, entropy: 0.9 },
    ]);

    expect(http.get).toHaveBeenCalledWith(
      "/api/v1/algorithms/attention?modelId=m1&runId=r1&limit=50",
      CONFIG,
    );
    expect(http.post).toHaveBeenCalledWith(
      "/api/v1/algorithms/attention",
      { records: [{ modelId: "m1", layer: 2, head: 4, entropy: 0.9 }] },
      CONFIG,
    );
  });
});

describe("OptimizationService", () => {
  it("lists, creates, and controls jobs on the admitted /api/v1/optimization surface", async () => {
    const http = mockHttp();
    const service = new OptimizationService(http, CONFIG);

    await service.listJobs("org-1");
    await service.createJob({ jobType: "hpo" }, { idempotencyKey: "k-1" });
    await service.runJobAction("job/1", "pause", { idempotencyKey: "k-2" });

    expect(http.get).toHaveBeenCalledWith(
      "/api/v1/optimization/jobs?orgId=org-1",
      CONFIG,
    );
    expect(http.post).toHaveBeenCalledWith(
      "/api/v1/optimization/jobs",
      { jobType: "hpo" },
      expect.objectContaining({
        headers: expect.objectContaining({ "Idempotency-Key": "k-1" }),
      }),
    );
    expect(http.post).toHaveBeenCalledWith(
      "/api/v1/optimization/jobs/job%2F1/pause",
      undefined,
      expect.objectContaining({
        headers: expect.objectContaining({ "Idempotency-Key": "k-2" }),
      }),
    );
  });

  it("auto-generates an Idempotency-Key when the caller does not supply one", async () => {
    const http = mockHttp();
    const service = new OptimizationService(http, CONFIG);
    await service.createJob({ jobType: "hpo" });
    const config = http.post.mock.calls[0][2];
    const key = config?.headers?.["Idempotency-Key"];
    expect(typeof key).toBe("string");
    expect(key).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("covers trial-data routes: history, suggest, visualization, surface, metrics", async () => {
    const http = mockHttp();
    const service = new OptimizationService(http, CONFIG);

    await service.getJobHistory("j1", { page: 2, pageSize: 25 });
    await service.getJobSuggestion("j1");
    await service.submitJobSuggestion("j1", { lr: 0.5 });
    await service.getJobVisualization("j1");
    await service.getJobSurface("j1", { x: "lr", y: "depth", resolution: 40 });
    await service.getJobMetrics("j1");

    expect(http.get).toHaveBeenCalledWith(
      "/api/v1/optimization/jobs/j1/history?page=2&pageSize=25",
      CONFIG,
    );
    expect(http.get).toHaveBeenCalledWith(
      "/api/v1/optimization/jobs/j1/suggest",
      CONFIG,
    );
    expect(http.post).toHaveBeenCalledWith(
      "/api/v1/optimization/jobs/j1/suggest",
      { lr: 0.5 },
      CONFIG,
    );
    expect(http.get).toHaveBeenCalledWith(
      "/api/v1/optimization/jobs/j1/visualization",
      CONFIG,
    );
    expect(http.get).toHaveBeenCalledWith(
      "/api/v1/optimization/jobs/j1/visualization/surface?x=lr&y=depth&resolution=40",
      CONFIG,
    );
    expect(http.get).toHaveBeenCalledWith(
      "/api/v1/optimization/jobs/j1/metrics",
      CONFIG,
    );
  });

  it("round-trips the wizard draft", async () => {
    const http = mockHttp();
    const service = new OptimizationService(http, CONFIG);
    await service.saveDraft({ name: "d", metricGoal: "maximize" });
    expect(http.post).toHaveBeenCalledWith(
      "/api/v1/optimization/drafts",
      { name: "d", metricGoal: "maximize" },
      CONFIG,
    );
  });
});

describe("AutopilotService", () => {
  it("generates, approves, deploys, executes, and revises workflows", async () => {
    const http = mockHttp();
    const service = new AutopilotService(http, CONFIG);

    await service.generate(
      { description: "Eval support chats" },
      { idempotencyKey: "g1" },
    );
    await service.approve(
      "wf1",
      { rationale: "looks right" },
      { idempotencyKey: "a1" },
    );
    await service.deploy("wf1", {}, { idempotencyKey: "d1" });
    await service.execute(
      "wf1",
      { seed: "s", sync: true },
      { idempotencyKey: "e1" },
    );
    await service.revise(
      "wf1",
      { plan: { steps: [] } },
      { idempotencyKey: "r1" },
    );

    expect(http.post).toHaveBeenNthCalledWith(
      1,
      "/api/v1/autopilot/generate",
      { description: "Eval support chats" },
      expect.objectContaining({
        headers: expect.objectContaining({ "Idempotency-Key": "g1" }),
      }),
    );
    expect(http.post).toHaveBeenNthCalledWith(
      2,
      "/api/v1/autopilot/wf1/approve",
      { rationale: "looks right" },
      expect.objectContaining({
        headers: expect.objectContaining({ "Idempotency-Key": "a1" }),
      }),
    );
    expect(http.post).toHaveBeenNthCalledWith(
      3,
      "/api/v1/autopilot/wf1/deploy",
      {},
      expect.objectContaining({
        headers: expect.objectContaining({ "Idempotency-Key": "d1" }),
      }),
    );
    expect(http.post).toHaveBeenNthCalledWith(
      4,
      "/api/v1/autopilot/wf1/execute",
      { seed: "s", sync: true },
      expect.objectContaining({
        headers: expect.objectContaining({ "Idempotency-Key": "e1" }),
      }),
    );
    expect(http.post).toHaveBeenNthCalledWith(
      5,
      "/api/v1/autopilot/wf1/revise",
      { plan: { steps: [] } },
      expect.objectContaining({
        headers: expect.objectContaining({ "Idempotency-Key": "r1" }),
      }),
    );
  });

  it("reads runs, controls them, and pages run events", async () => {
    const http = mockHttp();
    const service = new AutopilotService(http, CONFIG);

    await service.list();
    await service.getRun("run 1");
    await service.controlRun("run1", "resume", { idempotencyKey: "c1" });
    await service.getRunAudit("run1");
    await service.getRunEvents("run1", { after: 12, limit: 100 });
    await service.getMetrics({ days: 30 });

    expect(http.get).toHaveBeenNthCalledWith(1, "/api/v1/autopilot", CONFIG);
    expect(http.get).toHaveBeenNthCalledWith(
      2,
      "/api/v1/autopilot/runs/run%201",
      CONFIG,
    );
    expect(http.post).toHaveBeenCalledWith(
      "/api/v1/autopilot/runs/run1",
      { action: "resume" },
      expect.objectContaining({
        headers: expect.objectContaining({ "Idempotency-Key": "c1" }),
      }),
    );
    expect(http.get).toHaveBeenNthCalledWith(
      3,
      "/api/v1/autopilot/runs/run1/audit",
      CONFIG,
    );
    expect(http.get).toHaveBeenNthCalledWith(
      4,
      "/api/v1/autopilot/runs/run1/events?after=12&limit=100",
      CONFIG,
    );
    expect(http.get).toHaveBeenNthCalledWith(
      5,
      "/api/v1/autopilot/metrics?days=30",
      CONFIG,
    );
  });
});

describe("VisualizationService", () => {
  it("manages dashboards and engagement routes", async () => {
    const http = mockHttp();
    const service = new VisualizationService(http, CONFIG);
    const payload = {
      name: "Ops",
      layout: {
        columns: 12,
        rows: 8,
        gap: 8,
        padding: 8,
        responsive: true,
        breakpoints: { mobile: 480, tablet: 768, desktop: 1024 },
      },
      widgets: [],
      dataSources: [],
      refreshInterval: 60,
      isPublic: false,
      tags: [],
      metadata: {},
    };

    await service.listDashboards({ orgId: "o1", view: "favorites", limit: 10 });
    await service.createDashboard(payload, { idempotencyKey: "cd1" });
    await service.updateDashboard(
      "d1",
      { name: "Ops2" },
      { idempotencyKey: "ud1" },
    );
    await service.shareDashboard("d1", { idempotencyKey: "s1" });
    await service.favoriteDashboard("d1", { idempotencyKey: "f1" });
    await service.unbookmarkDashboard("d1");
    await service.recordDashboardView("d1", { idempotencyKey: "v1" });
    await service.deleteDashboard("d1");

    expect(http.get).toHaveBeenNthCalledWith(
      1,
      "/api/v1/visualization/dashboards?orgId=o1&limit=10&view=favorites",
      CONFIG,
    );
    expect(http.post).toHaveBeenNthCalledWith(
      1,
      "/api/v1/visualization/dashboards",
      payload,
      expect.objectContaining({
        headers: expect.objectContaining({ "Idempotency-Key": "cd1" }),
      }),
    );
    expect(http.put).toHaveBeenCalledWith(
      "/api/v1/visualization/dashboards/d1",
      { name: "Ops2" },
      expect.objectContaining({
        headers: expect.objectContaining({ "Idempotency-Key": "ud1" }),
      }),
    );
    expect(http.post).toHaveBeenCalledWith(
      "/api/v1/visualization/dashboards/d1/share",
      undefined,
      expect.objectContaining({
        headers: expect.objectContaining({ "Idempotency-Key": "s1" }),
      }),
    );
    expect(http.post).toHaveBeenCalledWith(
      "/api/v1/visualization/dashboards/d1/favorite",
      undefined,
      expect.objectContaining({
        headers: expect.objectContaining({ "Idempotency-Key": "f1" }),
      }),
    );
    expect(http.delete).toHaveBeenCalledWith(
      "/api/v1/visualization/dashboards/d1/bookmark",
      CONFIG,
    );
    expect(http.post).toHaveBeenCalledWith(
      "/api/v1/visualization/dashboards/d1/view",
      undefined,
      expect.objectContaining({
        headers: expect.objectContaining({ "Idempotency-Key": "v1" }),
      }),
    );
    expect(http.delete).toHaveBeenCalledWith(
      "/api/v1/visualization/dashboards/d1",
      CONFIG,
    );
  });

  it("reads widget data and renders exports", async () => {
    const http = mockHttp();
    const service = new VisualizationService(http, CONFIG);

    await service.listWidgets({
      dashboardId: "d1",
      chartType: "line",
      page: 2,
    });
    await service.runQuery({
      dataSourceId: "ds1",
      query: {
        id: "q1",
        sourceId: "ds1",
        query: "select 1",
        timeRange: { start: "2026-01-01", end: "2026-01-31" },
      },
    });
    await service.export(
      { widgetId: "w1", format: "png" },
      { idempotencyKey: "x1" },
    );

    expect(http.get).toHaveBeenCalledWith(
      "/api/v1/visualization/data?dashboardId=d1&chartType=line&page=2",
      CONFIG,
    );
    expect(http.post).toHaveBeenCalledWith(
      "/api/v1/visualization/data",
      expect.objectContaining({ dataSourceId: "ds1" }),
      CONFIG,
    );
    expect(http.post).toHaveBeenCalledWith(
      "/api/v1/visualization/export",
      { widgetId: "w1", format: "png" },
      expect.objectContaining({
        headers: expect.objectContaining({ "Idempotency-Key": "x1" }),
      }),
    );
  });

  it("manages scheduled export configs on the root-relative API", async () => {
    const http = mockHttp();
    const service = new VisualizationService(http, CONFIG);

    await service.listExports({ status: "active", limit: 5 });
    await service.createExport(
      { dashboardId: "d1", name: "Weekly", format: "pdf" },
      { idempotencyKey: "ce1" },
    );
    await service.updateExport(
      "e1",
      { status: "paused" },
      { idempotencyKey: "ue1" },
    );
    await service.runExport(
      "e1",
      { settings: { dpi: 300 } },
      { idempotencyKey: "re1" },
    );
    await service.getExportHistory("e1", { limit: 20 });
    await service.downloadExport("e1", "org-1");
    await service.deleteExport("e1");

    expect(http.get).toHaveBeenNthCalledWith(
      1,
      "/api/visualization/exports?status=active&limit=5",
      CONFIG,
    );
    expect(http.post).toHaveBeenNthCalledWith(
      1,
      "/api/visualization/exports",
      { dashboardId: "d1", name: "Weekly", format: "pdf" },
      expect.objectContaining({
        headers: expect.objectContaining({ "Idempotency-Key": "ce1" }),
      }),
    );
    expect(http.patch).toHaveBeenCalledWith(
      "/api/visualization/exports?id=e1",
      { status: "paused" },
      expect.objectContaining({
        headers: expect.objectContaining({ "Idempotency-Key": "ue1" }),
      }),
    );
    expect(http.post).toHaveBeenNthCalledWith(
      2,
      "/api/visualization/exports/e1/run",
      { settings: { dpi: 300 } },
      expect.objectContaining({
        headers: expect.objectContaining({ "Idempotency-Key": "re1" }),
      }),
    );
    expect(http.get).toHaveBeenNthCalledWith(
      2,
      "/api/visualization/exports/e1/history?limit=20",
      CONFIG,
    );
    expect(http.get).toHaveBeenNthCalledWith(
      3,
      "/api/visualization/exports/e1/download?orgId=org-1",
      CONFIG,
    );
    expect(http.delete).toHaveBeenCalledWith(
      "/api/visualization/exports?id=e1",
      CONFIG,
    );
  });
});

describe("CapacityService", () => {
  it("reads org-scoped utilization with a range", async () => {
    const http = mockHttp();
    const service = new CapacityService(http, CONFIG);

    await service.getUtilization({ orgId: "o1", range: "30d" });

    expect(http.get).toHaveBeenCalledWith(
      "/api/v1/capacity/utilization?orgId=o1&range=30d",
      CONFIG,
    );
  });
});
