import { declareDiscoveryExtension } from "@x402/extensions/bazaar";
import { RADAR_PRICE_USD } from "./radar.js";

const bountyExample = {
  source: "github",
  title: "docs: fix README typo $25",
  url: "https://github.com/acme/repo/issues/1",
  rewardUsd: 25,
  asset: "USD",
};

export const TOOL_NAME = "github_bounty_radar";

export const TOOL_DESCRIPTION =
  "Call when you need open GitHub issues with a parsed USD bounty (Algora/$/USD in title or labels). Optional minUsd and q filter the list. Not a generic GitHub search clone.";

export const radarBazaarExtensions = declareDiscoveryExtension({
  input: { minUsd: 25, q: "docs" },
  inputSchema: {
    type: "object",
    properties: {
      minUsd: {
        type: "number",
        description: "Minimum parsed USD reward. Omit to include unpriced issues.",
      },
      q: {
        type: "string",
        description: "Case-insensitive substring match on title and url.",
      },
    },
  },
  output: {
    example: {
      paid: RADAR_PRICE_USD,
      count: 1,
      bounties: [bountyExample],
    },
    schema: {
      type: "object",
      required: ["paid", "count", "bounties"],
      properties: {
        paid: { type: "number" },
        count: { type: "number" },
        bounties: {
          type: "array",
          items: {
            type: "object",
            required: ["source", "title", "url", "asset"],
            properties: {
              source: { type: "string" },
              title: { type: "string" },
              url: { type: "string" },
              rewardUsd: { type: ["number", "null"] },
              asset: { type: "string" },
            },
          },
        },
      },
    },
  },
});
