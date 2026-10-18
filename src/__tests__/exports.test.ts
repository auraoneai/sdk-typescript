import { describe, expect, test } from "@jest/globals";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import * as sdk from "../index";
import { AuraOneClient } from "../client/AuraOneClient";

/**
 * Launch-excluded API prefixes (mirror of EXCLUDED_API_PREFIXES in
 * apps/src/lib/production-launch-route-scope.ts). No shipped SDK method may
 * target one of these — they return 410 in production.
 */
const EXCLUDED_PREFIXES = [
  "/api/v1/robotics",
  "/api/v1/rewards",
  // "/api/v1/synthetic" is shipped ahead of the synthetic readmission ADM-01
  // scope flip (225319d006 SDK surface; verify-sdk-route-contract path waivers).
  "/api/v1/capture",
  "/api/v1/payouts",
  "/api/v1/finance",
  "/api/v1/rl",
  "/api/v1/federated",
  "/api/v1/model-comparisons",
  "/api/v1/crm",
  "/api/v1/data-connectors",
  // "/api/v1/visualization" is re-admitted by the secondary-dashboards
  // readmission (P2-04 ships the SDK surface ahead of the ADM-01 scope flip).
  "/compute/v1",
];

/** Legacy prefixes that must never appear in the SDK. */
const DEAD_PREFIXES = ['"/v1', "`/v1", '"/compute', "`/compute", '"/graphql"', "`/graphql`"];

function collectSources(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (entry === "__tests__" || entry === "node_modules") continue;
    if (statSync(full).isDirectory()) {
      files.push(...collectSources(full));
    } else if (full.endsWith(".ts")) {
      files.push(full);
    }
  }
  return files;
}

describe("SDK surface vs launch-excluded routes (PR-19 T-P0-15/R6)", () => {
  const srcDir = join(dirname(fileURLToPath(import.meta.url)), "..");
  const sources = collectSources(srcDir).filter(
    (f) => !f.includes("__tests__"),
  );

  test("no source file references a launch-excluded prefix", () => {
    const hits: string[] = [];
    for (const file of sources) {
      const text = readFileSync(file, "utf8");
      for (const prefix of EXCLUDED_PREFIXES) {
        if (text.includes(`"${prefix}`) || text.includes(`\`${prefix}`)) {
          hits.push(`${file}: ${prefix}`);
        }
      }
    }
    expect(hits).toEqual([]);
  });

  test("no source file references dead /v1, /compute or /graphql prefixes", () => {
    const hits: string[] = [];
    for (const file of sources) {
      const text = readFileSync(file, "utf8");
      for (const prefix of DEAD_PREFIXES) {
        if (text.includes(prefix)) {
          hits.push(`${file}: ${prefix}`);
        }
      }
    }
    expect(hits).toEqual([]);
  });

  test("admitted environments namespace is exported and constructed", () => {
    const client = new AuraOneClient({
      apiKey: `ak_${"0".repeat(8)}_${"0".repeat(64)}`,
    });
    expect(client.environments).toBeDefined();
    for (const method of [
      "list",
      "get",
      "create",
      "listVersions",
      "publishVersion",
      "listEpisodes",
      "getEpisode",
      "createExport",
      "listExports",
      "runBaseline",
      "listBaselines",
      "listMarketplace",
      "submitMarketplaceListing",
      "marketplaceLeaderboard",
    ] as const) {
      expect(typeof client.environments[method]).toBe("function");
    }
    expect(
      (sdk as Record<string, unknown>).EnvironmentsService,
    ).toBeDefined();
  });

  test("admitted graphql namespace is exported and constructed", () => {
    const client = new AuraOneClient({
      apiKey: `ak_${"0".repeat(8)}_${"0".repeat(64)}`,
    });
    expect(client.graphql).toBeDefined();
    for (const method of [
      "query",
      "mutate",
      "execute",
      "request",
      "persistedQuery",
      "getOptimizationJob",
      "listOptimizationJobs",
      "getOptimizationJobHistory",
      "getOptimizationJobSurfaces",
    ] as const) {
      expect(typeof client.graphql[method]).toBe("function");
    }
    expect((sdk as Record<string, unknown>).GraphQLService).toBeDefined();
  });

  test("excluded services are not exported or constructed", () => {
    const client = new AuraOneClient({
      apiKey: `ak_${"0".repeat(8)}_${"0".repeat(64)}`,
    });
    expect("robotics" in client).toBe(false);
    expect("syntheticResearch" in client).toBe(false);
    expect("compute" in client).toBe(false);
    expect((sdk as Record<string, unknown>).RoboticsService).toBeUndefined();
    expect(
      (sdk as Record<string, unknown>).SyntheticResearchService,
    ).toBeUndefined();
    expect((sdk as Record<string, unknown>).ComputeService).toBeUndefined();
  });
});
