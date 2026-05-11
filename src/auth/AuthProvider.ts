import {
  AuthenticationError,
  RequestConfig,
  HttpClient,
  AuraOneError,
} from "../types/api";

export interface AuthOptions {
  apiKey?: string;
  token?: string;
  refreshToken?: string;
  onTokenRefresh?: (newToken: string) => void;
}

export class AuthProvider {
  private apiKey?: string;
  private token?: string;
  private refreshToken?: string;
  private onTokenRefresh?: (newToken: string) => void;

  constructor(options: AuthOptions = {}) {
    this.apiKey = options.apiKey;
    this.token = options.token;
    this.refreshToken = options.refreshToken;
    this.onTokenRefresh = options.onTokenRefresh;
  }

  /**
   * Get authentication headers for API requests
   */
  getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    if (this.apiKey) {
      headers["X-API-Key"] = this.apiKey;
    }

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    return headers;
  }

  /**
   * Set API key for authentication
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    // Clear JWT token when API key is set
    this.token = undefined;
    this.refreshToken = undefined;
  }

  /**
   * Set JWT token for authentication
   */
  setToken(token: string, refreshToken?: string): void {
    this.token = token;
    this.refreshToken = refreshToken;
    // Clear API key when JWT token is set
    this.apiKey = undefined;
  }

  /**
   * Check if authentication is configured
   */
  isAuthenticated(): boolean {
    return !!(this.apiKey || this.token);
  }

  /**
   * Get current authentication method
   */
  getAuthMethod(): "apikey" | "jwt" | "none" {
    if (this.apiKey) return "apikey";
    if (this.token) return "jwt";
    return "none";
  }

  /**
   * Refresh JWT token if refresh token is available
   */
  async refreshAuthToken(
    refreshEndpoint: string,
    httpClient: HttpClient,
    config?: RequestConfig,
  ): Promise<boolean> {
    if (!this.refreshToken) {
      throw new AuthenticationError("No refresh token available");
    }

    try {
      const response = await httpClient.post<{
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
      }>(
        refreshEndpoint,
        {
          refresh_token: this.refreshToken,
          grant_type: "refresh_token",
        },
        config,
      );

      if (response.access_token) {
        this.token = response.access_token;

        if (response.refresh_token) {
          this.refreshToken = response.refresh_token;
        }

        // Notify callback about token refresh
        if (this.onTokenRefresh) {
          this.onTokenRefresh(response.access_token);
        }

        return true;
      }

      return false;
    } catch (error) {
      // Clear tokens if refresh fails
      this.token = undefined;
      this.refreshToken = undefined;
      throw new AuthenticationError(
        "Token refresh failed",
        "TOKEN_REFRESH_FAILED",
        error,
      );
    }
  }

  /**
   * Handle authentication errors and attempt to refresh token
   */
  async handleAuthError(
    error: AuraOneError,
    refreshEndpoint: string,
    httpClient: HttpClient,
    retryRequest: () => Promise<unknown>,
  ): Promise<unknown> {
    // Only attempt refresh for JWT authentication with 401 errors
    if (
      this.getAuthMethod() === "jwt" &&
      this.refreshToken &&
      error.statusCode === 401
    ) {
      try {
        const refreshed = await this.refreshAuthToken(
          refreshEndpoint,
          httpClient,
        );

        if (refreshed) {
          // Retry the original request with new token
          return await retryRequest();
        }
      } catch {
        // If refresh fails, throw the original error
        throw error;
      }
    }

    // Re-throw the original error if we can't handle it
    throw error;
  }

  /**
   * Clear all authentication data
   */
  clearAuth(): void {
    this.apiKey = undefined;
    this.token = undefined;
    this.refreshToken = undefined;
  }

  /**
   * Validate API key format
   */
  static isValidApiKey(apiKey: string): boolean {
    // AuraOne API keys follow the format: aura_live_xxxx or aura_test_xxxx
    const apiKeyPattern = /^aura_(live|test)_[a-zA-Z0-9]{32,}$/;
    return apiKeyPattern.test(apiKey);
  }

  /**
   * Validate JWT token format (basic validation)
   */
  static isValidJwtToken(token: string): boolean {
    // Basic JWT format validation (three parts separated by dots)
    const parts = token.split(".");
    return parts.length === 3 && parts.every((part) => part.length > 0);
  }

  /**
   * Extract token payload (without verification)
   */
  static getTokenPayload(token: string): Record<string, unknown> | null {
    try {
      if (!this.isValidJwtToken(token)) {
        return null;
      }

      const payload = token.split(".")[1];
      const decoded = Buffer.from(payload, "base64").toString("utf8");
      const parsed = JSON.parse(decoded);
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Check if JWT token is expired
   */
  static isTokenExpired(token: string): boolean {
    const payload = this.getTokenPayload(token);
    const exp =
      payload && typeof payload.exp === "number" ? payload.exp : undefined;
    if (typeof exp !== "number") {
      return true;
    }

    // Token expiration is in seconds, Date.now() is in milliseconds
    return exp * 1000 < Date.now();
  }

  /**
   * Get token expiration time
   */
  getTokenExpiration(): Date | null {
    if (!this.token) return null;

    const payload = AuthProvider.getTokenPayload(this.token);
    const exp =
      payload && typeof payload.exp === "number" ? payload.exp : undefined;
    if (typeof exp !== "number") return null;

    return new Date(exp * 1000);
  }

  /**
   * Check if current token will expire soon
   */
  willTokenExpireSoon(minutesThreshold = 5): boolean {
    const expiration = this.getTokenExpiration();
    if (!expiration) return true;

    const thresholdMs = minutesThreshold * 60 * 1000;
    return expiration.getTime() - Date.now() < thresholdMs;
  }

  /**
   * Create AuthProvider from environment variables
   */
  static fromEnvironment(): AuthProvider {
    const apiKey = process.env.AURAONE_API_KEY;
    const token = process.env.AURAONE_TOKEN;
    const refreshToken = process.env.AURAONE_REFRESH_TOKEN;

    return new AuthProvider({
      apiKey,
      token,
      refreshToken,
    });
  }
}
