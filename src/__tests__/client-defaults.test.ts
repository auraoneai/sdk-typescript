// PR-19 T-P0-13: no unsafe defaults. A client with no credential cannot be
// constructed, so no request can go out unauthenticated or with a guessed org.
import { AuraClient } from "../client";
import { AuraOneClient } from "../client/AuraOneClient";

describe("SDK client defaults (PR-19 T-P0-13)", () => {
  const savedKey = process.env.AURAONE_API_KEY;
  const savedLegacyKey = process.env.AURA_API_KEY;

  beforeEach(() => {
    delete process.env.AURAONE_API_KEY;
    delete process.env.AURA_API_KEY;
  });

  afterAll(() => {
    if (savedKey === undefined) delete process.env.AURAONE_API_KEY;
    else process.env.AURAONE_API_KEY = savedKey;
    if (savedLegacyKey === undefined) delete process.env.AURA_API_KEY;
    else process.env.AURA_API_KEY = savedLegacyKey;
  });

  it("new AuraOneClient({}) throws without a credential", () => {
    expect(() => new AuraOneClient({})).toThrow(/requires apiKey or accessToken/u);
  });

  it("new AuraOneClient() with no argument throws", () => {
    expect(() => new AuraOneClient()).toThrow(/requires apiKey or accessToken/u);
  });

  it("the AuraClient wrapper throws without a credential", () => {
    expect(() => new AuraClient()).toThrow(/requires apiKey or accessToken/u);
  });

  it("an empty-string apiKey is not a credential", () => {
    expect(() => new AuraOneClient({ apiKey: "" })).toThrow(/requires apiKey or accessToken/u);
  });
});
