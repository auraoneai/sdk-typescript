import { HttpClient, BillingInfo, RequestConfig } from "../types/api";

export class BillingService {
  constructor(private httpClient: HttpClient) {}

  /**
   * Get billing information for the organization
   */
  async getBillingInfo(config?: RequestConfig): Promise<BillingInfo> {
    return this.httpClient.get<BillingInfo>("/api/billing", config);
  }

  /**
   * Subscribe to a billing plan
   */
  async subscribe(
    plan: string,
    config?: RequestConfig,
  ): Promise<{
    success: boolean;
    subscriptionId?: string;
    message: string;
  }> {
    return this.httpClient.post("/api/billing/subscribe", { plan }, config);
  }
}
