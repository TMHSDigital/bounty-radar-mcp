import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PAY_TO } from "../src/payto.js";
import {
  assertBuyerNotTreasury,
  loadBuyer,
  parsePingArgs,
  resolveBuyerJsonPath,
} from "../scripts/ping-mcp.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const siblingPat = new RegExp("money[-_]agen[t]", "i");
const drivePat = /(^|[^A-Za-z0-9])[A-Za-z]:[\\/]/;

describe("ping-mcp helpers", () => {
  it("refuses the canonical payTo as the buyer", () => {
    expect(() => assertBuyerNotTreasury(PAY_TO)).toThrow(/self_send_not_allowed/);
    expect(() =>
      assertBuyerNotTreasury("0x2222222222222222222222222222222222222222"),
    ).not.toThrow();
  });

  it("requires BUYER_JSON and does not invent a path", () => {
    expect(() => resolveBuyerJsonPath({})).toThrow(/BUYER_JSON is required/);
    expect(resolveBuyerJsonPath({ BUYER_JSON: "buyer.json" })).toBe("buyer.json");
  });

  it("loads address and privateKey without extra fields", () => {
    const buyer = loadBuyer(
      JSON.stringify({ address: "0x2222222222222222222222222222222222222222", privateKey: "0xab" }),
    );
    expect(buyer.address).toBe("0x2222222222222222222222222222222222222222");
    expect(buyer.privateKey).toBe("0xab");
  });

  it("parses --unpaid and origin from argv or MCP_ORIGIN", () => {
    expect(parsePingArgs(["--unpaid", "https://example.example"], {})).toEqual({
      unpaid: true,
      origin: "https://example.example",
    });
    expect(parsePingArgs([], { MCP_ORIGIN: "https://example.example/" })).toEqual({
      unpaid: false,
      origin: "https://example.example",
    });
    expect(() => parsePingArgs([], {})).toThrow(/MCP_ORIGIN/);
  });
});

describe("ping-mcp source contract", () => {
  const src = readFileSync(join(root, "scripts", "ping-mcp.ts"), "utf8");
  const ci = readFileSync(join(root, ".github", "workflows", "ci.yml"), "utf8");

  it("uses the x402 MCP factory and canonical payTo import", () => {
    expect(src).toContain("createx402MCPClient");
    expect(src).toContain('from "@x402/mcp"');
    expect(src).toContain("assertBuyerNotTreasury");
    expect(src).toContain('from "../src/payto.js"');
    expect(src).toContain("PAY_TO");
    expect(src).not.toContain(PAY_TO);
    expect(src).not.toContain("@coinbase/cdp-sdk/x402");
    expect(src).not.toContain("CDP_WALLET_SECRET");
    expect(src).not.toContain("WALLET_JSON");
    expect(src).not.toContain("createChannel");
    expect(src).toContain("BUYER_JSON");
    expect(src).toContain("MCP_ORIGIN");
    expect(src).toContain("--unpaid");
    expect(src).not.toMatch(drivePat);
    expect(src).not.toMatch(siblingPat);
  });

  it("keeps the sibling-name split pattern in CI", () => {
    expect(ci).toContain("money[-_]agen[t]");
    expect(ci).not.toMatch(siblingPat);
  });
});
