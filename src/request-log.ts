/** Header names that may appear in request logs. Empty means headers are omitted. */
export const REQUEST_LOG_HEADER_ALLOWLIST: readonly string[] = [];

export function pickLoggedHeaders(
  headers: Record<string, unknown>,
  allowlist: readonly string[] = REQUEST_LOG_HEADER_ALLOWLIST,
): Record<string, string> | undefined {
  if (allowlist.length === 0) {
    return undefined;
  }
  const want = new Set(allowlist.map((name) => name.toLowerCase()));
  const picked: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (!want.has(key.toLowerCase()) || typeof value !== "string") {
      continue;
    }
    picked[key.toLowerCase()] = value;
  }
  return picked;
}

export function formatRequestLog(input: {
  method: string;
  path: string;
  status: number;
  protocol: string;
  headers?: Record<string, unknown>;
}): string {
  const picked = input.headers ? pickLoggedHeaders(input.headers) : undefined;
  const headerPart = picked ? ` ${JSON.stringify(picked)}` : "";
  return `${input.method} ${input.path} ${input.status} ${input.protocol}${headerPart}`;
}
