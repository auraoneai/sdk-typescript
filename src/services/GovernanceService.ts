import type {
  AppendEvidenceRequest,
  AppendEvidenceResponse,
  ComplianceFrameworkList,
  ComplianceFrameworkSummary,
  ComplianceEvidenceRecord,
  CreateComplianceFrameworkRequest,
} from "../types/api";
import type { HttpClient, RequestConfig } from "../types/api";

interface RawEvidenceRecord {
  id: string;
  orgId: string;
  standard: string;
  status: string;
  last_audit?: string;
  lastAudit?: string;
}

interface RawComplianceFramework {
  id: string;
  organizationId: string;
  framework: string;
  version: string;
  status: string;
  scope?: string[];
  responsible?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  riskAssessments?: Array<{ overallScore: number; assessedAt?: string }>;
  requirements?: Array<unknown>;
  assessments?: Array<unknown>;
  reports?: Array<unknown>;
  policies?: Array<unknown>;
}

interface ComplianceFrameworkApiResponse {
  data?: RawComplianceFramework[] | RawComplianceFramework;
  success?: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages?: number;
  };
}

export interface ListFrameworksParams {
  framework?: string;
  status?: string;
  responsible?: string;
  page?: number;
  limit?: number;
}

export class GovernanceService {
  constructor(
    private readonly http: HttpClient,
    private readonly requestConfig: RequestConfig = {},
  ) {}

  async listEvidence(limit = 200): Promise<ComplianceEvidenceRecord[]> {
    const response = await this.http.get<{ items?: RawEvidenceRecord[] }>(
      `/v1/compliance/evidence?limit=${limit}`,
      this.requestConfig,
    );
    return (response?.items ?? []).map((record) => ({
      id: record.id,
      orgId: record.orgId,
      standard: record.standard,
      status: record.status,
      lastAudit: record.lastAudit ?? record.last_audit ?? new Date().toISOString(),
    }));
  }

  async appendEvidence(payload: AppendEvidenceRequest): Promise<AppendEvidenceResponse> {
    const response = await this.http.post<AppendEvidenceResponse>(
      "/v1/compliance/evidence",
      payload,
      this.requestConfig,
    );
    return response;
  }

  async listFrameworks(params: ListFrameworksParams = {}): Promise<ComplianceFrameworkList> {
    const search = new URLSearchParams();
    if (params.framework) search.set("framework", params.framework);
    if (params.status) search.set("status", params.status);
    if (params.responsible) search.set("responsible", params.responsible);
    if (params.page) search.set("page", params.page.toString());
    if (params.limit) search.set("limit", params.limit.toString());

    const path = `/v1/compliance/frameworks${search.size ? `?${search.toString()}` : ""}`;
    const response = await this.http.get<ComplianceFrameworkApiResponse>(
      path,
      this.requestConfig,
    );

    const items = Array.isArray(response?.data)
      ? response.data.map((framework) => this.toFramework(framework))
      : [];

    const pagination = response?.pagination;

    return {
      items,
      page: pagination?.page ?? 1,
      limit: pagination?.limit ?? items.length,
      total: pagination?.total ?? items.length,
      totalPages: pagination?.totalPages,
    };
  }

  async createFramework(payload: CreateComplianceFrameworkRequest): Promise<ComplianceFrameworkSummary> {
    const response = await this.http.post<ComplianceFrameworkApiResponse>(
      "/v1/compliance/frameworks",
      payload,
      this.requestConfig,
    );

    const framework = Array.isArray(response?.data)
      ? response?.data[0]
      : (response?.data as RawComplianceFramework | undefined);

    if (!framework) {
      throw new Error("Compliance framework creation returned an empty response");
    }

    return this.toFramework(framework);
  }

  private toFramework(framework: RawComplianceFramework): ComplianceFrameworkSummary {
    return {
      id: framework.id,
      organizationId: framework.organizationId,
      framework: framework.framework as ComplianceFrameworkSummary["framework"],
      version: framework.version,
      status: framework.status as ComplianceFrameworkSummary["status"],
      scope: framework.scope ?? [],
      responsible: framework.responsible,
      description: framework.description,
      createdAt: framework.createdAt,
      updatedAt: framework.updatedAt,
      requirementsTotal: framework.requirements?.length,
      assessmentsTotal: framework.assessments?.length,
      reportsTotal: framework.reports?.length,
      policiesTotal: framework.policies?.length,
      riskAssessments: framework.riskAssessments,
    };
  }
}
