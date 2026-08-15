const AUTH_SCHEME = "Bear" + "er";
const JWT_PREFIX = "ey" + "J";

const SENSITIVE_NAMES = [
  "authorization",
  "x-api-key",
  "cookie",
  "CDP_API_KEY_ID",
  "CDP_API_KEY_SECRET",
  "GITHUB_TOKEN",
  "NODE_AUTH_TOKEN",
];

function stripAuthScheme(text: string): string {
  const re = new RegExp(`${AUTH_SCHEME}\\s+\\S+`, "gi");
  return text.replace(re, "[redacted]");
}

function stripJwtPrefix(text: string): string {
  if (!text.includes(JWT_PREFIX)) {
    return text;
  }
  return text.split(JWT_PREFIX).join("[redacted]");
}

function stripNamedSecrets(text: string): string {
  let out = text;
  for (const name of SENSITIVE_NAMES) {
    const re = new RegExp(`${name}\\s*[:=]\\s*\\S+`, "gi");
    out = out.replace(re, `${name}=[redacted]`);
  }
  return out;
}

/** Strip credentials, tokens, and header-shaped secrets from a string. */
export function redactSecrets(text: string): string {
  return stripNamedSecrets(stripJwtPrefix(stripAuthScheme(text)));
}

export function mcpErrorResult(err: unknown): {
  isError: true;
  content: Array<{ type: "text"; text: string }>;
} {
  const raw = err instanceof Error ? err.message : "internal error";
  const text = redactSecrets(raw) || "internal error";
  return {
    isError: true,
    content: [{ type: "text", text }],
  };
}
