import type { HttpClient, RequestConfig } from "../types/api";

export interface GraphQLRequestOptions {
  variables?: Record<string, unknown>;
  operationName?: string;
  headers?: Record<string, string>;
}

export interface GraphQLError {
  message: string;
  locations?: Array<{ line: number; column: number }>;
  path?: Array<string | number>;
  extensions?: Record<string, unknown>;
}

export class GraphQLClient {
  constructor(
    private readonly http: HttpClient,
    private readonly endpoint: string = "/graphql",
    private readonly baseConfig: RequestConfig = {},
  ) {}

  async request<T>(query: string, options: GraphQLRequestOptions = {}): Promise<T> {
    const response = await this.http.post<{ data?: T; errors?: GraphQLError[] }>(
      this.endpoint,
      {
        query,
        variables: options.variables,
        operationName: options.operationName,
      },
      {
        ...this.baseConfig,
        headers: {
          ...this.baseConfig.headers,
          ...options.headers,
          "Content-Type": "application/json",
        },
      },
    );

    if (response.errors?.length) {
      const error = response.errors[0];
      const details = error.extensions ? JSON.stringify(error.extensions) : undefined;
      throw new Error(`GraphQL error: ${error.message}${details ? ` (${details})` : ""}`);
    }

    if (!response.data) {
      throw new Error("GraphQL response missing data");
    }

    return response.data;
  }
}
