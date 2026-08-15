#!/usr/bin/env node
import { CdpClient, listX402DiscoveryMerchant } from "@coinbase/cdp-sdk";
import { PAY_TO } from "../src/payto.js";

async function main(): Promise<void> {
  new CdpClient();
  const result = await listX402DiscoveryMerchant({
    payTo: PAY_TO,
  });
  if (result.payTo.toLowerCase() !== PAY_TO.toLowerCase()) {
    throw new Error("merchant payTo does not match the canonical address");
  }
  for (const resource of result.resources) {
    console.log(
      JSON.stringify({
        resource: resource.resource,
        type: resource.type,
        description: resource.description ?? "",
      }),
    );
  }
  console.log(`count=${result.resources.length}`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : "verify failed";
  console.error(message);
  process.exit(1);
});
