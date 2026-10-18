import { EnterpriseIntelligenceTransport, queueQueryString, seg } from "./base";
import type {
  EnterpriseIntelligenceList,
  EnterpriseIntelligenceRecord,
  EnterpriseMutationOptions,
  EnterpriseQueueQuery,
  EnterpriseRecord,
  EnterpriseRegressionSuiteRunRequest,
} from "./types";
import type {
  EnterpriseImprovementItemCreateRequest,
  EnterpriseRegressionCandidateCreateRequest,
  EnterpriseRegressionCandidateReview,
} from "./types-operations";

type Result = EnterpriseIntelligenceRecord<EnterpriseRecord>;

/**
 * Improvement backlog and evaluation history: what changed, why, and the
 * evidence a change must pass before release.
 */
export class EnterpriseImprovementClient extends EnterpriseIntelligenceTransport {
  /** `GET` improvement items. Scope: read. */
  listItems(): Promise<EnterpriseIntelligenceList<EnterpriseRecord>> {
    return this.read("/api/v1/enterprise-intelligence/improvement-items");
  }

  /** `POST` propose an improvement tied to an incident. Returns 201. */
  createItem(
    request: EnterpriseImprovementItemCreateRequest,
    options?: EnterpriseMutationOptions,
  ): Promise<Result> {
    return this.post(
      "/api/v1/enterprise-intelligence/improvement-items",
      request,
      options?.idempotencyKey,
    );
  }

  /** `GET` activation evaluations with their release decision. */
  listEvaluations(
    query?: EnterpriseQueueQuery,
  ): Promise<EnterpriseIntelligenceList<EnterpriseRecord>> {
    const qs = queueQueryString(query);
    return this.read(`/api/v1/enterprise-intelligence/evaluations${qs}`);
  }
}

/**
 * Regression: accepted outcomes and corrections become test cases that
 * later versions must pass.
 */
export class EnterpriseRegressionClient extends EnterpriseIntelligenceTransport {
  /** `GET` regression candidates. */
  listCandidates(): Promise<EnterpriseIntelligenceList<EnterpriseRecord>> {
    return this.read("/api/v1/enterprise-intelligence/regression-candidates");
  }

  /** `POST` propose a candidate from an incident. Returns 201. */
  createCandidate(
    request: EnterpriseRegressionCandidateCreateRequest,
    options?: EnterpriseMutationOptions,
  ): Promise<Result> {
    return this.post(
      "/api/v1/enterprise-intelligence/regression-candidates",
      request,
      options?.idempotencyKey,
    );
  }

  /** `POST` approve or deny a candidate. Owner, administrator or reviewer role. */
  reviewCandidate(
    candidateId: string,
    review: EnterpriseRegressionCandidateReview,
    options?: EnterpriseMutationOptions,
  ): Promise<Result> {
    return this.post(
      `/api/v1/enterprise-intelligence/regression-candidates/${seg(candidateId)}/review`,
      review,
      options?.idempotencyKey,
    );
  }

  /** `GET` regression suites with case and run counts. */
  listSuites(): Promise<EnterpriseIntelligenceList<EnterpriseRecord>> {
    return this.read("/api/v1/enterprise-intelligence/regression-suites");
  }

  /** `POST` record a suite run for a version. */
  runSuite(
    suiteId: string,
    request: EnterpriseRegressionSuiteRunRequest,
    options?: EnterpriseMutationOptions,
  ): Promise<Result> {
    return this.post(
      `/api/v1/enterprise-intelligence/regression-suites/${seg(suiteId)}/run`,
      request,
      options?.idempotencyKey,
    );
  }

  /** `GET` the customer export package of a suite. */
  exportSuite(suiteId: string): Promise<Result> {
    return this.read(
      `/api/v1/enterprise-intelligence/regression-suites/${seg(suiteId)}/export`,
    );
  }
}
