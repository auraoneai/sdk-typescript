export type LabDomain = 'health' | 'finance' | 'av' | 'manufacturing';

export type LabBundleStatus = 'draft' | 'provisioning' | 'ready' | 'failed';

export type LabBundlePolicies = {
  costCeilingUsd: number;
  latencyP95Ms: number;
  qualityMinScore: number;
  biasMaxDelta: number;
  compliance?: string[];
};

export type LabBundle = {
  id: string;
  orgId: string;
  name: string;
  domain: LabDomain;
  templateId?: string;
  status: LabBundleStatus;
  policies: LabBundlePolicies;
  createdAt?: string;
  updatedAt?: string;
};

export type AgentEvalRun = {
  id: string;
  status: 'created' | 'running' | 'completed' | 'failed';
  result?: { role: string; content: string };
};
