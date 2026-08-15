import { x402ResourceServer } from "@x402/core/server";
import type { FacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { bazaarResourceServerExtension } from "@x402/extensions/bazaar";
import { createPaymentWrapper } from "@x402/mcp";
import type { MCPToolCallback } from "@x402/mcp";
import { runRadar, type RadarDeps } from "./radar.js";
import type { RadarResult } from "./types.js";
import { radarBazaarExtensions, TOOL_DESCRIPTION, TOOL_NAME } from "./discovery.js";
import { createFacilitatorClient } from "./facilitator.js";
import { NETWORK, PAY_TO, PRICE_LABEL, assertCanonicalPayTo } from "./payto.js";
import { mcpErrorResult } from "./redact.js";

export type PaidRadarOptions = {
  payTo?: string;
  facilitator?: FacilitatorClient;
  radar?: (input: { minUsd?: unknown; q?: unknown }, deps?: RadarDeps) => Promise<RadarResult>;
  radarDeps?: RadarDeps;
};

type FetchSlot = { ok: RadarResult } | { error: unknown };

type TransportCtx = {
  arguments?: object;
};

export async function createPaidRadar(options: PaidRadarOptions = {}): Promise<{
  resourceServer: x402ResourceServer;
  callTool: MCPToolCallback<{ minUsd?: number; q?: string }>;
}> {
  const payTo = options.payTo ?? PAY_TO;
  assertCanonicalPayTo(payTo);

  const radar = options.radar ?? runRadar;
  const slots = new WeakMap<object, FetchSlot>();

  const facilitator = options.facilitator ?? createFacilitatorClient();
  const resourceServer = new x402ResourceServer(facilitator);
  resourceServer.register(NETWORK, new ExactEvmScheme());
  resourceServer.registerExtension(bazaarResourceServerExtension);

  resourceServer.onAfterVerify(async (context) => {
    const argsObj = (context.transportContext as TransportCtx | undefined)?.arguments;
    const args = (argsObj ?? {}) as { minUsd?: unknown; q?: unknown };
    try {
      const result = await radar({ minUsd: args.minUsd, q: args.q }, options.radarDeps);
      if (argsObj) {
        slots.set(argsObj, { ok: result });
      }
    } catch (error) {
      if (argsObj) {
        slots.set(argsObj, { error });
      }
    }
  });

  resourceServer.onBeforeSettle(async (context) => {
    const argsObj = (context.transportContext as TransportCtx | undefined)?.arguments;
    const slot = argsObj ? slots.get(argsObj) : undefined;
    if (slot && "error" in slot) {
      return { abort: true as const, reason: "github_search_failed" };
    }
    return;
  });

  await resourceServer.initialize();

  const accepts = await resourceServer.buildPaymentRequirements({
    scheme: "exact",
    network: NETWORK,
    payTo,
    price: PRICE_LABEL,
  });

  const paid = createPaymentWrapper(resourceServer, {
    accepts,
    resource: {
      url: `mcp://tool/${TOOL_NAME}`,
      description: TOOL_DESCRIPTION,
    },
    extensions: radarBazaarExtensions,
  });

  const callTool = paid(async (args) => {
    const slot = slots.get(args);
    if (!slot) {
      return mcpErrorResult(new Error("radar result missing after verify"));
    }
    if ("error" in slot) {
      return mcpErrorResult(slot.error);
    }
    return {
      content: [{ type: "text", text: JSON.stringify(slot.ok) }],
      structuredContent: slot.ok as unknown as Record<string, unknown>,
    };
  });

  return { resourceServer, callTool };
}
