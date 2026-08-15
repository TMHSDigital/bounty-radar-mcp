import { generateJwt } from "@coinbase/cdp-sdk/auth";
import { HTTPFacilitatorClient } from "@x402/core/server";

export const CDP_FACILITATOR_URL = "https://api.cdp.coinbase.com/platform/v2/x402";

const AUTH_SCHEME = "Bear" + "er";

async function jwtFor(path: string, method: string): Promise<string> {
  const apiKeyId = process.env.CDP_API_KEY_ID?.trim() ?? "";
  const apiKeySecret = process.env.CDP_API_KEY_SECRET?.trim() ?? "";
  return generateJwt({
    apiKeyId,
    apiKeySecret,
    requestMethod: method,
    requestHost: "api.cdp.coinbase.com",
    requestPath: path,
    expiresIn: 120,
  });
}

async function cdpAuthHeaders(): Promise<{
  verify: Record<string, string>;
  settle: Record<string, string>;
  supported: Record<string, string>;
}> {
  const basePath = "/platform/v2/x402";
  async function headersFor(path: string, method: string): Promise<Record<string, string>> {
    const jwt = await jwtFor(path, method);
    return { Authorization: `${AUTH_SCHEME} ${jwt}` };
  }
  const [verify, settle, supported] = await Promise.all([
    headersFor(`${basePath}/verify`, "POST"),
    headersFor(`${basePath}/settle`, "POST"),
    headersFor(`${basePath}/supported`, "GET"),
  ]);
  return { verify, settle, supported };
}

export function createFacilitatorClient(): HTTPFacilitatorClient {
  return new HTTPFacilitatorClient({
    url: CDP_FACILITATOR_URL,
    createAuthHeaders: cdpAuthHeaders,
  });
}
