export type WorkforceJob = {
  id: string;
  data: unknown;
  modelConfidence?: number;
  driftScore?: number;
  createdAt: number;
};

export type PrioritizedJob = WorkforceJob & { priority: number };

export type SLAStatus = 'on_track' | 'warning' | 'breached';

export type SLAConfig = {
  warningThresholdMs: number;
  breachThresholdMs: number;
  penaltyPerMinUsd: number;
  rewardOnTimeUsd: number;
};
