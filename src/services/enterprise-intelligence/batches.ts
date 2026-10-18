import { EnterpriseIntelligenceTransport, seg } from "./base";
import type {
  EnterpriseIntelligenceList,
  EnterpriseIntelligenceRecord,
  EnterpriseMutationOptions,
  EnterpriseRecord,
} from "./types";
import type {
  EnterpriseBatchAcceptanceRequest,
  EnterpriseBatchIngestRequest,
  EnterpriseBatchItemState,
  EnterpriseBatchRetryRequest,
  EnterpriseBatchSubmission,
  EnterpriseIngestionContent,
  EnterpriseIngestionMediaType,
} from "./types-runs";

type Result = EnterpriseIntelligenceRecord<EnterpriseRecord>;

function toBlob(
  content: EnterpriseIngestionContent,
  mediaType: EnterpriseIngestionMediaType,
): Blob {
  // The route checks each file's type against its declared media type, so
  // every part is re-wrapped with the declared type.
  return new Blob([content as BlobPart], { type: mediaType });
}

/** Builds the multipart body for batch ingestion (exported for tests). */
export function buildIngestForm(
  request: EnterpriseBatchIngestRequest,
): FormData {
  if (request.sources.length === 0) {
    throw new TypeError("ingest requires at least one source");
  }
  const form = new FormData();
  form.append("workflowVersionId", request.workflowVersionId);
  form.append("contract", JSON.stringify(request.contract));
  form.append(
    "sources",
    JSON.stringify(
      request.sources.map(({ sourceId, fileName, mediaType }) => ({
        sourceId,
        fileName,
        mediaType,
      })),
    ),
  );
  for (const source of request.sources) {
    form.append(
      "file",
      toBlob(source.content, source.mediaType),
      source.fileName,
    );
  }
  return form;
}

/**
 * Batches: a weekly queue of work units submitted together. Each item
 * becomes one run and one delivery; acceptance is recorded per item.
 * Scope: read for reads, write for writes; cancel needs the cancel scope.
 */
export class EnterpriseBatchesClient extends EnterpriseIntelligenceTransport {
  /** `GET` batches. */
  list(): Promise<EnterpriseIntelligenceList<EnterpriseRecord>> {
    return this.read("/api/v1/enterprise-intelligence/batches");
  }

  /** `POST` submit a batch of 1–10,000 items. Returns 202. */
  submit(
    submission: EnterpriseBatchSubmission,
    options?: EnterpriseMutationOptions,
  ): Promise<Result> {
    return this.post(
      "/api/v1/enterprise-intelligence/batches",
      submission,
      options?.idempotencyKey,
    );
  }

  /**
   * `POST` upload source files (spreadsheets, photos, PDFs) as one batch.
   * Sent as multipart/form-data; files map by order to `sources`.
   * Returns 202. A missing malware scanner or ingestion runtime answers
   * 503 (`EnterpriseIntelligenceUnavailableError`).
   */
  ingest(
    request: EnterpriseBatchIngestRequest,
    options?: EnterpriseMutationOptions,
  ): Promise<Result> {
    return this.post(
      "/api/v1/enterprise-intelligence/batches/ingest",
      buildIngestForm(request),
      options?.idempotencyKey,
    );
  }

  /** `GET` one batch with its counts. */
  get(batchId: string): Promise<Result> {
    return this.read(`/api/v1/enterprise-intelligence/batches/${seg(batchId)}`);
  }

  /** `GET` per-item state: runtime status, business disposition, delivery. */
  listItems(
    batchId: string,
  ): Promise<EnterpriseIntelligenceList<EnterpriseBatchItemState>> {
    return this.read(
      `/api/v1/enterprise-intelligence/batches/${seg(batchId)}/items`,
    );
  }

  /** `POST` retry items. Returns 202. */
  retry(
    batchId: string,
    request: EnterpriseBatchRetryRequest = {},
    options?: EnterpriseMutationOptions,
  ): Promise<Result> {
    return this.post(
      `/api/v1/enterprise-intelligence/batches/${seg(batchId)}/retry`,
      request,
      options?.idempotencyKey,
    );
  }

  /** `POST` cancel the batch's open runs. Cancel scope or operator role. */
  cancel(
    batchId: string,
    options?: EnterpriseMutationOptions,
  ): Promise<Result> {
    return this.post(
      `/api/v1/enterprise-intelligence/batches/${seg(batchId)}/cancel`,
      undefined,
      options?.idempotencyKey,
    );
  }

  /**
   * `POST` accept, reject or send back items. The same key with a
   * different selection conflicts rather than disposing new records.
   */
  decideAcceptance(
    batchId: string,
    request: EnterpriseBatchAcceptanceRequest,
    options?: EnterpriseMutationOptions,
  ): Promise<Result> {
    return this.post(
      `/api/v1/enterprise-intelligence/batches/${seg(batchId)}/acceptance`,
      request,
      options?.idempotencyKey,
    );
  }
}
