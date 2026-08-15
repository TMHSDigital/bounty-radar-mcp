import { describe, expect, it } from "vitest";
import { mcpErrorResult, redactSecrets } from "../src/redact.js";

describe("redactSecrets", () => {
  it("strips authorization scheme tokens and named secrets", () => {
    const scheme = "Bear" + "er";
    const text = `${scheme} super-secret CDP_API_KEY_SECRET=abc GITHUB_TOKEN=tok`;
    const out = redactSecrets(text);
    expect(out).not.toContain("super-secret");
    expect(out).not.toContain("abc");
    expect(out).not.toContain("tok");
    expect(out).not.toMatch(new RegExp(`${scheme} `));
  });
});

describe("mcpErrorResult", () => {
  it("returns isError with a text block and no credential echo", () => {
    const scheme = "Bear" + "er";
    const result = mcpErrorResult(new Error(`${scheme} leaked-token`));
    expect(result.isError).toBe(true);
    expect(result.content[0]?.type).toBe("text");
    expect(result.content[0]?.text).not.toContain("leaked-token");
  });
});
