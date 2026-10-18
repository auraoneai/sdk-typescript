import { describe, expect, jest, test } from "@jest/globals";
import { AuraOneClient } from "../client/AuraOneClient";
import {
  GRAPHQL_PERSISTED_QUERIES,
  GraphQLExecutionError,
  GraphQLService,
} from "../services/GraphQLService";
import type { HttpClient, RequestConfig } from "../types/api";

interface RecordedPost {
  path: string;
  body: Record<string, unknown>;
  config?: RequestConfig;
}

function createMockHttp(
  handler: (call: RecordedPost) => unknown,
): { http: HttpClient; calls: RecordedPost[] } {
  const calls: RecordedPost[] = [];
  const post = jest.fn(
    async (path: string, data?: unknown, config?: RequestConfig) => {
      const call: RecordedPost = {
        path,
        body: (data ?? {}) as Record<string, unknown>,
        config,
      };
      calls.push(call);
      return handler(call) as never;
    },
  );
  const http = {
    get: jest.fn(),
    post,
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
  } as unknown as HttpClient;
  return { http, calls };
}

describe("GraphQLService contract (OSS-03)", () => {
  test("query and mutate hit /api/graphql and unwrap data", async () => {
    const { http, calls } = createMockHttp((call) => {
      if (String(call.body.query).includes("jobs")) {
        return { data: { jobs: [{ id: "job-1", name: "sweep" }] } };
      }
      return { data: { updateJobStatus: { id: "job-1", status: "paused" } } };
    });

    const service = new GraphQLService(http);
    const queryResult = await service.query<{ jobs: Array<{ id: string }> }>(
      "query OptimizationJobs($limit: Int) { jobs(limit: $limit) { id } }",
      {
        operationName: "OptimizationJobs",
        variables: { limit: 5 },
      },
    );
    expect(queryResult.jobs).toEqual([{ id: "job-1", name: "sweep" }]);

    const mutateResult = await service.mutate<{
      updateJobStatus: { id: string; status: string };
    }>(
      'mutation UpdateJob($id: ID!) { updateJobStatus(id: $id, status: "paused") { id status } }',
      {
        operationName: "UpdateJob",
        variables: { id: "job-1" },
        idempotencyKey: "idem-gql-1",
      },
    );
    expect(mutateResult.updateJobStatus.status).toBe("paused");

    expect(calls).toHaveLength(2);
    expect(calls[0].path).toBe("/api/graphql");
    expect(calls[0].body).toEqual({
      query:
        "query OptimizationJobs($limit: Int) { jobs(limit: $limit) { id } }",
      operationName: "OptimizationJobs",
      variables: { limit: 5 },
    });
    expect(calls[1].path).toBe("/api/graphql");
    expect(calls[1].config?.headers?.["Idempotency-Key"]).toBe("idem-gql-1");
  });

  test("getOptimizationJob sends APQ persistedQuery extension and source", async () => {
    const { http, calls } = createMockHttp(() => ({
      data: {
        job: {
          id: "job-9",
          name: "tune",
          strategy: "bayesian",
          status: "running",
          progress: 0.4,
        },
      },
    }));

    const service = new GraphQLService(http);
    const job = await service.getOptimizationJob("job-9");

    expect(job?.id).toBe("job-9");
    expect(calls[0].path).toBe("/api/graphql");
    expect(calls[0].body.extensions).toEqual({
      persistedQuery: {
        version: 1,
        sha256Hash: GRAPHQL_PERSISTED_QUERIES.OptimizationJob.sha256Hash,
      },
    });
  });

  test("throws GraphQLExecutionError when errors array is returned", async () => {
    const { http } = createMockHttp(() => ({
      errors: [
        {
          message: "PersistedQueryNotAllowed",
          extensions: { code: "PERSISTED_QUERY_NOT_ALLOWED" },
        },
      ],
    }));

    const service = new GraphQLService(http);
    await expect(service.query("{ jobs { id } }")).rejects.toThrow(
      GraphQLExecutionError,
    );
  });

  test("AuraOneClient wires client.graphql with API key auth", () => {
    const client = new AuraOneClient({
      apiKey: `ak_${"a1b2c3d4"}_${"0123456789abcdef".repeat(4)}`,
      orgId: "org_test",
    });
    expect(client.graphql).toBeInstanceOf(GraphQLService);
  });
});
