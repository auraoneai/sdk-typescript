import { afterEach, describe, expect, jest, test } from "@jest/globals";
import { RoboticsService } from "../services/RoboticsService";

describe("RoboticsService", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  test("listDatasets forwards pagination filters and returns computed pagination", async () => {
    const mockFetch = jest.fn(async (url: string) => {
      expect(url).toContain("/api/v1/robotics/datasets");
      expect(url).toContain("page=2");
      expect(url).toContain("limit=20");
      expect(url).toContain("dataMode=HUMAN_DEMO");

      return new Response(
        JSON.stringify({
          datasets: [
            {
              id: "ds_1",
              name: "Demo Dataset",
              dataMode: "HUMAN_DEMO",
              robotPlatform: "UR5",
              taskCategory: "PICK_PLACE",
              trajectoryCount: 10,
              qualityScore: 0.89,
            },
          ],
          stats: {
            TELEOPERATION: 4,
            HUMAN_DEMO: 30,
            VLA: 11,
          },
          total: 45,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    });

    global.fetch = mockFetch as unknown as typeof global.fetch;

    const service = new RoboticsService({
      baseUrl: "https://api.auraone.ai",
      apiKey: "aura_live_test_key",
      retries: 0,
    });

    const result = await service.listDatasets({
      page: 2,
      limit: 20,
      dataMode: "HUMAN_DEMO",
    });

    expect(result.datasets).toHaveLength(1);
    expect(result.pagination).toEqual({
      page: 2,
      limit: 20,
      total: 45,
      hasNext: true,
      hasPrev: true,
    });
  });

  test("listAllDatasets walks pages until total is exhausted", async () => {
    const mockFetch = jest.fn(async (url: string) => {
      const parsed = new URL(url);
      const page = Number(parsed.searchParams.get("page") ?? "1");

      if (page === 1) {
        return new Response(
          JSON.stringify({
            datasets: [
              {
                id: "ds_1",
                name: "Set 1",
                dataMode: "HUMAN_DEMO",
                robotPlatform: "UR5",
                taskCategory: "PICK_PLACE",
                trajectoryCount: 1,
                qualityScore: null,
              },
              {
                id: "ds_2",
                name: "Set 2",
                dataMode: "HUMAN_DEMO",
                robotPlatform: "UR5",
                taskCategory: "PICK_PLACE",
                trajectoryCount: 1,
                qualityScore: null,
              },
            ],
            total: 3,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({
          datasets: [
            {
              id: "ds_3",
              name: "Set 3",
              dataMode: "HUMAN_DEMO",
              robotPlatform: "UR5",
              taskCategory: "PICK_PLACE",
              trajectoryCount: 1,
              qualityScore: null,
            },
          ],
          total: 3,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    });

    global.fetch = mockFetch as unknown as typeof global.fetch;

    const service = new RoboticsService({
      baseUrl: "https://api.auraone.ai",
      apiKey: "aura_live_test_key",
      retries: 0,
    });

    const datasets = await service.listAllDatasets({ limit: 2 });

    expect(datasets.map((dataset) => dataset.id)).toEqual([
      "ds_1",
      "ds_2",
      "ds_3",
    ]);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  test("retries transient failures for robotics API calls", async () => {
    let attempts = 0;
    const mockFetch = jest.fn(async () => {
      attempts += 1;
      if (attempts === 1) {
        return new Response("temporary failure", { status: 503 });
      }
      return new Response(
        JSON.stringify({
          certifications: [],
          stats: {
            certifiedWorkers: 0,
            expiredCertifications: 0,
            expiringSoon: 0,
            safetyIncidents: 0,
            avgEstopLatencyMs: null,
            estopEvents: 0,
          },
          compliance: { summary: {}, controlsByStandard: {} },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    });

    global.fetch = mockFetch as unknown as typeof global.fetch;

    const service = new RoboticsService({
      baseUrl: "https://api.auraone.ai",
      apiKey: "aura_live_test_key",
      retries: 1,
      retryDelayMs: 1,
    });

    const snapshot = await service.getSafetyMetrics();

    expect(snapshot.stats.certifiedWorkers).toBe(0);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  test("downloadExport returns binary payload and response headers", async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);

    const mockFetch = jest.fn(async (url: string) => {
      expect(url).toContain("downloadToken=signed-token");

      return new Response(bytes, {
        status: 200,
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": 'attachment; filename="dataset.bin"',
          "X-Checksum-SHA256": "abc123",
          "X-Export-Contract-Version": "2026-02-26",
        },
      });
    });

    global.fetch = mockFetch as unknown as typeof global.fetch;

    const service = new RoboticsService({
      baseUrl: "https://api.auraone.ai",
      apiKey: "aura_live_test_key",
      retries: 0,
    });

    const download = await service.downloadExport({
      downloadToken: "signed-token",
    });

    expect(download.data.byteLength).toBe(4);
    expect(download.checksum).toBe("abc123");
    expect(download.contractVersion).toBe("2026-02-26");
  });

  test("workforce methods include orgId in requests", async () => {
    const recorded: Array<{ url: string; init: RequestInit | undefined }> = [];
    const mockFetch = jest.fn(async (url: string, init?: RequestInit) => {
      recorded.push({ url, init });

      const action =
        init?.method === "POST" && typeof init.body === "string"
          ? (JSON.parse(init.body) as { action?: string }).action
          : undefined;

      if (action === "assign") {
        return new Response(
          JSON.stringify({
            assignment: {
              operatorId: "operator-1",
              taskType: "teleoperation",
              status: "assigned",
              assignedAt: new Date().toISOString(),
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (action === "batch_assign") {
        return new Response(
          JSON.stringify({
            totalTasks: 1,
            status: "queued",
            estimatedCompletionMin: 1,
          }),
          { status: 202, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({
          operators: [],
          throughput: {
            trajectoriesLastHour: 0,
            trajectoriesPerMinute: 0,
            certifiedWorkers: 0,
            taskSuccessRate: 0,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });

    global.fetch = mockFetch as unknown as typeof global.fetch;

    const service = new RoboticsService({
      baseUrl: "https://api.auraone.ai",
      apiKey: "aura_live_test_key",
      organizationId: "org_123",
      retries: 0,
    });

    await service.listWorkforce();
    await service.assignOperator({
      operatorId: "operator-1",
      taskType: "teleoperation",
    });
    await service.batchAssign([
      { taskType: "teleoperation", priority: "normal", slaMinutes: 60 },
    ]);

    const listRequestUrl = new URL(recorded[0].url);
    expect(listRequestUrl.pathname).toBe("/api/v1/robotics/workforce");
    expect(listRequestUrl.searchParams.get("orgId")).toBe("org_123");

    const assignBody = JSON.parse(recorded[1].init?.body as string) as {
      orgId?: string;
      action?: string;
    };
    expect(assignBody.action).toBe("assign");
    expect(assignBody.orgId).toBe("org_123");

    const batchBody = JSON.parse(recorded[2].init?.body as string) as {
      orgId?: string;
      action?: string;
    };
    expect(batchBody.action).toBe("batch_assign");
    expect(batchBody.orgId).toBe("org_123");
  });

  test("workforce methods require organizationId", async () => {
    const service = new RoboticsService({
      baseUrl: "https://api.auraone.ai",
      apiKey: "aura_live_test_key",
      retries: 0,
    });

    await expect(service.listWorkforce()).rejects.toThrow(
      "organizationId is required for robotics workforce operations",
    );
  });
});
