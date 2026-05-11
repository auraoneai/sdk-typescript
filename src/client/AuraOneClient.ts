import { AuthProvider } from "../auth/AuthProvider";
import { FetchHttpClient } from "../utils/HttpClient";
import { AuthService } from "../services/AuthService";
import { AnalyticsService } from "../services/AnalyticsService";
import { TrainingService } from "../services/TrainingService";
import { BillingService } from "../services/BillingService";
import { CollaborationService } from "../services/CollaborationService";
import { RoboticsService } from "../services/RoboticsService";
import { EvaluationsService } from "../services/EvaluationsService";
import { LabsService } from "../services/LabsService";
import { GovernanceService } from "../services/GovernanceService";
import { IntegrationsService } from "../services/IntegrationsService";
import { ClientConfig, HttpClient, AuthenticationError, RequestConfig } from "../types/api";
import { createSDKLogger } from "../utils/logger";
import { GraphQLClient } from "../graphql/GraphQLClient";

/**
 * Main AuraOne API client
 */
export class AuraOneClient {
  private httpClient: HttpClient;
  private fetchClient: FetchHttpClient;
  private authProvider: AuthProvider;

  // Service instances
  public readonly auth: AuthService;
  public readonly analytics: AnalyticsService;
  public readonly training: TrainingService;
  public readonly billing: BillingService;
  public readonly collaboration: CollaborationService;
  public readonly robotics: RoboticsService;
  public readonly evaluations: EvaluationsService;
  public readonly graphql: GraphQLClient;
  public readonly labs: LabsService;
  public readonly governance: GovernanceService;
  public readonly integrations: IntegrationsService;
  private readonly orgId: string;

  constructor(config: ClientConfig = {}) {
    // Validate configuration
    this.validateConfig(config);

    // Initialize authentication provider
    this.authProvider = new AuthProvider({
      apiKey: config.apiKey,
      onTokenRefresh: (_newToken) => {
        void _newToken;
        createSDKLogger(config.debug).info("Token refreshed successfully");
      },
    });

    this.orgId = config.orgId ?? "public";

    // Initialize HTTP client
    this.fetchClient = new FetchHttpClient({
      baseUrl: config.baseUrl || "https://api.auraone.ai",
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
      debug: config.debug || false,
      defaultHeaders: {
        ...this.authProvider.getAuthHeaders(),
        "X-Org-Id": this.orgId,
      },
    });
    this.httpClient = this.fetchClient;

    // Initialize services
    this.auth = new AuthService(this.httpClient);
    this.analytics = new AnalyticsService(this.httpClient);
    this.training = new TrainingService(this.httpClient);
    this.billing = new BillingService(this.httpClient);
    this.collaboration = new CollaborationService(this.httpClient);
    this.robotics = new RoboticsService({
      baseUrl: config.baseUrl || "https://api.auraone.ai",
      apiKey: config.apiKey || "",
    });
    const orgScopedConfig: RequestConfig = {
      headers: {
        "X-Org-Id": this.orgId,
      },
    };
    this.evaluations = new EvaluationsService(this.httpClient, orgScopedConfig);
    this.graphql = new GraphQLClient(this.httpClient, "/graphql", {
      headers: {
        "X-Org-Id": this.orgId,
      },
    });
    this.labs = new LabsService(this.httpClient, orgScopedConfig);
    this.governance = new GovernanceService(this.httpClient, orgScopedConfig);
    this.integrations = new IntegrationsService(this.httpClient, orgScopedConfig);

    // Set up request interceptor for authentication
    this.setupRequestInterceptor();
  }

  /**
   * Create AuraOne client with API key authentication
   */
  static withApiKey(
    apiKey: string,
    options: Omit<ClientConfig, "apiKey"> = {},
  ): AuraOneClient {
    if (!AuthProvider.isValidApiKey(apiKey)) {
      throw new AuthenticationError("Invalid API key format");
    }

    return new AuraOneClient({
      ...options,
      apiKey,
    });
  }

  /**
   * Create AuraOne client with JWT token authentication
   */
  static withToken(
    token: string,
    refreshToken?: string,
    options: Omit<ClientConfig, "apiKey"> = {},
  ): AuraOneClient {
    if (!AuthProvider.isValidJwtToken(token)) {
      throw new AuthenticationError("Invalid JWT token format");
    }

    const client = new AuraOneClient(options);
    client.authProvider.setToken(token, refreshToken);
    client.updateAuthHeaders();
    return client;
  }

  /**
   * Create AuraOne client from environment variables
   */
  static fromEnvironment(
    options: Omit<ClientConfig, "apiKey"> = {},
  ): AuraOneClient {
    const authProvider = AuthProvider.fromEnvironment();

    if (!authProvider.isAuthenticated()) {
      throw new AuthenticationError(
        "No authentication credentials found in environment variables. " +
        "Set AURAONE_API_KEY or AURAONE_TOKEN environment variable.",
      );
    }

    const client = new AuraOneClient(options);
    client.authProvider = authProvider;
    client.updateAuthHeaders();
    return client;
  }

  /**
   * Set API key for authentication
   */
  setApiKey(apiKey: string): void {
    if (!AuthProvider.isValidApiKey(apiKey)) {
      throw new AuthenticationError("Invalid API key format");
    }

    this.authProvider.setApiKey(apiKey);
    this.updateAuthHeaders();
  }

  /**
   * Set JWT token for authentication
   */
  setToken(token: string, refreshToken?: string): void {
    if (!AuthProvider.isValidJwtToken(token)) {
      throw new AuthenticationError("Invalid JWT token format");
    }

    this.authProvider.setToken(token, refreshToken);
    this.updateAuthHeaders();
  }

  /**
   * Clear authentication credentials
   */
  clearAuth(): void {
    this.authProvider.clearAuth();
    this.updateAuthHeaders();
  }

  async getFederationNodes(
    orgId: string,
  ): Promise<{ nodes: unknown[]; [key: string]: unknown }> {
    if (!orgId) {
      throw new Error("orgId is required to list federation nodes");
    }
    return this.httpClient.get(
      `/v1/organizations/${encodeURIComponent(orgId)}/federation/nodes`,
    );
  }

  /**
   * Check if client is authenticated
   */
  isAuthenticated(): boolean {
    return this.authProvider.isAuthenticated();
  }

  /**
   * Get current authentication method
   */
  getAuthMethod(): "apikey" | "jwt" | "none" {
    return this.authProvider.getAuthMethod();
  }

  /**
   * Test API connectivity and authentication
   */
  async testConnection(): Promise<{
    success: boolean;
    authenticated: boolean;
    method: string;
    message: string;
  }> {
    try {
      await this.analytics.getHealth();

      return {
        success: true,
        authenticated: this.isAuthenticated(),
        method: this.getAuthMethod(),
        message: "Connection successful",
      };
    } catch (error: unknown) {
      return {
        success: false,
        authenticated: this.isAuthenticated(),
        method: this.getAuthMethod(),
        message:
          error instanceof Error ? error.message : "Connection failed",
      };
    }
  }

  /**
   * Get client configuration information
   */
  getConfig(): {
    baseUrl: string;
    authenticated: boolean;
    authMethod: string;
    version: string;
  } {
    return {
      baseUrl: this.fetchClient.getBaseUrl() || "https://api.auraone.ai",
      authenticated: this.isAuthenticated(),
      authMethod: this.getAuthMethod(),
      version: this.getVersion(),
    };
  }

  /**
   * Create a batch tracker for analytics events
   */
  createAnalyticsBatch(flushThreshold = 10, flushInterval = 5000) {
    return this.analytics.createBatchTracker(flushThreshold, flushInterval);
  }

  private validateConfig(config: ClientConfig): void {
    if (config.baseUrl && !this.isValidUrl(config.baseUrl)) {
      throw new Error("Invalid baseUrl provided");
    }

    if (config.timeout && (config.timeout < 1000 || config.timeout > 300000)) {
      throw new Error("Timeout must be between 1000ms and 300000ms");
    }

    if (config.retries && (config.retries < 0 || config.retries > 10)) {
      throw new Error("Retries must be between 0 and 10");
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private updateAuthHeaders(): void {
    const authHeaders = this.authProvider.getAuthHeaders();
    this.fetchClient.updateDefaultHeaders(authHeaders);

    // Clear old auth headers
    if (!authHeaders["X-API-Key"]) {
      this.fetchClient.removeDefaultHeader("X-API-Key");
    }
    if (!authHeaders["Authorization"]) {
      this.fetchClient.removeDefaultHeader("Authorization");
    }
  }

  private setupRequestInterceptor(): void {
    // In a full implementation, this would set up automatic token refresh
    // currently, we'll keep it simple
  }

  private getVersion(): string {
    // This would come from package.json in a real implementation
    return "1.0.0";
  }
}

// Re-export everything for convenience
export * from "../types/api";
export * from "../auth/AuthProvider";
export * from "../services/AuthService";
export * from "../services/AnalyticsService";
export * from "../services/TrainingService";
export * from "../services/BillingService";
export * from "../services/CollaborationService";
export * from "../services/RoboticsService";

// Default export
export default AuraOneClient;
