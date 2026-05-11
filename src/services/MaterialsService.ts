/**
 * MaterialsService — materials discovery records, scans, sweeps, sign-off.
 */
import type { HttpClient, RequestConfig } from "../types/api";

export interface MaterialCandidate {
  id: string;
  composition: string;
  predictedProperties: Record<string, number>;
  status: string;
}

export interface MaterialsScanInput {
  candidateId: string;
  instrument: string;
  payload: Record<string, unknown>;
}

export interface MaterialsScan {
  id: string;
  candidateId: string;
  instrument: string;
  status: string;
  capturedAt: string;
}

export interface MaterialsSweep {
  id: string;
  name: string;
  status: string;
  candidateCount: number;
  createdAt: string;
}

export interface MaterialsSignOff {
  id: string;
  candidateId: string;
  approver: string;
  signedAt: string;
  decision: "approved" | "rejected";
}

export class MaterialsService {
  constructor(
    private readonly http: HttpClient,
    private readonly requestConfig: RequestConfig = {},
  ) {}

  async listCandidates(
    query: { sweepId?: string; status?: string } = {},
  ): Promise<{ items: MaterialCandidate[] }> {
    const search = new URLSearchParams();
    if (query.sweepId) search.set("sweepId", query.sweepId);
    if (query.status) search.set("status", query.status);
    const qs = search.toString();
    return this.http.get<{ items: MaterialCandidate[] }>(
      `/v1/materials/records${qs ? `?${qs}` : ""}`,
      this.requestConfig,
    );
  }

  async submitScan(payload: MaterialsScanInput): Promise<MaterialsScan> {
    return this.http.post<MaterialsScan>(
      "/v1/materials/scans",
      payload,
      this.requestConfig,
    );
  }

  async listSweeps(): Promise<{ items: MaterialsSweep[] }> {
    return this.http.get<{ items: MaterialsSweep[] }>(
      "/v1/materials/sweeps",
      this.requestConfig,
    );
  }

  async signOff(payload: {
    candidateId: string;
    decision: "approved" | "rejected";
    notes?: string;
  }): Promise<MaterialsSignOff> {
    return this.http.post<MaterialsSignOff>(
      "/v1/materials/sign-off",
      payload,
      this.requestConfig,
    );
  }
}
