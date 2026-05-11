/**
 * ChemistryService — molecular workflow orchestration and parsing.
 */
import type { HttpClient, RequestConfig } from "../types/api";

export interface ChemistryWorkflowInput {
  name: string;
  steps: Array<{ kind: string; config?: Record<string, unknown> }>;
  metadata?: Record<string, unknown>;
}

export interface ChemistryWorkflow {
  id: string;
  name: string;
  status: string;
  steps: Array<{ kind: string; status: string }>;
  createdAt: string;
}

export interface MoleculeParseRequest {
  format: "smiles" | "inchi" | "molfile";
  input: string;
}

export interface MoleculeParseResult {
  canonicalSmiles: string;
  inchi: string;
  inchiKey: string;
  formula: string;
  molecularWeight: number;
}

export class ChemistryService {
  constructor(
    private readonly http: HttpClient,
    private readonly requestConfig: RequestConfig = {},
  ) {}

  async createWorkflow(
    payload: ChemistryWorkflowInput,
  ): Promise<ChemistryWorkflow> {
    return this.http.post<ChemistryWorkflow>(
      "/v1/chemistry/workflows",
      payload,
      this.requestConfig,
    );
  }

  async getWorkflow(workflowId: string): Promise<ChemistryWorkflow> {
    return this.http.get<ChemistryWorkflow>(
      `/v1/chemistry/workflows/${encodeURIComponent(workflowId)}`,
      this.requestConfig,
    );
  }

  async parseMolecule(
    payload: MoleculeParseRequest,
  ): Promise<MoleculeParseResult> {
    return this.http.post<MoleculeParseResult>(
      "/v1/chemistry/parse",
      payload,
      this.requestConfig,
    );
  }
}
