import { AuraOneLlamaIndexHook } from "../../src/plugins/llamaindex";

describe("AuraOneLlamaIndexHook", () => {
  it("emits start and end events", () => {
    const events: any[] = [];
    const hook = new AuraOneLlamaIndexHook({ onEvent: (e) => events.push(e) });
    const id = hook.onStart({ doc: "x" });
    hook.onEnd(id, { result: "ok" });

    expect(events[0].type).toBe("start");
    expect(events[1].type).toBe("end");
    expect(events[1].id).toBe(id);
  });

  it("emits error events", () => {
    const events: any[] = [];
    const hook = new AuraOneLlamaIndexHook({ onEvent: (e) => events.push(e) });
    const id = hook.onStart();
    hook.onError(id, "boom");
    expect(events.some((e) => e.type === "error")).toBe(true);
  });
});

