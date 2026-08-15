import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createServer } from "../src/server.js";
import { forbiddenFacilitator } from "./support.js";
import { PAY_TO } from "../src/payto.js";
import { TOOL_NAME } from "../src/discovery.js";

const ACCEPT = "application/json, text/event-stream";

describe("Streamable HTTP transport", () => {
  let server: Server | undefined;
  const logs: string[] = [];

  afterEach(async () => {
    logs.length = 0;
    if (!server) {
      return;
    }
    const closing = server;
    server = undefined;
    await new Promise<void>((resolve, reject) => {
      closing.close((err) => (err ? reject(err) : resolve()));
    });
  });

  async function start(): Promise<number> {
    let githubCalls = 0;
    server = createServer({
      facilitator: forbiddenFacilitator(),
      radar: async () => {
        githubCalls += 1;
        throw new Error("github must not run on unpaid calls");
      },
      log: (line) => logs.push(line),
    });
    (server as Server & { githubCalls?: () => number }).githubCalls = () => githubCalls;
    await new Promise<void>((resolve) => {
      server!.listen(0, "127.0.0.1", () => resolve());
    });
    return (server.address() as AddressInfo).port;
  }

  function githubCalls(): number {
    return ((server as Server & { githubCalls?: () => number }).githubCalls ?? (() => -1))();
  }

  it("honors X-Forwarded-Proto so logs show https", async () => {
    const port = await start();
    const res = await fetch(`http://127.0.0.1:${port}/health`, {
      headers: { "x-forwarded-proto": "https" },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(logs.some((line) => line === "GET /health 200 https")).toBe(true);
  });

  it("does not log request headers", async () => {
    const port = await start();
    await fetch(`http://127.0.0.1:${port}/health`, {
      headers: { authorization: "secret-value", cookie: "secret-value" },
    });
    expect(logs.join("\n")).not.toContain("secret-value");
  });

  it("initializes a Streamable HTTP session over POST /mcp", async () => {
    const port = await start();
    const res = await fetch(`http://127.0.0.1:${port}/mcp`, {
      method: "POST",
      headers: {
        accept: ACCEPT,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name: "transport-test", version: "0.0.0" },
        },
      }),
    });
    expect(res.status).toBe(200);
    const sessionId = res.headers.get("mcp-session-id");
    expect(sessionId).toBeTruthy();
    const body = (await res.json()) as {
      result?: { serverInfo?: { name?: string }; protocolVersion?: string };
    };
    expect(body.result?.serverInfo?.name).toBe("bounty-radar-mcp");
  });

  it("returns PaymentRequired on unpaid tools/call with no GitHub fetch", async () => {
    const port = await start();
    const init = await fetch(`http://127.0.0.1:${port}/mcp`, {
      method: "POST",
      headers: {
        accept: ACCEPT,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name: "transport-test", version: "0.0.0" },
        },
      }),
    });
    const sessionId = init.headers.get("mcp-session-id");
    expect(sessionId).toBeTruthy();
    await init.json();

    const call = await fetch(`http://127.0.0.1:${port}/mcp`, {
      method: "POST",
      headers: {
        accept: ACCEPT,
        "content-type": "application/json",
        "mcp-session-id": sessionId as string,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: TOOL_NAME,
          arguments: {},
        },
      }),
    });
    expect(call.status).toBe(200);
    const payload = (await call.json()) as {
      result?: {
        isError?: boolean;
        content?: Array<{ text?: string }>;
        structuredContent?: { accepts?: Array<{ payTo?: string; network?: string }> };
      };
    };
    expect(payload.result?.isError).toBe(true);
    expect(payload.result?.structuredContent?.accepts?.[0]?.payTo?.toLowerCase()).toBe(
      PAY_TO.toLowerCase(),
    );
    expect(payload.result?.structuredContent?.accepts?.[0]?.network).toBe("eip155:8453");
    expect(payload.result?.content?.[0]?.text ?? "").toMatch(/Payment required/i);
    expect(githubCalls()).toBe(0);
    expect(JSON.stringify(payload)).not.toContain("github must not run");
  });
});

describe("Dockerfile", () => {
  const dockerfile = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "..", "Dockerfile"),
    "utf8",
  );

  it("runs as non-root node user and does not bake credentials", () => {
    expect(dockerfile).toMatch(/^USER node$/m);
    expect(dockerfile).not.toMatch(/^USER root$/m);
    expect(dockerfile).not.toMatch(/CDP_API_KEY/);
    expect(dockerfile).not.toMatch(/GITHUB_TOKEN/);
    expect(dockerfile).not.toMatch(/ARG /);
  });
});
