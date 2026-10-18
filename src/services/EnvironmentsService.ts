import { randomUUID } from "node:crypto";
import type { HttpClient, RequestConfig } from "../types/api";
import { buildQueryString } from "../utils/HttpClient";

/**
 * RL environment registry + marketplace namespace.
 *
 * Route contracts (all org-scoped, verified against the route zod schemas):
 *   GET  /api/v1/environments                      → { data: Environment[] }
 *   GET  /api/environments/{id}                    → environment detail
 *   POST /api/environments                         → create (environmentCreateSchema)
 *   GET  /api/versions?orgId&environment           → { success, versions, total }
 *   POST /api/versions                             → publish immutable version
 *   GET  /api/environments/{id}/episodes           → { episodes, nextCursor }
 *   GET  /api/environments/{id}/episodes/{ep}      → episode detail
 *   POST /api/environments/{id}/exports            → { export } (harbor|reward_jsonl|openenv|verifiers)
 *   GET  /api/environments/{id}/exports            → { exports }
 *   POST /api/environments/{id}/baselines          → { baseline } (201)
 *   GET  /api/environments/{id}/baselines          → { baselines }
 *   GET  /api/v1/marketplace/environments          → listing page
 *   POST /api/v1/marketplace/environments          → submission acceptance
 *   GET  /api/v1/marketplace/environments/{key}/leaderboard → sealed leaderboard
 */

export type EnvironmentStatus = "draft" | "published" | "archived";

export interface EnvironmentSummary {
  id: string;
  name: string;
  type?: string;
  status?: string;
  orgId?: string;
  updatedAt?: string;
  runtime?: {
    totalEpisodes: number;
    avgReward: number;
    maxReward: number;
    successRate: number;
    lastRun: string | null;
    runningSessions: number;
    completedSessions: number;
    failedSessions: number;
  };
  [key: string]: unknown;
}

export interface EnvironmentVersion {
  id: string;
  environmentId: string;
  environmentName?: string;
  version: string;
  configHash?: string;
  imageDigest?: string | null;
  status?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface EnvironmentEpisode {
  id: string;
  environmentId: string;
  orgId: string;
  status: string;
  policyRef?: string | null;
  budgetCents?: number;
  rewardVector?: unknown;
  version?: { version: string; configHash: string };
  taskInstance?: { instanceHash: string; seed: string | null };
  [key: string]: unknown;
}

export type EnvironmentExportFormat =
  | "harbor"
  | "reward_jsonl"
  | "openenv"
  | "verifiers";

export type EnvironmentExportPurpose =
  | "EVALUATION"
  | "CUSTOMER_MODEL"
  | "AURAONE_MODEL"
  | "TRAINING_CUSTOMER_MODEL"
  | "TRAINING_AURAONE_MODEL"
  | "REDISTRIBUTION";

export interface EnvironmentExport {
  id: string;
  environmentVersionId: string;
  format: EnvironmentExportFormat;
  purpose: EnvironmentExportPurpose;
  manifestHash?: string;
  artifactUri?: string;
  status: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface EnvironmentBaselineRun {
  id: string;
  environmentId: string;
  environmentVersionId?: string;
  status: string;
  summary?: unknown;
  [key: string]: unknown;
}

export type MarketplaceEnvironmentCategory =
  | "PRODUCTIVITY"
  | "DEV_TOOLS"
  | "CRM"
  | "CLOUD";

export type MarketplaceEnvironmentDifficulty = "EASY" | "MEDIUM" | "HARD";

export type MarketplaceEnvironmentPricing = "PAY_PER_USE" | "SUBSCRIPTION";

export interface MarketplaceEnvironmentListing {
  id: string;
  name: string;
  description: string;
  category: MarketplaceEnvironmentCategory;
  taskCount: number;
  difficulty: MarketplaceEnvironmentDifficulty;
  pricing: MarketplaceEnvironmentPricing;
  pricePerUse: number;
  verified: boolean;
  rlEnvironmentId?: string | null;
  [key: string]: unknown;
}

export interface CreateEnvironmentRequest {
  organization_id: string;
  name: string;
  description?: string;
  category?: string;
  status?: EnvironmentStatus;
  prompt_template: string;
  input_schema?: string | Record<string, unknown>;
  output_schema?: string | Record<string, unknown>;
  evaluation_criteria?: Array<{
    name: string;
    description?: string;
    weight?: number;
    type?: string;
  }>;
  tags?: string[];
  settings?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  version?: string;
}

export interface PublishEnvironmentVersionRequest {
  orgId: string;
  environmentId: string;
  /** Semver label — versions are immutable and content-addressed. */
  version: string;
  name: string;
  description?: string;
  config?: Record<string, unknown>;
  isStable?: boolean;
  tags?: string[];
}

export interface ListEpisodesOptions {
  limit?: number;
  cursor?: string;
  status?: string;
}

export interface CreateEnvironmentExportRequest {
  versionId: string;
  format: EnvironmentExportFormat;
  purpose?: EnvironmentExportPurpose;
  idempotencyKey?: string;
}

export interface RunBaselineRequest {
  environmentVersionId: string;
  taskInstanceIds?: string[];
  seed?: string;
  budgetCents?: number;
  toolCallBudget?: number | null;
  idempotencyKey?: string;
}

export interface ListMarketplaceOptions {
  limit?: number;
  offset?: number;
  category?: MarketplaceEnvironmentCategory;
  difficulty?: MarketplaceEnvironmentDifficulty;
  pricing?: MarketplaceEnvironmentPricing;
  search?: string;
}

export interface SubmitMarketplaceEnvironmentRequest {
  name: string;
  description: string;
  category: MarketplaceEnvironmentCategory;
  difficulty: MarketplaceEnvironmentDifficulty;
  pricing: MarketplaceEnvironmentPricing;
  pricePerUse: number;
  taskCount: number;
  tags?: string[];
  creatorId?: string;
  idempotencyKey?: string;
}

export class EnvironmentsService {
  constructor(
    private readonly http: HttpClient,
    private readonly requestConfig: RequestConfig = {},
  ) {}

  /** List the caller organization's registered environments. */
  async list(): Promise<EnvironmentSummary[]> {
    const raw = await this.http.get<{ data: EnvironmentSummary[] }>(
      "/api/v1/environments",
      this.requestConfig,
    );
    return Array.isArray(raw?.data) ? raw.data : [];
  }

  /** Get one environment by id (org-scoped or public). */
  async get(environmentId: string): Promise<EnvironmentSummary> {
    return this.http.get<EnvironmentSummary>(
      `/api/environments/${encodeURIComponent(environmentId)}`,
      this.requestConfig,
    );
  }

  /** Create a new environment in the registry. */
  async create(
    request: CreateEnvironmentRequest,
    idempotencyKey?: string,
  ): Promise<EnvironmentSummary> {
    const headers = {
      ...this.requestConfig.headers,
      "X-Idempotency-Key": idempotencyKey ?? randomUUID(),
    };
    return this.http.post<EnvironmentSummary>("/api/environments", request, {
      ...this.requestConfig,
      headers,
    });
  }

  /** List published versions, optionally filtered to one environment. */
  async listVersions(
    orgId: string,
    environmentId?: string,
    sortBy?: "date" | "version",
  ): Promise<{ versions: EnvironmentVersion[]; total: number }> {
    const query = buildQueryString({
      orgId,
      environment: environmentId,
      sortBy,
    });
    const raw = await this.http.get<{
      versions?: EnvironmentVersion[];
      total?: number;
    }>(`/api/versions${query}`, this.requestConfig);
    return {
      versions: Array.isArray(raw?.versions) ? raw.versions : [],
      total: typeof raw?.total === "number" ? raw.total : 0,
    };
  }

  /** Publish a new immutable, content-addressed version. */
  async publishVersion(
    request: PublishEnvironmentVersionRequest,
  ): Promise<EnvironmentVersion> {
    const raw = await this.http.post<Record<string, unknown>>(
      "/api/versions",
      request,
      this.requestConfig,
    );
    return (raw?.version ?? raw) as EnvironmentVersion;
  }

  /** List episodes for an environment (org-scoped, cursor-paginated). */
  async listEpisodes(
    environmentId: string,
    options: ListEpisodesOptions = {},
  ): Promise<{ episodes: EnvironmentEpisode[]; nextCursor: string | null }> {
    const query = buildQueryString({
      limit: options.limit,
      cursor: options.cursor,
      status: options.status,
    });
    const raw = await this.http.get<{
      episodes?: EnvironmentEpisode[];
      nextCursor?: string | null;
    }>(
      `/api/environments/${encodeURIComponent(environmentId)}/episodes${query}`,
      this.requestConfig,
    );
    return {
      episodes: Array.isArray(raw?.episodes) ? raw.episodes : [],
      nextCursor: raw?.nextCursor ?? null,
    };
  }

  /** Get a single episode. */
  async getEpisode(
    environmentId: string,
    episodeId: string,
  ): Promise<EnvironmentEpisode> {
    return this.http.get<EnvironmentEpisode>(
      `/api/environments/${encodeURIComponent(
        environmentId,
      )}/episodes/${encodeURIComponent(episodeId)}`,
      this.requestConfig,
    );
  }

  /** Create an export package (harbor|reward_jsonl|openenv|verifiers). */
  async createExport(
    environmentId: string,
    request: CreateEnvironmentExportRequest,
  ): Promise<EnvironmentExport> {
    const { idempotencyKey, ...body } = request;
    const headers = {
      ...this.requestConfig.headers,
      "X-Idempotency-Key": idempotencyKey ?? randomUUID(),
    };
    const raw = await this.http.post<{ export?: EnvironmentExport }>(
      `/api/environments/${encodeURIComponent(environmentId)}/exports`,
      body,
      { ...this.requestConfig, headers },
    );
    return (raw?.export ?? raw) as EnvironmentExport;
  }

  /** List exports for an environment. */
  async listExports(environmentId: string): Promise<EnvironmentExport[]> {
    const raw = await this.http.get<{ exports?: EnvironmentExport[] }>(
      `/api/environments/${encodeURIComponent(environmentId)}/exports`,
      this.requestConfig,
    );
    return Array.isArray(raw?.exports) ? raw.exports : [];
  }

  /** Enqueue a baseline run on the remote sandbox pool. */
  async runBaseline(
    environmentId: string,
    request: RunBaselineRequest,
  ): Promise<EnvironmentBaselineRun> {
    const { idempotencyKey, ...body } = request;
    const headers = {
      ...this.requestConfig.headers,
      "X-Idempotency-Key": idempotencyKey ?? randomUUID(),
    };
    const raw = await this.http.post<{ baseline?: EnvironmentBaselineRun }>(
      `/api/environments/${encodeURIComponent(environmentId)}/baselines`,
      body,
      { ...this.requestConfig, headers },
    );
    return (raw?.baseline ?? raw) as EnvironmentBaselineRun;
  }

  /** List baseline runs for an environment. */
  async listBaselines(
    environmentId: string,
    limit?: number,
  ): Promise<EnvironmentBaselineRun[]> {
    const query = buildQueryString({ limit });
    const raw = await this.http.get<{
      baselines?: EnvironmentBaselineRun[];
    }>(
      `/api/environments/${encodeURIComponent(environmentId)}/baselines${query}`,
      this.requestConfig,
    );
    return Array.isArray(raw?.baselines) ? raw.baselines : [];
  }

  /** List marketplace environment listings visible to the caller's org. */
  async listMarketplace(
    options: ListMarketplaceOptions = {},
  ): Promise<MarketplaceEnvironmentListing[]> {
    const query = buildQueryString({
      limit: options.limit,
      offset: options.offset,
      category: options.category,
      difficulty: options.difficulty,
      pricing: options.pricing,
      search: options.search,
    });
    const raw = await this.http.get<unknown>(
      `/api/v1/marketplace/environments${query}`,
      this.requestConfig,
    );
    const record = raw as Record<string, unknown>;
    const items =
      (record?.environments as unknown[]) ??
      (record?.data as unknown[]) ??
      (record?.items as unknown[]) ??
      (Array.isArray(raw) ? raw : []);
    return items as MarketplaceEnvironmentListing[];
  }

  /** Submit an environment listing for marketplace review. */
  async submitMarketplaceListing(
    request: SubmitMarketplaceEnvironmentRequest,
  ): Promise<Record<string, unknown>> {
    const { idempotencyKey, ...body } = request;
    const headers = {
      ...this.requestConfig.headers,
      "X-Idempotency-Key": idempotencyKey ?? randomUUID(),
    };
    return this.http.post<Record<string, unknown>>(
      "/api/v1/marketplace/environments",
      body,
      { ...this.requestConfig, headers },
    );
  }

  /** Get the sealed leaderboard for a marketplace environment. */
  async marketplaceLeaderboard(
    environmentKey: string,
  ): Promise<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(
      `/api/v1/marketplace/environments/${encodeURIComponent(
        environmentKey,
      )}/leaderboard`,
      this.requestConfig,
    );
  }
}
