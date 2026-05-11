import { describe, expect, jest, test } from "@jest/globals";

import { AstronomyService } from "../services/AstronomyService";
import { BiologyService } from "../services/BiologyService";
import { ChemistryService } from "../services/ChemistryService";
import { ClimateService } from "../services/ClimateService";
import { EnvironmentalService } from "../services/EnvironmentalService";
import { FinancialService } from "../services/FinancialService";
import { GenomicsService } from "../services/GenomicsService";
import { ManufacturingService } from "../services/ManufacturingService";
import { MaterialsService } from "../services/MaterialsService";
import { MedicalImagingService } from "../services/MedicalImagingService";
import { PhysicsService } from "../services/PhysicsService";
import { Spatial3DService } from "../services/Spatial3DService";
import type { HttpClient } from "../types/api";

interface MockHttp {
  client: HttpClient;
  get: jest.Mock;
  post: jest.Mock;
  put: jest.Mock;
  delete: jest.Mock;
  patch: jest.Mock;
}

function makeMockClient(): MockHttp {
  const ok = jest.fn(async () => ({}));
  const get = jest.fn(async () => ({}));
  const post = jest.fn(async () => ({}));
  const put = jest.fn(async () => ({}));
  const del = jest.fn(async () => ({}));
  const patch = jest.fn(async () => ({}));
  void ok;
  const client: HttpClient = {
    get: get as unknown as HttpClient["get"],
    post: post as unknown as HttpClient["post"],
    put: put as unknown as HttpClient["put"],
    delete: del as unknown as HttpClient["delete"],
    patch: patch as unknown as HttpClient["patch"],
  };
  return { client, get, post, put, delete: del, patch };
}

describe("BiologyService", () => {
  test("biosafetyScreening POSTs the screening payload", async () => {
    const http = makeMockClient();
    const service = new BiologyService(http.client);
    await service.biosafetyScreening({ sequence: "ATCG" });
    expect(http.post).toHaveBeenCalledWith(
      "/v1/biology/biosafety-screening",
      { sequence: "ATCG" },
      {},
    );
  });

  test("listIbcCases GETs with status query", async () => {
    const http = makeMockClient();
    const service = new BiologyService(http.client);
    await service.listIbcCases({ status: "open", orgId: "org-1" });
    expect(http.get).toHaveBeenCalledWith(
      "/v1/biology/ibc/cases?orgId=org-1&status=open",
      {},
    );
  });

  test("listDurcCases GETs", async () => {
    const http = makeMockClient();
    const service = new BiologyService(http.client);
    await service.listDurcCases({ status: "review" });
    expect(http.get).toHaveBeenCalledWith(
      "/v1/biology/durc/cases?status=review",
      {},
    );
  });

  test("getSynthesisRelease GETs by id", async () => {
    const http = makeMockClient();
    const service = new BiologyService(http.client);
    await service.getSynthesisRelease("rel-1");
    expect(http.get).toHaveBeenCalledWith(
      "/v1/biology/synthesis/releases/rel-1",
      {},
    );
  });
});

describe("ChemistryService", () => {
  test("createWorkflow POSTs", async () => {
    const http = makeMockClient();
    const service = new ChemistryService(http.client);
    await service.createWorkflow({ name: "rxn-1", steps: [] });
    expect(http.post).toHaveBeenCalledWith(
      "/v1/chemistry/workflows",
      { name: "rxn-1", steps: [] },
      {},
    );
  });

  test("getWorkflow GETs", async () => {
    const http = makeMockClient();
    const service = new ChemistryService(http.client);
    await service.getWorkflow("wf-1");
    expect(http.get).toHaveBeenCalledWith(
      "/v1/chemistry/workflows/wf-1",
      {},
    );
  });

  test("parseMolecule POSTs", async () => {
    const http = makeMockClient();
    const service = new ChemistryService(http.client);
    await service.parseMolecule({ format: "smiles", input: "CCO" });
    expect(http.post).toHaveBeenCalledWith(
      "/v1/chemistry/parse",
      { format: "smiles", input: "CCO" },
      {},
    );
  });
});

describe("MaterialsService", () => {
  test("listCandidates GETs", async () => {
    const http = makeMockClient();
    const service = new MaterialsService(http.client);
    await service.listCandidates({ sweepId: "sw-1" });
    expect(http.get).toHaveBeenCalledWith(
      "/v1/materials/records?sweepId=sw-1",
      {},
    );
  });

  test("submitScan POSTs", async () => {
    const http = makeMockClient();
    const service = new MaterialsService(http.client);
    await service.submitScan({
      candidateId: "c-1",
      instrument: "XRD",
      payload: {},
    });
    expect(http.post).toHaveBeenCalledWith(
      "/v1/materials/scans",
      { candidateId: "c-1", instrument: "XRD", payload: {} },
      {},
    );
  });

  test("listSweeps GETs", async () => {
    const http = makeMockClient();
    const service = new MaterialsService(http.client);
    await service.listSweeps();
    expect(http.get).toHaveBeenCalledWith("/v1/materials/sweeps", {});
  });

  test("signOff POSTs", async () => {
    const http = makeMockClient();
    const service = new MaterialsService(http.client);
    await service.signOff({ candidateId: "c-1", decision: "approved" });
    expect(http.post).toHaveBeenCalledWith(
      "/v1/materials/sign-off",
      { candidateId: "c-1", decision: "approved" },
      {},
    );
  });
});

describe("EnvironmentalService", () => {
  test("listSiteThresholds GETs", async () => {
    const http = makeMockClient();
    const service = new EnvironmentalService(http.client);
    await service.listSiteThresholds({ siteId: "site-1" });
    expect(http.get).toHaveBeenCalledWith(
      "/v1/environmental/site-thresholds?siteId=site-1",
      {},
    );
  });

  test("upsertSiteThreshold POSTs", async () => {
    const http = makeMockClient();
    const service = new EnvironmentalService(http.client);
    await service.upsertSiteThreshold({
      siteId: "site-1",
      pollutant: "PM2.5",
      limit: 35,
      unit: "µg/m³",
    });
    expect(http.post).toHaveBeenCalled();
  });

  test("generatePacket POSTs to packets/<kind>", async () => {
    const http = makeMockClient();
    const service = new EnvironmentalService(http.client);
    await service.generatePacket({ kind: "epa-ttn", siteId: "site-1" });
    expect(http.post).toHaveBeenCalledWith(
      "/v1/environmental/packets/epa-ttn",
      { kind: "epa-ttn", siteId: "site-1" },
      {},
    );
  });
});

describe("AstronomyService", () => {
  test("listAlerts GETs with limit", async () => {
    const http = makeMockClient();
    const service = new AstronomyService(http.client);
    await service.listAlerts({ limit: 10 });
    expect(http.get).toHaveBeenCalledWith(
      "/v1/astronomy/alerts?limit=10",
      {},
    );
  });

  test("scoreTriage POSTs", async () => {
    const http = makeMockClient();
    const service = new AstronomyService(http.client);
    await service.scoreTriage({ alertId: "a-1" });
    expect(http.post).toHaveBeenCalledWith(
      "/v1/astronomy/triage",
      { alertId: "a-1" },
      {},
    );
  });

  test("scheduleObservation POSTs", async () => {
    const http = makeMockClient();
    const service = new AstronomyService(http.client);
    await service.scheduleObservation({
      alertId: "a-1",
      telescope: "Keck",
    });
    expect(http.post).toHaveBeenCalledWith(
      "/v1/astronomy/observations",
      { alertId: "a-1", telescope: "Keck" },
      {},
    );
  });
});

describe("ClimateService", () => {
  test("listProjects GETs", async () => {
    const http = makeMockClient();
    const service = new ClimateService(http.client);
    await service.listProjects({ region: "EU" });
    expect(http.get).toHaveBeenCalledWith(
      "/v1/climate/projects?region=EU",
      {},
    );
  });

  test("listVerraCredits GETs", async () => {
    const http = makeMockClient();
    const service = new ClimateService(http.client);
    await service.listVerraCredits({ projectId: "p-1" });
    expect(http.get).toHaveBeenCalledWith(
      "/v1/climate/verra-credits?projectId=p-1",
      {},
    );
  });
});

describe("Spatial3DService", () => {
  test("createProject POSTs", async () => {
    const http = makeMockClient();
    const service = new Spatial3DService(http.client);
    await service.createProject({ name: "scene-1" });
    expect(http.post).toHaveBeenCalledWith(
      "/v1/spatial3d/projects",
      { name: "scene-1" },
      {},
    );
  });

  test("executeJob POSTs to project jobs path", async () => {
    const http = makeMockClient();
    const service = new Spatial3DService(http.client);
    await service.executeJob({ projectId: "p-1", kind: "nerf" });
    expect(http.post).toHaveBeenCalledWith(
      "/v1/spatial3d/projects/p-1/jobs",
      { projectId: "p-1", kind: "nerf" },
      {},
    );
  });

  test("getProjectResult GETs", async () => {
    const http = makeMockClient();
    const service = new Spatial3DService(http.client);
    await service.getProjectResult("p-1");
    expect(http.get).toHaveBeenCalledWith(
      "/v1/spatial3d/projects/p-1/result",
      {},
    );
  });
});

describe("FinancialService", () => {
  test("scoreFraud POSTs", async () => {
    const http = makeMockClient();
    const service = new FinancialService(http.client);
    await service.scoreFraud({ transactionId: "t-1", features: {} });
    expect(http.post).toHaveBeenCalledWith(
      "/v1/financial/fraud/score",
      { transactionId: "t-1", features: {} },
      {},
    );
  });

  test("scoreCredit POSTs", async () => {
    const http = makeMockClient();
    const service = new FinancialService(http.client);
    await service.scoreCredit({ applicantId: "a-1", features: {} });
    expect(http.post).toHaveBeenCalledWith(
      "/v1/financial/credit/score",
      { applicantId: "a-1", features: {} },
      {},
    );
  });

  test("validateSar POSTs", async () => {
    const http = makeMockClient();
    const service = new FinancialService(http.client);
    await service.validateSar({ filingId: "f-1", payload: {} });
    expect(http.post).toHaveBeenCalledWith(
      "/v1/financial/sar/validate",
      { filingId: "f-1", payload: {} },
      {},
    );
  });
});

describe("ManufacturingService", () => {
  test("submitInspection POSTs", async () => {
    const http = makeMockClient();
    const service = new ManufacturingService(http.client);
    await service.submitInspection({
      partNumber: "PN-1",
      lotId: "lot-1",
      payload: {},
    });
    expect(http.post).toHaveBeenCalledWith(
      "/v1/manufacturing/inspections",
      { partNumber: "PN-1", lotId: "lot-1", payload: {} },
      {},
    );
  });

  test("getInspectionResult GETs", async () => {
    const http = makeMockClient();
    const service = new ManufacturingService(http.client);
    await service.getInspectionResult("ins-1");
    expect(http.get).toHaveBeenCalledWith(
      "/v1/manufacturing/inspections/ins-1",
      {},
    );
  });

  test("getQualityScore GETs", async () => {
    const http = makeMockClient();
    const service = new ManufacturingService(http.client);
    await service.getQualityScore("PN-1");
    expect(http.get).toHaveBeenCalledWith(
      "/v1/manufacturing/quality/PN-1",
      {},
    );
  });
});

describe("MedicalImagingService", () => {
  test("submitStudy POSTs", async () => {
    const http = makeMockClient();
    const service = new MedicalImagingService(http.client);
    await service.submitStudy({
      studyInstanceUid: "1.2.3",
      modality: "CT",
      payload: {},
    });
    expect(http.post).toHaveBeenCalledWith(
      "/v1/medical-imaging/studies",
      { studyInstanceUid: "1.2.3", modality: "CT", payload: {} },
      {},
    );
  });

  test("getTriage GETs", async () => {
    const http = makeMockClient();
    const service = new MedicalImagingService(http.client);
    await service.getTriage("1.2.3");
    expect(http.get).toHaveBeenCalledWith(
      "/v1/medical-imaging/triage/1.2.3",
      {},
    );
  });

  test("pushRegressionBank POSTs", async () => {
    const http = makeMockClient();
    const service = new MedicalImagingService(http.client);
    await service.pushRegressionBank({ modelVersion: "v1", cases: [] });
    expect(http.post).toHaveBeenCalledWith(
      "/v1/medical-imaging/regression-bank/push",
      { modelVersion: "v1", cases: [] },
      {},
    );
  });
});

describe("PhysicsService", () => {
  test("createSimulation POSTs", async () => {
    const http = makeMockClient();
    const service = new PhysicsService(http.client);
    await service.createSimulation({ kind: "fluid", config: {} });
    expect(http.post).toHaveBeenCalledWith(
      "/v1/physics/simulations",
      { kind: "fluid", config: {} },
      {},
    );
  });

  test("getSimulationResult GETs", async () => {
    const http = makeMockClient();
    const service = new PhysicsService(http.client);
    await service.getSimulationResult("sim-1");
    expect(http.get).toHaveBeenCalledWith(
      "/v1/physics/simulations/sim-1",
      {},
    );
  });

  test("getGpuTelemetry GETs", async () => {
    const http = makeMockClient();
    const service = new PhysicsService(http.client);
    await service.getGpuTelemetry();
    expect(http.get).toHaveBeenCalledWith(
      "/v1/physics/gpu/telemetry",
      {},
    );
  });
});

describe("GenomicsService", () => {
  test("annotateVariant POSTs", async () => {
    const http = makeMockClient();
    const service = new GenomicsService(http.client);
    await service.annotateVariant({
      chrom: "1",
      pos: 100,
      ref: "A",
      alt: "T",
    });
    expect(http.post).toHaveBeenCalledWith(
      "/v1/genomics/variants/annotate",
      { chrom: "1", pos: 100, ref: "A", alt: "T" },
      {},
    );
  });

  test("lookupCpic GETs", async () => {
    const http = makeMockClient();
    const service = new GenomicsService(http.client);
    await service.lookupCpic({ drug: "warfarin" });
    expect(http.get).toHaveBeenCalledWith(
      "/v1/genomics/cpic?drug=warfarin",
      {},
    );
  });

  test("lookupClinVar GETs", async () => {
    const http = makeMockClient();
    const service = new GenomicsService(http.client);
    await service.lookupClinVar("var-1");
    expect(http.get).toHaveBeenCalledWith(
      "/v1/genomics/clinvar/var-1",
      {},
    );
  });

  test("lookupGnomad GETs", async () => {
    const http = makeMockClient();
    const service = new GenomicsService(http.client);
    await service.lookupGnomad("var-1");
    expect(http.get).toHaveBeenCalledWith(
      "/v1/genomics/gnomad/var-1",
      {},
    );
  });
});
