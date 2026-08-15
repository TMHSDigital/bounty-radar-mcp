# Bounty Radar MCP

**Paid MCP server exposing a GitHub bounty radar tool. One tool, `github_bounty_radar`, priced at $0.05 USDC on Base and settled over x402 via the CDP facilitator.**

![License: CC-BY-NC-ND-4.0](https://img.shields.io/badge/license-CC--BY--NC--ND--4.0-green)
![Version](https://img.shields.io/badge/version-0.1.0-blue)
[![CI](https://github.com/TMHSDigital/bounty-radar-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/TMHSDigital/bounty-radar-mcp/actions/workflows/ci.yml)

This server speaks Streamable HTTP, not stdio. Bazaar cannot call stdio, so HTTP is required for discovery and paid tool calls.

The current surface is unpaid `GET /health`, which returns `{ "ok": true }` and nothing else. The paid tool is not registered yet.

Credentials (CDP API key id/secret, optional GitHub token) are supplied by the deployment environment. This repo does not create a hosted CDP wallet.

## Installation

```bash
npx -y @tmhs/bounty-radar-mcp
```

Node 22 or newer is required. Bind address is `0.0.0.0`. Port comes from `PORT` (default 3000).

## MCP Tools

None registered in this release. `github_bounty_radar` lands in a later change.

## Project Structure

```
bounty-radar-mcp/
  src/                TypeScript HTTP server
  test/               Offline vitest suite
  docs/               GitHub Pages site
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
