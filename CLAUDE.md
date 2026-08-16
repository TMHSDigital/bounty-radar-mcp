<!-- standards-version: 1.10.0 -->

# CLAUDE.md

This file provides guidance for Claude Code when working in this repository.

## Project

Bounty Radar MCP -- Paid MCP server exposing a GitHub bounty radar tool. One tool, github_bounty_radar, priced at $0.05 USDC on Base and settled over x402 via the CDP facilitator.

**Version:** 0.5.6
**License:** CC-BY-NC-ND-4.0
**Author:** TMHSDigital

## Key paths

- Source: `src/` (Streamable HTTP; unpaid `GET /health` and MCP at `/mcp`)
- Radar core: `src/radar.ts` (GitHub search, reward parse, minUsd/q filters, 5-minute cache)
- Tests: `test/` (offline vitest; no live facilitator or GitHub)
- Verify script: `scripts/verify-bazaar.ts` (Bazaar merchant listing; not run in CI)
- Package manifest: `package.json` (version source of truth)
- Tool list: `mcp-tools.json` (enumerates the MCP tools)
- Docs site: `docs/`
- CI workflows: `.github/workflows/`

## Conventions

- Use conventional commits (`feat:`, `fix:`, `chore:`, `docs:`)
- Bump the version in `package.json` in your PR (`npm version`, keeps the lockfile in sync); `release.yml` tags that version on merge. This repo is a deployed service and is not published to npm.
- Keep `mcp-tools.json` in sync with the registered tools
- Do not provision a CDP wallet or import `@coinbase/cdp-sdk/x402`
- Do not call a paid HTTP radar from this process

## Testing

```bash
npm run build
npm test
npm run typecheck
```
