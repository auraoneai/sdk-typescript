export type LlamaIndexEvent =
  | { type: "start"; id: string; ts: number; metadata?: Record<string, unknown> }
  | { type: "end"; id: string; ts: number; output?: unknown }
  | { type: "error"; id: string; ts: number; error: string };

export type LlamaIndexHookOptions = {
  onEvent?: (event: LlamaIndexEvent) => void;
};

export class AuraOneLlamaIndexHook {
  private readonly onEvent?: (event: LlamaIndexEvent) => void;

  constructor(options?: LlamaIndexHookOptions) {
    this.onEvent = options?.onEvent;
  }

  onStart(metadata?: Record<string, unknown>): string {
    const id = crypto.randomUUID();
    this.emit({ type: "start", id, ts: Date.now(), metadata });
    return id;
  }

  onEnd(id: string, output?: unknown): void {
    this.emit({ type: "end", id, ts: Date.now(), output });
  }

  onError(id: string, error: unknown): void {
    this.emit({
      type: "error",
      id,
      ts: Date.now(),
      error: error instanceof Error ? error.message : String(error),
    });
  }

  private emit(event: LlamaIndexEvent): void {
    this.onEvent?.(event);
  }
}

