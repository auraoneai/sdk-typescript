import type {
  HttpClient,
  IntegrationDefinitionInput,
  IntegrationHealthSummary,
  IntegrationHealthTestRequest,
  IntegrationHealthTestResult,
  IntegrationRegistryEntry,
  IntegrationRegistryFilters,
  RequestConfig,
} from "../types/api";

interface RawIntegrationHealthResponse {
  success?: boolean;
  data?: IntegrationHealthSummary;
}

interface RawIntegrationRegistryResponse {
  success?: boolean;
  data?: IntegrationRegistryEntry | IntegrationRegistryEntry[];
}

export interface ConnectorExecutionReceipt<T = Record<string, unknown>> {
  success?: boolean;
  provider?: string;
  action?: string;
  data?: T;
  [key: string]: unknown;
}

function encodeSegment(value: string): string {
  return encodeURIComponent(value);
}

function normalizeBinaryPayload(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value instanceof Uint8Array) {
    if (typeof Buffer !== "undefined") {
      return Buffer.from(value).toString("base64");
    }
    let binary = "";
    for (let i = 0; i < value.byteLength; i += 1) {
      binary += String.fromCharCode(value[i]);
    }
    return typeof btoa === "function" ? btoa(binary) : binary;
  }
  if (value instanceof ArrayBuffer) {
    return normalizeBinaryPayload(new Uint8Array(value));
  }
  return JSON.stringify(value ?? null);
}

export class BaseConnectorNamespace {
  constructor(
    public readonly providerId: string,
    protected readonly http: HttpClient,
    protected readonly requestConfig: RequestConfig = {},
  ) {}

  protected mergeConfig(options?: RequestConfig): RequestConfig {
    if (!options) return this.requestConfig;
    return {
      ...this.requestConfig,
      ...options,
      headers: {
        ...this.requestConfig.headers,
        ...options.headers,
      },
    };
  }

  /**
   * Install this connector through the connector framework.
   * `POST /api/v1/integrations/connectors/{provider}` with
   * `operation: "install"`. Callers may pass `{ credentials, config, name,
   * environment, subscribedEvents }`; a bare credential map is forwarded as
   * `credentials` for backwards compatibility.
   */
  async connect<T = Record<string, unknown>>(
    payload: Record<string, unknown>,
    options?: RequestConfig,
  ): Promise<T> {
    const {
      credentials,
      config,
      name,
      environment,
      subscribedEvents,
      ...rest
    } = payload ?? {};
    return this.http.post<T>(
      `/api/v1/integrations/connectors/${encodeSegment(this.providerId)}`,
      {
        operation: "install",
        credentials:
          credentials && typeof credentials === "object"
            ? credentials
            : rest,
        ...(config !== undefined ? { config } : {}),
        ...(name !== undefined ? { name } : {}),
        ...(environment !== undefined ? { environment } : {}),
        ...(subscribedEvents !== undefined ? { subscribedEvents } : {}),
      },
      this.mergeConfig(options),
    );
  }

  /**
   * Connection test through the connector framework.
   * `POST /api/v1/integrations/connectors/{provider}` with
   * `operation: "test"`; optional `credentials`/`config`/`connectorId` keys
   * in `payload` are forwarded verbatim.
   */
  async test<T = Record<string, unknown>>(
    payload: Record<string, unknown> = {},
    options?: RequestConfig,
  ): Promise<T> {
    return this.http.post<T>(
      `/api/v1/integrations/connectors/${encodeSegment(this.providerId)}`,
      { ...payload, operation: "test" },
      this.mergeConfig(options),
    );
  }

  /**
   * Durable fan-out through the connector framework dispatch queue.
   * `POST /api/v1/integrations/connectors/{provider}` with
   * `operation: "dispatch"`; `eventType` defaults to `sync.requested` and
   * may be overridden in `payload`.
   */
  async sync<T = Record<string, unknown>>(
    payload: Record<string, unknown>,
    options?: RequestConfig,
  ): Promise<T> {
    const { eventType, ...rest } = payload ?? {};
    return this.http.post<T>(
      `/api/v1/integrations/connectors/${encodeSegment(this.providerId)}`,
      {
        eventType:
          typeof eventType === "string" && eventType.trim()
            ? eventType
            : "sync.requested",
        payload: rest,
        operation: "dispatch",
      },
      this.mergeConfig(options),
    );
  }

  /**
   * Invoke a named connector action through the connector framework.
   * `POST /api/v1/integrations/connectors/{provider}` with
   * `operation: "invoke"` — replaces the retired per-provider workflow
   * execute surface.
   */
  async invoke<T = ConnectorExecutionReceipt>(
    action: string,
    payload: Record<string, unknown> = {},
    options?: RequestConfig,
  ): Promise<T> {
    return this.http.post<T>(
      `/api/v1/integrations/connectors/${encodeSegment(this.providerId)}`,
      {
        action,
        payload,
        operation: "invoke",
      },
      this.mergeConfig(options),
    );
  }
}

export class GitHubActionsConnector extends BaseConnectorNamespace {
  constructor(http: HttpClient, requestConfig?: RequestConfig) {
    super("github-actions", http, requestConfig);
  }

  async dispatchWorkflow(
    params: {
      owner: string;
      repo: string;
      workflowId: string;
      ref: string;
      inputs?: Record<string, unknown>;
    },
    options?: RequestConfig,
  ): Promise<ConnectorExecutionReceipt> {
    return this.invoke("dispatchWorkflow", params, options);
  }

  async getWorkflowRun(
    params: { owner: string; repo: string; runId: number | string },
    options?: RequestConfig,
  ): Promise<ConnectorExecutionReceipt> {
    return this.invoke("getWorkflowRun", params, options);
  }
}

export class GitLabCIConnector extends BaseConnectorNamespace {
  constructor(http: HttpClient, requestConfig?: RequestConfig) {
    super("gitlab-ci", http, requestConfig);
  }

  async triggerPipeline(
    params: {
      projectId: number | string;
      ref: string;
      variables?: Record<string, string>;
    },
    options?: RequestConfig,
  ): Promise<ConnectorExecutionReceipt> {
    return this.invoke("triggerPipeline", params, options);
  }

  async getPipeline(
    params: { projectId: number | string; pipelineId: number | string },
    options?: RequestConfig,
  ): Promise<ConnectorExecutionReceipt> {
    return this.invoke("getPipeline", params, options);
  }
}

export class JenkinsConnector extends BaseConnectorNamespace {
  constructor(http: HttpClient, requestConfig?: RequestConfig) {
    super("jenkins", http, requestConfig);
  }

  async triggerJob(
    params: { jobName: string; parameters?: Record<string, unknown> },
    options?: RequestConfig,
  ): Promise<ConnectorExecutionReceipt> {
    return this.invoke("triggerJob", params, options);
  }

  async getBuildStatus(
    params: { jobName: string; buildNumber: number | string },
    options?: RequestConfig,
  ): Promise<ConnectorExecutionReceipt> {
    return this.invoke("getBuildStatus", params, options);
  }
}

export class CircleCIConnector extends BaseConnectorNamespace {
  constructor(http: HttpClient, requestConfig?: RequestConfig) {
    super("circleci", http, requestConfig);
  }

  async triggerPipeline(
    params: {
      projectSlug: string;
      branch?: string;
      tag?: string;
      parameters?: Record<string, unknown>;
    },
    options?: RequestConfig,
  ): Promise<ConnectorExecutionReceipt> {
    return this.invoke("triggerPipeline", params, options);
  }

  async getPipeline(
    params: { pipelineId: string },
    options?: RequestConfig,
  ): Promise<ConnectorExecutionReceipt> {
    return this.invoke("getPipeline", params, options);
  }
}

export class SnowflakeConnector extends BaseConnectorNamespace {
  constructor(http: HttpClient, requestConfig?: RequestConfig) {
    super("snowflake", http, requestConfig);
  }

  async provisionConnection(
    connectionNameOrInput:
      | string
      | {
          connectionName: string;
          config?: Record<string, unknown>;
          [key: string]: unknown;
        },
    config?: Record<string, unknown>,
    options?: RequestConfig,
  ): Promise<ConnectorExecutionReceipt> {
    const payload =
      typeof connectionNameOrInput === "string"
        ? { connectionName: connectionNameOrInput, config: config ?? {} }
        : connectionNameOrInput;
    return this.invoke("provisionConnection", payload, options);
  }

  async executeQuery(
    params: { connectionName?: string; sql: string; bindings?: unknown[] },
    options?: RequestConfig,
  ): Promise<ConnectorExecutionReceipt> {
    return this.invoke("executeQuery", params, options);
  }

  async exportDataset(
    params: { connectionName?: string; table: string; rows?: unknown[] },
    options?: RequestConfig,
  ): Promise<ConnectorExecutionReceipt> {
    return this.invoke("exportDataset", params, options);
  }
}

export class BigQueryConnector extends BaseConnectorNamespace {
  constructor(http: HttpClient, requestConfig?: RequestConfig) {
    super("bigquery", http, requestConfig);
  }

  async startSync(
    connectionIdOrInput:
      | string
      | {
          connectionId: string;
          sourceTable?: string;
          targetDataset?: string;
          [key: string]: unknown;
        },
    syncOptions?: {
      sourceTable?: string;
      targetDataset?: string;
      [key: string]: unknown;
    },
    options?: RequestConfig,
  ): Promise<ConnectorExecutionReceipt> {
    const payload =
      typeof connectionIdOrInput === "string"
        ? { connectionId: connectionIdOrInput, ...(syncOptions ?? {}) }
        : connectionIdOrInput;
    return this.invoke("startSync", payload, options);
  }

  async insertRows(
    params: {
      datasetId: string;
      tableId: string;
      rows: Array<Record<string, unknown>>;
    },
    options?: RequestConfig,
  ): Promise<ConnectorExecutionReceipt> {
    return this.invoke("insertRows", params, options);
  }
}

export class DatabricksConnector extends BaseConnectorNamespace {
  constructor(http: HttpClient, requestConfig?: RequestConfig) {
    super("databricks", http, requestConfig);
  }

  async runJob(
    params: {
      jobId: number | string;
      notebookParams?: Record<string, unknown>;
      jarParams?: string[];
      pythonParams?: string[];
    },
    options?: RequestConfig,
  ): Promise<ConnectorExecutionReceipt> {
    return this.invoke("runJob", params, options);
  }

  async getRun(
    params: { runId: number | string },
    options?: RequestConfig,
  ): Promise<ConnectorExecutionReceipt> {
    return this.invoke("getRun", params, options);
  }
}

export class S3Connector extends BaseConnectorNamespace {
  constructor(http: HttpClient, requestConfig?: RequestConfig) {
    super("amazon-s3", http, requestConfig);
  }

  async store(
    dataOrInput:
      | Uint8Array
      | ArrayBuffer
      | string
      | {
          key: string;
          content?: Uint8Array | ArrayBuffer | string;
          organizationId?: string;
          dataClassification?: string;
          contentType?: string;
          [key: string]: unknown;
        },
    metadata?: {
      organizationId?: string;
      key: string;
      dataClassification?: string;
      contentType?: string;
      [key: string]: unknown;
    },
    options?: RequestConfig,
  ): Promise<ConnectorExecutionReceipt> {
    if (
      typeof dataOrInput === "object" &&
      dataOrInput !== null &&
      !(dataOrInput instanceof Uint8Array) &&
      !(dataOrInput instanceof ArrayBuffer) &&
      "key" in dataOrInput
    ) {
      const { content, ...rest } = dataOrInput;
      return this.invoke(
        "store",
        {
          ...rest,
          ...(content !== undefined
            ? { contentBase64: normalizeBinaryPayload(content) }
            : {}),
        },
        options,
      );
    }

    return this.invoke(
      "store",
      {
        ...(metadata ?? {}),
        contentBase64: normalizeBinaryPayload(dataOrInput),
      },
      options,
    );
  }

  async getObject(
    params: { key: string; bucket?: string },
    options?: RequestConfig,
  ): Promise<ConnectorExecutionReceipt> {
    return this.invoke("getObject", params, options);
  }

  async listObjects(
    params: { prefix?: string; bucket?: string } = {},
    options?: RequestConfig,
  ): Promise<ConnectorExecutionReceipt> {
    return this.invoke("listObjects", params, options);
  }

  async deleteObject(
    params: { key: string; bucket?: string },
    options?: RequestConfig,
  ): Promise<ConnectorExecutionReceipt> {
    return this.invoke("deleteObject", params, options);
  }
}

export class PagerDutyConnector extends BaseConnectorNamespace {
  constructor(http: HttpClient, requestConfig?: RequestConfig) {
    super("pagerduty", http, requestConfig);
  }

  async triggerIncident(
    params: {
      summary: string;
      source?: string;
      severity?: "critical" | "error" | "warning" | "info" | string;
      routingKey?: string;
      customDetails?: Record<string, unknown>;
    },
    options?: RequestConfig,
  ): Promise<ConnectorExecutionReceipt> {
    return this.invoke("triggerIncident", params, options);
  }

  async acknowledgeIncident(
    params: { dedupKey: string },
    options?: RequestConfig,
  ): Promise<ConnectorExecutionReceipt> {
    return this.invoke("acknowledgeIncident", params, options);
  }

  async resolveIncident(
    params: { dedupKey: string; summary?: string },
    options?: RequestConfig,
  ): Promise<ConnectorExecutionReceipt> {
    return this.invoke("resolveIncident", params, options);
  }
}

export class OpsgenieConnector extends BaseConnectorNamespace {
  constructor(http: HttpClient, requestConfig?: RequestConfig) {
    super("opsgenie", http, requestConfig);
  }

  async createAlert(
    params: {
      message: string;
      priority?: "P1" | "P2" | "P3" | "P4" | "P5" | string;
      alias?: string;
      description?: string;
      tags?: string[];
      details?: Record<string, unknown>;
    },
    options?: RequestConfig,
  ): Promise<ConnectorExecutionReceipt> {
    return this.invoke("createAlert", params, options);
  }

  async closeAlert(
    params: { identifier: string; note?: string },
    options?: RequestConfig,
  ): Promise<ConnectorExecutionReceipt> {
    return this.invoke("closeAlert", params, options);
  }
}

export class SlackConnector extends BaseConnectorNamespace {
  constructor(http: HttpClient, requestConfig?: RequestConfig) {
    super("slack", http, requestConfig);
  }

  async sendInterviewNotification(
    params: {
      type: string;
      channel?: string;
      text?: string;
      [key: string]: unknown;
    },
    options?: RequestConfig,
  ): Promise<ConnectorExecutionReceipt> {
    return this.invoke("sendInterviewNotification", params, options);
  }

  async sendMessage(
    params: {
      channel?: string;
      text: string;
      blocks?: unknown[];
      [key: string]: unknown;
    },
    options?: RequestConfig,
  ): Promise<ConnectorExecutionReceipt> {
    return this.invoke("sendMessage", params, options);
  }

  async postNotification(
    params: Record<string, unknown>,
    options?: RequestConfig,
  ): Promise<ConnectorExecutionReceipt> {
    return this.invoke("postNotification", params, options);
  }
}

export class TeamsConnector extends BaseConnectorNamespace {
  constructor(http: HttpClient, requestConfig?: RequestConfig) {
    super("microsoft-teams", http, requestConfig);
  }

  async sendMessage(
    params: {
      title?: string;
      text: string;
      sections?: unknown[];
      [key: string]: unknown;
    },
    options?: RequestConfig,
  ): Promise<ConnectorExecutionReceipt> {
    return this.invoke("sendMessage", params, options);
  }

  async sendAdaptiveCard(
    params: Record<string, unknown>,
    options?: RequestConfig,
  ): Promise<ConnectorExecutionReceipt> {
    return this.invoke("sendAdaptiveCard", params, options);
  }
}

export class JiraConnector extends BaseConnectorNamespace {
  constructor(http: HttpClient, requestConfig?: RequestConfig) {
    super("jira", http, requestConfig);
  }

  async createIssue(
    params: {
      projectKey: string;
      summary: string;
      description?: string;
      issueType?: string;
      priority?: string;
      labels?: string[];
      [key: string]: unknown;
    },
    options?: RequestConfig,
  ): Promise<ConnectorExecutionReceipt> {
    return this.invoke("createIssue", params, options);
  }

  async getIssue(
    params: { issueKey: string },
    options?: RequestConfig,
  ): Promise<ConnectorExecutionReceipt> {
    return this.invoke("getIssue", params, options);
  }

  async transitionIssue(
    params: { issueKey: string; transitionId: string },
    options?: RequestConfig,
  ): Promise<ConnectorExecutionReceipt> {
    return this.invoke("transitionIssue", params, options);
  }
}

export class DatadogConnector extends BaseConnectorNamespace {
  constructor(http: HttpClient, requestConfig?: RequestConfig) {
    super("datadog", http, requestConfig);
  }

  async sendMetric(
    params: {
      name: string;
      value: number;
      timestamp?: Date | string | number;
      type?: "gauge" | "count" | "rate" | "histogram" | string;
      tags?: string[];
    },
    options?: RequestConfig,
  ): Promise<ConnectorExecutionReceipt> {
    const normalizedTimestamp =
      params.timestamp instanceof Date
        ? params.timestamp.toISOString()
        : params.timestamp;
    return this.invoke(
      "sendMetric",
      {
        ...params,
        ...(normalizedTimestamp !== undefined
          ? { timestamp: normalizedTimestamp }
          : {}),
      },
      options,
    );
  }

  async sendEvent(
    params: {
      title: string;
      text: string;
      alertType?: string;
      tags?: string[];
    },
    options?: RequestConfig,
  ): Promise<ConnectorExecutionReceipt> {
    return this.invoke("sendEvent", params, options);
  }
}

export class GrafanaConnector extends BaseConnectorNamespace {
  constructor(http: HttpClient, requestConfig?: RequestConfig) {
    super("grafana", http, requestConfig);
  }

  async createAnnotation(
    params: {
      text: string;
      time?: number;
      timeEnd?: number;
      dashboardUID?: string;
      panelId?: number;
      tags?: string[];
    },
    options?: RequestConfig,
  ): Promise<ConnectorExecutionReceipt> {
    return this.invoke("createAnnotation", params, options);
  }

  async listAnnotations(
    params: { dashboardUID?: string; from?: number; to?: number } = {},
    options?: RequestConfig,
  ): Promise<ConnectorExecutionReceipt> {
    return this.invoke("listAnnotations", params, options);
  }
}

export class SplunkConnector extends BaseConnectorNamespace {
  constructor(http: HttpClient, requestConfig?: RequestConfig) {
    super("splunk", http, requestConfig);
  }

  async sendEvents(
    eventsOrPayload:
      | Array<Record<string, unknown>>
      | {
          events: Array<Record<string, unknown>>;
          source?: string;
          sourcetype?: string;
          index?: string;
        },
    options?: RequestConfig,
  ): Promise<ConnectorExecutionReceipt> {
    const payload = Array.isArray(eventsOrPayload)
      ? { events: eventsOrPayload }
      : eventsOrPayload;
    return this.invoke("sendEvents", payload, options);
  }

  async sendEvent(
    event: Record<string, unknown>,
    options?: RequestConfig,
  ): Promise<ConnectorExecutionReceipt> {
    return this.sendEvents([event], options);
  }
}

export class SalesforceConnector extends BaseConnectorNamespace {
  constructor(http: HttpClient, requestConfig?: RequestConfig) {
    super("salesforce", http, requestConfig);
  }

  async syncContact(
    params: Record<string, unknown>,
    options?: RequestConfig,
  ): Promise<ConnectorExecutionReceipt> {
    return this.invoke("syncContact", params, options);
  }

  async upsertRecord(
    params: {
      object: string;
      externalIdField?: string;
      record: Record<string, unknown>;
    },
    options?: RequestConfig,
  ): Promise<ConnectorExecutionReceipt> {
    return this.invoke("upsertRecord", params, options);
  }

  async readRecord(
    params: { object: string; recordId: string; fields?: string[] },
    options?: RequestConfig,
  ): Promise<ConnectorExecutionReceipt> {
    return this.invoke("readRecord", params, options);
  }

  async createCase(
    params: Record<string, unknown>,
    options?: RequestConfig,
  ): Promise<ConnectorExecutionReceipt> {
    return this.invoke("createCase", params, options);
  }
}

export class HubSpotConnector extends BaseConnectorNamespace {
  constructor(http: HttpClient, requestConfig?: RequestConfig) {
    super("hubspot", http, requestConfig);
  }

  async readContact(
    params: { contactId: string; fields?: string[] },
    options?: RequestConfig,
  ): Promise<ConnectorExecutionReceipt> {
    return this.invoke("readContact", params, options);
  }

  async upsertContact(
    params: {
      email: string;
      firstname?: string;
      lastname?: string;
      company?: string;
      jobtitle?: string;
      humanApprovalId?: string;
      [key: string]: unknown;
    },
    options?: RequestConfig,
  ): Promise<ConnectorExecutionReceipt> {
    return this.invoke("upsertContact", params, options);
  }

  async syncDeal(
    params: Record<string, unknown>,
    options?: RequestConfig,
  ): Promise<ConnectorExecutionReceipt> {
    return this.invoke("syncDeal", params, options);
  }
}

export const SUPPORTED_CONNECTOR_NAMESPACES = [
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
] as const;

export type SupportedConnectorNamespace =
  (typeof SUPPORTED_CONNECTOR_NAMESPACES)[number];

export class IntegrationsService {
  // 16 core connectors + 2 CRM connectors (OSS-16c)
  public readonly githubActions: GitHubActionsConnector;
  public readonly gitlabCi: GitLabCIConnector;
  public readonly jenkins: JenkinsConnector;
  public readonly circleci: CircleCIConnector;
  public readonly snowflake: SnowflakeConnector;
  public readonly bigquery: BigQueryConnector;
  public readonly databricks: DatabricksConnector;
  public readonly s3: S3Connector;
  public readonly pagerduty: PagerDutyConnector;
  public readonly opsgenie: OpsgenieConnector;
  public readonly slack: SlackConnector;
  public readonly teams: TeamsConnector;
  public readonly jira: JiraConnector;
  public readonly datadog: DatadogConnector;
  public readonly grafana: GrafanaConnector;
  public readonly splunk: SplunkConnector;
  public readonly salesforce: SalesforceConnector;
  public readonly hubspot: HubSpotConnector;

  // Quickstart shorthand aliases
  public readonly github: GitHubActionsConnector;
  public readonly gitlab: GitLabCIConnector;
  public readonly amazonS3: S3Connector;
  public readonly microsoftTeams: TeamsConnector;

  constructor(
    private readonly http: HttpClient,
    private readonly requestConfig: RequestConfig = {},
  ) {
    this.githubActions = new GitHubActionsConnector(http, requestConfig);
    this.gitlabCi = new GitLabCIConnector(http, requestConfig);
    this.jenkins = new JenkinsConnector(http, requestConfig);
    this.circleci = new CircleCIConnector(http, requestConfig);
    this.snowflake = new SnowflakeConnector(http, requestConfig);
    this.bigquery = new BigQueryConnector(http, requestConfig);
    this.databricks = new DatabricksConnector(http, requestConfig);
    this.s3 = new S3Connector(http, requestConfig);
    this.pagerduty = new PagerDutyConnector(http, requestConfig);
    this.opsgenie = new OpsgenieConnector(http, requestConfig);
    this.slack = new SlackConnector(http, requestConfig);
    this.teams = new TeamsConnector(http, requestConfig);
    this.jira = new JiraConnector(http, requestConfig);
    this.datadog = new DatadogConnector(http, requestConfig);
    this.grafana = new GrafanaConnector(http, requestConfig);
    this.splunk = new SplunkConnector(http, requestConfig);
    this.salesforce = new SalesforceConnector(http, requestConfig);
    this.hubspot = new HubSpotConnector(http, requestConfig);

    this.github = this.githubActions;
    this.gitlab = this.gitlabCi;
    this.amazonS3 = this.s3;
    this.microsoftTeams = this.teams;
  }

  async getHealth(
    options: { detailed?: boolean; organizationId?: string } = {},
  ): Promise<IntegrationHealthSummary> {
    const search = new URLSearchParams();
    if (options.detailed) search.set("detailed", "true");
    if (options.organizationId)
      search.set("organizationId", options.organizationId);
    const query = search.size ? `?${search.toString()}` : "";

    const response = await this.http.get<RawIntegrationHealthResponse>(
      `/api/v1/integration/health${query}`,
      this.requestConfig,
    );

    if (!response?.data) {
      throw new Error("Integration health response missing payload");
    }

    return response.data;
  }

  async runHealthTest(
    payload: IntegrationHealthTestRequest,
  ): Promise<IntegrationHealthTestResult[]> {
    const response = await this.http.post<{
      data?: IntegrationHealthTestResult[];
    }>(
      "/api/v1/integrations/scale/test",
      payload,
      this.requestConfig,
    );

    return response?.data ?? [];
  }

  async listRegistry(
    filters: IntegrationRegistryFilters = {},
  ): Promise<IntegrationRegistryEntry[]> {
    const search = new URLSearchParams();
    if (filters.category?.length)
      search.set("category", filters.category.join(","));
    if (filters.type?.length) search.set("type", filters.type.join(","));
    if (filters.provider?.length)
      search.set("provider", filters.provider.join(","));
    if (filters.capabilities?.length)
      search.set("capabilities", filters.capabilities.join(","));
    if (filters.tags?.length) search.set("tags", filters.tags.join(","));
    if (typeof filters.verified === "boolean")
      search.set("verified", String(filters.verified));
    if (typeof filters.active === "boolean")
      search.set("active", String(filters.active));
    if (filters.search) search.set("search", filters.search);
    if (filters.organizationId)
      search.set("organizationId", filters.organizationId);

    const query = search.size ? `?${search.toString()}` : "";
    const response = await this.http.get<RawIntegrationRegistryResponse>(
      `/api/v1/integration/registry${query}`,
      this.requestConfig,
    );

    const payload = response?.data;
    if (!payload) {
      return [];
    }

    return Array.isArray(payload) ? payload : [payload];
  }

  async registerIntegration(
    definition: IntegrationDefinitionInput,
  ): Promise<IntegrationRegistryEntry> {
    const response = await this.http.post<RawIntegrationRegistryResponse>(
      "/api/v1/integration/registry",
      definition,
      this.requestConfig,
    );

    const payload = response?.data;
    if (!payload) {
      throw new Error("Integration registration returned an empty response");
    }

    return Array.isArray(payload) ? payload[0] : payload;
  }
}
