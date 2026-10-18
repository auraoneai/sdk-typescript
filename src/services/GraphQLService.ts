import { AuraOneError, type HttpClient, type RequestConfig } from "../types/api";

export interface GraphQLErrorLocation {
  line: number;
  column: number;
}

export interface GraphQLErrorPayload {
  message: string;
  locations?: GraphQLErrorLocation[];
  path?: Array<string | number>;
  extensions?: Record<string, unknown>;
}

export interface GraphQLResponse<TData = Record<string, unknown>> {
  data?: TData;
  errors?: GraphQLErrorPayload[];
  extensions?: Record<string, unknown>;
}

export interface GraphQLRequestOptions<
  TVariables = Record<string, unknown>,
> {
  variables?: TVariables;
  operationName?: string;
  persistedQueryHash?: string;
  includeQueryWithHash?: boolean;
  headers?: Record<string, string>;
  idempotencyKey?: string;
}

export class GraphQLExecutionError extends AuraOneError {
  public readonly errors: GraphQLErrorPayload[];

  constructor(
    message: string,
    errors: GraphQLErrorPayload[] = [],
    details?: unknown,
  ) {
    const code =
      (typeof errors[0]?.extensions?.code === "string"
        ? errors[0].extensions.code
        : undefined) ?? "GRAPHQL_ERROR";
    super(message, code, details ?? { errors }, 400);
    this.name = "GraphQLExecutionError";
    this.errors = errors;
  }
}

export interface GraphQLOptimizationJob {
  id: string;
  name: string;
  strategy: string;
  status: string;
  progress: number;
  bestScore?: number | null;
  organizationId?: string | null;
  userId?: string | null;
}

export interface GraphQLOptimizationHistoryPoint {
  ts: number;
  score?: number | null;
  parameters?: Record<string, unknown> | null;
}

export interface GraphQLOptimizationSurface {
  parameterX: string;
  parameterY: string;
  resolution: number;
  data?: unknown;
}

export const GRAPHQL_PERSISTED_QUERIES = {
  OptimizationJob: {
    sha256Hash:
      "c2d6f57b508ee1e21e1f819a42f9a177d467b2d1f61ca4681b3b269a84f47291",
    operationName: "OptimizationJob",
    source: `query OptimizationJob($id: ID!) {
  job(id: $id) {
    id
    name
    strategy
    status
    progress
    bestScore
    organizationId
    userId
  }
}`,
  },
  OptimizationJobs: {
    sha256Hash:
      "5b1dc3104d637a1155593c1a9f14dc3969d85759f04e502503d5f7a3d88c5e7a",
    operationName: "OptimizationJobs",
    source: `query OptimizationJobs($limit: Int, $offset: Int) {
  jobs(limit: $limit, offset: $offset) {
    id
    name
    strategy
    status
    progress
    bestScore
    organizationId
    userId
  }
}`,
  },
  OptimizationJobHistory: {
    sha256Hash:
      "931f550bd9ea2c91ddefe76d44d69d425979a951b858ac03b51a4d74a13e0cb8",
    operationName: "OptimizationJobHistory",
    source: `query OptimizationJobHistory($id: ID!) {
  jobHistory(id: $id) {
    ts
    score
    parameters
  }
}`,
  },
  OptimizationJobSurfaces: {
    sha256Hash:
      "07a11763cb1542a68e8a1d39954652b43b3ea9640a05ebba8cdaf21897ced888",
    operationName: "OptimizationJobSurfaces",
    source: `query OptimizationJobSurfaces($id: ID!) {
  jobSurfaces(id: $id) {
    parameterX
    parameterY
    resolution
    data
  }
}`,
  },
} as const;

/**
 * Typed GraphQL client for `/api/graphql`.
 *
 * Every request is authenticated via the parent `AuraOneClient` (`X-API-Key`
 * or `Authorization: Bearer`) and org-scoped to the key/session organization.
 */
export class GraphQLService {
  constructor(
    private readonly http: HttpClient,
    private readonly endpoint: string = "/api/graphql",
    private readonly baseConfig: RequestConfig = {},
  ) {}

  async execute<
    TData = Record<string, unknown>,
    TVariables = Record<string, unknown>,
  >(
    document: string,
    options: GraphQLRequestOptions<TVariables> = {},
  ): Promise<TData> {
    const body: Record<string, unknown> = {};
    if (document && (!options.persistedQueryHash || options.includeQueryWithHash !== false)) {
      body.query = document;
    }
    if (options.variables !== undefined) {
      body.variables = options.variables;
    }
    if (options.operationName !== undefined) {
      body.operationName = options.operationName;
    }
    if (options.persistedQueryHash) {
      body.extensions = {
        persistedQuery: {
          version: 1,
          sha256Hash: options.persistedQueryHash,
        },
      };
    }

    const headers: Record<string, string> = {
      ...this.baseConfig.headers,
      ...options.headers,
      "Content-Type": "application/json",
    };
    if (options.idempotencyKey) {
      headers["Idempotency-Key"] = options.idempotencyKey;
    }

    const response = await this.http.post<GraphQLResponse<TData>>(
      this.endpoint,
      body,
      {
        ...this.baseConfig,
        headers,
      },
    );

    if (response?.errors && response.errors.length > 0) {
      const first = response.errors[0];
      throw new GraphQLExecutionError(
        first?.message || "GraphQL execution failed",
        response.errors,
        response,
      );
    }

    if (!response || response.data === undefined) {
      throw new GraphQLExecutionError(
        "GraphQL response missing data",
        [],
        response,
      );
    }

    return response.data;
  }

  async query<
    TData = Record<string, unknown>,
    TVariables = Record<string, unknown>,
  >(
    query: string,
    options: GraphQLRequestOptions<TVariables> = {},
  ): Promise<TData> {
    return this.execute<TData, TVariables>(query, options);
  }

  async mutate<
    TData = Record<string, unknown>,
    TVariables = Record<string, unknown>,
  >(
    mutation: string,
    options: GraphQLRequestOptions<TVariables> = {},
  ): Promise<TData> {
    return this.execute<TData, TVariables>(mutation, options);
  }

  async request<
    TData = Record<string, unknown>,
    TVariables = Record<string, unknown>,
  >(
    document: string,
    options: GraphQLRequestOptions<TVariables> = {},
  ): Promise<TData> {
    return this.execute<TData, TVariables>(document, options);
  }

  async persistedQuery<
    TData = Record<string, unknown>,
    TVariables = Record<string, unknown>,
  >(
    sha256Hash: string,
    options: GraphQLRequestOptions<TVariables> & { query?: string } = {},
  ): Promise<TData> {
    return this.execute<TData, TVariables>(options.query ?? "", {
      ...options,
      persistedQueryHash: sha256Hash,
      includeQueryWithHash: Boolean(options.query),
    });
  }

  async getOptimizationJob(
    id: string,
    options: Omit<GraphQLRequestOptions<{ id: string }>, "variables"> = {},
  ): Promise<GraphQLOptimizationJob | null> {
    const entry = GRAPHQL_PERSISTED_QUERIES.OptimizationJob;
    const data = await this.query<{ job: GraphQLOptimizationJob | null }, { id: string }>(
      entry.source,
      {
        ...options,
        operationName: entry.operationName,
        persistedQueryHash: entry.sha256Hash,
        variables: { id },
      },
    );
    return data.job;
  }

  async listOptimizationJobs(
    variables: { limit?: number; offset?: number } = {},
    options: Omit<
      GraphQLRequestOptions<{ limit?: number; offset?: number }>,
      "variables"
    > = {},
  ): Promise<GraphQLOptimizationJob[]> {
    const entry = GRAPHQL_PERSISTED_QUERIES.OptimizationJobs;
    const data = await this.query<
      { jobs: GraphQLOptimizationJob[] },
      { limit?: number; offset?: number }
    >(entry.source, {
      ...options,
      operationName: entry.operationName,
      persistedQueryHash: entry.sha256Hash,
      variables,
    });
    return data.jobs;
  }

  async getOptimizationJobHistory(
    id: string,
    options: Omit<GraphQLRequestOptions<{ id: string }>, "variables"> = {},
  ): Promise<GraphQLOptimizationHistoryPoint[]> {
    const entry = GRAPHQL_PERSISTED_QUERIES.OptimizationJobHistory;
    const data = await this.query<
      { jobHistory: GraphQLOptimizationHistoryPoint[] },
      { id: string }
    >(entry.source, {
      ...options,
      operationName: entry.operationName,
      persistedQueryHash: entry.sha256Hash,
      variables: { id },
    });
    return data.jobHistory;
  }

  async getOptimizationJobSurfaces(
    id: string,
    options: Omit<GraphQLRequestOptions<{ id: string }>, "variables"> = {},
  ): Promise<GraphQLOptimizationSurface[]> {
    const entry = GRAPHQL_PERSISTED_QUERIES.OptimizationJobSurfaces;
    const data = await this.query<
      { jobSurfaces: GraphQLOptimizationSurface[] },
      { id: string }
    >(entry.source, {
      ...options,
      operationName: entry.operationName,
      persistedQueryHash: entry.sha256Hash,
      variables: { id },
    });
    return data.jobSurfaces;
  }
}

export { GraphQLService as GraphQLClient };
