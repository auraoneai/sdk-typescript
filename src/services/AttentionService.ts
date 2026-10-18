import type { HttpClient, RequestConfig } from "../types/api";

/** One attention capture row pushed by the tenant. */
export interface AttentionEvidenceRecordInput {
  modelId: string;
  runId?: string;
  layer: number;
  head: number;
  entropy?: number;
  maxAttention?: number;
  pattern?: {
    type: string;
    strength: number;
    tokensInvolved?: number[];
    description?: string;
  };
  flow?: Array<{
    fromToken: string;
    toToken: string;
    weight: number;
  }>;
}

/** POST response — number of rows persisted. */
export interface AttentionIngestResponse {
  ok: boolean;
  orgId: string;
  inserted: number;
  source: "database";
}

export interface AttentionHead {
  id: string;
  layer: number;
  head: number;
  entropy: number | null;
  maxAttention: number | null;
}

export interface AttentionPattern {
  id: string;
  type: string;
  strength: number;
  tokensInvolved: number[];
  description: string;
}

export interface AttentionFlowEdge {
  fromToken: string;
  toToken: string;
  weight: number;
}

export interface AttentionModelSummary {
  id: string;
  name: string;
  version: string;
  status: string;
  updatedAt: string;
}

/** GET response — everything the attention dashboards render. */
export interface AttentionEvidenceResponse {
  orgId: string;
  source: "database";
  /** `empty` when the organization has not ingested any evidence yet. */
  status: "empty" | "ready";
  overview: {
    heads: number;
    patterns: number;
    averageEntropy: number | null;
    strongestAttention: number | null;
  };
  heads: AttentionHead[];
  patterns: AttentionPattern[];
  flow: AttentionFlowEdge[];
  models: AttentionModelSummary[];
  insights: string[];
  updatedAt: string;
}

export interface AttentionEvidenceQuery {
  /** Scope assertion — must equal the credential's organization. */
  orgId?: string;
  modelId?: string;
  runId?: string;
  /** 1-2000 rows, newest first. Defaults to 2000. */
  limit?: number;
}

/**
 * Client for `GET|POST /api/v1/algorithms/attention` — the durable attention
 * evidence surface (secondary-dashboards readmission P1-01).
 *
 * Tenants push captures recorded against their own runs via
 * `ingestEvidence`; `getEvidence` reads back only the resolved
 * organization's rows.
 */
export class AttentionService {
  constructor(
    private readonly http: HttpClient,
    private readonly requestConfig: RequestConfig = {},
  ) {}

  /** GET /api/v1/algorithms/attention — recorded heads/patterns/flow. */
  getEvidence(
    query: AttentionEvidenceQuery = {},
  ): Promise<AttentionEvidenceResponse> {
    const params = new URLSearchParams();
    if (query.orgId) params.set("orgId", query.orgId);
    if (query.modelId) params.set("modelId", query.modelId);
    if (query.runId) params.set("runId", query.runId);
    if (query.limit !== undefined) params.set("limit", String(query.limit));
    const suffix = params.toString();
    return this.http.get<AttentionEvidenceResponse>(
      `/api/v1/algorithms/attention${suffix ? `?${suffix}` : ""}`,
      this.requestConfig,
    );
  }

  /**
   * POST /api/v1/algorithms/attention — push a batch of attention captures.
   * Max 500 records and a 1 MiB payload per call; larger captures should be
   * split across calls.
   */
  ingestEvidence(
    records: AttentionEvidenceRecordInput[],
  ): Promise<AttentionIngestResponse> {
    return this.http.post<AttentionIngestResponse>(
      "/api/v1/algorithms/attention",
      { records },
      this.requestConfig,
    );
  }
}
