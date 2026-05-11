/**
 * PhysicsService — physics simulations and GPU telemetry.
 */
import type { HttpClient, RequestConfig } from "../types/api";

export interface PhysicsSimulationInput {
  kind: string;
  config: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface PhysicsSimulation {
  id: string;
  kind: string;
  status: string;
  startedAt: string;
}

export interface PhysicsSimulationResult {
  id: string;
  status: string;
  metrics: Record<string, number>;
  artifacts: Array<{ id: string; kind: string; url: string }>;
}

export interface GpuTelemetry {
  nodes: Array<{
    id: string;
    gpu: string;
    utilizationPct: number;
    memoryGb: number;
    temperatureC: number;
  }>;
  capturedAt: string;
}

export class PhysicsService {
  constructor(
    private readonly http: HttpClient,
    private readonly requestConfig: RequestConfig = {},
  ) {}

  async createSimulation(
    payload: PhysicsSimulationInput,
  ): Promise<PhysicsSimulation> {
    return this.http.post<PhysicsSimulation>(
      "/v1/physics/simulations",
      payload,
      this.requestConfig,
    );
  }

  async getSimulationResult(
    simulationId: string,
  ): Promise<PhysicsSimulationResult> {
    return this.http.get<PhysicsSimulationResult>(
      `/v1/physics/simulations/${encodeURIComponent(simulationId)}`,
      this.requestConfig,
    );
  }

  async getGpuTelemetry(): Promise<GpuTelemetry> {
    return this.http.get<GpuTelemetry>(
      "/v1/physics/gpu/telemetry",
      this.requestConfig,
    );
  }
}
