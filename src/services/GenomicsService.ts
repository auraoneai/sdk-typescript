/**
 * GenomicsService — variant annotation and curated genomic database lookups.
 */
import type { HttpClient, RequestConfig } from "../types/api";

export interface VariantAnnotationRequest {
  chrom: string;
  pos: number;
  ref: string;
  alt: string;
  build?: "GRCh37" | "GRCh38";
}

export interface VariantAnnotation {
  variantId: string;
  gene?: string;
  consequence?: string;
  significance?: string;
  populations?: Record<string, number>;
}

export interface CpicEntry {
  drug: string;
  gene: string;
  guideline: string;
  recommendation: string;
}

export interface ClinVarEntry {
  variantId: string;
  significance: string;
  reviewStatus: string;
  conditions: string[];
}

export interface GnomadEntry {
  variantId: string;
  alleleFrequency: number;
  populations: Record<string, number>;
}

export class GenomicsService {
  constructor(
    private readonly http: HttpClient,
    private readonly requestConfig: RequestConfig = {},
  ) {}

  async annotateVariant(
    payload: VariantAnnotationRequest,
  ): Promise<VariantAnnotation> {
    return this.http.post<VariantAnnotation>(
      "/v1/genomics/variants/annotate",
      payload,
      this.requestConfig,
    );
  }

  async lookupCpic(query: { drug?: string; gene?: string } = {}): Promise<{
    items: CpicEntry[];
  }> {
    const search = new URLSearchParams();
    if (query.drug) search.set("drug", query.drug);
    if (query.gene) search.set("gene", query.gene);
    const qs = search.toString();
    return this.http.get<{ items: CpicEntry[] }>(
      `/v1/genomics/cpic${qs ? `?${qs}` : ""}`,
      this.requestConfig,
    );
  }

  async lookupClinVar(variantId: string): Promise<ClinVarEntry> {
    return this.http.get<ClinVarEntry>(
      `/v1/genomics/clinvar/${encodeURIComponent(variantId)}`,
      this.requestConfig,
    );
  }

  async lookupGnomad(variantId: string): Promise<GnomadEntry> {
    return this.http.get<GnomadEntry>(
      `/v1/genomics/gnomad/${encodeURIComponent(variantId)}`,
      this.requestConfig,
    );
  }
}
