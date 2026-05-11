import { AuraOneClient } from "./client/AuraOneClient";
import {
  EvaluationStatus,
  EvaluationConfig,
  EvaluationResult,
  Template,
  RewardSpec,
  CreateEvaluationRequest,
} from "./services/EvaluationsService";

export {
  EvaluationStatus,
  EvaluationConfig,
  EvaluationResult,
  Template,
  RewardSpec,
  CreateEvaluationRequest,
};

export interface AuraClientOptions {
  apiKey?: string;
  baseUrl?: string;
  orgId?: string;
  timeout?: number;
  retryAttempts?: number;
}

export class AuraError extends Error {}

export class AuraClient extends AuraOneClient {
  constructor(options: AuraClientOptions = {}) {
    super({
      apiKey: options.apiKey,
      baseUrl: options.baseUrl,
      orgId: options.orgId,
      timeout: options.timeout,
      retries: options.retryAttempts,
    });
  }

  async evaluate(
    templateId: string,
    agentBundleUrl: string,
    options: {
      rewardSpecId?: string;
      config?: EvaluationConfig;
      wait?: boolean;
      timeout?: number;
      idempotencyKey?: string;
    } = {},
  ): Promise<EvaluationResult> {
    return this.evaluations.create({
      template_id: templateId,
      agent_bundle_url: agentBundleUrl,
      reward_spec_id: options.rewardSpecId,
      config: options.config,
      wait: options.wait,
      timeoutSeconds: options.timeout,
      idempotencyKey: options.idempotencyKey,
    });
  }

  async getEvaluation(evaluationId: string): Promise<EvaluationResult> {
    return this.evaluations.get(evaluationId);
  }

  async waitForCompletion(
    evaluationId: string,
    timeoutSeconds: number = 300,
  ): Promise<EvaluationResult> {
    return this.evaluations.waitForCompletion(evaluationId, timeoutSeconds, 1000);
  }

  async cancelEvaluation(evaluationId: string): Promise<EvaluationResult> {
    return this.evaluations.cancel(evaluationId);
  }

  async listTemplates(options?: { domain?: string; page?: number; per_page?: number }): Promise<Template[]> {
    return this.evaluations.listTemplates(options);
  }

  async getTemplate(templateId: string): Promise<Template> {
    return this.evaluations.getTemplate(templateId);
  }

  async createTemplate(template: Omit<Template, "id">): Promise<Template> {
    return this.evaluations.createTemplate(template);
  }

  async compileReward(yamlSpec: string) {
    return this.evaluations.compileReward(yamlSpec);
  }

  async listRewardSpecs(options?: { page?: number; per_page?: number }): Promise<RewardSpec[]> {
    return this.evaluations.listRewardSpecs(options);
  }
}
