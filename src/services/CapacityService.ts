import type { HttpClient, RequestConfig } from "../types/api";

export type CapacityUtilizationRange =
  | "24h"
  | "7d"
  | "30d"
  | "90d"
  | "week"
  | "month"
  | "quarter"
  | "year";

export interface CapacityPoolDay {
  date: string;
  credits: number;
  sessions: number;
}

export interface CapacityPool {
  used: number;
  limit: number;
  percentage: number;
  daily?: CapacityPoolDay[];
}

/** `GET /api/v1/capacity/utilization` — org-scoped consumption series. */
export interface CapacityUtilization {
  orgId: string;
  range: string;
  generatedAt: string;
  credits: CapacityPool;
  sessions: CapacityPool;
  gpu: CapacityPool;
  storage: CapacityPool;
}

export interface CapacityUtilizationOptions {
  /** Scope assertion — must equal the credential's organization. */
  orgId?: string;
  /** Default `7d`; accepts `24h|7d|30d|90d` and week/month/quarter/year. */
  range?: CapacityUtilizationRange | string;
}

/**
 * Client for `GET /api/v1/capacity/utilization` — the organization-scoped
 * usage/capacity series rendered on the capacity dashboard
 * (secondary-dashboards readmission P1-09).
 */
export class CapacityService {
  constructor(
    private readonly http: HttpClient,
    private readonly requestConfig: RequestConfig = {},
  ) {}

  /**
   * GET /api/v1/capacity/utilization — daily credits/sessions/gpu/storage
   * utilization rows for the resolved organization over `range`.
   */
  getUtilization(
    options: CapacityUtilizationOptions = {},
  ): Promise<CapacityUtilization> {
    const params = new URLSearchParams();
    if (options.orgId) params.set("orgId", options.orgId);
    if (options.range) params.set("range", options.range);
    const suffix = params.toString();
    return this.http.get<CapacityUtilization>(
      `/api/v1/capacity/utilization${suffix ? `?${suffix}` : ""}`,
      this.requestConfig,
    );
  }
}
