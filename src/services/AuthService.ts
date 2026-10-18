import {
  HttpClient,
  APIKeyResponse,
  ListAPIKeysResponse,
  RequestConfig,
} from "../types/api";
import { buildQueryString } from "../utils/HttpClient";

export class AuthService {
  constructor(private httpClient: HttpClient) {}

  /**
   * List all API keys for the organization
   */
  async listAPIKeys(
    options?: {
      includeStats?: boolean;
    },
    config?: RequestConfig,
  ): Promise<ListAPIKeysResponse> {
    const queryString = options
      ? buildQueryString({ stats: options.includeStats })
      : "";
    return this.httpClient.get<ListAPIKeysResponse>(
      `/api/v1/api-keys${queryString}`,
      config,
    );
  }

  /**
   * Create a new API key
   */
  async createAPIKey(
    request: {
      name: string;
      permissions: string[];
      expiresAt?: string;
    },
    config?: RequestConfig,
  ): Promise<APIKeyResponse> {
    return this.httpClient.post<APIKeyResponse>(
      "/api/v1/api-keys",
      {
        action: "create",
        ...request,
      },
      config,
    );
  }

  /**
   * Rotate an existing API key
   */
  async rotateAPIKey(
    keyId: string,
    config?: RequestConfig,
  ): Promise<APIKeyResponse> {
    return this.httpClient.post<APIKeyResponse>(
      "/api/v1/api-keys",
      {
        action: "rotate",
        keyId,
      },
      config,
    );
  }

  /**
   * Revoke an API key
   */
  async revokeAPIKey(
    keyId: string,
    config?: RequestConfig,
  ): Promise<APIKeyResponse> {
    return this.httpClient.post<APIKeyResponse>(
      "/api/v1/api-keys",
      {
        action: "revoke",
        keyId,
      },
      config,
    );
  }

  /**
   * Schedule rotation for expiring keys
   */
  async scheduleRotationForExpiringKeys(config?: RequestConfig): Promise<{
    success: boolean;
    result: {
      scheduled: number;
      notifications: number;
    };
    message: string;
  }> {
    return this.httpClient.put("/api/v1/api-keys", undefined, config);
  }

  /**
   * Get current session information
   */
  async getSession(config?: RequestConfig): Promise<{
    user?: {
      id: string;
      email: string;
      name: string;
      orgId: string;
    };
    expires: string;
  }> {
    return this.httpClient.get("/api/auth/session", config);
  }

  /**
   * Refresh authentication token.
   *
   * POST /api/auth/refresh takes `{ refreshToken }` and returns
   * `{ success, tokens: { accessToken, refreshToken, tokenType, expiresIn } }`.
   */
  async refreshToken(
    refreshToken: string,
    config?: RequestConfig,
  ): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
    tokenType?: string;
  }> {
    const response = await this.httpClient.post<{
      success?: boolean;
      tokens?: {
        accessToken: string;
        refreshToken?: string;
        tokenType?: string;
        expiresIn?: number;
      };
    }>("/api/auth/refresh", { refreshToken }, config);

    if (!response.tokens?.accessToken) {
      throw new Error("Refresh response missing tokens.accessToken");
    }

    return {
      accessToken: response.tokens.accessToken,
      refreshToken: response.tokens.refreshToken,
      expiresIn: response.tokens.expiresIn,
      tokenType: response.tokens.tokenType,
    };
  }

  /**
   * Get CSRF token for session-based authentication
   */
  async getCSRFToken(config?: RequestConfig): Promise<{
    csrfToken: string;
  }> {
    return this.httpClient.get("/api/auth/csrf", config);
  }
}
