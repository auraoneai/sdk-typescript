/**
 * BiologyService — synthesis screening, IBC/DURC oversight, biosafety packets.
 */
import type { HttpClient, RequestConfig } from "../types/api";

export interface BiosafetyScreeningRequest {
  sequence: string;
  organism?: string;
  metadata?: Record<string, unknown>;
}

export interface BiosafetyScreeningResult {
  decision: "allow" | "review" | "deny";
  riskScore: number;
  matches: Array<{ id: string; description: string; score: number }>;
  policyVersion: string;
}

export interface IbcCase {
  id: string;
  status: string;
  submittedAt: string;
  protocol: string;
  organism?: string;
}

export interface DurcCase {
  id: string;
  status: string;
  submittedAt: string;
  category: string;
}

export interface BiosafetyPacket {
  id: string;
  caseId: string;
  format: string;
  generatedAt: string;
  downloadUrl: string;
}

export interface SynthesisRelease {
  releaseId: string;
  status: string;
  approvedAt?: string;
  blockedReason?: string;
}

export class BiologyService {
  constructor(
    private readonly http: HttpClient,
    private readonly requestConfig: RequestConfig = {},
  ) {}

  async biosafetyScreening(
    payload: BiosafetyScreeningRequest,
  ): Promise<BiosafetyScreeningResult> {
    return this.http.post<BiosafetyScreeningResult>(
      "/v1/biology/biosafety-screening",
      payload,
      this.requestConfig,
    );
  }

  async listIbcCases(query: { orgId?: string; status?: string } = {}): Promise<{
    items: IbcCase[];
  }> {
    const search = new URLSearchParams();
    if (query.orgId) search.set("orgId", query.orgId);
    if (query.status) search.set("status", query.status);
    const qs = search.toString();
    return this.http.get<{ items: IbcCase[] }>(
      `/v1/biology/ibc/cases${qs ? `?${qs}` : ""}`,
      this.requestConfig,
    );
  }

  async listDurcCases(query: { orgId?: string; status?: string } = {}): Promise<{
    items: DurcCase[];
  }> {
    const search = new URLSearchParams();
    if (query.orgId) search.set("orgId", query.orgId);
    if (query.status) search.set("status", query.status);
    const qs = search.toString();
    return this.http.get<{ items: DurcCase[] }>(
      `/v1/biology/durc/cases${qs ? `?${qs}` : ""}`,
      this.requestConfig,
    );
  }

  async listBiosafetyPackets(query: { caseId?: string } = {}): Promise<{
    items: BiosafetyPacket[];
  }> {
    const search = new URLSearchParams();
    if (query.caseId) search.set("caseId", query.caseId);
    const qs = search.toString();
    return this.http.get<{ items: BiosafetyPacket[] }>(
      `/v1/biology/packets${qs ? `?${qs}` : ""}`,
      this.requestConfig,
    );
  }

  async getSynthesisRelease(releaseId: string): Promise<SynthesisRelease> {
    return this.http.get<SynthesisRelease>(
      `/v1/biology/synthesis/releases/${encodeURIComponent(releaseId)}`,
      this.requestConfig,
    );
  }
}
