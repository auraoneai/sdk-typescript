import type { HttpClient, RequestConfig } from "../types/api";

/**
 * A1 model certification client — `/api/v1/certification/{modelId}` +
 * `/api/v1/models/{id}/certification`.
 *
 * Certification status is derived from benchmark evidence and the Foundry
 * contamination report; absent evidence is reported as null by the API and
 * surfaced here untouched.
 */

export interface ModelCertification {
  model_id: string;
  certified: boolean;
  status: string;
  evidence: Record<string, unknown> | null;
  contamination_checked_at: string | null;
}

export class CertificationService {
  constructor(
    private readonly http: HttpClient,
    private readonly requestConfig: RequestConfig = {},
  ) {}

  /** Certification decision for a model id. */
  async get(modelId: string): Promise<ModelCertification> {
    const raw = await this.http.get<Record<string, unknown>>(
      `/api/v1/certification/${encodeURIComponent(modelId)}`,
      this.requestConfig,
    );
    return this.toCertification(raw, modelId);
  }

  /** Detailed certification record for a model. */
  async getDetail(modelId: string): Promise<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(
      `/api/v1/models/${encodeURIComponent(modelId)}/certification`,
      this.requestConfig,
    );
  }

  private toCertification(
    raw: Record<string, unknown>,
    modelId: string,
  ): ModelCertification {
    const row = (raw?.certification ?? raw?.data ?? raw) as Record<
      string,
      unknown
    >;
    const status = String(row.status ?? (row.certified === true ? "certified" : "uncertified"));
    return {
      model_id: String(row.model_id ?? row.modelId ?? modelId),
      certified:
        row.certified === true ||
        status === "certified" ||
        status === "approved",
      status,
      evidence: (row.evidence ?? null) as Record<string, unknown> | null,
      contamination_checked_at:
        (row.contamination_checked_at ??
          row.contaminationCheckedAt ??
          null) as string | null,
    };
  }
}
