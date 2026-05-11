import { AuraOneLangChainHandler } from "../../src/plugins/langchain";

describe("AuraOneLangChainHandler", () => {
  it("emits trace on end", () => {
    const traces: any[] = [];
    const handler = new AuraOneLangChainHandler({
      onTrace: (t) => traces.push(t),
    });

    handler.handleChainStart({}, { input: "hi" });
    handler.handleChainEnd({ output: "bye" });

    expect(traces).toHaveLength(1);
    expect(traces[0].outputs).toEqual({ output: "bye" });
  });

  it("captures errors", () => {
    const traces: any[] = [];
    const handler = new AuraOneLangChainHandler({
      onTrace: (t) => traces.push(t),
    });

    handler.handleChainStart({}, { input: "hi" });
    handler.handleChainError(new Error("fail"));

    expect(traces[0].error).toBe("fail");
  });
});

