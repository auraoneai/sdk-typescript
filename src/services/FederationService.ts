import type { HttpClient, RequestConfig } from "../types/api";

/**
 * Federation (federated learning) coordinator surface.
 *
 * Readmission PRD P2-01: these methods land behind the launch exclusion —
 * the routes resolve to the org-scoped federation legs, which return 410
 * until A-01 admits the `federated-learning` capability. Only the contracted
 * coordinator legs below are covered; participant upload legs stay with the
 * `sdks/python/aura/federation` participant client.
 *
 * Every method needs an organization context: pass `orgId` per call or set
 * `orgId` on the client config. The key's organization is enforced
 * server-side (`organization_forbidden` on mismatch).
 */

export interface FederationRef {
  id: string;
  orgId?: string;
  name: string;
  status?: string;
  aggregationStrategy?: string;
  privacyMechanism?: string;
  epsilonTotal?: number;
  deltaTotal?: number;
  createdAt?: string;
}

export interface FederationParticipantRef {
  id: string;
  federationId?: string;
  orgId?: string;
  status: string;
  publicKeyFingerprint?: string | null;
  invitedAt?: string;
  approvedAt?: string | null;
}

export interface FederationRoundRef {
  id: string;
  federationId?: string;
  roundNumber?: number;
  status: string;
  aggregationStrategy?: string;
  privacyMechanism?: string;
  startedAt?: string;
  completedAt?: string | null;
}

export interface FederationPrivacyBudget {
  federationId: string;
  orgId?: string;
  federationName?: string;
  privacyMechanism?: string;
  totals?: {
    epsilonTotal?: number;
    epsilonConsumed?: number;
    epsilonRemaining?: number;
    deltaTotal?: number;
    deltaConsumed?: number;
    deltaRemaining?: number;
  };
  entries?: Array<Record<string, unknown>>;
}

export interface FederationAuditExport {
  manifest?: Record<string, unknown>;
  ndjson?: string;
  events?: Array<Record<string, unknown>>;
  downloadUrl?: string;
}

export interface CreateFederationInput {
  name: string;
  aggregationStrategy?: string;
  privacyMechanism?: string;
  epsilonTotal?: number;
  deltaTotal?: number;
  minParticipants?: number;
}

export interface InviteParticipantInput {
  orgId?: string;
  participantOrgSlug?: string;
  publicKeyPem?: string;
  publicKeyFingerprint?: string;
}

export interface StartRoundInput {
  federationId: string;
  modelType?: string;
  participantNodeIds?: string[];
  epsilonRequested?: number;
  deltaRequested?: number;
}

interface FederationsResponse {
  federations?: FederationRef[];
}

interface ParticipantsResponse {
  participants?: FederationParticipantRef[];
}

interface RoundsResponse {
  rounds?: FederationRoundRef[];
}

export class FederationService {
  constructor(
    private readonly http: HttpClient,
    private readonly options: { orgId?: string } = {},
    private readonly requestConfig: RequestConfig = {},
  ) {}

  private resolveOrgId(orgId?: string): string {
    const resolved = orgId ?? this.options.orgId;
    if (!resolved) {
      throw new Error(
        "Federation legs are organization-scoped: pass orgId or configure it on the client",
      );
    }
    return resolved;
  }

  async listFederations(orgId?: string): Promise<FederationRef[]> {
    const response = await this.http.get<FederationsResponse>(
      `/api/v1/organizations/${encodeURIComponent(this.resolveOrgId(orgId))}/federation/federations`,
      this.requestConfig,
    );
    return response?.federations ?? [];
  }

  async createFederation(
    input: CreateFederationInput,
    orgId?: string,
  ): Promise<FederationRef> {
    const response = await this.http.post<{ federation?: FederationRef }>(
      `/api/v1/organizations/${encodeURIComponent(this.resolveOrgId(orgId))}/federation/federations`,
      input,
      this.requestConfig,
    );
    return (
      response?.federation ?? ({ id: "", name: input.name } as FederationRef)
    );
  }

  async inviteParticipant(
    federationId: string,
    input: InviteParticipantInput,
    orgId?: string,
  ): Promise<FederationParticipantRef> {
    const response = await this.http.post<{
      participant?: FederationParticipantRef;
    }>(
      `/api/v1/organizations/${encodeURIComponent(this.resolveOrgId(orgId))}/federation/federations/${encodeURIComponent(federationId)}/participants`,
      input,
      this.requestConfig,
    );
    return (
      response?.participant ??
      ({ id: "", status: "pending" } as FederationParticipantRef)
    );
  }

  async listParticipants(
    federationId: string,
    orgId?: string,
  ): Promise<FederationParticipantRef[]> {
    const response = await this.http.get<ParticipantsResponse>(
      `/api/v1/organizations/${encodeURIComponent(this.resolveOrgId(orgId))}/federation/federations/${encodeURIComponent(federationId)}/participants`,
      this.requestConfig,
    );
    return response?.participants ?? [];
  }

  async startRound(
    input: StartRoundInput,
    orgId?: string,
  ): Promise<FederationRoundRef> {
    const response = await this.http.post<{ round?: FederationRoundRef }>(
      `/api/v1/organizations/${encodeURIComponent(this.resolveOrgId(orgId))}/federation/rounds`,
      input,
      this.requestConfig,
    );
    return (
      response?.round ?? ({ id: "", status: "pending" } as FederationRoundRef)
    );
  }

  async listRounds(
    orgId?: string,
    options: { status?: string; limit?: number } = {},
  ): Promise<FederationRoundRef[]> {
    const search = new URLSearchParams();
    if (options.status) search.set("status", options.status);
    if (options.limit) search.set("limit", String(options.limit));
    const qs = search.size ? `?${search.toString()}` : "";
    const response = await this.http.get<RoundsResponse>(
      `/api/v1/organizations/${encodeURIComponent(this.resolveOrgId(orgId))}/federation/rounds${qs}`,
      this.requestConfig,
    );
    return response?.rounds ?? [];
  }

  async getRound(roundId: string, orgId?: string): Promise<FederationRoundRef> {
    const response = await this.http.get<{ round?: FederationRoundRef }>(
      `/api/v1/organizations/${encodeURIComponent(this.resolveOrgId(orgId))}/federation/rounds/${encodeURIComponent(roundId)}`,
      this.requestConfig,
    );
    return (
      response?.round ??
      ({ id: roundId, status: "pending" } as FederationRoundRef)
    );
  }

  async getPrivacyBudget(
    federationId: string,
    orgId?: string,
  ): Promise<FederationPrivacyBudget> {
    const response = await this.http.get<{
      privacy_budget?: FederationPrivacyBudget;
    }>(
      `/api/v1/organizations/${encodeURIComponent(this.resolveOrgId(orgId))}/federation/privacy-budget?federationId=${encodeURIComponent(federationId)}`,
      this.requestConfig,
    );
    return (
      response?.privacy_budget ?? ({ federationId } as FederationPrivacyBudget)
    );
  }

  async exportAudit(
    federationId: string,
    orgId?: string,
  ): Promise<FederationAuditExport> {
    const response = await this.http.get<FederationAuditExport>(
      `/api/v1/organizations/${encodeURIComponent(this.resolveOrgId(orgId))}/federation/federations/${encodeURIComponent(federationId)}/audit-export`,
      this.requestConfig,
    );
    return response ?? {};
  }
}
