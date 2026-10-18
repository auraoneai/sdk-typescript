import { EnterpriseIntelligenceTransport, queueQueryString, seg } from "./base";
import type {
  EnterpriseIntelligenceList,
  EnterpriseIntelligenceRecord,
  EnterpriseMutationOptions,
  EnterpriseQueueQuery,
  EnterpriseRecord,
  EnterpriseRun,
  EnterpriseRunCreateOptions,
  EnterpriseRunDelivery,
  EnterpriseRunInputs,
  EnterpriseRunInputsMeta,
} from "./types";
import type {
  EnterpriseCompensationRequest,
  EnterpriseIncidentRequest,
  EnterpriseReplayRequest,
  EnterpriseRunAcceptanceRequest,
} from "./types-runs";

type Result = EnterpriseIntelligenceRecord<EnterpriseRecord>;

/**
 * Runs: one unit of recurring work moving through software steps and human
 * review. Starting a run and reading its output, trace and delivery are the
 * customer surface. Cancellation, compensation, incidents and replay are
 * operator actions.
 */
export class EnterpriseRunsClient extends EnterpriseIntelligenceTransport {
  /** `GET` runs. Scope: read. */
  list(
    query?: EnterpriseQueueQuery,
  ): Promise<EnterpriseIntelligenceList<EnterpriseRun>> {
    const qs = queueQueryString(query);
    return this.read(`/api/v1/enterprise-intelligence/runs${qs}`);
  }

  /**
   * `POST` start a run. Scope: write. Returns 202. The same idempotency key
   * returns the committed run instead of starting a second one.
   */
  create(
    options: EnterpriseRunCreateOptions,
  ): Promise<EnterpriseIntelligenceRecord<EnterpriseRun>> {
    const { idempotencyKey, ...body } = options;
    return this.post(
      "/api/v1/enterprise-intelligence/runs",
      body,
      idempotencyKey,
    );
  }

  /** `GET` one run. Scope: read. */
  get(runId: string): Promise<EnterpriseIntelligenceRecord<EnterpriseRun>> {
    return this.read(`/api/v1/enterprise-intelligence/runs/${seg(runId)}`);
  }

  /** `GET` the run output. Scope: read. Access is audited. */
  getOutput(runId: string): Promise<Result> {
    return this.read(
      `/api/v1/enterprise-intelligence/runs/${seg(runId)}/output`,
    );
  }

  /** `GET` the run trace: each step, who reviewed, and how long it took. */
  getTrace(runId: string): Promise<Result> {
    return this.read(
      `/api/v1/enterprise-intelligence/runs/${seg(runId)}/trace`,
    );
  }

  /** `GET` the run's delivery and per-file access grants. */
  getDelivery(
    runId: string,
  ): Promise<EnterpriseIntelligenceRecord<EnterpriseRunDelivery>> {
    return this.read(
      `/api/v1/enterprise-intelligence/runs/${seg(runId)}/delivery`,
    );
  }

  /**
   * `GET` input content and environment versions a new run may use.
   * Scope: write.
   */
  getInputs(query?: { q?: string }): Promise<
    EnterpriseIntelligenceRecord<EnterpriseRunInputs> & {
      meta?: EnterpriseRunInputsMeta;
    }
  > {
    const search = query?.q ? `?q=${encodeURIComponent(query.q)}` : "";
    return this.read(`/api/v1/enterprise-intelligence/run-inputs${search}`);
  }

  /** `GET` the run's commercial record: usage, invoice and margin. */
  getCommercial(runId: string): Promise<Result> {
    return this.read(
      `/api/v1/enterprise-intelligence/runs/${seg(runId)}/commercial`,
    );
  }

  /**
   * `POST` accept, reject or send back a run's delivered outcome. A reason
   * is required unless the decision is `accepted`. Decisions are final; a
   * second, different decision fails with 409 `EI_ACCEPTANCE_IMMUTABLE`.
   */
  decideAcceptance(
    runId: string,
    request: EnterpriseRunAcceptanceRequest,
    options?: EnterpriseMutationOptions,
  ): Promise<Result> {
    return this.post(
      `/api/v1/enterprise-intelligence/runs/${seg(runId)}/acceptance`,
      request,
      options?.idempotencyKey,
    );
  }

  /**
   * `POST` cancel a run. Needs the `enterprise-intelligence.cancel` scope
   * (API keys) or an operator role (sessions). Returns 202.
   */
  cancel(runId: string, options?: EnterpriseMutationOptions): Promise<Result> {
    return this.post(
      `/api/v1/enterprise-intelligence/runs/${seg(runId)}/cancel`,
      undefined,
      options?.idempotencyKey,
    );
  }

  /** `POST` request compensation for one side effect. Cancel scope. Returns 202. */
  requestCompensation(
    runId: string,
    request: EnterpriseCompensationRequest,
    options?: EnterpriseMutationOptions,
  ): Promise<Result> {
    return this.post(
      `/api/v1/enterprise-intelligence/runs/${seg(runId)}/compensations`,
      request,
      options?.idempotencyKey,
    );
  }

  /** `POST` execute a requested compensation. Cancel scope. Returns 202. */
  executeCompensation(
    compensationId: string,
    options?: EnterpriseMutationOptions,
  ): Promise<Result> {
    return this.post(
      `/api/v1/enterprise-intelligence/compensations/${seg(compensationId)}/execute`,
      undefined,
      options?.idempotencyKey,
    );
  }

  /** `POST` report an incident against a run. Returns 201. */
  reportIncident(
    runId: string,
    request: EnterpriseIncidentRequest,
    options?: EnterpriseMutationOptions,
  ): Promise<Result> {
    return this.post(
      `/api/v1/enterprise-intelligence/runs/${seg(runId)}/incidents`,
      request,
      options?.idempotencyKey,
    );
  }

  /** `POST` deterministic evaluation replay of a run. Operator role. Returns 202. */
  replay(
    runId: string,
    request: EnterpriseReplayRequest,
    options?: EnterpriseMutationOptions,
  ): Promise<Result> {
    return this.post(
      `/api/v1/enterprise-intelligence/runs/${seg(runId)}/replay`,
      request,
      options?.idempotencyKey,
    );
  }
}
