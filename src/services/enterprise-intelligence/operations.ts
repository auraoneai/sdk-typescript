import { EnterpriseIntelligenceTransport, plainQueryString, seg } from "./base";
import type {
  EnterpriseIntelligenceList,
  EnterpriseIntelligenceRecord,
  EnterpriseMutationOptions,
  EnterpriseRecord,
} from "./types";
import type {
  EnterpriseMetricsQuery,
  EnterpriseRegistryModelRequest,
  EnterpriseRegistryPolicyRequest,
  EnterpriseRegistryPromptRequest,
  EnterpriseRegistryToolRequest,
  EnterpriseSloActivateRequest,
  EnterpriseSloCreateRequest,
  EnterpriseSloQuery,
  EnterpriseSloReleaseGateQuery,
} from "./types-operations";

type Result = EnterpriseIntelligenceRecord<EnterpriseRecord>;

/**
 * Operations: service-level metrics and agreed service levels (SLOs).
 * SLO approval needs the customer owner role; activation needs an owner or
 * administrator.
 */
export class EnterpriseOperationsClient extends EnterpriseIntelligenceTransport {
  /** `GET` the metrics snapshot for one workflow version. */
  getMetrics(query: EnterpriseMetricsQuery): Promise<Result> {
    const qs = plainQueryString({
      programId: query.programId,
      workflowId: query.workflowId,
      workflowVersionId: query.workflowVersionId,
    });
    return this.read(`/api/v1/enterprise-intelligence/operations/metrics${qs}`);
  }

  /** `GET` SLOs for a program workflow. */
  listSlos(
    query: EnterpriseSloQuery,
  ): Promise<EnterpriseIntelligenceList<EnterpriseRecord>> {
    const qs = plainQueryString({
      programId: query.programId,
      workflowId: query.workflowId,
    });
    return this.read(`/api/v1/enterprise-intelligence/operations/slos${qs}`);
  }

  /** `POST` draft an SLO. Returns 201. */
  createSlo(
    request: EnterpriseSloCreateRequest,
    options?: EnterpriseMutationOptions,
  ): Promise<Result> {
    return this.post(
      "/api/v1/enterprise-intelligence/operations/slos",
      request,
      options?.idempotencyKey,
    );
  }

  /** `POST` approve a draft SLO. Customer owner role. */
  approveSlo(
    sloId: string,
    options?: EnterpriseMutationOptions,
  ): Promise<Result> {
    return this.post(
      `/api/v1/enterprise-intelligence/operations/slos/${seg(sloId)}/approve`,
      undefined,
      options?.idempotencyKey,
    );
  }

  /** `POST` activate an approved SLO from a date. Owner or administrator. */
  activateSlo(
    sloId: string,
    request: EnterpriseSloActivateRequest,
    options?: EnterpriseMutationOptions,
  ): Promise<Result> {
    return this.post(
      `/api/v1/enterprise-intelligence/operations/slos/${seg(sloId)}/activate`,
      request,
      options?.idempotencyKey,
    );
  }

  /** `GET` whether the active SLOs allow a release now (or at `at`). */
  getSloReleaseGate(query: EnterpriseSloReleaseGateQuery): Promise<Result> {
    const qs = plainQueryString({
      programId: query.programId,
      workflowId: query.workflowId,
      at: query.at,
    });
    return this.read(
      `/api/v1/enterprise-intelligence/operations/slos/release-gate${qs}`,
    );
  }
}

/**
 * Registry: the governed models, policies, prompts and tools a workflow
 * version may reference. Each write is one `action` of a discriminated
 * union. Scope: write.
 */
export class EnterpriseRegistryClient extends EnterpriseIntelligenceTransport {
  /** `GET` every reference a workflow node can point at. */
  getNodeOptions(): Promise<Result> {
    return this.read("/api/v1/enterprise-intelligence/registry/node-options");
  }

  /** `POST` create, version or release a model deployment. */
  models(
    request: EnterpriseRegistryModelRequest,
    options?: EnterpriseMutationOptions,
  ): Promise<EnterpriseRecord> {
    return this.post(
      "/api/v1/enterprise-intelligence/registry/models",
      request,
      options?.idempotencyKey,
    );
  }

  /** `POST` version or approve a policy. */
  policies(
    request: EnterpriseRegistryPolicyRequest,
    options?: EnterpriseMutationOptions,
  ): Promise<EnterpriseRecord> {
    return this.post(
      "/api/v1/enterprise-intelligence/registry/policies",
      request,
      options?.idempotencyKey,
    );
  }

  /** `POST` create, version or approve a prompt. */
  prompts(
    request: EnterpriseRegistryPromptRequest,
    options?: EnterpriseMutationOptions,
  ): Promise<EnterpriseRecord> {
    return this.post(
      "/api/v1/enterprise-intelligence/registry/prompts",
      request,
      options?.idempotencyKey,
    );
  }

  /** `POST` create, version or approve a tool. */
  tools(
    request: EnterpriseRegistryToolRequest,
    options?: EnterpriseMutationOptions,
  ): Promise<EnterpriseRecord> {
    return this.post(
      "/api/v1/enterprise-intelligence/registry/tools",
      request,
      options?.idempotencyKey,
    );
  }
}
