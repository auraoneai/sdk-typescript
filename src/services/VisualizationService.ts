import { randomUUID } from "node:crypto";
import type { HttpClient, RequestConfig } from "../types/api";

export type DashboardView =
  | "all"
  | "favorites"
  | "bookmarks"
  | "mine"
  | "templates"
  | "recent";

export type DashboardSortBy =
  | "name"
  | "createdAt"
  | "updatedAt"
  | "lastViewed"
  | "popularity";

export interface DashboardEngagement {
  viewCount: number;
  likeCount: number;
  bookmarkCount: number;
  shareCount: number;
  lastViewedAt?: string | null;
}

export interface DashboardWidgetInput {
  id: string;
  type: string;
  title: string;
  description?: string;
  position: { x: number; y: number; w: number; h: number };
  dataQuery: Record<string, unknown>;
  chartConfig?: Record<string, unknown>;
  filters?: unknown[];
  isRealtime?: boolean;
  refreshInterval?: number;
  customization?: Record<string, unknown>;
  cacheSettings?: Record<string, unknown>;
  alertRules?: unknown[];
}

export interface CreateDashboardRequest {
  name: string;
  description?: string;
  layout: {
    columns: number;
    rows: number;
    gap: number;
    padding: number;
    responsive: boolean;
    breakpoints: { mobile: number; tablet: number; desktop: number };
  };
  widgets: DashboardWidgetInput[];
  /** Required by the route (may be an empty array). */
  dataSources: Record<string, unknown>[];
  refreshInterval: number;
  isPublic: boolean;
  /** Required by the route (may be an empty array). */
  tags: string[];
  /** Required by the route (may be an empty object). */
  metadata: Record<string, unknown>;
}

export interface UpdateDashboardRequest {
  name?: string;
  description?: string;
  layout?: Record<string, unknown>;
  widgets?: Record<string, unknown>[];
  dataSources?: Record<string, unknown>[];
  refreshInterval?: number;
  isPublic?: boolean;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface DashboardListItem {
  id: string;
  name: string;
  description?: string | null;
  organizationId: string;
  createdBy?: string;
  isPublic: boolean;
  tags: string[];
  metadata: Record<string, unknown>;
  layout?: Record<string, unknown>;
  createdAt: string | null;
  updatedAt: string | null;
  chartCount: number;
  isFavorite: boolean;
  isBookmarked: boolean;
  isTemplate: boolean;
  engagement?: DashboardEngagement;
}

export interface DashboardListResponse {
  data: DashboardListItem[];
  pagination: { total: number; limit: number; offset: number; pages: number };
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string | null;
  organizationId: string;
  createdBy?: string;
  isPublic?: boolean;
  tags?: string[];
  metadata?: Record<string, unknown>;
  layout?: Record<string, unknown>;
  dataSources?: Record<string, unknown>[];
  widgets?: Record<string, unknown>[];
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface ListDashboardsOptions {
  /** Scope assertion — must equal the credential's organization. */
  orgId?: string;
  limit?: number;
  offset?: number;
  search?: string;
  /** Comma-separated tag filter. */
  tags?: string;
  sortBy?: DashboardSortBy;
  sortOrder?: "asc" | "desc";
  includePublic?: boolean;
  view?: DashboardView;
  includeAnalytics?: boolean;
}

export interface DashboardEngagementResponse {
  data: {
    dashboardId: string;
    isFavorite?: boolean;
    isBookmarked?: boolean;
    shareUrl?: string;
    shareId?: string;
    engagement: DashboardEngagement;
  };
}

export interface VisualizationWidgetRecord {
  id: string;
  dashboardId: string;
  dashboard: { id: string; name: string; organizationId: string };
  chartType: string;
  title: string;
  description?: string;
  dataQuery: Record<string, unknown>;
  chartConfig: Record<string, unknown>;
  filters: unknown[];
  position: Record<string, unknown>;
  isRealtime: boolean;
  refreshInterval?: number;
  customization: Record<string, unknown>;
  cacheSettings: Record<string, unknown>;
  alertRules: unknown[];
  createdAt: string;
  updatedAt: string;
}

/** `GET /api/v1/visualization/data` without a widgetId. */
export interface VisualizationWidgetList {
  data: {
    widgets: VisualizationWidgetRecord[];
    summary: {
      totalWidgets: number;
      chartTypeDistribution: Record<string, number>;
    };
  };
  success: boolean;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** `GET /api/v1/visualization/data?widgetId=` — single widget. */
export interface VisualizationWidgetResponse {
  data: VisualizationWidgetRecord;
  success: boolean;
}

export type VisualizationChartType =
  | "line"
  | "bar"
  | "scatter"
  | "area"
  | "pie"
  | "donut"
  | "heatmap"
  | "treemap"
  | "network"
  | "sankey"
  | "candlestick"
  | "gauge"
  | "funnel"
  | "bubble"
  | "violin"
  | "histogram";

export interface ListVisualizationDataOptions {
  dashboardId?: string;
  widgetId?: string;
  chartType?: VisualizationChartType;
  page?: number;
  limit?: number;
}

export type VisualizationJson =
  | string
  | number
  | boolean
  | null
  | VisualizationJson[]
  | { [key: string]: VisualizationJson };

export interface VisualizationDataQuery {
  /** Must equal `query.sourceId`. */
  dataSourceId: string;
  query: {
    id: string;
    sourceId: string;
    query: string;
    parameters?: Record<string, VisualizationJson>;
    aggregations?: Array<{
      field: string;
      function:
        | "sum"
        | "avg"
        | "count"
        | "min"
        | "max"
        | "median"
        | "std_dev"
        | "variance"
        | "percentile"
        | "distinct_count";
      alias?: string;
      parameters?: Record<string, VisualizationJson>;
    }>;
    filters?: Array<{
      field: string;
      operator:
        | "equals"
        | "not_equals"
        | "greater_than"
        | "less_than"
        | "greater_than_equal"
        | "less_than_equal"
        | "contains"
        | "not_contains"
        | "starts_with"
        | "ends_with"
        | "in"
        | "not_in"
        | "between"
        | "is_null"
        | "is_not_null";
      value: VisualizationJson;
      condition?: "AND" | "OR";
    }>;
    timeRange: { start: string; end: string; timezone?: string };
    groupBy?: string[];
    sortBy?: Array<{
      field: string;
      direction: "asc" | "desc";
      nulls?: "first" | "last";
    }>;
    limit?: number;
    offset?: number;
    cacheTTL?: number;
  };
}

export interface VisualizationQueryResult {
  data: VisualizationJson[];
  metadata: {
    totalRows: number;
    executionTime: number;
    fromCache: boolean;
    cacheKey?: string;
  };
}

export type VisualizationExportFormat =
  | "png"
  | "svg"
  | "pdf"
  | "html"
  | "excel"
  | "csv"
  | "json";

/** Exactly one of `dashboardId`/`widgetId` is required. */
export interface VisualizationExportRequest {
  dashboardId?: string;
  widgetId?: string;
  format: VisualizationExportFormat;
  options?: {
    width?: number;
    height?: number;
    dpi?: number;
    quality?: number;
    includeData?: boolean;
    includeFilters?: boolean;
    theme?: "light" | "dark";
    watermark?: {
      text: string;
      position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
      opacity: number;
    };
  };
  filters?: unknown[];
  dateRange?: { start: string; end: string };
}

// ---------------------------------------------------------------------------
// Scheduled export configs — `/api/visualization/exports` (non-v1 shared
// surface; the resource is `VisualizationExportConfig` + `ExportHistory`).
// ---------------------------------------------------------------------------

export type ExportConfigFormat =
  | "pdf"
  | "png"
  | "svg"
  | "excel"
  | "csv"
  | "json";
export type ExportConfigStatus = "active" | "paused" | "archived";

export interface ExportConfig {
  id: string;
  orgId: string;
  dashboardId: string;
  dashboardName?: string;
  name: string;
  description?: string | null;
  status: string;
  format: string;
  settings: Record<string, unknown>;
  schedule: Record<string, unknown>;
  distribution: Record<string, unknown>;
  runCount: number;
  successCount: number;
  successRate: number;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  createdAt: string;
  updatedAt: string;
  downloadUrl?: string | null;
  lastRun?: {
    id: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    expiresAt: string | null;
  } | null;
  createdBy?: { id: string; name: string | null; email: string | null };
}

export interface CreateExportConfigRequest {
  dashboardId: string;
  name: string;
  description?: string;
  format: ExportConfigFormat;
  settings?: Record<string, unknown>;
  schedule?: Record<string, unknown>;
  distribution?: Record<string, unknown>;
  status?: "active" | "paused";
  /** Default true — enqueue a run immediately after creation. */
  runNow?: boolean;
  orgId?: string;
}

export interface UpdateExportConfigRequest {
  name?: string;
  description?: string;
  format?: ExportConfigFormat;
  settings?: Record<string, unknown>;
  schedule?: Record<string, unknown>;
  distribution?: Record<string, unknown>;
  status?: ExportConfigStatus;
  nextRunAt?: string;
  runNow?: boolean;
}

export interface ExportConfigListResponse {
  data: ExportConfig[];
  pagination: { total: number; limit: number; offset: number };
}

export interface ListExportsOptions {
  orgId?: string;
  /** When set, returns `{ data: ExportConfig }` for that config only. */
  id?: string;
  format?: ExportConfigFormat;
  status?: ExportConfigStatus;
  search?: string;
  sortBy?: "createdAt" | "name" | "lastRun";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

/** `POST /api/visualization/exports/{id}/run` — 202. */
export interface ExportRunReceipt {
  data: {
    id: string;
    status: string;
    createdAt: string;
    configId: string;
  };
}

export interface ExportHistoryEntry {
  id: string;
  status: string;
  /** `/api/visualization/exports/{id}/download` when status is completed. */
  downloadUrl: string | null;
  fileSize?: number | null;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string | null;
  processingTime?: number | null;
}

export interface ExportHistoryResponse {
  data: ExportHistoryEntry[];
  pagination: { total: number; limit: number; offset: number };
}

export interface RunExportOverrides {
  settings?: Record<string, unknown>;
  schedule?: Record<string, unknown>;
  distribution?: Record<string, unknown>;
}

export interface VisualizationRequestOptions {
  /** Sent as `Idempotency-Key`; auto-generated when omitted on mutations. */
  idempotencyKey?: string;
}

function id(value: string): string {
  return encodeURIComponent(value);
}

function bool(value: boolean): string {
  return value ? "true" : "false";
}

/**
 * Client for the visualization surface:
 *
 * - `/api/v1/visualization/dashboards/**` — CRUD plus share / favorite /
 *   bookmark / view engagement.
 * - `/api/v1/visualization/data` — widget configuration reads and the
 *   structured query executor.
 * - `/api/v1/visualization/export` — synchronous dashboard/widget render.
 * - `/api/visualization/exports/...` — scheduled export configs, runs,
 *   history, and artifact download (P1-06).
 */
export class VisualizationService {
  constructor(
    private readonly http: HttpClient,
    private readonly requestConfig: RequestConfig = {},
  ) {}

  private mutationConfig(options?: VisualizationRequestOptions): RequestConfig {
    return {
      ...this.requestConfig,
      headers: {
        ...this.requestConfig.headers,
        "Idempotency-Key": options?.idempotencyKey ?? randomUUID(),
      },
    };
  }

  /** GET /api/v1/visualization/dashboards — filtered, paginated list. */
  listDashboards(
    options: ListDashboardsOptions = {},
  ): Promise<DashboardListResponse> {
    const params = new URLSearchParams();
    if (options.orgId) params.set("orgId", options.orgId);
    if (options.limit !== undefined) params.set("limit", String(options.limit));
    if (options.offset !== undefined) {
      params.set("offset", String(options.offset));
    }
    if (options.search) params.set("search", options.search);
    if (options.tags) params.set("tags", options.tags);
    if (options.sortBy) params.set("sortBy", options.sortBy);
    if (options.sortOrder) params.set("sortOrder", options.sortOrder);
    if (options.includePublic !== undefined) {
      params.set("includePublic", bool(options.includePublic));
    }
    if (options.view) params.set("view", options.view);
    if (options.includeAnalytics !== undefined) {
      params.set("includeAnalytics", bool(options.includeAnalytics));
    }
    const suffix = params.toString();
    return this.http.get<DashboardListResponse>(
      `/api/v1/visualization/dashboards${suffix ? `?${suffix}` : ""}`,
      this.requestConfig,
    );
  }

  /** POST /api/v1/visualization/dashboards — create (201). */
  createDashboard(
    payload: CreateDashboardRequest,
    options?: VisualizationRequestOptions,
  ): Promise<Dashboard> {
    return this.http.post<Dashboard>(
      "/api/v1/visualization/dashboards",
      payload,
      this.mutationConfig(options),
    );
  }

  /** GET /api/v1/visualization/dashboards/{id} — with widgets. */
  getDashboard(dashboardId: string): Promise<Dashboard> {
    return this.http.get<Dashboard>(
      `/api/v1/visualization/dashboards/${id(dashboardId)}`,
      this.requestConfig,
    );
  }

  /** PUT /api/v1/visualization/dashboards/{id} — full update (idempotent). */
  updateDashboard(
    dashboardId: string,
    patch: UpdateDashboardRequest,
    options?: VisualizationRequestOptions,
  ): Promise<Dashboard> {
    return this.http.put<Dashboard>(
      `/api/v1/visualization/dashboards/${id(dashboardId)}`,
      patch,
      this.mutationConfig(options),
    );
  }

  /** DELETE /api/v1/visualization/dashboards/{id}. */
  deleteDashboard(dashboardId: string): Promise<Record<string, unknown>> {
    return this.http.delete<Record<string, unknown>>(
      `/api/v1/visualization/dashboards/${id(dashboardId)}`,
      this.requestConfig,
    );
  }

  /**
   * POST /api/v1/visualization/dashboards/{id}/share — mints a bearer-token
   * share URL (`data.shareUrl`); the platform stores only its hash.
   */
  shareDashboard(
    dashboardId: string,
    options?: VisualizationRequestOptions,
  ): Promise<DashboardEngagementResponse> {
    return this.http.post<DashboardEngagementResponse>(
      `/api/v1/visualization/dashboards/${id(dashboardId)}/share`,
      undefined,
      this.mutationConfig(options),
    );
  }

  /** POST /api/v1/visualization/dashboards/{id}/favorite. */
  favoriteDashboard(
    dashboardId: string,
    options?: VisualizationRequestOptions,
  ): Promise<DashboardEngagementResponse> {
    return this.http.post<DashboardEngagementResponse>(
      `/api/v1/visualization/dashboards/${id(dashboardId)}/favorite`,
      undefined,
      this.mutationConfig(options),
    );
  }

  /** DELETE /api/v1/visualization/dashboards/{id}/favorite. */
  unfavoriteDashboard(
    dashboardId: string,
  ): Promise<DashboardEngagementResponse> {
    return this.http.delete<DashboardEngagementResponse>(
      `/api/v1/visualization/dashboards/${id(dashboardId)}/favorite`,
      this.requestConfig,
    );
  }

  /** POST /api/v1/visualization/dashboards/{id}/bookmark. */
  bookmarkDashboard(
    dashboardId: string,
    options?: VisualizationRequestOptions,
  ): Promise<DashboardEngagementResponse> {
    return this.http.post<DashboardEngagementResponse>(
      `/api/v1/visualization/dashboards/${id(dashboardId)}/bookmark`,
      undefined,
      this.mutationConfig(options),
    );
  }

  /** DELETE /api/v1/visualization/dashboards/{id}/bookmark. */
  unbookmarkDashboard(
    dashboardId: string,
  ): Promise<DashboardEngagementResponse> {
    return this.http.delete<DashboardEngagementResponse>(
      `/api/v1/visualization/dashboards/${id(dashboardId)}/bookmark`,
      this.requestConfig,
    );
  }

  /** POST /api/v1/visualization/dashboards/{id}/view — record a view. */
  recordDashboardView(
    dashboardId: string,
    options?: VisualizationRequestOptions,
  ): Promise<DashboardEngagementResponse> {
    return this.http.post<DashboardEngagementResponse>(
      `/api/v1/visualization/dashboards/${id(dashboardId)}/view`,
      undefined,
      this.mutationConfig(options),
    );
  }

  /**
   * GET /api/v1/visualization/data — widget records. Pass `widgetId` for a
   * single widget; otherwise returns the paginated list + type summary.
   */
  listWidgets(
    options: ListVisualizationDataOptions = {},
  ): Promise<VisualizationWidgetResponse | VisualizationWidgetList> {
    const params = new URLSearchParams();
    if (options.dashboardId) params.set("dashboardId", options.dashboardId);
    if (options.widgetId) params.set("widgetId", options.widgetId);
    if (options.chartType) params.set("chartType", options.chartType);
    if (options.page !== undefined) params.set("page", String(options.page));
    if (options.limit !== undefined) params.set("limit", String(options.limit));
    const suffix = params.toString();
    return this.http.get<VisualizationWidgetResponse | VisualizationWidgetList>(
      `/api/v1/visualization/data${suffix ? `?${suffix}` : ""}`,
      this.requestConfig,
    );
  }

  /**
   * POST /api/v1/visualization/data — execute a structured query against an
   * org-owned data source (`dataSourceId` must equal `query.sourceId`).
   */
  runQuery(query: VisualizationDataQuery): Promise<VisualizationQueryResult> {
    return this.http.post<VisualizationQueryResult>(
      "/api/v1/visualization/data",
      query,
      this.requestConfig,
    );
  }

  /**
   * POST /api/v1/visualization/export — synchronous render of exactly one of
   * `dashboardId`/`widgetId` into the requested format.
   */
  export(
    request: VisualizationExportRequest,
    options?: VisualizationRequestOptions,
  ): Promise<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(
      "/api/v1/visualization/export",
      request,
      this.mutationConfig(options),
    );
  }

  // -------------------------------------------------------------------
  // Scheduled exports — /api/visualization/exports
  // -------------------------------------------------------------------

  /**
   * GET /api/visualization/exports — list export configs. With `id` set the
   * API returns a single `{ data: ExportConfig }` instead of a page.
   */
  listExports(
    options: ListExportsOptions = {},
  ): Promise<ExportConfigListResponse | { data: ExportConfig }> {
    const params = new URLSearchParams();
    if (options.orgId) params.set("orgId", options.orgId);
    if (options.id) params.set("id", options.id);
    if (options.format) params.set("format", options.format);
    if (options.status) params.set("status", options.status);
    if (options.search) params.set("search", options.search);
    if (options.sortBy) params.set("sortBy", options.sortBy);
    if (options.sortOrder) params.set("sortOrder", options.sortOrder);
    if (options.limit !== undefined) params.set("limit", String(options.limit));
    if (options.offset !== undefined) {
      params.set("offset", String(options.offset));
    }
    const suffix = params.toString();
    return this.http.get<ExportConfigListResponse | { data: ExportConfig }>(
      `/api/visualization/exports${suffix ? `?${suffix}` : ""}`,
      this.requestConfig,
    );
  }

  /**
   * POST /api/visualization/exports — create a scheduled export config;
   * `runNow` (default true server-side) enqueues a run immediately.
   */
  createExport(
    payload: CreateExportConfigRequest,
    options?: VisualizationRequestOptions,
  ): Promise<{ data: ExportConfig }> {
    return this.http.post<{ data: ExportConfig }>(
      "/api/visualization/exports",
      payload,
      this.mutationConfig(options),
    );
  }

  /**
   * PATCH /api/visualization/exports?id={exportId} — update a config.
   * (The resource id travels as a query parameter on this route.)
   */
  updateExport(
    exportId: string,
    patch: UpdateExportConfigRequest,
    options?: VisualizationRequestOptions,
  ): Promise<{ data: ExportConfig }> {
    return this.http.patch<{ data: ExportConfig }>(
      `/api/visualization/exports?id=${id(exportId)}`,
      patch,
      this.mutationConfig(options),
    );
  }

  /** DELETE /api/visualization/exports?id={exportId} — soft delete. */
  deleteExport(exportId: string): Promise<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(
      `/api/visualization/exports?id=${id(exportId)}`,
      this.requestConfig,
    );
  }

  /**
   * POST /api/visualization/exports/{id}/run — enqueue an export run (202),
   * optionally overriding the stored settings/schedule/distribution.
   */
  runExport(
    exportId: string,
    overrides: RunExportOverrides = {},
    options?: VisualizationRequestOptions,
  ): Promise<ExportRunReceipt> {
    const body = Object.values(overrides).some((v) => v !== undefined)
      ? overrides
      : undefined;
    return this.http.post<ExportRunReceipt>(
      `/api/visualization/exports/${id(exportId)}/run`,
      body,
      this.mutationConfig(options),
    );
  }

  /**
   * GET /api/visualization/exports/{id}/history — paginated run history.
   * `downloadUrl` points at the authenticated download route.
   */
  getExportHistory(
    exportId: string,
    options: { limit?: number; offset?: number } = {},
  ): Promise<ExportHistoryResponse> {
    const params = new URLSearchParams();
    if (options.limit !== undefined) params.set("limit", String(options.limit));
    if (options.offset !== undefined) {
      params.set("offset", String(options.offset));
    }
    const suffix = params.toString();
    return this.http.get<ExportHistoryResponse>(
      `/api/visualization/exports/${id(exportId)}/history${suffix ? `?${suffix}` : ""}`,
      this.requestConfig,
    );
  }

  /**
   * GET /api/visualization/exports/{id}/download — fetch a completed export
   * artifact. Returns the artifact bytes; the route 302-redirects to the
   * stored signed URL for object-storage artifacts (the HTTP client follows
   * redirects). 409 while the export is still running; 410 once expired.
   */
  downloadExport(exportId: string, orgId?: string): Promise<ArrayBuffer> {
    const query = orgId ? `orgId=${encodeURIComponent(orgId)}` : "";
    return this.http.get<ArrayBuffer>(
      `/api/visualization/exports/${id(exportId)}/download${query ? `?${query}` : ""}`,
      this.requestConfig,
    );
  }
}
