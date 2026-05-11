export type DPSpec = {
  epsilon: number;
  mechanism: 'laplace' | 'gaussian' | 'exponential';
};

export type StyleProfile = {
  id: string;
  tone: 'formal' | 'casual' | 'technical' | 'creative';
  structure: 'paragraph' | 'bullet-points' | 'dialogue';
  complexityLevel: number;
};

export type UtilityScore = {
  overall: number;
  fidelity: number;
  diversity: number;
};

export type SyntheticGenerateResponse = {
  records: Array<Record<string, unknown>>;
  prompt: string;
  utility: UtilityScore;
  privacy: { budgetUsed: number; privacyLevel: string };
};
