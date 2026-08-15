# Changelog

All notable changes to Bounty Radar MCP will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [0.5.0] - Unreleased

### Added

- Bazaar merchant listing script and deploy checklist (health, unpaid 402, non-treasury settle)

## [0.4.0] - 2026-08-15

### Added

- Streamable HTTP transport on `/mcp`, Express trust proxy, non-root Node 22 Dockerfile, and `.env.example`

## [0.3.0] - 2026-08-15

### Added

- x402 payment wrapper for `github_bounty_radar` via the CDP facilitator, with a canonical payTo guard and fail-closed GitHub fetch

## [0.2.0] - 2026-08-15

### Added

- Offline GitHub bounty radar core: reward parsing, minUsd/q filters, 5-minute cache, fixture tests

## [0.1.0] - 2026-08-15

### Added

- Initial project scaffold
- CI/CD workflows (ci, release, publish, drift-check, pages, stale, label-sync)
- GitHub Pages documentation site
