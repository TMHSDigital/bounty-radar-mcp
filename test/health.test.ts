import { afterEach, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createServer } from "../src/server.js";

describe("GET /health", () => {
  let server: Server | undefined;

  afterEach(async () => {
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
    server = createServer();
    await new Promise<void>((resolve) => {
      server!.listen(0, "127.0.0.1", () => resolve());
    });
    return (server.address() as AddressInfo).port;
  }

  it("returns { ok: true } and no extra fields", async () => {
    const port = await start();
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual({ ok: true });
    expect(Object.keys(body as object)).toEqual(["ok"]);
  });

  it("does not register any MCP tool surface on other paths", async () => {
    const port = await start();
    const res = await fetch(`http://127.0.0.1:${port}/mcp`);
    expect(res.status).toBe(404);
  });
});
