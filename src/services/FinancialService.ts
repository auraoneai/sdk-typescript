/**
 * FinancialService — fraud, credit, and SAR validation scoring.
 */
import type { HttpClient, RequestConfig } from "../types/api";

export interface FraudScoreRequest {
  transactionId: string;
  features: Record<string, unknown>;
}

export interface FraudScoreResult {
  transactionId: string;
  score: number;
  decision: "allow" | "review" | "block";
  rationale?: string;
}

export interface CreditScoreRequest {
  applicantId: string;
  features: Record<string, unknown>;
}

export interface CreditScoreResult {
  applicantId: string;
  score: number;
  band: string;
  reasonCodes: string[];
}

export interface SarValidationRequest {
  filingId: string;
  payload: Record<string, unknown>;
}

export interface SarValidationResult {
  filingId: string;
  valid: boolean;
  errors: Array<{ code: string; message: string }>;
}

export class FinancialService {
  constructor(
    private readonly http: HttpClient,
    private readonly requestConfig: RequestConfig = {},
  ) {}

  async scoreFraud(payload: FraudScoreRequest): Promise<FraudScoreResult> {
    return this.http.post<FraudScoreResult>(
      "/v1/financial/fraud/score",
      payload,
      this.requestConfig,
    );
  }

  async scoreCredit(payload: CreditScoreRequest): Promise<CreditScoreResult> {
    return this.http.post<CreditScoreResult>(
      "/v1/financial/credit/score",
      payload,
      this.requestConfig,
    );
  }

  async validateSar(
    payload: SarValidationRequest,
  ): Promise<SarValidationResult> {
    return this.http.post<SarValidationResult>(
      "/v1/financial/sar/validate",
      payload,
      this.requestConfig,
    );
  }
}
