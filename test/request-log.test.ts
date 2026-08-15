import { describe, expect, it } from "vitest";
import { formatRequestLog, pickLoggedHeaders, REQUEST_LOG_HEADER_ALLOWLIST } from "../src/request-log.js";

describe("request log", () => {
  it("omits headers by default even when sensitive names are present", () => {
    expect(REQUEST_LOG_HEADER_ALLOWLIST).toEqual([]);
    const picked = pickLoggedHeaders({
      authorization: "secret-value",
      "x-api-key": "secret-value",
      cookie: "secret-value",
    });
    expect(picked).toBeUndefined();
    const line = formatRequestLog({
      method: "POST",
      path: "/mcp",
      status: 200,
      protocol: "https",
      headers: { authorization: "secret-value" },
    });
    expect(line).toBe("POST /mcp 200 https");
    expect(line).not.toContain("secret-value");
    expect(line).not.toMatch(/authori[z]ation/i);
  });

  it("allowlists header names rather than denylisting when the list is non-empty", () => {
    const picked = pickLoggedHeaders(
      {
        "x-forwarded-proto": "https",
        authorization: "secret-value",
      },
      ["x-forwarded-proto"],
    );
    expect(picked).toEqual({ "x-forwarded-proto": "https" });
    expect(picked).not.toHaveProperty("authorization");
  });
});
