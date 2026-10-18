import { EnterpriseIntelligenceTransport, queueQueryString, seg } from "./base";
import type {
  EnterpriseIntelligenceList,
  EnterpriseIntelligenceRecord,
  EnterpriseMutationOptions,
  EnterpriseQueueQuery,
  EnterpriseRecord,
} from "./types";
import type {
  EnterpriseBaselineEvaluateRequest,
  EnterpriseBaselinePrepareRequest,
  EnterpriseContextSourceIngestRequest,
  EnterpriseContextSourceRegisterRequest,
  EnterpriseDatasetPurpose,
  EnterpriseHistoricalImportRequest,
} from "./types-context";

type Result = EnterpriseIntelligenceRecord<EnterpriseRecord>;

/**
 * Context sources: customer policies, exports and files a workflow reads.
 * Writes need an owner, administrator or operator role. Every read and
 * write is audited.
 */
export class EnterpriseContextSourcesClient extends EnterpriseIntelligenceTransport {
  /** `GET` sources with their derived status. */
  list(
    query?: EnterpriseQueueQuery,
  ): Promise<EnterpriseIntelligenceList<EnterpriseRecord>> {
    const qs = queueQueryString(query);
    return this.read(`/api/v1/enterprise-intelligence/context-sources${qs}`);
  }

  /** `POST` register a stored object as an immutable source version. Returns 201. */
  register(
    request: EnterpriseContextSourceRegisterRequest,
    options?: EnterpriseMutationOptions,
  ): Promise<Result> {
    return this.post(
      "/api/v1/enterprise-intelligence/context-sources",
      request,
      options?.idempotencyKey,
    );
  }

  /** `GET` one source with its versions. */
  get(sourceId: string): Promise<Result> {
    return this.read(
      `/api/v1/enterprise-intelligence/context-sources/${seg(sourceId)}`,
    );
  }

  /** `POST` ingest and normalize a source version. */
  ingest(
    sourceId: string,
    request: EnterpriseContextSourceIngestRequest,
    options?: EnterpriseMutationOptions,
  ): Promise<Result> {
    return this.post(
      `/api/v1/enterprise-intelligence/context-sources/${seg(sourceId)}/retry`,
      request,
      options?.idempotencyKey,
    );
  }

  /** `POST` withdraw processing rights. Normalized context follows. */
  withdraw(
    sourceId: string,
    options?: EnterpriseMutationOptions,
  ): Promise<Result> {
    return this.post(
      `/api/v1/enterprise-intelligence/context-sources/${seg(sourceId)}/withdraw`,
      undefined,
      options?.idempotencyKey,
    );
  }

  /** `PATCH` `{ action: "withdraw" | "delete" }`. */
  applyAction(
    sourceId: string,
    request: { action: "withdraw" | "delete" },
    options?: EnterpriseMutationOptions,
  ): Promise<Result> {
    return this.patch(
      `/api/v1/enterprise-intelligence/context-sources/${seg(sourceId)}`,
      request,
      options?.idempotencyKey,
    );
  }

  /** `DELETE` delete the source objects and propagate deletion. */
  delete(
    sourceId: string,
    options?: EnterpriseMutationOptions,
  ): Promise<Result> {
    return this.remove(
      `/api/v1/enterprise-intelligence/context-sources/${seg(sourceId)}`,
      undefined,
      options?.idempotencyKey,
    );
  }
}

/**
 * Historical sets: past cases with accepted outcomes. Validated sets
 * become evaluation datasets and baselines for later cycles.
 */
export class EnterpriseHistoricalSetsClient extends EnterpriseIntelligenceTransport {
  /** `GET` sets. */
  list(): Promise<EnterpriseIntelligenceList<EnterpriseRecord>> {
    return this.read("/api/v1/enterprise-intelligence/historical-sets");
  }

  /** `POST` import records, or CSV / JSONL text. Returns 201. */
  import(
    request: EnterpriseHistoricalImportRequest,
    options?: EnterpriseMutationOptions,
  ): Promise<Result> {
    return this.post(
      "/api/v1/enterprise-intelligence/historical-sets",
      request,
      options?.idempotencyKey,
    );
  }

  /** `GET` one set with validation findings and baselines. */
  get(setId: string): Promise<Result> {
    return this.read(
      `/api/v1/enterprise-intelligence/historical-sets/${seg(setId)}`,
    );
  }

  /** `GET` the set's examples. */
  listExamples(
    setId: string,
  ): Promise<EnterpriseIntelligenceList<EnterpriseRecord>> {
    return this.read(
      `/api/v1/enterprise-intelligence/historical-sets/${seg(setId)}/examples`,
    );
  }

  /** `POST` validate the set (rejections and PII findings). */
  validate(
    setId: string,
    options?: EnterpriseMutationOptions,
  ): Promise<Result> {
    return this.post(
      `/api/v1/enterprise-intelligence/historical-sets/${seg(setId)}/validate`,
      undefined,
      options?.idempotencyKey,
    );
  }

  /** `POST` accept a validated set. */
  accept(setId: string, options?: EnterpriseMutationOptions): Promise<Result> {
    return this.post(
      `/api/v1/enterprise-intelligence/historical-sets/${seg(setId)}/accept`,
      undefined,
      options?.idempotencyKey,
    );
  }

  /** `POST` generate a dataset for one purpose. Returns 201. */
  createDataset(
    setId: string,
    purpose: EnterpriseDatasetPurpose,
    options?: EnterpriseMutationOptions,
  ): Promise<Result> {
    return this.post(
      `/api/v1/enterprise-intelligence/historical-sets/${seg(setId)}/dataset`,
      { purpose },
      options?.idempotencyKey,
    );
  }

  /** `GET` recorded baselines. */
  listBaselines(
    setId: string,
  ): Promise<EnterpriseIntelligenceList<EnterpriseRecord>> {
    return this.read(
      `/api/v1/enterprise-intelligence/historical-sets/${seg(setId)}/baseline`,
    );
  }

  /** `POST` fetch the held-out examples a baseline must answer. */
  prepareBaseline(
    setId: string,
    request: EnterpriseBaselinePrepareRequest,
    options?: EnterpriseMutationOptions,
  ): Promise<Result> {
    return this.post(
      `/api/v1/enterprise-intelligence/historical-sets/${seg(setId)}/baseline`,
      request,
      options?.idempotencyKey,
    );
  }

  /** `POST` score model outputs against the accepted outcomes. Returns 201. */
  evaluateBaseline(
    setId: string,
    request: EnterpriseBaselineEvaluateRequest,
    options?: EnterpriseMutationOptions,
  ): Promise<Result> {
    return this.post(
      `/api/v1/enterprise-intelligence/historical-sets/${seg(setId)}/baseline`,
      request,
      options?.idempotencyKey,
    );
  }
}
