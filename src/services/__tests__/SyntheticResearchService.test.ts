import { SyntheticResearchService } from "../SyntheticResearchService";
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
    service: new SyntheticResearchService(http, {
      headers: { "X-Org-Id": "org-1" },
    }),
  };
}

describe("SyntheticResearchService", () => {
  it("uses cursor pagination and the canonical source path", async () => {
    const { http, service } = client();
    http.get.mockResolvedValue({
      data: [],
      nextCursor: null,
      requestId: "req-1",
    });

    await service.listSources({ cursor: "next:1", limit: 25 });

    expect(http.get).toHaveBeenCalledWith(
      "/api/v1/synthetic-research/sources?cursor=next%3A1&limit=25",
      { headers: { "X-Org-Id": "org-1" } },
    );
  });

  it("sends request and idempotency identifiers on mutations", async () => {
    const { http, service } = client();
    http.post.mockResolvedValue({
      data: { id: "source-1" },
      requestId: "req-1",
    });

    await service.createSource(
      { name: "Authorized survey" },
      { idempotencyKey: "source-create-1", requestId: "req-client-1" },
    );

    expect(http.post).toHaveBeenCalledWith(
      "/api/v1/synthetic-research/sources",
      { name: "Authorized survey" },
      {
        headers: {
          "X-Org-Id": "org-1",
          "Idempotency-Key": "source-create-1",
          "X-Request-Id": "req-client-1",
        },
      },
    );
  });

  it("encodes identifiers and routes run result/report operations", async () => {
    const { http, service } = client();
    http.get.mockResolvedValue({ data: {}, requestId: "req-1" });
    http.post.mockResolvedValue({ data: {}, requestId: "req-1" });

    await service.getQuestionResults("run/1", "q 1");
    await service.createExport(
      "run/1",
      { format: "csv" },
      { idempotencyKey: "export-1" },
    );

    expect(http.get).toHaveBeenCalledWith(
      "/api/v1/synthetic-research/runs/run%2F1/results/questions/q%201",
      { headers: { "X-Org-Id": "org-1" } },
    );
    expect(http.post).toHaveBeenCalledWith(
      "/api/v1/synthetic-research/runs/run%2F1/exports",
      { format: "csv" },
      { headers: { "X-Org-Id": "org-1", "Idempotency-Key": "export-1" } },
    );
  });

  it("covers additive governance, evidence, settings, and result routes", async () => {
    const { http, service } = client();
    http.get.mockResolvedValue({ data: {}, requestId: "req-1" });
    http.post.mockResolvedValue({ data: {}, requestId: "req-1" });
    http.put.mockResolvedValue({ data: {}, requestId: "req-1" });

    await service.getPersonaEvidence("persona/1", "trace-1");
    await service.estimateCost({ respondents: 100 }, { requestId: "trace-2" });
    await service.updateSettings(
      "retention/policy",
      { days: 30 },
      { idempotencyKey: "settings-1" },
    );

    expect(http.get).toHaveBeenCalledWith(
      "/api/v1/synthetic-research/personas/persona%2F1/evidence",
      { headers: { "X-Org-Id": "org-1", "X-Request-Id": "trace-1" } },
    );
    expect(http.post).toHaveBeenCalledWith(
      "/api/v1/synthetic-research/cost-estimates",
      { respondents: 100 },
      { headers: { "X-Org-Id": "org-1", "X-Request-Id": "trace-2" } },
    );
    expect(http.put).toHaveBeenCalledWith(
      "/api/v1/synthetic-research/settings/retention%2Fpolicy",
      { days: 30 },
      { headers: { "X-Org-Id": "org-1", "Idempotency-Key": "settings-1" } },
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
