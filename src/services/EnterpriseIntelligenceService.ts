import type { HttpClient, RequestConfig } from "../types/api";
import {
  EnterpriseIntelligenceTransport,
  queueQueryString,
} from "./enterprise-intelligence/base";
import { EnterpriseBatchesClient } from "./enterprise-intelligence/batches";
import {
  EnterpriseConnectorsClient,
  EnterpriseToolBindingsClient,
} from "./enterprise-intelligence/connectors";
import {
  EnterpriseContextSourcesClient,
  EnterpriseHistoricalSetsClient,
} from "./enterprise-intelligence/context-sources";
import {
  EnterpriseDeliveriesClient,
  EnterpriseHumanTasksClient,
} from "./enterprise-intelligence/deliveries";
import {
  EnterpriseImprovementClient,
  EnterpriseRegressionClient,
} from "./enterprise-intelligence/improvement";
import {
  EnterpriseOperationsClient,
  EnterpriseRegistryClient,
} from "./enterprise-intelligence/operations";
import { EnterpriseRunsClient } from "./enterprise-intelligence/runs";
import { EnterpriseWorkflowsClient } from "./enterprise-intelligence/workflows";
import type {
  EnterpriseConnectorReceipt,
  EnterpriseDelivery,
  EnterpriseHealth,
  EnterpriseHumanTaskCompletion,
  EnterpriseIntelligenceList,
  EnterpriseIntelligenceRecord,
  EnterpriseQueueQuery,
  EnterpriseRecord,
  EnterpriseRegressionSuiteRunRequest,
  EnterpriseRun,
  EnterpriseRunCreateOptions,
  EnterpriseRunDelivery,
  EnterpriseRunInputs,
  EnterpriseRunInputsMeta,
  EnterpriseSettings,
  EnterpriseWorkflow,
  EnterpriseWorkflowCreateOptions,
} from "./enterprise-intelligence/types";

export * from "./enterprise-intelligence/types";
export * from "./enterprise-intelligence/types-workflows";
export * from "./enterprise-intelligence/types-runs";
export * from "./enterprise-intelligence/types-context";
export * from "./enterprise-intelligence/types-operations";
export * from "./enterprise-intelligence/errors";
export { buildIngestForm } from "./enterprise-intelligence/batches";
export {
  EnterpriseBatchesClient,
  EnterpriseConnectorsClient,
  EnterpriseContextSourcesClient,
  EnterpriseDeliveriesClient,
  EnterpriseHistoricalSetsClient,
  EnterpriseHumanTasksClient,
  EnterpriseImprovementClient,
  EnterpriseOperationsClient,
  EnterpriseRegistryClient,
  EnterpriseRegressionClient,
  EnterpriseRunsClient,
  EnterpriseToolBindingsClient,
  EnterpriseWorkflowsClient,
};

/**
 * Enterprise Intelligence client for the routes under
 * api/v1/enterprise-intelligence, documented in
 * `docs/api/public-api-contract.md`.
 *
 * Two surfaces share one auth contract:
 *
 * - Customer surface (flat methods below): read workflows, runs, outputs,
 *   traces, deliveries and receipts; start runs (`createRun`).
 * - Operator families (grouped clients such as `workflows`, `batches`,
 *   `connectors`, `operations`): authoring, approvals, acceptance,
 *   connectors, SLOs and improvement. Each method documents the role or
 *   scope it needs; the platform derives roles from the API key's creator.
 *
 * Scopes: reads need `enterprise-intelligence.read`; writes need
 * `enterprise-intelligence.write`; cancellation and compensation need
 * `enterprise-intelligence.cancel`. `health` is unauthenticated. The
 * organization comes from the API key; a configured `orgId` is only sent
 * as a `?orgId=` assertion.
 *
 * Every write sends an `idempotency-key` header (8–255 characters). Pass
 * your own key to retry safely; otherwise one is generated per call.
 *
 * A 503 from any route throws `EnterpriseIntelligenceUnavailableError`.
 */
export class EnterpriseIntelligenceService extends EnterpriseIntelligenceTransport {
  readonly workflows: EnterpriseWorkflowsClient;
  readonly runs: EnterpriseRunsClient;
  readonly batches: EnterpriseBatchesClient;
  readonly deliveries: EnterpriseDeliveriesClient;
  readonly humanTasks: EnterpriseHumanTasksClient;
  readonly connectors: EnterpriseConnectorsClient;
  readonly toolBindings: EnterpriseToolBindingsClient;
  readonly contextSources: EnterpriseContextSourcesClient;
  readonly historicalSets: EnterpriseHistoricalSetsClient;
  readonly improvement: EnterpriseImprovementClient;
  readonly regression: EnterpriseRegressionClient;
  readonly operations: EnterpriseOperationsClient;
  readonly registry: EnterpriseRegistryClient;

  constructor(http: HttpClient, requestConfig: RequestConfig = {}) {
    super(http, requestConfig);
    this.workflows = new EnterpriseWorkflowsClient(http, requestConfig);
    this.runs = new EnterpriseRunsClient(http, requestConfig);
    this.batches = new EnterpriseBatchesClient(http, requestConfig);
    this.deliveries = new EnterpriseDeliveriesClient(http, requestConfig);
    this.humanTasks = new EnterpriseHumanTasksClient(http, requestConfig);
    this.connectors = new EnterpriseConnectorsClient(http, requestConfig);
    this.toolBindings = new EnterpriseToolBindingsClient(http, requestConfig);
    this.contextSources = new EnterpriseContextSourcesClient(
      http,
      requestConfig,
    );
    this.historicalSets = new EnterpriseHistoricalSetsClient(
      http,
      requestConfig,
    );
    this.improvement = new EnterpriseImprovementClient(http, requestConfig);
    this.regression = new EnterpriseRegressionClient(http, requestConfig);
    this.operations = new EnterpriseOperationsClient(http, requestConfig);
    this.registry = new EnterpriseRegistryClient(http, requestConfig);
  }

  /* ── customer surface ─────────────────────────────────────────── */

  /** `GET` workflows — scope: read. */
  async listWorkflows(
    query?: EnterpriseQueueQuery,
  ): Promise<EnterpriseIntelligenceList<EnterpriseWorkflow>> {
    return this.workflows.list(query);
  }

  /** `GET` one workflow — scope: read. */
  async getWorkflow(
    workflowId: string,
  ): Promise<EnterpriseIntelligenceRecord<EnterpriseWorkflow>> {
    return this.workflows.get(workflowId);
  }

  /** `GET` runs — scope: read. */
  async listRuns(
    query?: EnterpriseQueueQuery,
  ): Promise<EnterpriseIntelligenceList<EnterpriseRun>> {
    return this.runs.list(query);
  }

  /**
   * `POST` start a run — scope: write. Sends the required
   * `idempotency-key` header (generated when not supplied); the platform
   * replays the committed outcome on duplicates.
   */
  async createRun(
    options: EnterpriseRunCreateOptions,
  ): Promise<EnterpriseIntelligenceRecord<EnterpriseRun>> {
    return this.runs.create(options);
  }

  /** `GET` one run — scope: read. */
  async getRun(
    runId: string,
  ): Promise<EnterpriseIntelligenceRecord<EnterpriseRun>> {
    return this.runs.get(runId);
  }

  /** `GET` run output — scope: read. */
  async getRunOutput(
    runId: string,
  ): Promise<EnterpriseIntelligenceRecord<Record<string, unknown>>> {
    return this.runs.getOutput(runId);
  }

  /** `GET` run trace — scope: read. */
  async getRunTrace(
    runId: string,
  ): Promise<EnterpriseIntelligenceRecord<Record<string, unknown>>> {
    return this.runs.getTrace(runId);
  }

  /** `GET` run delivery — scope: read. */
  async getRunDelivery(
    runId: string,
  ): Promise<EnterpriseIntelligenceRecord<EnterpriseRunDelivery>> {
    return this.runs.getDelivery(runId);
  }

  /**
   * `GET` run inputs — scope: write. Eligible input content references
   * plus the environment versions this organization's runs have used
   * (bounded to 25 contents / 10 environments).
   */
  async getRunInputs(query?: { q?: string }): Promise<
    EnterpriseIntelligenceRecord<EnterpriseRunInputs> & {
      meta?: EnterpriseRunInputsMeta;
    }
  > {
    return this.runs.getInputs(query);
  }

  /** `GET` deliveries — scope: read. */
  async listDeliveries(
    query?: EnterpriseQueueQuery,
  ): Promise<EnterpriseIntelligenceList<EnterpriseDelivery>> {
    return this.deliveries.list(query);
  }

  /** `GET` one delivery — scope: read. */
  async getDelivery(
    deliveryId: string,
  ): Promise<EnterpriseIntelligenceRecord<EnterpriseDelivery>> {
    return this.deliveries.get(deliveryId);
  }

  /** `GET` connector receipts — scope: read; optional `workflowId`/`runId`. */
  async listConnectorReceipts(
    connectorId: string,
    query?: { workflowId?: string; runId?: string },
  ): Promise<EnterpriseIntelligenceList<EnterpriseConnectorReceipt>> {
    return this.connectors.listReceipts(connectorId, query);
  }

  /** `GET` one connector receipt — scope: read; deeply redacted evidence. */
  async getConnectorReceipt(
    connectorId: string,
    receiptId: string,
    query?: { workflowId?: string; runId?: string },
  ): Promise<EnterpriseIntelligenceRecord<EnterpriseConnectorReceipt>> {
    return this.connectors.getReceipt(connectorId, receiptId, query);
  }

  /**
   * `GET` health — unauthenticated probe. The platform answers 503 with
   * the same body when `status` is `UNAVAILABLE`; that throws
   * `EnterpriseIntelligenceUnavailableError` with the body in `details`.
   */
  async getHealth(): Promise<EnterpriseHealth> {
    return this.read("/api/v1/enterprise-intelligence/health");
  }

  /** `GET` organization policy versions (read-only settings). */
  async getSettings(): Promise<EnterpriseIntelligenceList<EnterpriseSettings>> {
    return this.read("/api/v1/enterprise-intelligence/settings");
  }

  /** `GET` workspace counts: workflows, recent runs, open tasks, billing. */
  async getDashboard(): Promise<
    EnterpriseIntelligenceRecord<EnterpriseRecord>
  > {
    return this.read("/api/v1/enterprise-intelligence/dashboard");
  }

  /* ── workspace operator families kept flat for compatibility ──── */

  /** `POST` workflow draft — scope: write; operator role. */
  async createWorkflow(
    options: EnterpriseWorkflowCreateOptions,
  ): Promise<EnterpriseIntelligenceRecord<EnterpriseWorkflow>> {
    return this.workflows.create(options);
  }

  /** `GET` human tasks — scope: read. */
  async listHumanTasks(
    query?: EnterpriseQueueQuery,
  ): Promise<EnterpriseIntelligenceList<Record<string, unknown>>> {
    return this.humanTasks.list(query);
  }

  /**
   * `POST` complete a human task — scope: write. Body: `{ action,
   * outputContentId, evidence, expectedLockVersion, correction? }`.
   */
  async completeHumanTask(
    taskId: string,
    resolution: EnterpriseHumanTaskCompletion,
    idempotencyKey?: string,
  ): Promise<EnterpriseIntelligenceRecord<Record<string, unknown>>> {
    return this.humanTasks.complete(taskId, resolution, { idempotencyKey });
  }

  /** `GET` connectors — scope: read. */
  async listConnectors(
    query?: EnterpriseQueueQuery,
  ): Promise<EnterpriseIntelligenceList<Record<string, unknown>>> {
    return this.connectors.list(query);
  }

  /** `GET` improvement items — scope: read. */
  async listImprovementItems(
    query?: EnterpriseQueueQuery,
  ): Promise<EnterpriseIntelligenceList<Record<string, unknown>>> {
    // The route ignores queue filters today; they are forwarded unchanged.
    const qs = queueQueryString(query);
    return this.read(`/api/v1/enterprise-intelligence/improvement-items${qs}`);
  }

  /** `GET` evaluations — scope: read. */
  async listEvaluations(
    query?: EnterpriseQueueQuery,
  ): Promise<EnterpriseIntelligenceList<Record<string, unknown>>> {
    return this.improvement.listEvaluations(query);
  }

  /** `GET` regression suites — scope: read. */
  async listRegressionSuites(
    query?: EnterpriseQueueQuery,
  ): Promise<EnterpriseIntelligenceList<Record<string, unknown>>> {
    // The route ignores queue filters today; they are forwarded unchanged.
    const qs = queueQueryString(query);
    return this.read(`/api/v1/enterprise-intelligence/regression-suites${qs}`);
  }

  /**
   * `POST` record a regression suite run — scope: write. Strict body
   * `{ workflowVersionId, evidenceId }`.
   */
  async runRegressionSuite(
    suiteId: string,
    request: EnterpriseRegressionSuiteRunRequest,
    idempotencyKey?: string,
  ): Promise<EnterpriseIntelligenceRecord<Record<string, unknown>>> {
    return this.regression.runSuite(suiteId, request, { idempotencyKey });
  }
}
