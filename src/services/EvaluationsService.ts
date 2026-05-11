import { randomUUID } from "node:crypto";
import type { HttpClient, RequestConfig } from "../types/api";

export enum EvaluationStatus {
  QUEUED = "queued",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

export type EvaluationConfigValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Record<string, unknown>
  | EvaluationConfigValue[];

export interface EvaluationConfig {
  timeout?: number;
  memory_limit?: string;
  preemptible?: boolean;
  priority?: "low" | "standard" | "high";
  [key: string]: EvaluationConfigValue;
}

export interface EvaluationResult {
  id: string;
  status: EvaluationStatus;
  score?: number;
  metrics?: Record<string, number>;
  artifacts_url?: string;
  attestation_url?: string;
  cost?: {
    cpu_min: number;
    gpu_min: number;
    egress_mb: number;
    storage_gb_day: number;
  };
  completed_at?: string;
}

export interface Template {
  id: string;
  name: string;
  version: string;
  domain?: string;
  description?: string;
  difficulty?: "easy" | "medium" | "hard";
  languages?: string[];
}

export interface RewardSpec {
  id: string;
  name: string;
  version: number;
  yaml_spec: string;
  created_at: string;
}

export interface CreateEvaluationRequest {
  template_id: string;
  agent_bundle_url: string;
  reward_spec_id?: string;
  config?: EvaluationConfig;
}

export interface CreateEvaluationOptions extends CreateEvaluationRequest {
  wait?: boolean;
  timeoutSeconds?: number;
  pollIntervalMs?: number;
  idempotencyKey?: string;
}

export class EvaluationsService {
  constructor(
    private readonly http: HttpClient,
    private readonly requestConfig: RequestConfig = {},
  ) {}

  async create(options: CreateEvaluationOptions): Promise<EvaluationResult> {
    const {
      wait = true,
      timeoutSeconds = 300,
      pollIntervalMs = 1000,
      idempotencyKey,
      ...request
    } = options;

    const headers = {
      ...this.requestConfig.headers,
      "X-Idempotency-Key": idempotencyKey ?? randomUUID(),
    };

    const raw = await this.http.post<Record<string, unknown>>(
      "/v1/evaluations",
      request,
      { ...this.requestConfig, headers },
    );

    const evaluation = this.toEvaluationResult(raw);
    if (!wait) {
      return evaluation;
    }

    return this.waitForCompletion(evaluation.id, timeoutSeconds, pollIntervalMs);
  }

  async get(evaluationId: string): Promise<EvaluationResult> {
    const raw = await this.http.get<Record<string, unknown>>(
      `/v1/evaluations/${evaluationId}`,
      this.requestConfig,
    );
    return this.toEvaluationResult(raw);
  }

  async waitForCompletion(
    evaluationId: string,
    timeoutSeconds: number,
    pollIntervalMs: number,
  ): Promise<EvaluationResult> {
    const startedAt = Date.now();
    const timeoutMs = timeoutSeconds * 1000;

    while (Date.now() - startedAt < timeoutMs) {
      const result = await this.get(evaluationId);
      if (
        result.status === EvaluationStatus.COMPLETED ||
        result.status === EvaluationStatus.FAILED ||
        result.status === EvaluationStatus.CANCELLED
      ) {
        return result;
      }
      await this.delay(pollIntervalMs);
    }

    throw new Error(`Evaluation ${evaluationId} timed out after ${timeoutSeconds}s`);
  }

  async cancel(evaluationId: string): Promise<EvaluationResult> {
    const raw = await this.http.post<Record<string, unknown>>(
      `/v1/evaluations/${evaluationId}:cancel`,
      undefined,
      this.requestConfig,
    );

    if (raw && typeof raw === "object" && typeof (raw as Record<string, unknown>).id !== "undefined") {
      return this.toEvaluationResult(raw as Record<string, unknown>);
    }

    return this.get(evaluationId);
  }

  async listTemplates(options: { domain?: string; page?: number; per_page?: number } = {}): Promise<Template[]> {
    const params = new URLSearchParams();
    if (options.domain) params.set("domain", options.domain);
    if (options.page) params.set("page", options.page.toString());
    if (options.per_page) params.set("per_page", options.per_page.toString());

    const endpoint = `/v1/templates?${params.toString()}`;
    const raw = await this.http.get<unknown>(endpoint, this.requestConfig);
    const source = Array.isArray(raw)
      ? raw
      : this.isRecord(raw) && Array.isArray(raw.templates)
        ? raw.templates
        : this.isRecord(raw) && Array.isArray(raw.data)
          ? raw.data
          : [];

    return (source as unknown[])
      .filter((value): value is Record<string, unknown> => this.isRecord(value))
      .map((item) => this.toTemplate(item));
  }

  async getTemplate(templateId: string): Promise<Template> {
    const raw = await this.http.get<Record<string, unknown> | { template: Record<string, unknown> }>(
      `/v1/templates/${templateId}`,
      this.requestConfig,
    );

    const templateRecord =
      this.isRecord(raw) && this.isRecord(raw.template)
        ? raw.template
        : (raw as Record<string, unknown>);

    return this.toTemplate(templateRecord);
  }

  async createTemplate(template: Omit<Template, "id">): Promise<Template> {
    const raw = await this.http.post<Record<string, unknown> | { template: Record<string, unknown> }>(
      "/v1/templates",
      template,
      this.requestConfig,
    );

    const templateRecord =
      this.isRecord(raw) && this.isRecord(raw.template)
        ? raw.template
        : (raw as Record<string, unknown>);

    return this.toTemplate(templateRecord);
  }

  async compileReward(
    yamlSpec: string,
  ): Promise<{
    valid: boolean;
    warnings: string[];
    contracts: { bounded: boolean; monotonic: boolean; pure: boolean };
  }> {
    return this.http.post(
      "/v1/rewards/compile",
      { yaml_spec: yamlSpec },
      this.requestConfig,
    );
  }

  async listRewardSpecs(options: { page?: number; per_page?: number } = {}): Promise<RewardSpec[]> {
    const params = new URLSearchParams();
    if (options.page) params.set("page", options.page.toString());
    if (options.per_page) params.set("per_page", options.per_page.toString());

    const endpoint = `/v1/rewards/specs?${params.toString()}`;
    const raw = await this.http.get<unknown>(endpoint, this.requestConfig);
    const source = Array.isArray(raw)
      ? raw
      : this.isRecord(raw) && Array.isArray(raw.specs)
        ? raw.specs
        : [];

    return (source as unknown[])
      .filter((value): value is Record<string, unknown> => this.isRecord(value))
      .map((spec) => this.toRewardSpec(spec));
  }

  private toEvaluationResult(raw: Record<string, unknown>): EvaluationResult {
    const id = this.getString(raw.id);
    if (!id) {
      throw new Error("Evaluation response missing id");
    }

    const statusCandidate =
      this.getString(raw.status) ??
      this.getString(raw.state) ??
      EvaluationStatus.QUEUED;

    const status = Object.values(EvaluationStatus).includes(
      statusCandidate as EvaluationStatus,
    )
      ? (statusCandidate as EvaluationStatus)
      : EvaluationStatus.QUEUED;

    return {
      id,
      status,
      score: this.getNumber(raw.score),
      metrics: this.extractMetrics(raw.metrics),
      artifacts_url: this.getString(raw.artifacts_url),
      attestation_url: this.getString(raw.attestation_url),
      cost: this.extractCost(raw.cost),
      completed_at: this.getString(raw.completed_at),
    };
  }

  private toTemplate(raw: Record<string, unknown>): Template {
    const id = this.getString(raw.id);
    const name = this.getString(raw.name);

    if (!id || !name) {
      throw new Error("Template response missing required fields");
    }

    const version = this.getString(raw.version) ?? "1.0.0";
    const difficultyValue = this.getString(raw.difficulty);
    const difficulty = (
      difficultyValue === "easy" ||
      difficultyValue === "medium" ||
      difficultyValue === "hard"
        ? difficultyValue
        : undefined
    ) as Template["difficulty"];

    const languages = Array.isArray(raw.languages)
      ? raw.languages.filter((lang): lang is string => typeof lang === "string")
      : undefined;

    return {
      id,
      name,
      version,
      domain: this.getString(raw.domain),
      description: this.getString(raw.description),
      difficulty,
      languages,
    };
  }

  private toRewardSpec(raw: Record<string, unknown>): RewardSpec {
    const id = this.getString(raw.id);
    const name = this.getString(raw.name);

    if (!id || !name) {
      throw new Error("Reward spec response missing required fields");
    }

    const version = typeof raw.version === "number" ? raw.version : 1;
    const yamlSpec = this.getString(raw.yaml_spec) ?? "";
    const createdAt = this.getString(raw.created_at) ?? new Date().toISOString();

    return {
      id,
      name,
      version,
      yaml_spec: yamlSpec,
      created_at: createdAt,
    };
  }

  private extractMetrics(value: unknown): Record<string, number> | undefined {
    if (!this.isRecord(value)) {
      return undefined;
    }

    const entries = Object.entries(value).filter(([, v]) => typeof v === "number");
    if (entries.length === 0) {
      return undefined;
    }

    return Object.fromEntries(entries) as Record<string, number>;
  }

  private extractCost(value: unknown): EvaluationResult["cost"] | undefined {
    if (!this.isRecord(value)) {
      return undefined;
    }

    const cpu = this.getNumber(value.cpu_min);
    const gpu = this.getNumber(value.gpu_min);
    const egress = this.getNumber(value.egress_mb);
    const storage = this.getNumber(value.storage_gb_day);

    if (
      typeof cpu === "number" &&
      typeof gpu === "number" &&
      typeof egress === "number" &&
      typeof storage === "number"
    ) {
      return {
        cpu_min: cpu,
        gpu_min: gpu,
        egress_mb: egress,
        storage_gb_day: storage,
      };
    }

    return undefined;
  }

  private getString(value: unknown): string | undefined {
    return typeof value === "string" ? value : undefined;
  }

  private getNumber(value: unknown): number | undefined {
    return typeof value === "number" ? value : undefined;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
