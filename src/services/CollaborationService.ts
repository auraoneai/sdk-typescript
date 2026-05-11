import {
  HttpClient,
  ActiveCollaborationsResponse,
  RequestConfig,
} from "../types/api";

export class CollaborationService {
  constructor(private httpClient: HttpClient) {}

  /**
   * Get active collaboration sessions
   */
  async getActiveCollaborations(
    config?: RequestConfig,
  ): Promise<ActiveCollaborationsResponse> {
    return this.httpClient.get<ActiveCollaborationsResponse>(
      "/api/collaboration/active",
      config,
    );
  }

  /**
   * Join a collaboration session
   */
  async joinSession(
    sessionId: string,
    config?: RequestConfig,
  ): Promise<{
    success: boolean;
    session: Record<string, unknown>;
  }> {
    return this.httpClient.post(
      "/api/collaboration/session/join",
      { sessionId },
      config,
    );
  }

  /**
   * Submit collaboration operation
   */
  async submitOperation(
    operation: Record<string, unknown>,
    config?: RequestConfig,
  ): Promise<{
    success: boolean;
    operationId: string;
  }> {
    return this.httpClient.post(
      "/api/collaboration/session/operations",
      operation,
      config,
    );
  }
}
