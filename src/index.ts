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
 * @version 1.0.0
 * @author AuraOne Team
 * @license MIT
 */

// Main client export
export { AuraOneClient as default } from "./client/AuraOneClient";
export { AuraOneClient } from "./client/AuraOneClient";

// Service exports
export { AuthService } from "./services/AuthService";
export {
  AnalyticsService,
  BatchEventTracker,
} from "./services/AnalyticsService";
export { TrainingService } from "./services/TrainingService";
export { BillingService } from "./services/BillingService";
export { CollaborationService } from "./services/CollaborationService";
export * from "./services/RoboticsService";
export { LabsService } from "./services/LabsService";
export { GovernanceService } from "./services/GovernanceService";
export { IntegrationsService } from "./services/IntegrationsService";

// Domain Lab service exports
export { BiologyService } from "./services/BiologyService";
export { ChemistryService } from "./services/ChemistryService";
export { MaterialsService } from "./services/MaterialsService";
export { EnvironmentalService } from "./services/EnvironmentalService";
export { AstronomyService } from "./services/AstronomyService";
export { ClimateService } from "./services/ClimateService";
export { Spatial3DService } from "./services/Spatial3DService";
export { FinancialService } from "./services/FinancialService";
export { ManufacturingService } from "./services/ManufacturingService";
export { MedicalImagingService } from "./services/MedicalImagingService";
export { PhysicsService } from "./services/PhysicsService";
export { GenomicsService } from "./services/GenomicsService";

// Utility exports
export { AuthProvider } from "./auth/AuthProvider";
export { FetchHttpClient, buildQueryString } from "./utils/HttpClient";

// Type exports
export * from "./types/api";
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
export const VERSION = "1.0.0";

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
