import http from "node:http";

const HEALTH_BODY = JSON.stringify({ ok: true });

function requestPath(url: string | undefined): string {
  if (!url) {
    return "/";
  }
  const q = url.indexOf("?");
  return q === -1 ? url : url.slice(0, q);
}

/** HTTP server with unpaid GET /health. No MCP tools are registered yet. */
export function createServer(): http.Server {
  return http.createServer((req, res) => {
    const path = requestPath(req.url);
    if (req.method === "GET" && path === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(HEALTH_BODY);
      return;
    }
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not_found" }));
  });
}
