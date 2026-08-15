import { describe, expect, it } from "vitest";
import { createPaidRadar } from "../src/paid.js";
import { PAY_TO } from "../src/payto.js";
import { TOOL_NAME } from "../src/discovery.js";
import { forbiddenFacilitator } from "./support.js";

describe("unpaid github_bounty_radar", () => {
  it("returns isError PaymentRequired and does not call GitHub", async () => {
    let githubCalls = 0;
    const { callTool } = await createPaidRadar({
      facilitator: forbiddenFacilitator(),
      radar: async () => {
        githubCalls += 1;
        throw new Error("github must not run on unpaid calls");
      },
    });

    const result = await callTool({}, { _meta: {} });

    expect(githubCalls).toBe(0);
    expect(result.isError).toBe(true);
    const structured = result.structuredContent as { error?: string; accepts?: Array<{ payTo?: string; network?: string }> } | undefined;
    expect(structured?.accepts?.length).toBeGreaterThan(0);
    expect(structured?.accepts?.[0]?.payTo?.toLowerCase()).toBe(PAY_TO.toLowerCase());
    expect(structured?.accepts?.[0]?.network).toBe("eip155:8453");
    const text = result.content[0]?.text ?? "";
    expect(text).toMatch(/Payment required/i);
    expect(JSON.stringify(result)).not.toContain("github must not run");
    expect(text).toContain(TOOL_NAME);
  });
});
