/**
 * EnvironmentalService — site thresholds and packet generation.
 */
import type { HttpClient, RequestConfig } from "../types/api";

export interface SiteThreshold {
  id: string;
  siteId: string;
  pollutant: string;
  limit: number;
  unit: string;
  effectiveAt: string;
}

export interface UpsertSiteThresholdInput {
  siteId: string;
  pollutant: string;
  limit: number;
  unit: string;
  effectiveAt?: string;
}

export interface EnvironmentalPacket {
  id: string;
  kind: string;
  generatedAt: string;
  downloadUrl: string;
}

export class EnvironmentalService {
  constructor(
    private readonly http: HttpClient,
    private readonly requestConfig: RequestConfig = {},
  ) {}

  async listSiteThresholds(query: { siteId?: string } = {}): Promise<{
    items: SiteThreshold[];
  }> {
    const search = new URLSearchParams();
    if (query.siteId) search.set("siteId", query.siteId);
    const qs = search.toString();
    return this.http.get<{ items: SiteThreshold[] }>(
      `/v1/environmental/site-thresholds${qs ? `?${qs}` : ""}`,
      this.requestConfig,
    );
  }

  async upsertSiteThreshold(
    payload: UpsertSiteThresholdInput,
  ): Promise<SiteThreshold> {
    return this.http.post<SiteThreshold>(
      "/v1/environmental/site-thresholds",
      payload,
      this.requestConfig,
    );
  }

  async generatePacket(payload: {
    kind: string;
    siteId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<EnvironmentalPacket> {
    return this.http.post<EnvironmentalPacket>(
      `/v1/environmental/packets/${encodeURIComponent(payload.kind)}`,
      payload,
      this.requestConfig,
    );
  }
}
