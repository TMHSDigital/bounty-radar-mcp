import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { TOOL_DESCRIPTION, TOOL_NAME } from "./discovery.js";
import { createPaidRadar, type PaidRadarOptions } from "./paid.js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function readVersion(): string {
  const pkgPath = join(dirname(fileURLToPath(import.meta.url)), "..", "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version: string };
  return pkg.version;
}

export async function createMcpServer(options: PaidRadarOptions = {}): Promise<McpServer> {
  const { callTool } = await createPaidRadar(options);
  const server = new McpServer({ name: "bounty-radar-mcp", version: readVersion() });
  server.registerTool(
    TOOL_NAME,
    {
      description: TOOL_DESCRIPTION,
      inputSchema: {
        minUsd: z.number().optional(),
        q: z.string().optional(),
      },
    },
    callTool,
  );
  return server;
}
