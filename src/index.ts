#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { createServer } from "./server.js";

export { fetchRadar, filterRadar, parseReward, runRadar } from "./radar.js";
export { createMcpServer } from "./mcp.js";
export { PAY_TO, NETWORK, assertCanonicalPayTo } from "./payto.js";

const DEFAULT_PORT = 3000;

export function listenPort(): number {
  const raw = process.env.PORT;
  if (raw === undefined || raw === "") {
    return DEFAULT_PORT;
  }
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer in 1..65535");
  }
  return port;
}

async function main(): Promise<void> {
  const port = listenPort();
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "0.0.0.0", () => resolve());
  });
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  main().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
