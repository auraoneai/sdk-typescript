import type {
  IntegrationDefinitionInput,
  IntegrationHealthSummary,
  IntegrationHealthTestRequest,
  IntegrationHealthTestResult,
  IntegrationRegistryEntry,
  IntegrationRegistryFilters,
} from "../types/api";
import type { HttpClient, RequestConfig } from "../types/api";

interface RawIntegrationHealthResponse {
  success?: boolean;
  data?: IntegrationHealthSummary;
}

interface RawIntegrationRegistryResponse {
  success?: boolean;
  data?: IntegrationRegistryEntry | IntegrationRegistryEntry[];
}

export class IntegrationsService {
  constructor(
    private readonly http: HttpClient,
    private readonly requestConfig: RequestConfig = {},
  ) {}

  async getHealth(options: { detailed?: boolean; organizationId?: string } = {}): Promise<IntegrationHealthSummary> {
    const search = new URLSearchParams();
    if (options.detailed) search.set("detailed", "true");
    if (options.organizationId) search.set("organizationId", options.organizationId);
    const query = search.size ? `?${search.toString()}` : "";

    const response = await this.http.get<RawIntegrationHealthResponse>(
      `/v1/integration/health${query}`,
      this.requestConfig,
    );

    if (!response?.data) {
      throw new Error("Integration health response missing payload");
    }

    return response.data;
  }

  async runHealthTest(payload: IntegrationHealthTestRequest): Promise<IntegrationHealthTestResult[]> {
    const response = await this.http.post<{ data?: IntegrationHealthTestResult[] }>(
      "/v1/integration/health/test",
      payload,
      this.requestConfig,
    );

    return response?.data ?? [];
  }

  async listRegistry(filters: IntegrationRegistryFilters = {}): Promise<IntegrationRegistryEntry[]> {
    const search = new URLSearchParams();
    if (filters.category?.length) search.set("category", filters.category.join(","));
    if (filters.type?.length) search.set("type", filters.type.join(","));
    if (filters.provider?.length) search.set("provider", filters.provider.join(","));
    if (filters.capabilities?.length) search.set("capabilities", filters.capabilities.join(","));
    if (filters.tags?.length) search.set("tags", filters.tags.join(","));
    if (typeof filters.verified === "boolean") search.set("verified", String(filters.verified));
    if (typeof filters.active === "boolean") search.set("active", String(filters.active));
    if (filters.search) search.set("search", filters.search);
    if (filters.organizationId) search.set("organizationId", filters.organizationId);

    const query = search.size ? `?${search.toString()}` : "";
    const response = await this.http.get<RawIntegrationRegistryResponse>(
      `/v1/integration/registry${query}`,
      this.requestConfig,
    );

    const payload = response?.data;
    if (!payload) {
      return [];
    }

    return Array.isArray(payload) ? payload : [payload];
  }

  async registerIntegration(definition: IntegrationDefinitionInput): Promise<IntegrationRegistryEntry> {
    const response = await this.http.post<RawIntegrationRegistryResponse>(
      "/v1/integration/registry",
      definition,
      this.requestConfig,
    );

    const payload = response?.data;
    if (!payload) {
      throw new Error("Integration registration returned an empty response");
    }

    return Array.isArray(payload) ? payload[0] : payload;
  }
}
