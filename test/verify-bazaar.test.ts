import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PAY_TO } from "../src/payto.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("verify-bazaar script", () => {
  const src = readFileSync(join(root, "scripts", "verify-bazaar.ts"), "utf8");

  it("calls listX402DiscoveryMerchant from the CDP SDK root with the canonical payTo", () => {
    expect(src).toContain('from "@coinbase/cdp-sdk"');
    expect(src).toContain("listX402DiscoveryMerchant");
    expect(src).toContain("payTo: PAY_TO");
    expect(src).not.toContain(PAY_TO);
    expect(src).not.toContain("@coinbase/cdp-sdk/x402");
    expect(src).not.toContain("CDP_WALLET_SECRET");
    expect(src).not.toContain("createX402Server");
  });
});

describe("DEPLOY.md", () => {
  const src = readFileSync(join(root, "docs", "DEPLOY.md"), "utf8");

  it("states the self-pay failure and dashboard-only credentials", () => {
    expect(src).toContain("self_send_not_allowed");
    expect(src).toContain("Never pass them as Docker build args");
    expect(src).toContain("non-treasury");
    expect(src).not.toContain("CDP_WALLET_SECRET");
    expect(src).toContain("PAY_TO");
    expect(src).toContain("src/payto.ts");
    expect(src).not.toContain(PAY_TO);
  });
});
