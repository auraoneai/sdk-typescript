import {
  HttpClient,
  TrainingExportRequest,
  TrainingExportStats,
  RequestConfig,
} from "../types/api";
import { buildQueryString } from "../utils/HttpClient";

export class TrainingService {
  constructor(private httpClient: HttpClient) {}

  /**
   * Export training data in specified format
   */
  async exportTrainingData(
    request: TrainingExportRequest,
    config?: RequestConfig,
  ): Promise<string> {
    // Override headers for JSONL response
    const requestConfig = {
      ...config,
      headers: {
        ...config?.headers,
        Accept: "application/x-jsonlines",
      },
    };

    return this.httpClient.post<string>(
      "/api/training/export",
      request,
      requestConfig,
    );
  }

  /**
   * Export DPO format training data
   */
  async exportDPO(
    request: Omit<TrainingExportRequest, "format">,
    config?: RequestConfig,
  ): Promise<string> {
    return this.exportTrainingData({ ...request, format: "dpo" }, config);
  }

  /**
   * Export PPO format training data
   */
  async exportPPO(
    request: Omit<TrainingExportRequest, "format">,
    config?: RequestConfig,
  ): Promise<string> {
    return this.exportTrainingData({ ...request, format: "ppo" }, config);
  }

  /**
   * Export SFT format training data
   */
  async exportSFT(
    request: Omit<TrainingExportRequest, "format"> & {
      sftFormat?: "alpaca" | "sharegpt" | "custom";
    },
    config?: RequestConfig,
  ): Promise<string> {
    return this.exportTrainingData(
      {
        ...request,
        format: "sft",
        sftFormat: request.sftFormat || "custom",
      },
      config,
    );
  }

  /**
   * Export span format training data
   */
  async exportSpan(
    request: Omit<TrainingExportRequest, "format">,
    config?: RequestConfig,
  ): Promise<string> {
    return this.exportTrainingData({ ...request, format: "span" }, config);
  }

  /**
   * Export trajectory format training data
   */
  async exportTrajectory(
    request: Omit<TrainingExportRequest, "format">,
    config?: RequestConfig,
  ): Promise<string> {
    return this.exportTrainingData(
      { ...request, format: "trajectory" },
      config,
    );
  }

  /**
   * Get training export statistics
   */
  async getExportStats(
    orgId: string,
    format?: string,
    config?: RequestConfig,
  ): Promise<TrainingExportStats> {
    const queryString = buildQueryString({ orgId, format });
    return this.httpClient.get<TrainingExportStats>(
      `/api/training/export${queryString}`,
      config,
    );
  }

  /**
   * Get export statistics for specific format
   */
  async getFormatStats(
    orgId: string,
    format: "dpo" | "ppo" | "sft" | "span" | "trajectory",
    config?: RequestConfig,
  ): Promise<{
    format: string;
    available: number;
    lastExported?: string;
  }> {
    const queryString = buildQueryString({ orgId, format });
    return this.httpClient.get(`/api/training/export${queryString}`, config);
  }

  /**
   * Parse JSONL training data
   */
  static parseJSONL(jsonlData: string): Record<string, unknown>[] {
    return jsonlData
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        try {
          const parsed = JSON.parse(line);
          if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
            throw new Error("Training records must be JSON objects");
          }
          return parsed as Record<string, unknown>;
        } catch (error) {
          throw new Error(`Failed to parse JSONL line: ${line}`);
        }
      });
  }

  /**
   * Validate training data format
   */
  static validateTrainingData(
    data: Record<string, unknown>[],
    format: "dpo" | "ppo" | "sft" | "span" | "trajectory",
  ): {
    isValid: boolean;
    errors: string[];
    validCount: number;
    totalCount: number;
  } {
    const errors: string[] = [];
    let validCount = 0;

    data.forEach((item, index) => {
      try {
        switch (format) {
          case "dpo":
            this.validateDPOFormat(item);
            break;
          case "ppo":
            this.validatePPOFormat(item);
            break;
          case "sft":
            this.validateSFTFormat(item);
            break;
          case "span":
            this.validateSpanFormat(item);
            break;
          case "trajectory":
            this.validateTrajectoryFormat(item);
            break;
        }
        validCount++;
      } catch (error) {
        errors.push(
          `Record ${index}: ${error instanceof Error ? error.message : "Invalid format"}`,
        );
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      validCount,
      totalCount: data.length,
    };
  }

  private static validateDPOFormat(item: Record<string, unknown>): void {
    const required = ["prompt", "chosen", "rejected"];
    for (const field of required) {
      if (typeof item[field] === "undefined") {
        throw new Error(`Missing required field: ${field}`);
      }
    }
  }

  private static validatePPOFormat(item: Record<string, unknown>): void {
    const required = ["prompt", "response", "reward"];
    for (const field of required) {
      if (typeof item[field] === "undefined") {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (typeof item.reward !== "number") {
      throw new Error("Reward must be a number");
    }
  }

  private static validateSFTFormat(item: Record<string, unknown>): void {
    const { conversations, instruction } = item;
    if (typeof conversations !== "undefined") {
      // ShareGPT format
      if (!Array.isArray(conversations)) {
        throw new Error("Conversations must be an array");
      }
    } else if (typeof instruction !== "undefined") {
      // Alpaca format
      const required = ["instruction"];
      for (const field of required) {
        if (typeof item[field] === "undefined") {
          throw new Error(`Missing required field: ${field}`);
        }
      }
    } else {
      throw new Error(
        "Invalid SFT format: must have either conversations or instruction",
      );
    }
  }

  private static validateSpanFormat(item: Record<string, unknown>): void {
    const required = ["text", "spans"];
    for (const field of required) {
      if (typeof item[field] === "undefined") {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (!Array.isArray(item.spans)) {
      throw new Error("Spans must be an array");
    }
  }

  private static validateTrajectoryFormat(item: Record<string, unknown>): void {
    const required = ["states", "actions", "rewards"];
    for (const field of required) {
      if (typeof item[field] === "undefined") {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (
      !Array.isArray(item.states) ||
      !Array.isArray(item.actions) ||
      !Array.isArray(item.rewards)
    ) {
      throw new Error("States, actions, and rewards must be arrays");
    }
  }

  /**
   * Stream training data export for large datasets
   */
  async *streamExport(
    request: TrainingExportRequest,
    config?: RequestConfig,
  ): AsyncGenerator<string, void, unknown> {
    // This would implement streaming for large exports
    // currently, we'll use regular export and yield chunks
    const data = await this.exportTrainingData(request, config);
    const lines = data.split("\n");

    for (const line of lines) {
      if (line.trim()) {
        yield line;
      }
    }
  }

  /**
   * Export and save training data to file (Node.js environment)
   */
  async exportToFile(
    request: TrainingExportRequest,
    filePath: string,
    config?: RequestConfig,
  ): Promise<void> {
    if (typeof window !== "undefined") {
      throw new Error(
        "File operations are not supported in browser environment",
      );
    }

    const data = await this.exportTrainingData(request, config);

    // Dynamic import for Node.js environment
    const fs = await import("fs/promises");
    await fs.writeFile(filePath, data, "utf-8");
  }

  /**
   * Download training data as blob (browser environment)
   */
  downloadAsBlob(
    request: TrainingExportRequest,
    filename?: string,
    config?: RequestConfig,
  ): Promise<void> {
    if (typeof window === "undefined") {
      throw new Error("Blob download is only supported in browser environment");
    }

    return this.exportTrainingData(request, config).then((data) => {
      const blob = new Blob([data], { type: "application/x-jsonlines" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download =
        filename || `training_export_${request.format}_${Date.now()}.jsonl`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);
    });
  }
}
