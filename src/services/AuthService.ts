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
      `/api/auth/api-keys${queryString}`,
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
      "/api/auth/api-keys",
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
      "/api/auth/api-keys",
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
      "/api/auth/api-keys",
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
    return this.httpClient.put("/api/auth/api-keys", undefined, config);
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
   * Refresh authentication token
   */
  async refreshToken(
    refreshToken: string,
    config?: RequestConfig,
  ): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    token_type: string;
  }> {
    return this.httpClient.post(
      "/api/auth/refresh",
      {
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      },
      config,
    );
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
