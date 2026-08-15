<!-- standards-version: 1.10.0 -->

# AGENTS.md

This file tells AI coding agents how the Bounty Radar MCP repo works and how to contribute correctly.

**Documentation site:** https://tmhsdigital.github.io/bounty-radar-mcp/ (auto-deployed on push to main)

## Repository overview

This is an MCP server. It contains:

- **`src/`** -- TypeScript HTTP server. Phase 1 surface is unpaid `GET /health` only.
- **`test/`** -- Offline vitest tests. No live facilitator, no live GitHub, no wallet writes.
- **`package.json`** -- npm package manifest (version source of truth)
- **`mcp-tools.json`** -- enumerates the MCP tools this server exposes (empty until the paid tool is wired)
- **`docs/`** -- documentation and GitHub Pages site
- **`CHANGELOG.md`** -- release history

Do not add stdio as the primary transport. Do not provision a CDP wallet. Do not call any paid HTTP radar from this server.

## Branching and commit model

- **Single branch**: `main` only. No develop/release branches.
- **Conventional commits** are required. Use them to decide your version bump, then apply it in your PR (`npm version <patch|minor|major> --no-git-tag-version`); `release.yml` tags and publishes that version on merge, and CI never writes to `main`:
  - `feat:` or `feat(scope):` -- bump the **minor** version
  - `feat!:` or a `BREAKING CHANGE` trailer -- bump the **major** version
  - everything else (`fix:`, `chore:`, `docs:`) -- bump the **patch** version
- Commit messages should be concise and describe the "why", not the "what".
- DCO sign-off is required (`git commit -s`).

## CI/CD workflows

### `ci.yml` (runs on PR and push to main)

Builds and runs the test suite on Node 22:
- TypeScript build (`npm run build`)
- Test suite (`npm test`, vitest, offline)
- Public-repo safety scan (drive-letter paths, private key headers, credential files)

### `release.yml` (runs on push to main)

Reads the version from `package.json` and, if there is no matching tag yet, pushes the `v<version>` tag (plus the floating `vMAJOR` and `vMAJOR.MINOR` tags), creates a GitHub Release, and dispatches `publish.yml`. It only pushes tags and never writes to `main`; bump the version in your PR.

### `publish.yml` (runs on release published or workflow_dispatch)

Publishes the package to npm.

### `drift-check.yml`

Checks this repo against the ecosystem standards for drift.

### `pages.yml` (deploys docs/ to GitHub Pages)

Builds and deploys the documentation site on push to main.

### `stale.yml`

Marks issues/PRs as stale after 30 days of inactivity.

### `label-sync.yml`

Keeps repository labels in sync.

## Version management

- The **source of truth** for the current version is `package.json`.
- Bump it in your PR with `npm version <patch|minor|major> --no-git-tag-version` (keeps the lockfile in sync) and update the README badge, following conventional-commit intent.
- On merge, `release.yml` tags that version and publishes it. `main` is protected and is never written to by CI.

## Code conventions

- No hardcoded credentials. CI and the pre-commit hook scan for private key headers, authorization tokens, and drive-letter paths.
- Pin `@x402/*` and `@coinbase/cdp-sdk` to exact versions when they are added. Stay on zod 3.
- Network access in tests is forbidden. Use fixtures.
- An unpaid call must never reach GitHub. Fetch only after payment verify succeeds.
- `payTo` is a compile-time constant. Do not move it to an env var.
- Keep `mcp-tools.json` in sync with the tools registered in source.

## Adding content

### New tool

1. Register the tool in `src/`
2. Add it to `mcp-tools.json`
3. Add vitest tests that do not hit the live facilitator
4. Use `feat:` commit prefix

## Standards deviations

These departures are intentional. Do not "fix" them back to the letter of the standard.

1. **Tool naming.** [`standards/mcp-server.md`](https://github.com/TMHSDigital/Developer-Tools-Directory/blob/main/standards/mcp-server.md) requires `<tool-prefix>_<verbNoun>` in camelCase. This repo ships `github_bounty_radar`. The tool name is a market-facing identifier that Bazaar buyers discover on, and it must match the already-indexed HTTP listing. Wire compatibility wins over internal naming.
2. **Destructive-operation rule.** [`standards/mcp-server.md`](https://github.com/TMHSDigital/Developer-Tools-Directory/blob/main/standards/mcp-server.md) classifies anything that moves money as destructive and requires a `confirm: boolean` parameter. `github_bounty_radar` is read-only against the GitHub API. Payment is a transport-level x402 concern initiated by the buyer's client, not an effect the tool produces. A `confirm` param would break the x402 retry loop. No `confirm` or `dry_run` is added.
3. **Transport.** [`standards/mcp-server.md`](https://github.com/TMHSDigital/Developer-Tools-Directory/blob/main/standards/mcp-server.md) defaults to stdio and permits HTTP only when the server must run remotely, with the reason documented in the README. Bazaar cannot call stdio. This server uses Streamable HTTP.

## License

CC-BY-NC-ND-4.0. All contributions fall under this license.
