import { describe, expect, jest, test } from "@jest/globals";
import { AuraOneClient } from "../client/AuraOneClient";
import {
  IntegrationsService,
  SUPPORTED_CONNECTOR_NAMESPACES,
} from "../services/IntegrationsService";
import type { HttpClient, RequestConfig } from "../types/api";

interface RecordedRequest {
  method: string;
  path: string;
  body?: unknown;
  config?: RequestConfig;
}

function createMockHttp(): {
  http: HttpClient;
  calls: RecordedRequest[];
} {
  const calls: RecordedRequest[] = [];
  const record = (method: string) =>
    jest.fn(
      async (
        path: string,
        bodyOrConfig?: unknown,
        maybeConfig?: RequestConfig,
      ) => {
        const hasBody = method === "post" || method === "put" || method === "patch";
        calls.push({
          method,
          path,
          body: hasBody ? bodyOrConfig : undefined,
          config: (hasBody ? maybeConfig : bodyOrConfig) as
            | RequestConfig
            | undefined,
        });
        return { success: true, data: { ok: true } } as never;
      },
    );

  const http = {
    get: record("get"),
    post: record("post"),
    put: record("put"),
    delete: record("delete"),
    patch: record("patch"),
  } as unknown as HttpClient;

  return { http, calls };
}

describe("IntegrationsService connector namespaces (OSS-16c)", () => {
  test("exposes all 16 connectors plus salesforce and hubspot on client.integrations", () => {
    const client = new AuraOneClient({
      apiKey: `ak_${"a1b2c3d4"}_${"0123456789abcdef".repeat(4)}`,
    });

    expect(SUPPORTED_CONNECTOR_NAMESPACES).toEqual([
      "githubActions",
      "gitlabCi",
      "jenkins",
      "circleci",
      "snowflake",
      "bigquery",
      "databricks",
      "s3",
      "pagerduty",
      "opsgenie",
      "slack",
      "teams",
      "jira",
      "datadog",
      "grafana",
      "splunk",
      "salesforce",
      "hubspot",
    ]);

    for (const namespace of SUPPORTED_CONNECTOR_NAMESPACES) {
      expect(client.integrations[namespace]).toBeDefined();
      expect(typeof client.integrations[namespace].connect).toBe("function");
      expect(typeof client.integrations[namespace].test).toBe("function");
      expect(typeof client.integrations[namespace].sync).toBe("function");
      expect(typeof client.integrations[namespace].invoke).toBe("function");
    }

    // Aliases
    expect(client.integrations.github).toBe(client.integrations.githubActions);
    expect(client.integrations.gitlab).toBe(client.integrations.gitlabCi);
    expect(client.integrations.amazonS3).toBe(client.integrations.s3);
    expect(client.integrations.microsoftTeams).toBe(client.integrations.teams);
  });

  test("executes provider actions for all 18 connector namespaces", async () => {
    const { http, calls } = createMockHttp();
    const integrations = new IntegrationsService(http);

    await integrations.githubActions.dispatchWorkflow({
      owner: "aura",
      repo: "evals",
      workflowId: "ci.yml",
      ref: "main",
    });
    await integrations.gitlabCi.triggerPipeline({
      projectId: 123,
      ref: "main",
    });
    await integrations.jenkins.triggerJob({
      jobName: "regressions",
      parameters: { SHA: "abc123" },
    });
    await integrations.circleci.triggerPipeline({
      projectSlug: "gh/auraone/evals",
      branch: "main",
    });
    await integrations.snowflake.provisionConnection("prod-warehouse", {
      account: "xy12345",
    });
    await integrations.bigquery.startSync("conn-1", {
      sourceTable: "runs",
      targetDataset: "auraone",
    });
    await integrations.databricks.runJob({
      jobId: 42,
      notebookParams: { runId: "r-1" },
    });
    await integrations.s3.store(new Uint8Array([1, 2, 3]), {
      organizationId: "org_1",
      key: "evidence.json",
      dataClassification: "confidential",
    });
    await integrations.pagerduty.triggerIncident({
      summary: "Eval failed",
      source: "AuraOne",
      severity: "critical",
    });
    await integrations.opsgenie.createAlert({
      message: "Regression bank stall",
      priority: "P2",
    });
    await integrations.slack.sendInterviewNotification({
      type: "interview_completed",
      channel: "#evals",
    });
    await integrations.teams.sendMessage({
      title: "Run passed",
      text: "All checks green",
    });
    await integrations.jira.createIssue({
      projectKey: "AURA",
      summary: "Evaluation failure",
      description: "Details",
    });
    await integrations.datadog.sendMetric({
      name: "eval.latency",
      value: 120,
      type: "gauge",
    });
    await integrations.grafana.createAnnotation({
      text: "Regression gate tripped",
      time: 1700000000000,
    });
    await integrations.splunk.sendEvents([{ event: "audit.completed" }]);
    await integrations.salesforce.upsertRecord({
      object: "Account",
      record: { Name: "Acme" },
    });
    await integrations.hubspot.upsertContact({
      email: "ops@example.com",
      firstname: "Ada",
    });

    expect(calls).toHaveLength(18);
    expect(calls[0]).toMatchObject({
      method: "post",
      path: "/api/v1/integrations/connectors/github-actions",
      body: {
        operation: "invoke",
        action: "dispatchWorkflow",
      },
    });
    expect(calls[4]).toMatchObject({
      method: "post",
      path: "/api/v1/integrations/connectors/snowflake",
      body: {
        operation: "invoke",
        action: "provisionConnection",
        payload: {
          connectionName: "prod-warehouse",
          config: { account: "xy12345" },
        },
      },
    });
    expect(calls[16]).toMatchObject({
      method: "post",
      path: "/api/v1/integrations/connectors/salesforce",
      body: {
        operation: "invoke",
        action: "upsertRecord",
      },
    });
    expect(calls[17]).toMatchObject({
      method: "post",
      path: "/api/v1/integrations/connectors/hubspot",
      body: {
        operation: "invoke",
        action: "upsertContact",
      },
    });
  });

  test("connect/test/sync hit the connector framework endpoints with operation bodies", async () => {
    const { http, calls } = createMockHttp();
    const integrations = new IntegrationsService(http);

    await integrations.pagerduty.connect({ routingKey: "pd-key-1" });
    await integrations.pagerduty.test({ connectorId: "conn_1" });
    await integrations.slack.sync({ table: "runs" });
    await integrations.slack.invoke("postRunEvent", {
      runId: "r-1",
      summary: "ok",
    });

    expect(calls[0]).toMatchObject({
      method: "post",
      path: "/api/v1/integrations/connectors/pagerduty",
      body: {
        operation: "install",
        credentials: { routingKey: "pd-key-1" },
      },
    });
    expect(calls[1]).toMatchObject({
      method: "post",
      path: "/api/v1/integrations/connectors/pagerduty",
      body: { connectorId: "conn_1", operation: "test" },
    });
    expect(calls[2]).toMatchObject({
      method: "post",
      path: "/api/v1/integrations/connectors/slack",
      body: {
        eventType: "sync.requested",
        payload: { table: "runs" },
        operation: "dispatch",
      },
    });
    expect(calls[3]).toMatchObject({
      method: "post",
      path: "/api/v1/integrations/connectors/slack",
      body: {
        action: "postRunEvent",
        payload: { runId: "r-1", summary: "ok" },
        operation: "invoke",
      },
    });
  });
});
