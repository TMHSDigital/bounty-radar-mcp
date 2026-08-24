#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { createx402MCPClient } from "@x402/mcp";
import { createPublicClient, erc20Abi, formatUnits, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { TOOL_NAME } from "../src/discovery.js";
import { RADAR_PRICE_USD } from "../src/radar.js";
import { NETWORK, PAY_TO, USDC_BASE } from "../src/payto.js";

const PING_NAME = "bounty-radar-mcp-ping";
const BASE_RPC = "https://mainnet.base.org";
const USDC_DECIMALS = 6;

export type BuyerRecord = {
  address: string;
  privateKey: string;
};

export type PingArgs = {
  unpaid: boolean;
  origin: string;
};

export function assertBuyerNotTreasury(address: string): void {
  if (address.toLowerCase() === PAY_TO.toLowerCase()) {
    throw new Error("buyer must not be the canonical payTo (self_send_not_allowed)");
  }
}

export function resolveBuyerJsonPath(env: NodeJS.ProcessEnv = process.env): string {
  const path = env.BUYER_JSON?.trim() ?? "";
  if (path === "") {
    throw new Error("BUYER_JSON is required");
  }
  return path;
}

export function loadBuyer(jsonText: string): BuyerRecord {
  const parsed = JSON.parse(jsonText) as Partial<BuyerRecord>;
  if (typeof parsed.address !== "string" || typeof parsed.privateKey !== "string") {
    throw new Error("buyer JSON must include address and privateKey strings");
  }
  return { address: parsed.address, privateKey: parsed.privateKey };
}

export function parsePingArgs(argv: string[], env: NodeJS.ProcessEnv = process.env): PingArgs {
  const unpaid = argv.includes("--unpaid");
  const positional = argv.filter((arg) => arg !== "--unpaid" && !arg.startsWith("-"));
  const origin = (positional[0] ?? env.MCP_ORIGIN?.trim() ?? "").replace(/\/$/, "");
  if (origin === "") {
    throw new Error("MCP_ORIGIN or a positional origin URL is required");
  }
  return { unpaid, origin };
}

function mcpUrl(origin: string): URL {
  return new URL("mcp", `${origin}/`);
}

function asHexPrivateKey(raw: string): `0x${string}` {
  const value = raw.startsWith("0x") ? raw : `0x${raw}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error("buyer privateKey must be 32-byte hex");
  }
  return value as `0x${string}`;
}

function readPingVersion(): string {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
    version: string;
  };
  return pkg.version;
}

async function readUsdcBalance(address: `0x${string}`): Promise<number> {
  const client = createPublicClient({
    chain: base,
    transport: http(BASE_RPC),
  });
  const raw = await client.readContract({
    address: USDC_BASE,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address],
  });
  return Number(formatUnits(raw, USDC_DECIMALS));
}

function summarizeToolResult(result: {
  isError?: boolean;
  content?: Array<{ type?: string; text?: string }>;
}): { isError: boolean; paymentRequired: boolean } {
  const text = result.content?.map((item) => item.text ?? "").join("\n") ?? "";
  return {
    isError: result.isError === true,
    paymentRequired: /payment required/i.test(text),
  };
}

async function unpaidProbe(origin: string, version: string): Promise<void> {
  const client = new Client({ name: PING_NAME, version });
  const transport = new StreamableHTTPClientTransport(mcpUrl(origin));
  await client.connect(transport);
  try {
    const result = await client.callTool({ name: TOOL_NAME, arguments: {} });
    const summary = summarizeToolResult(result);
    if (!summary.isError || !summary.paymentRequired) {
      throw new Error("unpaid call did not return PaymentRequired");
    }
    console.log(
      JSON.stringify({
        origin,
        unpaid: true,
        isError: true,
        paymentRequired: true,
      }),
    );
  } finally {
    await client.close();
  }
}

async function paidPing(origin: string, version: string): Promise<void> {
  const buyer = loadBuyer(readFileSync(resolveBuyerJsonPath(), "utf8"));
  assertBuyerNotTreasury(buyer.address);
  const address = buyer.address as `0x${string}`;
  const usdc = await readUsdcBalance(address);
  if (!Number.isFinite(usdc) || usdc < RADAR_PRICE_USD) {
    console.log(
      JSON.stringify({
        origin,
        skip: "buyer USDC below price",
        buyer: address,
        usdc: Number.isFinite(usdc) ? usdc : null,
        price: RADAR_PRICE_USD,
      }),
    );
    return;
  }

  const account = privateKeyToAccount(asHexPrivateKey(buyer.privateKey));
  if (account.address.toLowerCase() !== address.toLowerCase()) {
    throw new Error("buyer address does not match privateKey");
  }

  const client = createx402MCPClient({
    name: PING_NAME,
    version,
    schemes: [{ network: NETWORK, client: new ExactEvmScheme(account) }],
    autoPayment: true,
    onPaymentRequested: () => true,
  });
  const transport = new StreamableHTTPClientTransport(mcpUrl(origin));
  await client.connect(transport);
  try {
    const result = await client.callTool(TOOL_NAME, {});
    const transaction =
      result.paymentResponse && "transaction" in result.paymentResponse
        ? result.paymentResponse.transaction
        : undefined;
    if (result.isError || !result.paymentMade) {
      throw new Error("paid call did not settle");
    }
    console.log(
      JSON.stringify({
        origin,
        buyer: address,
        usdc,
        paymentMade: result.paymentMade,
        isError: result.isError === true,
        transaction: transaction ?? null,
      }),
    );
  } finally {
    await client.close();
  }
}

async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const { unpaid, origin } = parsePingArgs(argv);
  const version = readPingVersion();
  if (unpaid) {
    await unpaidProbe(origin, version);
    return;
  }
  await paidPing(origin, version);
}

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  main().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : "ping failed";
    console.error(message);
    process.exit(1);
  });
}
