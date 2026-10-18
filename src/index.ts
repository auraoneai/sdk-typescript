/**
 * @fileoverview AuraOne SDK - Official TypeScript SDK for AuraOne API
 *
 * This SDK provides comprehensive access to the AuraOne platform's capabilities
 * including authentication, analytics, training, billing, and collaboration features.
 *
 * @example Basic usage with API key
 * ```typescript
 * import AuraOne from '@auraone/sdk';
 *
 * const client = AuraOne.withApiKey('your-api-key');
 *
 * // Track analytics event
 * await client.analytics.trackUser('button_clicked', {
 *   button: 'submit',
 *   page: 'dashboard'
 * });
 *
 * // Export training data
 * const trainingData = await client.training.exportDPO({
 *   orgId: 'your-org-id',
 *   minConfidence: 3
 * });
 * ```
 *
 * @example Usage with environment variables
 * ```typescript
 * import AuraOne from '@auraone/sdk';
 *
 * // Reads from AURAONE_API_KEY or AURAONE_TOKEN environment variables
 * const client = AuraOne.fromEnvironment();
 *
 * // Test connection
 * const status = await client.testConnection();
 * console.log('Connected:', status.success);
 * ```
 *
 * @example Batch analytics tracking
 * ```typescript
 * import AuraOne from '@auraone/sdk';
 *
 * const client = AuraOne.withApiKey('your-api-key');
 * const tracker = client.createAnalyticsBatch();
 *
 * // Events are automatically batched and sent
 * tracker.track({ name: 'page_view', category: 'user', properties: { page: '/home' } });
 * tracker.track({ name: 'button_click', category: 'user', properties: { button: 'cta' } });
 *
 * // Manually flush if needed
 * await tracker.flush();
 * ```
 *
 * @author AuraOne Team
 * @license MIT
 */

// Main client export
export { AuraOneClient as default } from "./client/AuraOneClient";
export { AuraOneClient } from "./client/AuraOneClient";
export {
  AuraOneBrowserClient,
  createBrowserClient,
  type BrowserClientConfig,
} from "./browser";
export { createNodeClient } from "./node";

// Service exports
export { AuthService } from "./services/AuthService";
export {
  AnalyticsService,
  BatchEventTracker,
} from "./services/AnalyticsService";
export { TrainingService } from "./services/TrainingService";
export { BillingService } from "./services/BillingService";
export { CollaborationService } from "./services/CollaborationService";
export {
  BenchmarksService,
  type BenchmarkSummary,
  type BenchmarkDetail,
  type LeaderboardEntry,
  type BenchmarkEvaluationStatus,
  type SubmitBenchmarkEvaluationOptions,
  type AssignReviewRequest,
  type ReviewProtocol,
} from "./services/BenchmarksService";
export {
  CertificationService,
  type ModelCertification,
} from "./services/CertificationService";
export {
  RegressionService,
  type RegressionRequestOptions,
  type RegressionStatus,
} from "./services/RegressionService";
export { LabsService } from "./services/LabsService";
export { GovernanceService } from "./services/GovernanceService";
export {
  IntegrationsService,
  SUPPORTED_CONNECTOR_NAMESPACES,
  BaseConnectorNamespace,
  GitHubActionsConnector,
  GitLabCIConnector,
  JenkinsConnector,
  CircleCIConnector,
  SnowflakeConnector,
  BigQueryConnector,
  DatabricksConnector,
  S3Connector,
  PagerDutyConnector,
  OpsgenieConnector,
  SlackConnector,
  TeamsConnector,
  JiraConnector,
  DatadogConnector,
  GrafanaConnector,
  SplunkConnector,
  SalesforceConnector,
  HubSpotConnector,
  type SupportedConnectorNamespace,
  type ConnectorExecutionReceipt,
} from "./services/IntegrationsService";
export { EnterpriseIntelligenceService } from "./services/EnterpriseIntelligenceService";
export {
  EnterpriseIntelligenceUnavailableError,
  isEnterpriseIntelligenceUnavailable,
  isTruncated,
  EnterpriseWorkflowsClient,
  EnterpriseRunsClient,
  EnterpriseBatchesClient,
  EnterpriseDeliveriesClient,
  EnterpriseHumanTasksClient,
  EnterpriseConnectorsClient,
  EnterpriseToolBindingsClient,
  EnterpriseContextSourcesClient,
  EnterpriseHistoricalSetsClient,
  EnterpriseImprovementClient,
  EnterpriseRegressionClient,
  EnterpriseOperationsClient,
  EnterpriseRegistryClient,
} from "./services/EnterpriseIntelligenceService";
// Type-only modules: `export *` re-exports only their types.
export * from "./services/enterprise-intelligence/types-workflows";
export * from "./services/enterprise-intelligence/types-runs";
export * from "./services/enterprise-intelligence/types-context";
export * from "./services/enterprise-intelligence/types-operations";
export type { EnterpriseIntelligenceErrorCode } from "./services/enterprise-intelligence/errors";
export type {
  EnterpriseMutationOptions,
  EnterpriseRecord,
  EnterpriseContentRights,
  EnterpriseAcceptanceDecision,
  EnterpriseHumanTaskAction,
  EnterpriseSettings,
} from "./services/enterprise-intelligence/types";
export type {
  EnterpriseIntelligenceQueueMeta,
  EnterpriseIntelligencePermissions,
  EnterpriseIntelligenceList,
  EnterpriseIntelligenceRecord,
  EnterpriseWorkflow,
  EnterpriseWorkflowCreateOptions,
  EnterpriseRun,
  EnterpriseRunStatus,
  EnterpriseRunCreateRequest,
  EnterpriseRunCreateOptions,
  EnterpriseDelivery,
  EnterpriseDeliveryStatus,
  EnterpriseRunDelivery,
  EnterpriseConnectorReceipt,
  EnterpriseRunInputs,
  EnterpriseRunInputContent,
  EnterpriseRunInputEnvironment,
  EnterpriseRunInputsMeta,
  EnterpriseHealth,
  EnterpriseHealthStatus,
  EnterpriseQueueQuery,
  EnterpriseHumanTaskCompletion,
  EnterpriseRegressionSuiteRunRequest,
} from "./services/EnterpriseIntelligenceService";
export { AttentionService } from "./services/AttentionService";
export { OptimizationService } from "./services/OptimizationService";
export { AutopilotService } from "./services/AutopilotService";
export { VisualizationService } from "./services/VisualizationService";
export { CapacityService } from "./services/CapacityService";
export {
  GraphQLService,
  GraphQLClient,
  GraphQLExecutionError,
  GRAPHQL_PERSISTED_QUERIES,
  type GraphQLErrorLocation,
  type GraphQLErrorPayload,
  type GraphQLResponse,
  type GraphQLRequestOptions,
  type GraphQLOptimizationJob,
  type GraphQLOptimizationHistoryPoint,
  type GraphQLOptimizationSurface,
} from "./services/GraphQLService";
export { EnvironmentsService } from "./services/EnvironmentsService";
export type {
  EnvironmentBaselineRun,
  EnvironmentEpisode,
  EnvironmentExport,
  EnvironmentExportFormat,
  EnvironmentExportPurpose,
  EnvironmentSummary,
  EnvironmentVersion,
  MarketplaceEnvironmentListing,
} from "./services/EnvironmentsService";

// Utility exports
export { AuthProvider } from "./auth/AuthProvider";
export { FetchHttpClient, buildQueryString } from "./utils/HttpClient";

// Type exports
export * from "./types/api";
export { SDK_VERSION } from "./version";
import { SDK_VERSION } from "./version";
export { AgentEvalRun, LabDomain } from "./types/labs";
export * from "./types/workforce";
export * from "./types/synthetic";

// Error exports for easier error handling
export {
  AuraOneError,
  AuthenticationError,
  RateLimitError,
  ValidationError,
  NotFoundError,
} from "./types/api";

/**
 * SDK version
 */
export const VERSION = SDK_VERSION;

/**
 * Supported API version
 */
export const API_VERSION = "1.0";

/**
 * Default configuration constants
 */
export const DEFAULT_CONFIG = {
  baseUrl: "https://api.auraone.ai",
  timeout: 30000,
  retries: 3,
  rateLimitRetry: true,
  debug: false,
} as const;

export type {
  AcceptedRecordDisposition,
  AcceptedRecordDispositionType,
  AcceptedRecordFeedbackKind,
  AcceptedRecordFeedbackSeverity,
  AcceptedRecordFeedbackSignal,
  AcceptedRecordFeedbackSource,
  AcceptedRecordFeedbackStatus,
  AcceptedRecordTimelineEntry,
  AcceptedRecordFailureLink,
  AcceptedRecordFailureLinkMethod,
  AcceptedRecordLibraryItem,
  AcceptedRecordLibraryPage,
  AcceptedRecordLibraryQuery,
  CreateAcceptedRecordDispositionRequest,
  CreateAcceptedRecordFeedbackRequest,
  TransitionAcceptedRecordFeedbackRequest,
  NextCycleRecommendation,
  NextCycleRecommendationStatus,
  NextCycleRecommendationType,
  QualityPerformanceView,
  RecommendationDecisionRequest,
} from "./types/accepted-record-feedback";

/**
 * Helper function to create AuraOne client with API key
 */
export function withApiKey(
  apiKey: string,
  options: Omit<import("./types/api").ClientConfig, "apiKey"> = {},
): import("./client/AuraOneClient").AuraOneClient {
  const { AuraOneClient } = require("./client/AuraOneClient");
  return AuraOneClient.withApiKey(apiKey, options);
}

/**
 * Helper function to create AuraOne client with JWT token
 */
export function withToken(
  token: string,
  refreshToken?: string,
  options: Omit<import("./types/api").ClientConfig, "apiKey"> = {},
): import("./client/AuraOneClient").AuraOneClient {
  const { AuraOneClient } = require("./client/AuraOneClient");
  return AuraOneClient.withToken(token, refreshToken, options);
}

/**
 * Helper function to create AuraOne client from environment variables
 */
export function fromEnvironment(
  options: Omit<import("./types/api").ClientConfig, "apiKey"> = {},
): import("./client/AuraOneClient").AuraOneClient {
  const { AuraOneClient } = require("./client/AuraOneClient");
  return AuraOneClient.fromEnvironment(options);
}

/**
 * Validate API key format
 */
export function isValidApiKey(apiKey: string): boolean {
  const { AuthProvider } = require("./auth/AuthProvider");
  return AuthProvider.isValidApiKey(apiKey);
}

/**
 * Validate JWT token format
 */
export function isValidJwtToken(token: string): boolean {
  const { AuthProvider } = require("./auth/AuthProvider");
  return AuthProvider.isValidJwtToken(token);
}
