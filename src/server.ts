import { randomUUID } from "node:crypto";
import http from "node:http";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import type { Express, Request, Response } from "express";
import { createMcpServerFromCallTool } from "./mcp.js";
import { createPaidRadar, type PaidRadarOptions } from "./paid.js";
import { formatRequestLog } from "./request-log.js";

const HEALTH_BODY = { ok: true } as const;
const JSONRPC_INTERNAL = {
  jsonrpc: "2.0",
  error: { code: -32603, message: "Internal error" },
  id: null,
} as const;
const JSONRPC_BAD_SESSION = {
  jsonrpc: "2.0",
  error: { code: -32000, message: "Bad Request: No valid session ID provided" },
  id: null,
} as const;

export type HttpServerOptions = PaidRadarOptions & {
  log?: (line: string) => void;
};

type SessionSlot = {
  transport: StreamableHTTPServerTransport;
};

function mcpSessionId(req: Request): string | undefined {
  const raw = req.headers["mcp-session-id"];
  return typeof raw === "string" && raw.length > 0 ? raw : undefined;
}

export function createApp(options: HttpServerOptions = {}): Express {
  const app = createMcpExpressApp({ host: "0.0.0.0" });
  app.set("trust proxy", true);

  const log = options.log ?? ((line: string) => console.log(line));
  const sessions = new Map<string, SessionSlot>();
  let paidPromise: ReturnType<typeof createPaidRadar> | undefined;

  function getPaid() {
    paidPromise ??= createPaidRadar(options);
    return paidPromise;
  }

  app.use((req, res, next) => {
    res.on("finish", () => {
      log(
        formatRequestLog({
          method: req.method,
          path: req.path,
          status: res.statusCode,
          protocol: req.protocol,
        }),
      );
    });
    next();
  });

  app.get("/health", (_req, res) => {
    res.status(200).json(HEALTH_BODY);
  });

  async function handleInitialize(req: Request, res: Response): Promise<void> {
    const { callTool } = await getPaid();
    const mcp = createMcpServerFromCallTool(callTool);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      enableJsonResponse: true,
      onsessioninitialized: (sessionId) => {
        sessions.set(sessionId, { transport });
      },
    });
    transport.onclose = () => {
      const sessionId = transport.sessionId;
      if (sessionId) {
        sessions.delete(sessionId);
      }
      void mcp.close();
    };
    await mcp.connect(transport);
    await transport.handleRequest(req, res, req.body);
  }

  async function handleMcp(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = mcpSessionId(req);
      if (sessionId) {
        const slot = sessions.get(sessionId);
        if (!slot) {
          res.status(404).json({
            jsonrpc: "2.0",
            error: { code: -32001, message: "Session not found" },
            id: null,
          });
          return;
        }
        await slot.transport.handleRequest(req, res, req.body);
        return;
      }
      if (req.method === "POST" && isInitializeRequest(req.body)) {
        await handleInitialize(req, res);
        return;
      }
      res.status(400).json(JSONRPC_BAD_SESSION);
    } catch {
      if (!res.headersSent) {
        res.status(500).json(JSONRPC_INTERNAL);
      }
    }
  }

  app.post("/mcp", (req, res) => {
    void handleMcp(req, res);
  });
  app.get("/mcp", (req, res) => {
    void handleMcp(req, res);
  });
  app.delete("/mcp", (req, res) => {
    void handleMcp(req, res);
  });

  return app;
}

/** HTTP server: unpaid GET /health plus Streamable HTTP at /mcp. */
export function createServer(options: HttpServerOptions = {}): http.Server {
  return http.createServer(createApp(options));
}
