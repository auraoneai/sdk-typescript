import { EnterpriseIntelligenceTransport, queueQueryString, seg } from "./base";
import type {
  EnterpriseDelivery,
  EnterpriseHumanTaskCompletion,
  EnterpriseIntelligenceList,
  EnterpriseIntelligenceRecord,
  EnterpriseMutationOptions,
  EnterpriseQueueQuery,
  EnterpriseRecord,
} from "./types";
import type { EnterpriseDeliveryDisposition } from "./types-runs";

/** Deliveries: the accepted output, in the agreed format. */
export class EnterpriseDeliveriesClient extends EnterpriseIntelligenceTransport {
  /** `GET` deliveries. Scope: read. */
  list(
    query?: EnterpriseQueueQuery,
  ): Promise<EnterpriseIntelligenceList<EnterpriseDelivery>> {
    const qs = queueQueryString(query);
    return this.read(`/api/v1/enterprise-intelligence/deliveries${qs}`);
  }

  /** `GET` one delivery with files and events. Access is audited. */
  get(
    deliveryId: string,
  ): Promise<EnterpriseIntelligenceRecord<EnterpriseDelivery>> {
    return this.read(
      `/api/v1/enterprise-intelligence/deliveries/${seg(deliveryId)}`,
    );
  }

  /**
   * `PATCH` dispose of a Program delivery. Operator role. Deliveries that
   * belong to a run answer 409; use `runs.decideAcceptance` for those.
   * `rework` answers 409 until a superseding delivery exists.
   */
  dispose(
    deliveryId: string,
    disposition: EnterpriseDeliveryDisposition,
    options?: EnterpriseMutationOptions,
  ): Promise<EnterpriseIntelligenceRecord<EnterpriseDelivery>> {
    return this.patch(
      `/api/v1/enterprise-intelligence/deliveries/${seg(deliveryId)}`,
      disposition,
      options?.idempotencyKey,
    );
  }
}

/** Human tasks: exceptions and reviews that qualified people resolve. */
export class EnterpriseHumanTasksClient extends EnterpriseIntelligenceTransport {
  /** `GET` tasks, ordered by due time. Scope: read. */
  list(
    query?: EnterpriseQueueQuery,
  ): Promise<EnterpriseIntelligenceList<EnterpriseRecord>> {
    const qs = queueQueryString(query);
    return this.read(`/api/v1/enterprise-intelligence/human-tasks${qs}`);
  }

  /** `GET` one task. Access is audited. */
  get(taskId: string): Promise<EnterpriseIntelligenceRecord<EnterpriseRecord>> {
    return this.read(
      `/api/v1/enterprise-intelligence/human-tasks/${seg(taskId)}`,
    );
  }

  /**
   * `POST` resolve a task. `expectedLockVersion` is the version you read;
   * a stale version is rejected. Returns 202.
   */
  complete(
    taskId: string,
    resolution: EnterpriseHumanTaskCompletion,
    options?: EnterpriseMutationOptions,
  ): Promise<EnterpriseIntelligenceRecord<EnterpriseRecord>> {
    return this.post(
      `/api/v1/enterprise-intelligence/human-tasks/${seg(taskId)}/complete`,
      resolution,
      options?.idempotencyKey,
    );
  }
}
