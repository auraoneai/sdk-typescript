// Auto-generated from OpenAPI specification
// Do not edit manually - regenerate with npm run codegen

export interface ClientConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  rateLimitRetry?: boolean;
  debug?: boolean;
  orgId?: string;
}

export interface RequestConfig {
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
}

// Common response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ErrorResponse {
  error: string;
  details?: unknown;
  code?: string;
}

export interface PaginatedResponse<T = unknown> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Authentication types
export interface APIKey {
  id: string;
  name: string;
  prefix: string;
  permissions: string[];
  isActive: boolean;
  expiresAt?: string;
  lastUsedAt?: string;
  createdAt: string;
}

export interface CreateAPIKeyRequest {
  action: "create";
  name: string;
  permissions: string[];
  expiresAt?: string;
}

export interface RotateAPIKeyRequest {
  action: "rotate";
  keyId: string;
}

export interface RevokeAPIKeyRequest {
  action: "revoke";
  keyId: string;
}

export type ManageAPIKeyRequest =
  | CreateAPIKeyRequest
  | RotateAPIKeyRequest
  | RevokeAPIKeyRequest;

export interface APIKeyResponse {
  success: boolean;
  apiKey?: string;
  message?: string;
  warning?: string;
}

export interface ListAPIKeysResponse {
  success: boolean;
  apiKeys: APIKey[];
  availablePermissions: string[];
  stats?: {
    total: number;
    active: number;
    expired: number;
    lastUsed: string;
  };
}

// Analytics types
export type EventCategory =
  | "user"
  | "system"
  | "performance"
  | "business"
  | "error";

export interface AnalyticsEvent {
  name: string;
  category: EventCategory;
  properties?: Record<string, unknown>;
  timestamp?: string;
  userId?: string;
  sessionId?: string;
  organizationId?: string;
}

export interface AnalyticsBatch {
  events: AnalyticsEvent[];
  batch?: boolean;
  context?: {
    userAgent: string;
    url: string;
    referrer?: string;
    deviceType: "desktop" | "mobile" | "tablet";
    timestamp: string;
  };
}

export interface AnalyticsResponse {
  success: boolean;
  eventsProcessed: number;
}

export interface AnalyticsHealthResponse {
  status: string;
  service: string;
  timestamp: string;
  supportedEvents: string[];
}

// Training types
export type TrainingFormat = "dpo" | "ppo" | "sft" | "span" | "trajectory";
export type SFTFormat = "alpaca" | "sharegpt" | "custom";

export interface TrainingExportRequest {
  orgId: string;
  format: TrainingFormat;
  sftFormat?: SFTFormat;
  includeMetadata?: boolean;
  minConfidence?: number;
  dateRange?: {
    start: string;
    end: string;
  };
  maxRecords?: number;
  normalizeScores?: boolean;
  validateOutput?: boolean;
}

export interface TrainingExportStats {
  stats: {
    dpo: FormatStats;
    ppo: FormatStats;
    sft: FormatStats;
    span: FormatStats;
    trajectory: FormatStats;
  };
}

export interface FormatStats {
  available: number;
  lastExported?: string;
}

export interface TrainingExportError {
  error: string;
  details: {
    totalRecords: number;
    validRecords: number;
    errors: unknown[];
  };
}

// Billing types
export interface BillingInfo {
  success: boolean;
  billing: {
    plan: string;
    status: string;
    currentPeriod: {
      start: string;
      end: string;
    };
    usage: {
      requests: number;
      storage: number;
      compute: number;
    };
    limits: {
      requests: number;
      storage: number;
      compute: number;
    };
  };
}

// Collaboration types
export interface Collaboration {
  id: string;
  projectId: string;
  status: "active" | "paused" | "completed";
  participants: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ActiveCollaborationsResponse {
  success: boolean;
  collaborations: Collaboration[];
}

// Admin types
export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  entity: string;
  details: Record<string, unknown>;
}

export interface AuditLogsResponse {
  success: boolean;
  logs: AuditLog[];
  total: number;
}

// Webhook types
export interface WebhookConfig {
  url: string;
  events: string[];
  secret?: string;
  active: boolean;
}

export interface WebhookEvent {
  id: string;
  event: string;
  data: unknown;
  timestamp: string;
  deliveryId: string;
}

// Error classes
export class AuraOneError extends Error {
  public code?: string;
  public details?: unknown;
  public statusCode?: number;

  constructor(
    message: string,
    code?: string,
    details?: unknown,
    statusCode?: number,
  ) {
    super(message);
    this.name = "AuraOneError";
    this.code = code;
    this.details = details;
    this.statusCode = statusCode;
  }
}

export class AuthenticationError extends AuraOneError {
  constructor(
    message = "Authentication failed",
    code = "AUTH_ERROR",
    details?: unknown,
  ) {
    super(message, code, details, 401);
    this.name = "AuthenticationError";
  }
}

export class RateLimitError extends AuraOneError {
  constructor(
    message = "Rate limit exceeded",
    code = "RATE_LIMIT",
    details?: unknown,
  ) {
    super(message, code, details, 429);
    this.name = "RateLimitError";
  }
}

export class ValidationError extends AuraOneError {
  constructor(
    message = "Invalid request parameters",
    code = "VALIDATION_ERROR",
    details?: unknown,
  ) {
    super(message, code, details, 400);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AuraOneError {
  constructor(
    message = "Resource not found",
    code = "NOT_FOUND",
    details?: unknown,
  ) {
    super(message, code, details, 404);
    this.name = "NotFoundError";
  }
}

// Labs & Evaluation Governance
export type LabsEvaluationStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | string;

export interface LabsEvaluationMetric {
  name: string;
  value: number;
  timestamp?: string;
}

export interface LabsEvaluationResultRecord {
  id: string;
  createdAt?: string;
  metrics?: Record<string, unknown>;
  data?: Record<string, unknown>;
}

export interface LabsEvaluationQueueInfo {
  position: number;
  estimatedWaitSeconds: number | null;
}

export interface LabsEvaluationArtifact {
  id: string;
  name: string;
  size?: number;
  contentType?: string;
  createdAt?: string;
}

export interface LabsEvaluation {
  id: string;
  status: LabsEvaluationStatus;
  priority?: string;
  suiteId?: string | null;
  model?: string | null;
  template?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt?: string;
  queue?: LabsEvaluationQueueInfo | null;
  metrics?: LabsEvaluationMetric[];
  results?: LabsEvaluationResultRecord[];
  inputsCount?: number | null;
  artifacts?: LabsEvaluationArtifact[];
  progress?: number | null;
}

export interface CreateLabsEvaluationRequest {
  suiteId?: string;
  model?: string;
  inputs: Array<Record<string, unknown>>;
  gates?: Record<string, unknown>;
  waitForCompletion?: boolean;
  timeoutSeconds?: number;
  pollIntervalMs?: number;
}

export type LabBundleDomain =
  | "astronomy"
  | "biology"
  | "chemistry"
  | "climate"
  | "drug-discovery"
  | "financial"
  | "genomics"
  | "manufacturing"
  | "materials"
  | "medical"
  | "oncology"
  | "physics"
  | "robotics"
  | "spatial3d";

export type LabBundleStatus =
  | "draft"
  | "provisioning"
  | "ready"
  | "failed";

export interface LabBundlePolicies {
  costCeilingUsd?: number;
  latencyP95Ms?: number;
  qualityMinScore?: number;
  biasMaxDelta?: number;
  compliance?: string[];
}

export interface LabBundle {
  id: string;
  orgId: string;
  templateId?: string | null;
  domain: LabBundleDomain;
  name: string;
  status: LabBundleStatus;
  policies: LabBundlePolicies;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface LabBundleTemplate {
  id: string;
  domain: LabBundleDomain;
  name: string;
  description?: string;
  datasets?: string[];
  agents?: string[];
  evalSuites?: string[];
  defaultPolicies: LabBundlePolicies;
}

export interface CreateLabBundleRequest {
  name: string;
  domain: LabBundleDomain;
  templateId?: string;
  policies?: Partial<LabBundlePolicies>;
  metadata?: Record<string, unknown>;
}

export interface UpdateLabBundleRequest extends Partial<CreateLabBundleRequest> {
  status?: LabBundleStatus;
}

export interface LabBundleList {
  bundles: LabBundle[];
  templates: LabBundleTemplate[];
}

export enum ComplianceFrameworkId {
  GDPR = "GDPR",
  SOC2 = "SOC2",
  HIPAA = "HIPAA",
  NIST_AI_RMF = "NIST_AI_RMF",
  ISO_27001 = "ISO_27001",
  CCPA = "CCPA",
  PCI_DSS = "PCI_DSS",
  FEDRAMP = "FEDRAMP",
}

export enum ComplianceFrameworkStatus {
  COMPLIANT = "COMPLIANT",
  NON_COMPLIANT = "NON_COMPLIANT",
  PENDING = "PENDING",
  PARTIAL = "PARTIAL",
  NOT_APPLICABLE = "NOT_APPLICABLE",
}

export interface ComplianceFrameworkSummary {
  id: string;
  organizationId: string;
  framework: ComplianceFrameworkId;
  version: string;
  status: ComplianceFrameworkStatus;
  scope: string[];
  responsible?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  requirementsTotal?: number;
  assessmentsTotal?: number;
  reportsTotal?: number;
  policiesTotal?: number;
  riskAssessments?: Array<{ overallScore: number; assessedAt?: string }>;
}

export interface ComplianceFrameworkList {
  items: ComplianceFrameworkSummary[];
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
}

export interface CreateComplianceFrameworkRequest {
  framework: ComplianceFrameworkId;
  version: string;
  scope: string[];
  description?: string;
  responsible?: string;
}

export interface ComplianceEvidenceRecord {
  id: string;
  orgId: string;
  standard: string;
  status: string;
  lastAudit: string;
}

export interface AppendEvidenceRequest {
  action?: string;
  entity?: string;
  details?: Record<string, unknown>;
}

export interface AppendEvidenceResponse {
  ok: boolean;
  hash?: string;
}

export interface IntegrationHealthCheck {
  component: string;
  status: "healthy" | "degraded" | "unhealthy" | string;
  message?: string;
  timestamp: string;
  durationMs?: number;
}

export interface IntegrationHealthSummary {
  status: string;
  timestamp: string;
  components: number;
  healthy: number;
  degraded: number;
  unhealthy: number;
  checks?: IntegrationHealthCheck[];
}

export interface IntegrationHealthTestResult extends IntegrationHealthCheck {}

export interface IntegrationHealthTestRequest {
  components?: string[];
  deepCheck?: boolean;
}

export interface IntegrationRegistryEntry {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  version: string;
  provider: string;
  category: string;
  type: string;
  logo?: string;
  documentation?: string;
  supportUrl?: string;
  tags: string[];
  isVerified: boolean;
  isActive: boolean;
  capabilities: string[];
  pricing?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface IntegrationRegistryFilters {
  category?: string[];
  type?: string[];
  provider?: string[];
  verified?: boolean;
  active?: boolean;
  capabilities?: string[];
  tags?: string[];
  search?: string;
  organizationId?: string;
}

export interface IntegrationDefinitionInput {
  name: string;
  displayName: string;
  description?: string;
  version?: string;
  provider: string;
  category: string;
  type: string;
  logo?: string;
  documentation?: string;
  supportUrl?: string;
  tags?: string[];
  capabilities?: string[];
  configuration: Record<string, unknown>;
  authentication: Record<string, unknown>;
  endpoints?: Array<Record<string, unknown>>;
  webhooks?: Array<Record<string, unknown>>;
  rateLimits?: Record<string, unknown>;
  pricing?: Record<string, unknown>;
  requirements?: Record<string, unknown>;
}

// HTTP client types
export interface HttpClient {
  get<T>(url: string, config?: RequestConfig): Promise<T>;
  post<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T>;
  put<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T>;
  delete<T>(url: string, config?: RequestConfig): Promise<T>;
  patch<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T>;
}

// Retry configuration
export interface RetryConfig {
  retries: number;
  retryDelay: (attemptNumber: number) => number;
  retryCondition: (error: unknown) => boolean;
}

// Rate limiting
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}
