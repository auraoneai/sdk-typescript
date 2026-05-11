/**
 * ClimateService — climate projects and Verra carbon credits.
 */
import type { HttpClient, RequestConfig } from "../types/api";

export interface ClimateProject {
  id: string;
  name: string;
  type: string;
  region: string;
  status: string;
}

export interface VerraCredit {
  id: string;
  projectId: string;
  vintage: number;
  quantity: number;
  status: string;
}

export class ClimateService {
  constructor(
    private readonly http: HttpClient,
    private readonly requestConfig: RequestConfig = {},
  ) {}

  async listProjects(query: { region?: string; status?: string } = {}): Promise<{
    items: ClimateProject[];
  }> {
    const search = new URLSearchParams();
    if (query.region) search.set("region", query.region);
    if (query.status) search.set("status", query.status);
    const qs = search.toString();
    return this.http.get<{ items: ClimateProject[] }>(
      `/v1/climate/projects${qs ? `?${qs}` : ""}`,
      this.requestConfig,
    );
  }

  async listVerraCredits(query: { projectId?: string } = {}): Promise<{
    items: VerraCredit[];
  }> {
    const search = new URLSearchParams();
    if (query.projectId) search.set("projectId", query.projectId);
    const qs = search.toString();
    return this.http.get<{ items: VerraCredit[] }>(
      `/v1/climate/verra-credits${qs ? `?${qs}` : ""}`,
      this.requestConfig,
    );
  }
}
