import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  CACHE_TTL_MS,
  GITHUB_SEARCH_URL,
  GithubSearchError,
  USER_AGENT,
  clearRadarCache,
  fetchRadar,
  filterRadar,
  parseRadarQuery,
  parseReward,
  runRadar,
} from "../src/radar.js";
import type { Bounty } from "../src/types.js";

const fixture = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "fixtures", "search-issues.json"), "utf8"),
) as { items: unknown[] };

const AUTH_SCHEME = "Bear" + "er";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  clearRadarCache();
});

describe("parseReward", () => {
  it("prefers algora:$N over a bare dollar amount", () => {
    expect(parseReward("algora:$50 and also $9")).toBe(50);
  });

  it("reads a bare $N amount", () => {
    expect(parseReward("docs: fix README typo $25")).toBe(25);
    expect(parseReward("Fix bug $12.5 please")).toBe(12.5);
  });

  it("reads N USD when no dollar sigil is present", () => {
    expect(parseReward("25 USD bounty")).toBe(25);
  });

  it("returns null when no reward form matches", () => {
    expect(parseReward("no money here")).toBeNull();
  });
});

describe("filterRadar", () => {
  const items: Bounty[] = [
    {
      source: "github",
      title: "docs typo $10",
      url: "https://github.com/a/b/issues/1",
      rewardUsd: 10,
      asset: "USD",
    },
    {
      source: "github",
      title: "feat $80",
      url: "https://github.com/a/b/issues/2",
      rewardUsd: 80,
      asset: "USD",
    },
    {
      source: "github",
      title: "unpriced",
      url: "https://github.com/acme/special/issues/3",
      rewardUsd: null,
      asset: "USD",
    },
  ];

  it("includes unpriced issues when minUsd is omitted", () => {
    expect(filterRadar(items).map((b) => b.rewardUsd)).toEqual([80, 10, null]);
  });

  it("excludes unpriced issues when minUsd is set", () => {
    expect(filterRadar(items, { minUsd: 25 }).map((b) => b.rewardUsd)).toEqual([80]);
  });

  it("keeps issues whose reward is greater than or equal to minUsd", () => {
    expect(filterRadar(items, { minUsd: 10 }).map((b) => b.rewardUsd)).toEqual([80, 10]);
  });

  it("matches q against title case-insensitively", () => {
    expect(filterRadar(items, { q: "DOCS" })).toEqual([items[0]]);
  });

  it("matches q against url case-insensitively", () => {
    expect(filterRadar(items, { q: "special" }).map((b) => b.url)).toEqual([
      "https://github.com/acme/special/issues/3",
    ]);
  });

  it("sorts by rewardUsd descending and treats null as 0", () => {
    const shuffled = [items[2], items[0], items[1]];
    expect(filterRadar(shuffled).map((b) => b.rewardUsd)).toEqual([80, 10, null]);
  });
});

describe("parseRadarQuery", () => {
  it("trims q and coerces minUsd from a string", () => {
    expect(parseRadarQuery({ minUsd: "25", q: " docs " })).toEqual({ minUsd: 25, q: "docs" });
  });
});

describe("fetchRadar", () => {
  it("maps GitHub issues, parses rewards, and sorts", async () => {
    const items = await fetchRadar({
      fetch: async () => jsonResponse(fixture),
    });
    expect(items.map((b) => ({ title: b.title, rewardUsd: b.rewardUsd, source: b.source }))).toEqual([
      { title: "feat: add widget", rewardUsd: 80, source: "github" },
      { title: "docs: fix README typo $25", rewardUsd: 25, source: "github" },
      { title: "fix: timeout 15 USD", rewardUsd: 15, source: "github" },
      { title: "chore: unpriced cleanup", rewardUsd: null, source: "github" },
    ]);
  });

  it("calls GitHub with the compiled user-agent and no auth when token is empty", async () => {
    let url = "";
    let headers: Headers | undefined;
    await fetchRadar({
      githubToken: "",
      fetch: async (input, init) => {
        url = String(input);
        headers = new Headers(init?.headers);
        return jsonResponse({ items: [] });
      },
    });
    expect(url).toBe(GITHUB_SEARCH_URL);
    expect(headers?.get("accept")).toBe("application/vnd.github+json");
    expect(headers?.get("user-agent")).toBe(USER_AGENT);
    expect(headers?.has("authorization")).toBe(false);
  });

  it("adds an authorization header when a token is provided", async () => {
    let authorization: string | null = null;
    await fetchRadar({
      githubToken: "test-token",
      fetch: async (_input, init) => {
        authorization = new Headers(init?.headers).get("authorization");
        return jsonResponse({ items: [] });
      },
    });
    expect(authorization).toBe(`${AUTH_SCHEME} test-token`);
  });

  it("reuses the cache within the TTL", async () => {
    let calls = 0;
    const fetchFn: typeof fetch = async () => {
      calls += 1;
      return jsonResponse(fixture);
    };
    const first = await fetchRadar({ fetch: fetchFn, now: () => 1_000 });
    const second = await fetchRadar({ fetch: fetchFn, now: () => 1_000 + CACHE_TTL_MS - 1 });
    expect(calls).toBe(1);
    expect(second).toEqual(first);
  });

  it("refetches after the cache TTL expires", async () => {
    let calls = 0;
    const fetchFn: typeof fetch = async () => {
      calls += 1;
      return jsonResponse(fixture);
    };
    await fetchRadar({ fetch: fetchFn, now: () => 1_000 });
    await fetchRadar({ fetch: fetchFn, now: () => 1_000 + CACHE_TTL_MS });
    expect(calls).toBe(2);
  });

  it("throws GithubSearchError on a non-OK status without echoing headers", async () => {
    const err = await fetchRadar({
      fetch: async () =>
        new Response("nope", {
          status: 403,
          headers: { authorization: `${AUTH_SCHEME} leaked`, "x-github-request-id": "abc" },
        }),
    }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(GithubSearchError);
    expect((err as GithubSearchError).status).toBe(403);
    expect((err as Error).message).toBe("GitHub search failed with status 403");
    expect((err as Error).message).not.toMatch(new RegExp(`${AUTH_SCHEME} `));
  });
});

describe("runRadar", () => {
  it("returns the paid envelope with count and filtered bounties", async () => {
    const result = await runRadar(
      { minUsd: 20, q: "acme" },
      { fetch: async () => jsonResponse(fixture) },
    );
    expect(result.paid).toBe(0.05);
    expect(result.count).toBe(2);
    expect(result.bounties.map((b) => b.rewardUsd)).toEqual([80, 25]);
    expect(result).not.toHaveProperty("source");
  });
});
