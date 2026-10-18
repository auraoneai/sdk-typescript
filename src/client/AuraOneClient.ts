import { AuthProvider } from "../auth/AuthProvider";
import { FetchHttpClient } from "../utils/HttpClient";
import { AuthService } from "../services/AuthService";
import { AnalyticsService } from "../services/AnalyticsService";
import { TrainingService } from "../services/TrainingService";
import { BillingService } from "../services/BillingService";
import { CollaborationService } from "../services/CollaborationService";
import { EvaluationsService } from "../services/EvaluationsService";
import { BenchmarksService } from "../services/BenchmarksService";
import { CertificationService } from "../services/CertificationService";
import { RegressionService } from "../services/RegressionService";
import { LabsService } from "../services/LabsService";
import { GovernanceService } from "../services/GovernanceService";
import { IntegrationsService } from "../services/IntegrationsService";
import { EnvironmentsService } from "../services/EnvironmentsService";
import { EnterpriseIntelligenceService } from "../services/EnterpriseIntelligenceService";
import { AttentionService } from "../services/AttentionService";
import { OptimizationService } from "../services/OptimizationService";
import { AutopilotService } from "../services/AutopilotService";
import { VisualizationService } from "../services/VisualizationService";
import { CapacityService } from "../services/CapacityService";
import { FederationService } from "../services/FederationService";
import { GraphQLService } from "../services/GraphQLService";
import {
  ClientConfig,
  HttpClient,
  AuthenticationError,
} from "../types/api";
import { createSDKLogger } from "../utils/logger";
import { SDK_VERSION } from "../version";

/**
 * Main AuraOne API client.
 *
 * Route contract: all paths are `/api/...` on the public host
 * (`https://api.auraone.ai`). The organization context is derived from the
 * API key record server-side; a configured `orgId` is sent only as a
 * `?orgId=` query assertion and must equal the key's organization.
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
  public readonly evaluations: EvaluationsService;
  public readonly benchmarks: BenchmarksService;
  public readonly certification: CertificationService;
  public readonly regression: RegressionService;
  public readonly labs: LabsService;
  public readonly governance: GovernanceService;
  public readonly integrations: IntegrationsService;
  public readonly environments: EnvironmentsService;
  public readonly enterpriseIntelligence: EnterpriseIntelligenceService;
  public readonly attention: AttentionService;
  public readonly optimization: OptimizationService;
  public readonly autopilot: AutopilotService;
  public readonly visualization: VisualizationService;
  public readonly capacity: CapacityService;
  public readonly federation: FederationService;
  public readonly graphql: GraphQLService;
  private readonly orgId?: string;

  constructor(config: ClientConfig = {}) {
    // Validate configuration
    this.validateConfig(config);

    // Initialize authentication provider
    this.authProvider = new AuthProvider({
      apiKey: config.apiKey,
      token: config.accessToken,
      refreshToken: config.refreshToken,
      onTokenRefresh: (_newToken) => {
        void _newToken;
        createSDKLogger(config.debug).info("Token refreshed successfully");
      },
    });

    this.orgId = config.orgId;

    // Initialize HTTP client
    this.fetchClient = new FetchHttpClient({
      baseUrl: config.baseUrl || "https://api.auraone.ai",
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
      debug: config.debug || false,
      orgId: this.orgId,
      defaultHeaders: {
        ...this.authProvider.getAuthHeaders(),
      },
    });
    this.httpClient = this.fetchClient;

    // Initialize services
    this.auth = new AuthService(this.httpClient);
    this.analytics = new AnalyticsService(this.httpClient);
    this.training = new TrainingService(this.httpClient);
    this.billing = new BillingService(this.httpClient);
    this.collaboration = new CollaborationService(this.httpClient);
    this.evaluations = new EvaluationsService(this.httpClient);
    this.benchmarks = new BenchmarksService(this.httpClient);
    this.certification = new CertificationService(this.httpClient);
    this.regression = new RegressionService(this.httpClient);
    this.labs = new LabsService(this.httpClient);
    this.governance = new GovernanceService(this.httpClient);
    this.integrations = new IntegrationsService(this.httpClient);
    this.environments = new EnvironmentsService(this.httpClient);
    this.enterpriseIntelligence = new EnterpriseIntelligenceService(
      this.httpClient,
    );
    this.attention = new AttentionService(this.httpClient);
    this.optimization = new OptimizationService(this.httpClient);
    this.autopilot = new AutopilotService(this.httpClient);
    this.visualization = new VisualizationService(this.httpClient);
    this.capacity = new CapacityService(this.httpClient);
    this.federation = new FederationService(this.httpClient, {
      orgId: this.orgId,
    });
    this.graphql = new GraphQLService(this.httpClient);

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

    return new AuraOneClient({
      ...options,
      accessToken: token,
      refreshToken,
    });
  }

  /**
   * Create AuraOne client from environment variables
   */
  static fromEnvironment(
    options: Omit<ClientConfig, "apiKey" | "accessToken" | "refreshToken"> = {},
  ): AuraOneClient {
    const apiKey = process.env.AURAONE_API_KEY;
    const accessToken = process.env.AURAONE_TOKEN;
    const refreshToken = process.env.AURAONE_REFRESH_TOKEN;

    if (!apiKey && !accessToken) {
      throw new AuthenticationError(
        "No authentication credentials found in environment variables. " +
          "Set AURAONE_API_KEY or AURAONE_TOKEN environment variable.",
      );
    }

    return new AuraOneClient({
      ...options,
      apiKey,
      accessToken,
      refreshToken,
    });
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
        message: error instanceof Error ? error.message : "Connection failed",
      };
    }
  }

  /**
   * Public base URL the client is configured to call.
   */
  getBaseUrl(): string {
    return this.fetchClient.getBaseUrl();
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
    if (config.apiKey && !AuthProvider.isValidApiKey(config.apiKey)) {
      throw new AuthenticationError("Invalid API key format");
    }

    if (
      config.accessToken &&
      !AuthProvider.isValidJwtToken(config.accessToken)
    ) {
      throw new AuthenticationError("Invalid access token format");
    }

    // A credential is required at construction (PR-19 T-P0-13, CC-28 R3):
    // there is no unauthenticated client.
    if (!config.apiKey && !config.accessToken) {
      throw new AuthenticationError(
        "AuraOneClient requires apiKey or accessToken (set AURAONE_API_KEY)",
      );
    }

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
    return SDK_VERSION;
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
export * from "../services/IntegrationsService";
export * from "../services/EnterpriseIntelligenceService";
export * from "../services/AttentionService";
export * from "../services/OptimizationService";
export * from "../services/AutopilotService";
export * from "../services/VisualizationService";
export * from "../services/CapacityService";
export * from "../services/FederationService";
export * from "../services/GraphQLService";

// Default export
export default AuraOneClient;
