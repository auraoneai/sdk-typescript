import { EnterpriseIntelligenceTransport, queueQueryString, seg } from "./base";
import type {
  EnterpriseIntelligenceList,
  EnterpriseIntelligenceRecord,
  EnterpriseMutationOptions,
  EnterpriseQueueQuery,
  EnterpriseRecord,
  EnterpriseWorkflow,
  EnterpriseWorkflowCreateOptions,
} from "./types";
import type {
  EnterpriseApprovalDecision,
  EnterpriseApprovalRequestCreate,
  EnterpriseApprovalRevocation,
  EnterpriseApprovalSide,
  EnterpriseContextPackageRequest,
  EnterpriseReleaseGateRequest,
  EnterpriseWorkflowActivationRequest,
  EnterpriseWorkflowEvaluationRequest,
  EnterpriseWorkflowVersionCreateRequest,
  EnterpriseWorkflowVersionRetireRequest,
} from "./types-workflows";

type Result = EnterpriseIntelligenceRecord<EnterpriseRecord>;

/**
 * Workflow definitions, versions, approvals, activation, evaluation and
 * release gating.
 *
 * Reads need the `enterprise-intelligence.read` scope. Writes need
 * `enterprise-intelligence.write`, and most also need the API key's creator
 * to hold an owner, administrator or operator role (operator family).
 */
export class EnterpriseWorkflowsClient extends EnterpriseIntelligenceTransport {
  /** `GET` workflows. */
  list(
    query?: EnterpriseQueueQuery,
  ): Promise<EnterpriseIntelligenceList<EnterpriseWorkflow>> {
    const qs = queueQueryString(query);
    return this.read(`/api/v1/enterprise-intelligence/workflows${qs}`);
  }

  /** `GET` one workflow. */
  get(
    workflowId: string,
  ): Promise<EnterpriseIntelligenceRecord<EnterpriseWorkflow>> {
    return this.read(
      `/api/v1/enterprise-intelligence/workflows/${seg(workflowId)}`,
    );
  }

  /** `POST` a workflow definition draft. Operator role. Returns 201. */
  create(
    options: EnterpriseWorkflowCreateOptions,
  ): Promise<EnterpriseIntelligenceRecord<EnterpriseWorkflow>> {
    const { idempotencyKey, ...body } = options;
    return this.post(
      "/api/v1/enterprise-intelligence/workflows",
      body,
      idempotencyKey,
    );
  }

  /**
   * `POST` a new immutable workflow version. Operator role. An invalid
   * graph fails with 400 `WORKFLOW_GRAPH_INVALID`; the issues are in the
   * error `details`.
   */
  createVersion(
    workflowId: string,
    request: EnterpriseWorkflowVersionCreateRequest,
    options?: EnterpriseMutationOptions,
  ): Promise<Result> {
    return this.post(
      `/api/v1/enterprise-intelligence/workflows/${seg(workflowId)}/versions`,
      request,
      options?.idempotencyKey,
    );
  }

  /** `POST` retire a version (optimistic: pass the versions you read). Operator role. */
  retireVersion(
    workflowId: string,
    versionId: string,
    request: EnterpriseWorkflowVersionRetireRequest,
    options?: EnterpriseMutationOptions,
  ): Promise<Result> {
    return this.post(
      `/api/v1/enterprise-intelligence/workflows/${seg(workflowId)}/versions/${seg(versionId)}/retire`,
      request,
      options?.idempotencyKey,
    );
  }

  /**
   * `POST` bind a context package to a version. Activation requires one.
   * Operator role. Returns 201.
   */
  bindContextPackage(
    workflowId: string,
    versionId: string,
    request: EnterpriseContextPackageRequest,
    options?: EnterpriseMutationOptions,
  ): Promise<Result> {
    return this.post(
      `/api/v1/enterprise-intelligence/workflows/${seg(workflowId)}/versions/${seg(versionId)}/context-package`,
      request,
      options?.idempotencyKey,
    );
  }

  /** `POST` open an activation approval request. Operator role. Returns 201. */
  createApprovalRequest(
    workflowId: string,
    request: EnterpriseApprovalRequestCreate,
    options?: EnterpriseMutationOptions,
  ): Promise<Result> {
    return this.post(
      `/api/v1/enterprise-intelligence/workflows/${seg(workflowId)}/approval-requests`,
      request,
      options?.idempotencyKey,
    );
  }

  /** `GET` the readiness of an approval request. */
  getApprovalRequest(workflowId: string, requestId: string): Promise<Result> {
    return this.read(
      `/api/v1/enterprise-intelligence/workflows/${seg(workflowId)}/approval-requests/${seg(requestId)}`,
    );
  }

  /**
   * `POST` record one side of the dual approval. `customer` is decided by
   * the customer's approver; `auraone` by AuraOne. Returns 201.
   */
  decideApprovalRequest(
    workflowId: string,
    requestId: string,
    side: EnterpriseApprovalSide,
    decision: EnterpriseApprovalDecision,
    options?: EnterpriseMutationOptions,
  ): Promise<Result> {
    const key = options?.idempotencyKey;
    return side === "customer"
      ? this.post(
          `/api/v1/enterprise-intelligence/workflows/${seg(workflowId)}/approval-requests/${seg(requestId)}/customer`,
          decision,
          key,
        )
      : this.post(
          `/api/v1/enterprise-intelligence/workflows/${seg(workflowId)}/approval-requests/${seg(requestId)}/auraone`,
          decision,
          key,
        );
  }

  /** `DELETE` revoke one side's decision. The body carries the evidence. */
  revokeApprovalDecision(
    workflowId: string,
    requestId: string,
    side: EnterpriseApprovalSide,
    revocation: EnterpriseApprovalRevocation,
    options?: EnterpriseMutationOptions,
  ): Promise<Result> {
    const key = options?.idempotencyKey;
    return side === "customer"
      ? this.remove(
          `/api/v1/enterprise-intelligence/workflows/${seg(workflowId)}/approval-requests/${seg(requestId)}/customer`,
          revocation,
          key,
        )
      : this.remove(
          `/api/v1/enterprise-intelligence/workflows/${seg(workflowId)}/approval-requests/${seg(requestId)}/auraone`,
          revocation,
          key,
        );
  }

  /**
   * `POST` activate an approved version. Fails with 409
   * `ENTERPRISE_CONTEXT_PACKAGE_REQUIRED` until a context package is bound.
   * Operator role. Returns 201.
   */
  activateVersion(
    workflowId: string,
    request: EnterpriseWorkflowActivationRequest,
    options?: EnterpriseMutationOptions,
  ): Promise<Result> {
    return this.post(
      `/api/v1/enterprise-intelligence/workflows/${seg(workflowId)}/activations`,
      request,
      options?.idempotencyKey,
    );
  }

  /** `POST` record evaluation evidence for a version. Operator role. Returns 201. */
  recordEvaluation(
    workflowId: string,
    request: EnterpriseWorkflowEvaluationRequest,
    options?: EnterpriseMutationOptions,
  ): Promise<Result> {
    return this.post(
      `/api/v1/enterprise-intelligence/workflows/${seg(workflowId)}/evaluations`,
      request,
      options?.idempotencyKey,
    );
  }

  /** `POST` decide whether a version may be promoted. Operator role. */
  evaluateReleaseGate(
    workflowId: string,
    request: EnterpriseReleaseGateRequest,
    options?: EnterpriseMutationOptions,
  ): Promise<Result> {
    return this.post(
      `/api/v1/enterprise-intelligence/workflows/${seg(workflowId)}/release-gate`,
      request,
      options?.idempotencyKey,
    );
  }
}
