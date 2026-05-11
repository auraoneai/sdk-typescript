import { BaseCallbackHandler } from "langchain/callbacks";
import type { ChainValues } from "langchain/schema";

export type AuraOneTrace = {
  runId: string;
  startTime: number;
  endTime?: number;
  inputs?: ChainValues;
  outputs?: ChainValues;
  model?: string;
  error?: string;
};

export type AuraOneCallbackOptions = {
  onTrace?: (trace: AuraOneTrace) => void;
};

export class AuraOneLangChainHandler extends BaseCallbackHandler {
  name = "AuraOneCallbackHandler";
  constructor(options?: AuraOneCallbackOptions) {
    super();
    this.onTrace = options?.onTrace;
  }
  get lc_namespace(): ["langchain_core", "callbacks", string] {
    return ["langchain_core", "callbacks", "auraone"];
  }
  get lc_secrets() {
    return undefined;
  }
  get lc_attributes() {
    return undefined;
  }
  private readonly onTrace?: (trace: AuraOneTrace) => void;
  private current?: AuraOneTrace;

  handleChainStart(_chain: unknown, inputs: ChainValues): void {
    this.current = {
      runId: crypto.randomUUID(),
      startTime: Date.now(),
      inputs,
    };
  }

  handleChainError(err: unknown): void {
    if (!this.current) return;
    this.current.error = err instanceof Error ? err.message : String(err);
    this.current.endTime = Date.now();
    this.flush();
  }

  handleChainEnd(outputs: ChainValues): void {
    if (!this.current) return;
    this.current.outputs = outputs;
    this.current.endTime = Date.now();
    this.flush();
  }

  private flush(): void {
    if (this.current && this.onTrace) {
      this.onTrace(this.current);
    }
    this.current = undefined;
  }
}

