/**
 * Spatial3DService — 3D scene reconstruction projects and jobs.
 */
import type { HttpClient, RequestConfig } from "../types/api";

export interface Spatial3DProject {
  id: string;
  name: string;
  status: string;
  createdAt: string;
}

export interface Spatial3DJob {
  id: string;
  projectId: string;
  kind: string;
  status: string;
  startedAt: string;
}

export interface Spatial3DProjectResult {
  projectId: string;
  status: string;
  artifacts: Array<{ id: string; kind: string; url: string }>;
}

export class Spatial3DService {
  constructor(
    private readonly http: HttpClient,
    private readonly requestConfig: RequestConfig = {},
  ) {}

  async createProject(payload: {
    name: string;
    description?: string;
    metadata?: Record<string, unknown>;
  }): Promise<Spatial3DProject> {
    return this.http.post<Spatial3DProject>(
      "/v1/spatial3d/projects",
      payload,
      this.requestConfig,
    );
  }

  async executeJob(payload: {
    projectId: string;
    kind: string;
    config?: Record<string, unknown>;
  }): Promise<Spatial3DJob> {
    return this.http.post<Spatial3DJob>(
      `/v1/spatial3d/projects/${encodeURIComponent(payload.projectId)}/jobs`,
      payload,
      this.requestConfig,
    );
  }

  async getProjectResult(projectId: string): Promise<Spatial3DProjectResult> {
    return this.http.get<Spatial3DProjectResult>(
      `/v1/spatial3d/projects/${encodeURIComponent(projectId)}/result`,
      this.requestConfig,
    );
  }
}
