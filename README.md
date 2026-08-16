# Bounty Radar MCP

**Paid MCP server exposing a GitHub bounty radar tool. One tool, `github_bounty_radar`, priced at $0.05 USDC on Base and settled over x402 via the CDP facilitator.**

![License: CC-BY-NC-ND-4.0](https://img.shields.io/badge/license-CC--BY--NC--ND--4.0-green)
![Version](https://img.shields.io/badge/version-0.5.4-blue)
[![CI](https://github.com/TMHSDigital/bounty-radar-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/TMHSDigital/bounty-radar-mcp/actions/workflows/ci.yml)

This server speaks Streamable HTTP, not stdio. Bazaar cannot call stdio, so HTTP is required for discovery and paid tool calls.

The paid MCP tool `github_bounty_radar` is registered and wrapped with x402. An unpaid call returns `isError: true` with `PaymentRequired`. GitHub is fetched only after payment verify succeeds. Settlement is aborted if that fetch fails.

Credentials (CDP API key id/secret, optional GitHub token) are supplied by the deployment environment. They are never build args and are never baked into the image. This repo does not create a hosted CDP wallet.

Request logs record method, path, status, and protocol. Headers are omitted. If header logging is added later, names must be allowlisted.

See [docs/DEPLOY.md](docs/DEPLOY.md) for the post-build checklist. This repo does not deploy itself. After the service is live, run `npm run verify:bazaar` to list Bazaar resources for the canonical `payTo`.

## Run

This is a deployed paid MCP service. It is not published to npm.

```bash
git clone https://github.com/TMHSDigital/bounty-radar-mcp.git
cd bounty-radar-mcp
npm ci
npm run build
npm start
```

Node 22 or newer is required. Bind address is `0.0.0.0`. Port comes from `PORT` (default 3000). `GET /health` is unpaid and returns `{ "ok": true }` only. MCP Streamable HTTP is `POST /mcp` (plus session `GET`/`DELETE`). Behind a TLS terminator, `trust proxy` is enabled so `req.protocol` is `https`.

Copy `.env.example` and set values in the runtime environment:

| Variable | Required | Purpose |
| --- | --- | --- |
| `CDP_API_KEY_ID` | yes for paid calls | CDP API key id |
| `CDP_API_KEY_SECRET` | yes for paid calls | CDP API key secret |
| `GITHUB_TOKEN` | no | Optional GitHub token for search rate limits |
| `PORT` | no | Listen port, default 3000 |

## Docker

The image runs as the non-root `node` user. There is no wallet volume.

```bash
docker build -t bounty-radar-mcp .
docker run --rm -p 3000:3000 --env-file .env bounty-radar-mcp
```

## MCP Tools

| Tool | Description |
| --- | --- |
| `github_bounty_radar` | Open GitHub issues with a parsed USD bounty. Optional minUsd and q. x402-paid. |

## Project Structure

```
bounty-radar-mcp/
  src/                TypeScript Streamable HTTP server
  test/               Offline vitest suite
  docs/               GitHub Pages site and deploy checklist
  Dockerfile          Node 22 image, non-root
  .env.example        Empty credential names for local copies
  .github/            CI/CD workflows
  .githooks/          Pre-commit secret and path leak guard
```

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the project roadmap.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

CC-BY-NC-ND-4.0. See [LICENSE](LICENSE) for details.

---

**Built by TMHSDigital**
