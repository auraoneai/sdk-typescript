/**
 * @fileoverview AuraOne SDK - Official TypeScript SDK for AuraOne API
 *
 * This SDK provides typed access to hosted AuraOne evaluations, authentication,
 * analytics, training, governance, labs, GraphQL, and domain services.
 *
 * @example Create a hosted evaluation with environment-based authentication
 * ```typescript
 * import { randomUUID } from "node:crypto";
 * import { AuraOneClient, EvaluationStatus } from "@auraone/sdk";
 *
 * const client = AuraOneClient.fromEnvironment({
 *   timeout: 30_000,
 *   retries: 3,
 * });
 *
 * const evaluation = await client.evaluations.create({
 *   template_id: "rubric.web.qa",
 *   agent_bundle_url: "s3://example-evaluation-inputs/web-agent-v3.zip",
 *   idempotencyKey:
 *     process.env.AURAONE_IDEMPOTENCY_KEY ?? randomUUID(),
 *   wait: true,
 *   timeoutSeconds: 300,
 * });
 *
 * if (evaluation.status !== EvaluationStatus.COMPLETED) {
 *   throw new Error(`Evaluation ended with ${evaluation.status}`);
 * }
 * ```
 *
 * @author AuraOne Team
 * @license MIT
 */

import { SDK_VERSION } from "./version";

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
export * from "./services/EvaluationsService";

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
