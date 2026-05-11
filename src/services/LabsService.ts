import type {
  CreateLabBundleRequest,
  CreateLabsEvaluationRequest,
  LabBundle,
  LabBundleList,
  LabBundleTemplate,
  LabsEvaluation,
  LabBundleStatus,
  LabBundlePolicies,
  LabBundleDomain,
  UpdateLabBundleRequest,
} from "../types/api";
import type { HttpClient, RequestConfig } from "../types/api";

interface RawLabsEvaluation {
  id: string;
  status?: string;
  state?: string;
  priority?: string;
  suite_id?: string | null;
  suiteId?: string | null;
  model?: string | null;
  template?: { id: string; name: string } | null;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
  metrics?: Array<{ name?: string; metricName?: string; value?: number; timestamp?: string }>;
  results?: Array<{
    id: string;
    created_at?: string;
    createdAt?: string;
    metrics?: Record<string, unknown>;
    data?: Record<string, unknown>;
  }>;
  queue?: { position: number; estimated_wait_seconds?: number | null } | null;
  progress?: number | null;
  inputs_count?: number | null;
  inputsCount?: number | null;
  artifacts?: Array<{
    id: string;
    name: string;
    size?: number;
    contentType?: string;
    createdAt?: string;
  }>;
}

interface RawLabBundle {
  id: string;
  orgId: string;
  templateId?: string | null;
  domain: LabBundleDomain;
  name: string;
  status: LabBundleStatus;
  policies?: LabBundlePolicies;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface RawLabBundleTemplate {
  id: string;
  domain: LabBundleDomain;
  name: string;
  description?: string;
  datasets?: string[];
  agents?: string[];
  evalSuites?: string[];
  defaultPolicies: LabBundlePolicies;
}

export class LabsService {
  constructor(
    private readonly http: HttpClient,
    private readonly requestConfig: RequestConfig = {},
  ) {}

  async createEvaluation(request: CreateLabsEvaluationRequest): Promise<LabsEvaluation> {
    const { waitForCompletion, timeoutSeconds, pollIntervalMs, ...payload } = request;
    const response = await this.http.post<RawLabsEvaluation>(
      "/v1/labs/evals",
      payload,
      this.requestConfig,
    );
    const evaluation = this.toEvaluation(response);

    if (waitForCompletion) {
      return this.waitForCompletion(
        evaluation.id,
        timeoutSeconds ?? 600,
        pollIntervalMs ?? 2000,
      );
    }

    return evaluation;
  }

  async getEvaluation(evaluationId: string): Promise<LabsEvaluation> {
    const response = await this.http.get<RawLabsEvaluation>(
      `/v1/labs/evals/${encodeURIComponent(evaluationId)}`,
      this.requestConfig,
    );
    return this.toEvaluation(response);
  }

  async waitForCompletion(
    evaluationId: string,
    timeoutSeconds = 600,
    pollIntervalMs = 2000,
  ): Promise<LabsEvaluation> {
    const start = Date.now();
    const timeout = timeoutSeconds * 1000;

    while (Date.now() - start < timeout) {
      const evaluation = await this.getEvaluation(evaluationId);
      if (this.isTerminalState(evaluation.status)) {
        return evaluation;
      }
      await this.delay(pollIntervalMs);
    }

    throw new Error(
      `Labs evaluation ${evaluationId} did not complete within ${timeoutSeconds}s`,
    );
  }

  async listBundles(): Promise<LabBundleList> {
    const response = await this.http.get<{ data?: RawLabBundle[]; templates?: RawLabBundleTemplate[] }>(
      "/v1/labs/bundles",
      this.requestConfig,
    );

    return {
      bundles: (response?.data ?? []).map((bundle) => this.toBundle(bundle)),
      templates: (response?.templates ?? []).map((template) => this.toTemplate(template)),
    };
  }

  async createBundle(payload: CreateLabBundleRequest): Promise<LabBundle> {
    const response = await this.http.post<{ data: RawLabBundle }>(
      "/v1/labs/bundles",
      payload,
      this.requestConfig,
    );
    return this.toBundle(response.data);
  }

  async getBundle(bundleId: string): Promise<LabBundle> {
    const response = await this.http.get<{ data: RawLabBundle }>(
      `/v1/labs/bundles/${encodeURIComponent(bundleId)}`,
      this.requestConfig,
    );
    return this.toBundle(response.data);
  }

  async updateBundle(bundleId: string, payload: UpdateLabBundleRequest): Promise<LabBundle> {
    const response = await this.http.patch<{ data: RawLabBundle }>(
      `/v1/labs/bundles/${encodeURIComponent(bundleId)}`,
      payload,
      this.requestConfig,
    );
    return this.toBundle(response.data);
  }

  async deleteBundle(bundleId: string): Promise<void> {
    await this.http.delete(
      `/v1/labs/bundles/${encodeURIComponent(bundleId)}`,
      this.requestConfig,
    );
  }

  private toEvaluation(payload: RawLabsEvaluation): LabsEvaluation {
    const metrics = payload.metrics?.map((metric) => ({
      name: metric.name ?? metric.metricName ?? "metric",
      value: typeof metric.value === "number" ? metric.value : Number(metric.value ?? 0),
      timestamp: metric.timestamp,
    }));

    const results = payload.results?.map((result) => ({
      id: result.id,
      createdAt: result.createdAt ?? result.created_at,
      metrics: result.metrics ?? {},
      data: result.data ?? {},
    }));

    return {
      id: payload.id,
      status: payload.status ?? payload.state ?? "unknown",
      priority: payload.priority,
      suiteId: payload.suiteId ?? payload.suite_id ?? null,
      model: payload.model ?? null,
      template: payload.template ?? null,
      createdAt: payload.createdAt ?? payload.created_at ?? new Date().toISOString(),
      updatedAt: payload.updatedAt ?? payload.updated_at,
      queue: payload.queue
        ? {
            position: payload.queue.position,
            estimatedWaitSeconds: payload.queue.estimated_wait_seconds ?? null,
          }
        : null,
      metrics,
      results,
      inputsCount: payload.inputsCount ?? payload.inputs_count ?? null,
      artifacts: payload.artifacts ?? [],
      progress: payload.progress ?? null,
    };
  }

  private toBundle(bundle: RawLabBundle): LabBundle {
    return {
      id: bundle.id,
      orgId: bundle.orgId,
      templateId: bundle.templateId ?? null,
      domain: bundle.domain,
      name: bundle.name,
      status: bundle.status,
      policies: bundle.policies ?? {},
      metadata: bundle.metadata,
      createdAt: bundle.createdAt,
      updatedAt: bundle.updatedAt,
    };
  }

  private toTemplate(template: RawLabBundleTemplate): LabBundleTemplate {
    return {
      id: template.id,
      domain: template.domain,
      name: template.name,
      description: template.description,
      datasets: template.datasets,
      agents: template.agents,
      evalSuites: template.evalSuites,
      defaultPolicies: template.defaultPolicies,
    };
  }

  private isTerminalState(status: string): boolean {
    const normalized = status.toLowerCase();
    return ["completed", "failed", "cancelled"].includes(normalized);
  }

  private async delay(ms: number): Promise<void> {
    if (ms <= 0) {
      return;
    }
    await new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
