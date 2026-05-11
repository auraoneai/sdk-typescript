/**
 * MedicalImagingService — DICOM study triage and regression-bank push.
 */
import type { HttpClient, RequestConfig } from "../types/api";

export interface MedicalStudySubmission {
  studyInstanceUid: string;
  modality: string;
  payload: Record<string, unknown>;
}

export interface MedicalStudyAccepted {
  id: string;
  studyInstanceUid: string;
  status: string;
  submittedAt: string;
}

export interface MedicalTriageResult {
  studyInstanceUid: string;
  triage: "stat" | "urgent" | "routine";
  findings: Array<{ code: string; description: string; confidence: number }>;
}

export interface RegressionBankPushPayload {
  modelVersion: string;
  cases: Array<{
    studyId: string;
    input: Record<string, unknown>;
    expectedOutput?: Record<string, unknown>;
  }>;
}

export interface RegressionBankPushResult {
  status: "external_pushed" | "internal_captured" | "unavailable";
  pushedCount: number;
  cases: Array<{ studyId: string; signatureId?: string; remoteId?: string | null }>;
}

export class MedicalImagingService {
  constructor(
    private readonly http: HttpClient,
    private readonly requestConfig: RequestConfig = {},
  ) {}

  async submitStudy(
    payload: MedicalStudySubmission,
  ): Promise<MedicalStudyAccepted> {
    return this.http.post<MedicalStudyAccepted>(
      "/v1/medical-imaging/studies",
      payload,
      this.requestConfig,
    );
  }

  async getTriage(studyInstanceUid: string): Promise<MedicalTriageResult> {
    return this.http.get<MedicalTriageResult>(
      `/v1/medical-imaging/triage/${encodeURIComponent(studyInstanceUid)}`,
      this.requestConfig,
    );
  }

  async pushRegressionBank(
    payload: RegressionBankPushPayload,
  ): Promise<RegressionBankPushResult> {
    return this.http.post<RegressionBankPushResult>(
      "/v1/medical-imaging/regression-bank/push",
      payload,
      this.requestConfig,
    );
  }
}
