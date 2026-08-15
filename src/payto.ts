export const PAY_TO = "0xC0a707F63df3120E018F119ddf44Fc8eAab40E72" as const;
export const NETWORK = "eip155:8453" as const;
export const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;
export const PRICE_LABEL = "$0.05" as const;

export function assertCanonicalPayTo(address: string): asserts address is typeof PAY_TO {
  if (address.toLowerCase() !== PAY_TO.toLowerCase()) {
    throw new Error(`payTo must be ${PAY_TO}`);
  }
}
