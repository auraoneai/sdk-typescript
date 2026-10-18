import { describe, expect, jest, test } from "@jest/globals";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { AuraClient, EvaluationStatus } from "../client";
import { EvaluationsService } from "../services/EvaluationsService";
import type { HttpClient } from "../types/api";

const FIXTURES = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../contract-fixtures/evaluations",
);

const loadFixture = (name: string): Record<string, unknown> =>
  JSON.parse(readFileSync(join(FIXTURES, name), "utf8")) as Record<
    string,
    unknown
  >;

function clientReturning(
  responder: (url: string, init?: RequestInit) => Record<string, unknown>,
): { client: AuraClient; calls: Array<{ url: string; init?: RequestInit }> } {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const post = jest.fn(async (path: string) => {
    const res = responder(path, { method: "POST" });
    calls.push({ url: path, init: { method: "POST" } });
    return res;
  });
  const get = jest.fn(async (path: string) => {
    const res = responder(path);
    calls.push({ url: path });
    return res;
  });
  const http = {
    get,
    post,
    put: jest.fn(async () => ({})),
    delete: jest.fn(async () => ({})),
    patch: jest.fn(async () => ({})),
  } as unknown as HttpClient;
  const client = new AuraClient({
    apiKey: `ak_${"ab12cd34"}_${"f".repeat(64)}`,
    baseUrl: "http://unit.test",
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (client as any).evaluations = new EvaluationsService(http);
  return { client, calls };
}

describe("Evaluations contract fixtures (platform-verified shapes)", () => {
  test("create response (201 body) parses to EvaluationResult", async () => {
    const create = loadFixture("create-response.json");
    const get = loadFixture("get-response.json");
    const { client } = clientReturning((url, init) =>
      init?.method === "POST" ? create : get,
    );

    const result = await client.evaluate("tpl_example", "bundle://agent", {
      wait: false,
    });
    expect(result.id).toBe("eval_9f1c2d");
    expect(result.status).toBe(EvaluationStatus.PENDING);
  });

  test("get response parses metrics array into a record", async () => {
    const get = loadFixture("get-response.json");
    const { client } = clientReturning(() => get);

    const result = await client.getEvaluation("eval_9f1c2d");
    expect(result.id).toBe("eval_9f1c2d");
    expect(result.status).toBe(EvaluationStatus.COMPLETED);
    expect(result.metrics).toEqual({ accuracy: 0.91, latency_ms: 123 });
    expect(result.completed_at).toBe("2026-01-01T00:05:00.000Z");
  });

  test("cancel response {success, evaluation_id, status} maps to result", async () => {
    const cancel = loadFixture("cancel-response.json");
    const { client } = clientReturning(() => cancel);

    const result = await client.cancelEvaluation("eval_9f1c2d");
    expect(result.id).toBe("eval_9f1c2d");
    expect(result.status).toBe(EvaluationStatus.CANCELLED);
  });

  test("waitForCompletion stops on pending -> cancelled transition", async () => {
    const get = loadFixture("get-response.json");
    const cancelled = { ...get, status: "cancelled", state: "cancelled" };
    let polls = 0;
    const { client } = clientReturning(() => {
      polls++;
      return polls === 1 ? { ...get, status: "pending" } : cancelled;
    });

    const result = await client.waitForCompletion("eval_9f1c2d", 30);
    expect(result.status).toBe(EvaluationStatus.CANCELLED);
  });
});
