/**
 * ManufacturingService — inspections, quality scoring.
 */
import type { HttpClient, RequestConfig } from "../types/api";

export interface InspectionInput {
  partNumber: string;
  lotId: string;
  payload: Record<string, unknown>;
}

export interface InspectionSubmission {
  id: string;
  status: string;
  submittedAt: string;
}

export interface InspectionResult {
  id: string;
  partNumber: string;
  lotId: string;
  pass: boolean;
  defects: Array<{ code: string; severity: string; description: string }>;
}

export interface QualityScore {
  partNumber: string;
  score: number;
  defectRate: number;
  trend: "improving" | "stable" | "degrading";
}

export class ManufacturingService {
  constructor(
    private readonly http: HttpClient,
    private readonly requestConfig: RequestConfig = {},
  ) {}

  async submitInspection(
    payload: InspectionInput,
  ): Promise<InspectionSubmission> {
    return this.http.post<InspectionSubmission>(
      "/v1/manufacturing/inspections",
      payload,
      this.requestConfig,
    );
  }

  async getInspectionResult(inspectionId: string): Promise<InspectionResult> {
    return this.http.get<InspectionResult>(
      `/v1/manufacturing/inspections/${encodeURIComponent(inspectionId)}`,
      this.requestConfig,
    );
  }

  async getQualityScore(partNumber: string): Promise<QualityScore> {
    return this.http.get<QualityScore>(
      `/v1/manufacturing/quality/${encodeURIComponent(partNumber)}`,
      this.requestConfig,
    );
  }
}
