import type { FacilitatorClient } from "@x402/core/server";
import { NETWORK } from "../src/payto.js";

/** Facilitator stub that never calls the network. Verify and settle throw. */
export function forbiddenFacilitator(): FacilitatorClient {
  return {
    async verify() {
      throw new Error("live facilitator forbidden in tests");
    },
    async settle() {
      throw new Error("live facilitator forbidden in tests");
    },
    async getSupported() {
      return {
        kinds: [{ x402Version: 2, network: NETWORK, scheme: "exact" }],
        extensions: [],
        signers: {},
      };
    },
  };
}
