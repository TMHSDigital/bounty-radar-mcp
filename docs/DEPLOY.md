# Deploy

This document is the post-build checklist for Bounty Radar MCP. It does not deploy the service. You run these steps in the platform dashboard after the image or Node process is ready.

## Runtime

The process listens on `0.0.0.0` and `PORT` (default 3000). MCP Streamable HTTP is `POST /mcp`. Unpaid `GET /health` returns `{ "ok": true }` only.

Run as a non-root container. There is no wallet volume and no hosted CDP wallet.

## Environment

Set these in the platform dashboard. Never commit them. Never pass them as Docker build args.

| Variable | Required | Purpose |
| --- | --- | --- |
| `CDP_API_KEY_ID` | yes | CDP API key id for facilitator JWTs |
| `CDP_API_KEY_SECRET` | yes | CDP API key secret for facilitator JWTs |
| `GITHUB_TOKEN` | no | Optional GitHub token for search rate limits |
| `PORT` | no | Listen port, default 3000 |

Do not set a wallet secret. This server does not mint, import, or store a CDP wallet.

## After deploy

1. `GET /health` returns `{ "ok": true }` and nothing else.
2. An unpaid `github_bounty_radar` call returns `isError: true` with `PaymentRequired`. GitHub is not contacted.
3. A paid call from a **non-treasury** payer verifies, fetches GitHub, and settles. Self-pay from the treasury key fails with `self_send_not_allowed`. The first real settle must come from a different payer.
4. Bazaar lists this MCP storefront **and** the existing HTTP radar resource for the same `payTo`.

Confirm listing:

```bash
npx tsx scripts/verify-bazaar.ts
```

The script calls `listX402DiscoveryMerchant` with the compile-time `PAY_TO` constant from `src/payto.ts` and prints each resource. Expect an `mcp` entry for `github_bounty_radar` in addition to the HTTP radar URL.
