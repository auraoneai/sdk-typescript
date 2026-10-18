import type { HttpClient, RequestConfig } from "../types/api";
import type {
  CalibrationResult,
  ConsentRecord,
  EvidenceDiscoveryCandidate,
  ExpertTwin,
  IdentityReview,
  PriorSet,
  PriorVersion,
  StudyInstrument,
  SyntheticAnswer,
  SyntheticPopulation,
  SyntheticPopulationMember,
  SyntheticResearchEnvelope,
  SyntheticResearchListOptions,
  SyntheticResearchPage,
  SyntheticResearchPayload,
  SyntheticResearchReport,
  SyntheticResearchRequestOptions,
  SyntheticResearchReadOptions,
  SyntheticResearchSettings,
  SyntheticPersona,
  ReportShare,
  SyntheticSource,
  SyntheticStudy,
  SyntheticStudyRun,
  ValidationResult,
} from "../types/synthetic-research";

const BASE = "/api/v1/synthetic-research";

function query(options: SyntheticResearchListOptions = {}): string {
  const values = new URLSearchParams();
  if (options.cursor) values.set("cursor", options.cursor);
  if (options.limit !== undefined) values.set("limit", String(options.limit));
  const encoded = values.toString();
  return encoded ? `?${encoded}` : "";
}

function id(value: string): string {
  return encodeURIComponent(value);
}

export class SyntheticResearchService {
  constructor(
    private readonly http: HttpClient,
    private readonly requestConfig: RequestConfig = {},
  ) {}

  private mutationConfig(
    options: SyntheticResearchRequestOptions,
  ): RequestConfig {
    return {
      ...this.requestConfig,
      headers: {
        ...this.requestConfig.headers,
        "Idempotency-Key": options.idempotencyKey,
        ...(options.requestId ? { "X-Request-Id": options.requestId } : {}),
      },
    };
  }

  private getConfig(requestId?: string): RequestConfig {
    return requestId
      ? {
          ...this.requestConfig,
          headers: { ...this.requestConfig.headers, "X-Request-Id": requestId },
        }
      : this.requestConfig;
  }

  listSources(options?: SyntheticResearchListOptions) {
    return this.http.get<SyntheticResearchPage<SyntheticSource>>(
      `${BASE}/sources${query(options)}`,
      this.requestConfig,
    );
  }
  createSource(
    payload: SyntheticResearchPayload,
    options: SyntheticResearchRequestOptions,
  ) {
    return this.http.post<SyntheticResearchEnvelope<SyntheticSource>>(
      `${BASE}/sources`,
      payload,
      this.mutationConfig(options),
    );
  }
  getSource(sourceId: string, requestId?: string) {
    return this.http.get<SyntheticResearchEnvelope<SyntheticSource>>(
      `${BASE}/sources/${id(sourceId)}`,
      this.getConfig(requestId),
    );
  }
  createSourceUploadUrl(
    sourceId: string,
    payload: SyntheticResearchPayload,
    options: SyntheticResearchRequestOptions,
  ) {
    return this.http.post<SyntheticResearchEnvelope<SyntheticResearchPayload>>(
      `${BASE}/sources/${id(sourceId)}/artifacts/upload-url`,
      payload,
      this.mutationConfig(options),
    );
  }
  completeSourceUpload(
    sourceId: string,
    payload: SyntheticResearchPayload,
    options: SyntheticResearchRequestOptions,
  ) {
    return this.http.post<SyntheticResearchEnvelope<SyntheticResearchPayload>>(
      `${BASE}/sources/${id(sourceId)}/artifacts/upload-url/complete`,
      payload,
      this.mutationConfig(options),
    );
  }
  ingestSource(
    sourceId: string,
    payload: SyntheticResearchPayload,
    options: SyntheticResearchRequestOptions,
  ) {
    return this.http.post<SyntheticResearchEnvelope<SyntheticResearchPayload>>(
      `${BASE}/sources/${id(sourceId)}/ingest`,
      payload,
      this.mutationConfig(options),
    );
  }
  getSourceSchema(sourceId: string) {
    return this.http.get<SyntheticResearchEnvelope<SyntheticResearchPayload>>(
      `${BASE}/sources/${id(sourceId)}/schema`,
      this.requestConfig,
    );
  }
  updateSourceMappings(
    sourceId: string,
    payload: SyntheticResearchPayload,
    options: SyntheticResearchRequestOptions,
  ) {
    return this.http.put<SyntheticResearchEnvelope<SyntheticResearchPayload>>(
      `${BASE}/sources/${id(sourceId)}/mappings`,
      payload,
      this.mutationConfig(options),
    );
  }
  updateSourceRights(
    sourceId: string,
    payload: SyntheticResearchPayload,
    options: SyntheticResearchRequestOptions,
  ) {
    return this.http.put<SyntheticResearchEnvelope<SyntheticSource>>(
      `${BASE}/sources/${id(sourceId)}/rights`,
      payload,
      this.mutationConfig(options),
    );
  }
  freezeSource(sourceId: string, options: SyntheticResearchRequestOptions) {
    return this.http.post<SyntheticResearchEnvelope<SyntheticSource>>(
      `${BASE}/sources/${id(sourceId)}/freeze`,
      {},
      this.mutationConfig(options),
    );
  }
  listSourceRecords(sourceId: string, options?: SyntheticResearchListOptions) {
    return this.http.get<SyntheticResearchPage<SyntheticResearchPayload>>(
      `${BASE}/sources/${id(sourceId)}/records${query(options)}`,
      this.requestConfig,
    );
  }
  getSourceDeletionImpact(sourceId: string) {
    return this.http.get<SyntheticResearchEnvelope<SyntheticResearchPayload>>(
      `${BASE}/sources/${id(sourceId)}/deletion-impact`,
      this.requestConfig,
    );
  }
  requestSourceDeletion(
    sourceId: string,
    payload: SyntheticResearchPayload,
    options: SyntheticResearchRequestOptions,
  ) {
    return this.http.post<SyntheticResearchEnvelope<SyntheticResearchPayload>>(
      `${BASE}/sources/${id(sourceId)}/delete-request`,
      payload,
      this.mutationConfig(options),
    );
  }

  listPriors(options?: SyntheticResearchListOptions) {
    return this.http.get<SyntheticResearchPage<PriorSet>>(
      `${BASE}/priors${query(options)}`,
      this.requestConfig,
    );
  }
  createPrior(
    payload: SyntheticResearchPayload,
    options: SyntheticResearchRequestOptions,
  ) {
    return this.http.post<SyntheticResearchEnvelope<PriorSet>>(
      `${BASE}/priors`,
      payload,
      this.mutationConfig(options),
    );
  }
  getPrior(priorSetId: string) {
    return this.http.get<SyntheticResearchEnvelope<PriorSet>>(
      `${BASE}/priors/${id(priorSetId)}`,
      this.requestConfig,
    );
  }
  updatePrior(
    priorSetId: string,
    payload: SyntheticResearchPayload,
    options: SyntheticResearchRequestOptions,
  ) {
    return this.http.patch<SyntheticResearchEnvelope<PriorSet>>(
      `${BASE}/priors/${id(priorSetId)}`,
      payload,
      this.mutationConfig(options),
    );
  }
  archivePrior(priorSetId: string, options: SyntheticResearchRequestOptions) {
    return this.http.delete<SyntheticResearchEnvelope<PriorSet>>(
      `${BASE}/priors/${id(priorSetId)}`,
      this.mutationConfig(options),
    );
  }
  createPriorVersion(
    priorSetId: string,
    payload: SyntheticResearchPayload,
    options: SyntheticResearchRequestOptions,
  ) {
    return this.http.post<SyntheticResearchEnvelope<PriorVersion>>(
      `${BASE}/priors/${id(priorSetId)}/versions`,
      payload,
      this.mutationConfig(options),
    );
  }
  getPriorVersion(priorSetId: string, versionId: string) {
    return this.http.get<SyntheticResearchEnvelope<PriorVersion>>(
      `${BASE}/priors/${id(priorSetId)}/versions/${id(versionId)}`,
      this.requestConfig,
    );
  }
  activatePriorVersion(
    priorSetId: string,
    versionId: string,
    options: SyntheticResearchRequestOptions,
  ) {
    return this.http.post<SyntheticResearchEnvelope<PriorVersion>>(
      `${BASE}/priors/${id(priorSetId)}/versions/${id(versionId)}/activate`,
      {},
      this.mutationConfig(options),
    );
  }

  listPopulations(options?: SyntheticResearchListOptions) {
    return this.http.get<SyntheticResearchPage<SyntheticPopulation>>(
      `${BASE}/populations${query(options)}`,
      this.requestConfig,
    );
  }
  createPopulation(
    payload: SyntheticResearchPayload,
    options: SyntheticResearchRequestOptions,
  ) {
    return this.http.post<SyntheticResearchEnvelope<SyntheticPopulation>>(
      `${BASE}/populations`,
      payload,
      this.mutationConfig(options),
    );
  }
  previewPopulation(
    payload: SyntheticResearchPayload,
    options: SyntheticResearchRequestOptions,
  ) {
    return this.http.post<SyntheticResearchEnvelope<SyntheticResearchPayload>>(
      `${BASE}/populations/preview`,
      payload,
      this.mutationConfig(options),
    );
  }
  getPopulation(populationId: string) {
    return this.http.get<SyntheticResearchEnvelope<SyntheticPopulation>>(
      `${BASE}/populations/${id(populationId)}`,
      this.requestConfig,
    );
  }
  updatePopulation(
    populationId: string,
    payload: SyntheticResearchPayload,
    options: SyntheticResearchRequestOptions,
  ) {
    return this.http.patch<SyntheticResearchEnvelope<SyntheticPopulation>>(
      `${BASE}/populations/${id(populationId)}`,
      payload,
      this.mutationConfig(options),
    );
  }
  archivePopulation(
    populationId: string,
    options: SyntheticResearchRequestOptions,
  ) {
    return this.http.delete<SyntheticResearchEnvelope<SyntheticPopulation>>(
      `${BASE}/populations/${id(populationId)}`,
      this.mutationConfig(options),
    );
  }
  populationAction(
    populationId: string,
    action: "preview" | "build" | "activate" | "waive",
    payload: SyntheticResearchPayload,
    options: SyntheticResearchRequestOptions,
  ) {
    return this.http.post<SyntheticResearchEnvelope<SyntheticResearchPayload>>(
      `${BASE}/populations/${id(populationId)}/${action}`,
      payload,
      this.mutationConfig(options),
    );
  }
  listPopulationMembers(
    populationId: string,
    options?: SyntheticResearchListOptions,
  ) {
    return this.http.get<SyntheticResearchPage<SyntheticPopulationMember>>(
      `${BASE}/populations/${id(populationId)}/members${query(options)}`,
      this.requestConfig,
    );
  }
  getPopulationDiagnostics(populationId: string) {
    return this.http.get<SyntheticResearchEnvelope<SyntheticResearchPayload>>(
      `${BASE}/populations/${id(populationId)}/diagnostics`,
      this.requestConfig,
    );
  }
  listPopulationVersions(populationId: string) {
    return this.http.get<SyntheticResearchEnvelope<SyntheticResearchPayload[]>>(
      `${BASE}/populations/${id(populationId)}/versions`,
      this.requestConfig,
    );
  }
  clonePopulationVersion(
    populationId: string,
    payload: SyntheticResearchPayload,
    options: SyntheticResearchRequestOptions,
  ) {
    return this.http.post<SyntheticResearchEnvelope<SyntheticPopulation>>(
      `${BASE}/populations/${id(populationId)}/clone-version`,
      payload,
      this.mutationConfig(options),
    );
  }

  previewCohortResolution(
    payload: SyntheticResearchPayload,
    options: SyntheticResearchRequestOptions,
  ) {
    return this.http.post<SyntheticResearchEnvelope<SyntheticResearchPayload>>(
      `${BASE}/cohorts/resolve-preview`,
      payload,
      this.mutationConfig(options),
    );
  }
  resolveCohort(
    payload: SyntheticResearchPayload,
    options: SyntheticResearchRequestOptions,
  ) {
    return this.http.post<SyntheticResearchEnvelope<SyntheticResearchPayload>>(
      `${BASE}/cohorts/resolve`,
      payload,
      this.mutationConfig(options),
    );
  }
  getCohortResolution(jobId: string) {
    return this.http.get<SyntheticResearchEnvelope<SyntheticResearchPayload>>(
      `${BASE}/cohorts/resolve/${id(jobId)}`,
      this.requestConfig,
    );
  }
  createNamedCohort(
    payload: SyntheticResearchPayload,
    options: SyntheticResearchRequestOptions,
  ) {
    return this.http.post<SyntheticResearchEnvelope<SyntheticPopulation>>(
      `${BASE}/named-cohorts`,
      payload,
      this.mutationConfig(options),
    );
  }
  getNamedCohort(populationId: string) {
    return this.http.get<SyntheticResearchEnvelope<SyntheticPopulation>>(
      `${BASE}/named-cohorts/${id(populationId)}`,
      this.requestConfig,
    );
  }
  listIdentityReviews(options?: SyntheticResearchListOptions) {
    return this.http.get<SyntheticResearchPage<IdentityReview>>(
      `${BASE}/identity-reviews${query(options)}`,
      this.requestConfig,
    );
  }
  getIdentityReview(reviewId: string) {
    return this.http.get<SyntheticResearchEnvelope<IdentityReview>>(
      `${BASE}/identity-reviews/${id(reviewId)}`,
      this.requestConfig,
    );
  }
  decideIdentityReview(
    reviewId: string,
    payload: SyntheticResearchPayload,
    options: SyntheticResearchRequestOptions,
  ) {
    return this.http.post<SyntheticResearchEnvelope<IdentityReview>>(
      `${BASE}/identity-reviews/${id(reviewId)}/decision`,
      payload,
      this.mutationConfig(options),
    );
  }
  bulkDecideIdentityReviews(
    payload: SyntheticResearchPayload,
    options: SyntheticResearchRequestOptions,
  ) {
    return this.http.post<SyntheticResearchEnvelope<IdentityReview[]>>(
      `${BASE}/identity-reviews/bulk-decision`,
      payload,
      this.mutationConfig(options),
    );
  }

  listExpertTwins(options?: SyntheticResearchListOptions) {
    return this.http.get<SyntheticResearchPage<ExpertTwin>>(
      `${BASE}/expert-twins${query(options)}`,
      this.requestConfig,
    );
  }
  createExpertTwin(
    payload: SyntheticResearchPayload,
    options: SyntheticResearchRequestOptions,
  ) {
    return this.http.post<SyntheticResearchEnvelope<ExpertTwin>>(
      `${BASE}/expert-twins`,
      payload,
      this.mutationConfig(options),
    );
  }
  getExpertTwin(expertTwinId: string, requestId?: string) {
    return this.http.get<SyntheticResearchEnvelope<ExpertTwin>>(
      `${BASE}/expert-twins/${id(expertTwinId)}`,
      this.getConfig(requestId),
    );
  }
  getPersona(personaVersionId: string, requestId?: string) {
    return this.http.get<SyntheticResearchEnvelope<SyntheticPersona>>(
      `${BASE}/personas/${id(personaVersionId)}`,
      this.getConfig(requestId),
    );
  }
  getPersonaEvidence(personaVersionId: string, requestId?: string) {
    return this.http.get<SyntheticResearchEnvelope<SyntheticResearchPayload>>(
      `${BASE}/personas/${id(personaVersionId)}/evidence`,
      this.getConfig(requestId),
    );
  }

  listStudies(options?: SyntheticResearchListOptions) {
    return this.http.get<SyntheticResearchPage<SyntheticStudy>>(
      `${BASE}/studies${query(options)}`,
      this.requestConfig,
    );
  }
  createStudy(
    payload: SyntheticResearchPayload,
    options: SyntheticResearchRequestOptions,
  ) {
    return this.http.post<SyntheticResearchEnvelope<SyntheticStudy>>(
      `${BASE}/studies`,
      payload,
      this.mutationConfig(options),
    );
  }
  getStudy(studyId: string) {
    return this.http.get<SyntheticResearchEnvelope<SyntheticStudy>>(
      `${BASE}/studies/${id(studyId)}`,
      this.requestConfig,
    );
  }
  updateStudy(
    studyId: string,
    payload: SyntheticResearchPayload,
    options: SyntheticResearchRequestOptions,
  ) {
    return this.http.patch<SyntheticResearchEnvelope<SyntheticStudy>>(
      `${BASE}/studies/${id(studyId)}`,
      payload,
      this.mutationConfig(options),
    );
  }
  archiveStudy(studyId: string, options: SyntheticResearchRequestOptions) {
    return this.http.delete<SyntheticResearchEnvelope<SyntheticStudy>>(
      `${BASE}/studies/${id(studyId)}`,
      this.mutationConfig(options),
    );
  }
  getInstrument(studyId: string) {
    return this.http.get<SyntheticResearchEnvelope<StudyInstrument>>(
      `${BASE}/studies/${id(studyId)}/instrument`,
      this.requestConfig,
    );
  }
  putInstrument(
    studyId: string,
    payload: SyntheticResearchPayload,
    options: SyntheticResearchRequestOptions,
  ) {
    return this.http.put<SyntheticResearchEnvelope<StudyInstrument>>(
      `${BASE}/studies/${id(studyId)}/instrument`,
      payload,
      this.mutationConfig(options),
    );
  }
  validateInstrument(
    studyId: string,
    payload: SyntheticResearchPayload,
    options: SyntheticResearchRequestOptions,
  ) {
    return this.http.post<SyntheticResearchEnvelope<SyntheticResearchPayload>>(
      `${BASE}/studies/${id(studyId)}/instrument/validate`,
      payload,
      this.mutationConfig(options),
    );
  }
  publishInstrument(
    studyId: string,
    payload: SyntheticResearchPayload,
    options: SyntheticResearchRequestOptions,
  ) {
    return this.http.post<SyntheticResearchEnvelope<StudyInstrument>>(
      `${BASE}/studies/${id(studyId)}/instrument/publish`,
      payload,
      this.mutationConfig(options),
    );
  }
  preflightStudy(
    studyId: string,
    payload: SyntheticResearchPayload,
    options: SyntheticResearchRequestOptions,
  ) {
    return this.http.post<SyntheticResearchEnvelope<SyntheticResearchPayload>>(
      `${BASE}/studies/${id(studyId)}/preflight`,
      payload,
      this.mutationConfig(options),
    );
  }
  createStudyRun(
    studyId: string,
    payload: SyntheticResearchPayload,
    options: SyntheticResearchRequestOptions,
  ) {
    return this.http.post<SyntheticResearchEnvelope<SyntheticStudyRun>>(
      `${BASE}/studies/${id(studyId)}/runs`,
      payload,
      this.mutationConfig(options),
    );
  }
  getRun(runId: string) {
    return this.http.get<SyntheticResearchEnvelope<SyntheticStudyRun>>(
      `${BASE}/runs/${id(runId)}`,
      this.requestConfig,
    );
  }
  runAction(
    runId: string,
    action: "pause" | "resume" | "cancel" | "retry-failures" | "analysis",
    payload: SyntheticResearchPayload,
    options: SyntheticResearchRequestOptions,
  ) {
    return this.http.post<SyntheticResearchEnvelope<SyntheticStudyRun>>(
      `${BASE}/runs/${id(runId)}/${action}`,
      payload,
      this.mutationConfig(options),
    );
  }
  listAnswers(runId: string, options?: SyntheticResearchListOptions) {
    return this.http.get<SyntheticResearchPage<SyntheticAnswer>>(
      `${BASE}/runs/${id(runId)}/answers${query(options)}`,
      this.requestConfig,
    );
  }
  getResultsOverview(runId: string) {
    return this.http.get<SyntheticResearchEnvelope<SyntheticResearchPayload>>(
      `${BASE}/runs/${id(runId)}/results/overview`,
      this.requestConfig,
    );
  }
  getQuestionResults(runId: string, questionId: string) {
    return this.http.get<SyntheticResearchEnvelope<SyntheticResearchPayload>>(
      `${BASE}/runs/${id(runId)}/results/questions/${id(questionId)}`,
      this.requestConfig,
    );
  }
  getResultThemes(runId: string, requestId?: string) {
    return this.http.get<SyntheticResearchEnvelope<SyntheticResearchPayload>>(
      `${BASE}/runs/${id(runId)}/results/themes`,
      this.getConfig(requestId),
    );
  }
  createResultsCrosstab(
    runId: string,
    payload: SyntheticResearchPayload,
    options: SyntheticResearchReadOptions = {},
  ) {
    return this.http.post<SyntheticResearchEnvelope<SyntheticResearchPayload>>(
      `${BASE}/runs/${id(runId)}/results/crosstab`,
      payload,
      this.getConfig(options.requestId),
    );
  }
  getMethodology(runId: string) {
    return this.http.get<SyntheticResearchEnvelope<SyntheticResearchPayload>>(
      `${BASE}/runs/${id(runId)}/methodology`,
      this.requestConfig,
    );
  }
  createExport(
    runId: string,
    payload: SyntheticResearchPayload,
    options: SyntheticResearchRequestOptions,
  ) {
    return this.http.post<SyntheticResearchEnvelope<SyntheticResearchReport>>(
      `${BASE}/runs/${id(runId)}/exports`,
      payload,
      this.mutationConfig(options),
    );
  }

  getCalibration(calibrationId: string, requestId?: string) {
    return this.http.get<SyntheticResearchEnvelope<CalibrationResult>>(
      `${BASE}/calibrations/${id(calibrationId)}`,
      this.getConfig(requestId),
    );
  }
  getValidation(validationId: string, requestId?: string) {
    return this.http.get<SyntheticResearchEnvelope<ValidationResult>>(
      `${BASE}/validations/${id(validationId)}`,
      this.getConfig(requestId),
    );
  }
  listConsents(options?: SyntheticResearchListOptions) {
    return this.http.get<SyntheticResearchPage<ConsentRecord>>(
      `${BASE}/consents${query(options)}`,
      this.requestConfig,
    );
  }
  withdrawConsent(
    consentId: string,
    payload: SyntheticResearchPayload,
    options: SyntheticResearchRequestOptions,
  ) {
    return this.http.post<SyntheticResearchEnvelope<ConsentRecord>>(
      `${BASE}/consents/${id(consentId)}/withdraw`,
      payload,
      this.mutationConfig(options),
    );
  }
  estimateCost(
    payload: SyntheticResearchPayload,
    options: SyntheticResearchReadOptions = {},
  ) {
    return this.http.post<SyntheticResearchEnvelope<SyntheticResearchPayload>>(
      `${BASE}/cost-estimates`,
      payload,
      this.getConfig(options.requestId),
    );
  }
  discoverEvidence(
    payload: SyntheticResearchPayload,
    options: SyntheticResearchRequestOptions,
  ) {
    return this.http.post<
      SyntheticResearchEnvelope<EvidenceDiscoveryCandidate[]>
    >(`${BASE}/evidence-discovery`, payload, this.mutationConfig(options));
  }
  approveEvidenceCandidate(
    candidateId: string,
    payload: SyntheticResearchPayload,
    options: SyntheticResearchRequestOptions,
  ) {
    return this.http.post<
      SyntheticResearchEnvelope<EvidenceDiscoveryCandidate>
    >(
      `${BASE}/evidence-discovery/${id(candidateId)}/approve`,
      payload,
      this.mutationConfig(options),
    );
  }
  ingestEvidenceApproval(
    approvalId: string,
    payload: SyntheticResearchPayload,
    options: SyntheticResearchRequestOptions,
  ) {
    return this.http.post<SyntheticResearchEnvelope<SyntheticResearchPayload>>(
      `${BASE}/evidence-discovery/approvals/${id(approvalId)}/ingest`,
      payload,
      this.mutationConfig(options),
    );
  }
  getGovernance(requestId?: string) {
    return this.http.get<SyntheticResearchEnvelope<SyntheticResearchPayload>>(
      `${BASE}/governance`,
      this.getConfig(requestId),
    );
  }
  getPilotWorkspace(requestId?: string) {
    return this.http.get<SyntheticResearchEnvelope<SyntheticResearchPayload>>(
      `${BASE}/pilot/workspace`,
      this.getConfig(requestId),
    );
  }
  listReports(options?: SyntheticResearchListOptions) {
    return this.http.get<SyntheticResearchPage<SyntheticResearchReport>>(
      `${BASE}/reports${query(options)}`,
      this.requestConfig,
    );
  }
  getReport(reportId: string, requestId?: string) {
    return this.http.get<SyntheticResearchEnvelope<SyntheticResearchReport>>(
      `${BASE}/reports/${id(reportId)}`,
      this.getConfig(requestId),
    );
  }
  updateReport(
    reportId: string,
    payload: SyntheticResearchPayload,
    options: SyntheticResearchRequestOptions,
  ) {
    return this.http.patch<SyntheticResearchEnvelope<SyntheticResearchReport>>(
      `${BASE}/reports/${id(reportId)}`,
      payload,
      this.mutationConfig(options),
    );
  }
  listReportShares(options?: SyntheticResearchListOptions) {
    return this.http.get<SyntheticResearchPage<ReportShare>>(
      `${BASE}/report-shares${query(options)}`,
      this.requestConfig,
    );
  }
  createReportShare(
    payload: SyntheticResearchPayload,
    options: SyntheticResearchRequestOptions,
  ) {
    return this.http.post<SyntheticResearchEnvelope<ReportShare>>(
      `${BASE}/report-shares`,
      payload,
      this.mutationConfig(options),
    );
  }
  revokeReportShare(shareId: string, options: SyntheticResearchRequestOptions) {
    return this.http.post<SyntheticResearchEnvelope<ReportShare>>(
      `${BASE}/report-shares/${id(shareId)}/revoke`,
      {},
      this.mutationConfig(options),
    );
  }
  getSettings(requestId?: string) {
    return this.http.get<SyntheticResearchEnvelope<SyntheticResearchSettings>>(
      `${BASE}/settings`,
      this.getConfig(requestId),
    );
  }
  updateSettings(
    section: string,
    payload: SyntheticResearchPayload,
    options: SyntheticResearchRequestOptions,
  ) {
    return this.http.put<SyntheticResearchEnvelope<SyntheticResearchSettings>>(
      `${BASE}/settings/${id(section)}`,
      payload,
      this.mutationConfig(options),
    );
  }
}
