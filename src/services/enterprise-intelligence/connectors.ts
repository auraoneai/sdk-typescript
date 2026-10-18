import {
  EnterpriseIntelligenceTransport,
  plainQueryString,
  queueQueryString,
  seg,
} from "./base";
import type {
  EnterpriseConnectorReceipt,
  EnterpriseIntelligenceList,
  EnterpriseIntelligenceRecord,
  EnterpriseMutationOptions,
  EnterpriseQueueQuery,
  EnterpriseRecord,
} from "./types";
import type {
  EnterpriseConnectorAuthorizeRequest,
  EnterpriseConnectorCreateRequest,
  EnterpriseConnectorReceiptQuery,
  EnterpriseToolBindingCreateRequest,
  EnterpriseToolBindingUpdateRequest,
} from "./types-context";

type Result = EnterpriseIntelligenceRecord<EnterpriseRecord>;

/**
 * Connectors to customer systems and the receipts of every call made
 * through them. Creating, authorizing and revoking connectors needs an
 * owner or administrator role; sandbox tests accept operators too.
 */
export class EnterpriseConnectorsClient extends EnterpriseIntelligenceTransport {
  /** `GET` connectors. Scope: read. */
  list(
    query?: EnterpriseQueueQuery,
  ): Promise<EnterpriseIntelligenceList<EnterpriseRecord>> {
    const qs = queueQueryString(query);
    return this.read(`/api/v1/enterprise-intelligence/connectors${qs}`);
  }

  /** `POST` create a named connector. Administrator role. Returns 201. */
  create(
    request: EnterpriseConnectorCreateRequest,
    options?: EnterpriseMutationOptions,
  ): Promise<Result> {
    return this.post(
      "/api/v1/enterprise-intelligence/connectors",
      request,
      options?.idempotencyKey,
    );
  }

  /** `GET` one connector and its tool versions. */
  get(connectorId: string): Promise<Result> {
    return this.read(
      `/api/v1/enterprise-intelligence/connectors/${seg(connectorId)}`,
    );
  }

  /** `PATCH` `{ action: "revoke" }`, the same effect as {@link revoke}. */
  applyAction(
    connectorId: string,
    request: { action: "revoke" },
    options?: EnterpriseMutationOptions,
  ): Promise<Result> {
    return this.patch(
      `/api/v1/enterprise-intelligence/connectors/${seg(connectorId)}`,
      request,
      options?.idempotencyKey,
    );
  }

  /** `POST` OAuth authorization steps: START, CALLBACK or REVOKE. Administrator role. */
  authorize(
    connectorId: string,
    request: EnterpriseConnectorAuthorizeRequest,
    options?: EnterpriseMutationOptions,
  ): Promise<Result> {
    return this.post(
      `/api/v1/enterprise-intelligence/connectors/${seg(connectorId)}/authorize`,
      request,
      options?.idempotencyKey,
    );
  }

  /**
   * `POST` run the sandbox probe. Operator role. A failed probe answers
   * 424, which surfaces as an `AuraOneError` with the probe result in
   * `details`.
   */
  test(
    connectorId: string,
    options?: EnterpriseMutationOptions,
  ): Promise<Result> {
    return this.post(
      `/api/v1/enterprise-intelligence/connectors/${seg(connectorId)}/test`,
      undefined,
      options?.idempotencyKey,
    );
  }

  /** `POST` revoke the connector, its secret and its OAuth grant. Administrator role. */
  revoke(
    connectorId: string,
    options?: EnterpriseMutationOptions,
  ): Promise<Result> {
    return this.post(
      `/api/v1/enterprise-intelligence/connectors/${seg(connectorId)}/revoke`,
      undefined,
      options?.idempotencyKey,
    );
  }

  /** `GET` call receipts, optionally for one workflow or run. */
  listReceipts(
    connectorId: string,
    query?: EnterpriseConnectorReceiptQuery,
  ): Promise<EnterpriseIntelligenceList<EnterpriseConnectorReceipt>> {
    const qs = plainQueryString({
      workflowId: query?.workflowId,
      runId: query?.runId,
    });
    return this.read(
      `/api/v1/enterprise-intelligence/connectors/${seg(connectorId)}/receipts${qs}`,
    );
  }

  /** `GET` one receipt, with redacted before/after evidence. */
  getReceipt(
    connectorId: string,
    receiptId: string,
    query?: EnterpriseConnectorReceiptQuery,
  ): Promise<EnterpriseIntelligenceRecord<EnterpriseConnectorReceipt>> {
    const qs = plainQueryString({
      workflowId: query?.workflowId,
      runId: query?.runId,
    });
    return this.read(
      `/api/v1/enterprise-intelligence/connectors/${seg(connectorId)}/receipts/${seg(receiptId)}${qs}`,
    );
  }
}

/**
 * Tool bindings: which connector tool a workflow version may call, with
 * what scopes, objects and limits. Writes need an owner or administrator.
 */
export class EnterpriseToolBindingsClient extends EnterpriseIntelligenceTransport {
  /** `GET` bindings (status ACTIVE or DISABLED). */
  list(
    query?: EnterpriseQueueQuery,
  ): Promise<EnterpriseIntelligenceList<EnterpriseRecord>> {
    const qs = queueQueryString(query);
    return this.read(`/api/v1/enterprise-intelligence/tool-bindings${qs}`);
  }

  /** `POST` create or replace a binding. Returns 201. */
  create(
    request: EnterpriseToolBindingCreateRequest,
    options?: EnterpriseMutationOptions,
  ): Promise<Result> {
    return this.post(
      "/api/v1/enterprise-intelligence/tool-bindings",
      request,
      options?.idempotencyKey,
    );
  }

  /** `GET` one binding. */
  get(bindingId: string): Promise<Result> {
    return this.read(
      `/api/v1/enterprise-intelligence/tool-bindings/${seg(bindingId)}`,
    );
  }

  /** `PATCH` change limits, name or `enabled`. */
  update(
    bindingId: string,
    request: EnterpriseToolBindingUpdateRequest,
    options?: EnterpriseMutationOptions,
  ): Promise<Result> {
    return this.patch(
      `/api/v1/enterprise-intelligence/tool-bindings/${seg(bindingId)}`,
      request,
      options?.idempotencyKey,
    );
  }

  /** `DELETE` disable a binding. */
  disable(
    bindingId: string,
    options?: EnterpriseMutationOptions,
  ): Promise<Result> {
    return this.remove(
      `/api/v1/enterprise-intelligence/tool-bindings/${seg(bindingId)}`,
      undefined,
      options?.idempotencyKey,
    );
  }
}
