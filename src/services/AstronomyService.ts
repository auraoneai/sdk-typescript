/**
 * AstronomyService — alerts, triage scoring, observation scheduling.
 */
import type { HttpClient, RequestConfig } from "../types/api";

export interface AstronomyAlert {
  id: string;
  type: string;
  ra: number;
  dec: number;
  magnitude: number;
  detectedAt: string;
}

export interface TriageScoreRequest {
  alertId: string;
  features?: Record<string, number>;
}

export interface TriageScoreResult {
  alertId: string;
  score: number;
  classification: string;
  rationale?: string;
}

export interface ObservationSchedule {
  id: string;
  alertId: string;
  telescope: string;
  scheduledAt: string;
  status: string;
}

export class AstronomyService {
  constructor(
    private readonly http: HttpClient,
    private readonly requestConfig: RequestConfig = {},
  ) {}

  async listAlerts(query: { since?: string; limit?: number } = {}): Promise<{
    items: AstronomyAlert[];
  }> {
    const search = new URLSearchParams();
    if (query.since) search.set("since", query.since);
    if (query.limit !== undefined) search.set("limit", String(query.limit));
    const qs = search.toString();
    return this.http.get<{ items: AstronomyAlert[] }>(
      `/v1/astronomy/alerts${qs ? `?${qs}` : ""}`,
      this.requestConfig,
    );
  }

  async scoreTriage(payload: TriageScoreRequest): Promise<TriageScoreResult> {
    return this.http.post<TriageScoreResult>(
      "/v1/astronomy/triage",
      payload,
      this.requestConfig,
    );
  }

  async scheduleObservation(payload: {
    alertId: string;
    telescope: string;
    requestedAt?: string;
  }): Promise<ObservationSchedule> {
    return this.http.post<ObservationSchedule>(
      "/v1/astronomy/observations",
      payload,
      this.requestConfig,
    );
  }
}
