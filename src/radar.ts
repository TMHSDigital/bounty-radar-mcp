import type { Bounty, RadarQuery, RadarResult } from "./types.js";

export type { Bounty, RadarQuery, RadarResult };

export const RADAR_PRICE_USD = 0.05 as const;
export const CACHE_TTL_MS = 5 * 60 * 1000;
export const USER_AGENT = "bounty-radar-mcp/0.1";
export const GITHUB_SEARCH_URL =
  "https://api.github.com/search/issues?q=label:bounty+state:open+is:issue&per_page=20&sort=updated";

export type RadarFetch = typeof fetch;

export type RadarDeps = {
  fetch?: RadarFetch;
  now?: () => number;
  githubToken?: string;
};

const AUTH_SCHEME = "Bear" + "er";

let cache: { at: number; items: Bounty[] } | null = null;

export class GithubSearchError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`GitHub search failed with status ${status}`);
    this.name = "GithubSearchError";
    this.status = status;
  }
}

export function parseReward(text: string): number | null {
  const labeled = text.match(/algora:\$(\d+(?:\.\d+)?)/i);
  if (labeled?.[1]) {
    return Number(labeled[1]);
  }
  const usd = text.match(/\$(\d+(?:\.\d+)?)/);
  if (usd?.[1]) {
    return Number(usd[1]);
  }
  const words = text.match(/(\d+(?:\.\d+)?)\s*USD/i);
  if (words?.[1]) {
    return Number(words[1]);
  }
  return null;
}

function labelNames(labels: Array<string | { name?: string }> | undefined): string {
  return (labels ?? [])
    .map((label) => (typeof label === "string" ? label : (label.name ?? "")))
    .join(" ");
}

function asIssue(item: {
  title?: string;
  html_url?: string;
  labels?: Array<string | { name?: string }>;
}): Bounty | null {
  const title = item.title ?? "";
  const url = item.html_url ?? "";
  if (!title || !url) {
    return null;
  }
  return {
    source: "github",
    title,
    url,
    rewardUsd: parseReward(`${title} ${labelNames(item.labels)}`),
    asset: "USD",
  };
}

function githubHeaders(token: string | undefined): Record<string, string> {
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    "user-agent": USER_AGENT,
  };
  const trimmed = token?.trim();
  if (trimmed) {
    headers.authorization = `${AUTH_SCHEME} ${trimmed}`;
  }
  return headers;
}

function tokenFromDeps(deps: RadarDeps): string | undefined {
  if (deps.githubToken !== undefined) {
    return deps.githubToken;
  }
  return process.env.GITHUB_TOKEN;
}

async function searchGithub(fetchFn: RadarFetch, token: string | undefined): Promise<Bounty[]> {
  const res = await fetchFn(GITHUB_SEARCH_URL, {
    headers: githubHeaders(token),
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) {
    throw new GithubSearchError(res.status);
  }
  const body = (await res.json()) as { items?: unknown[] };
  const out: Bounty[] = [];
  for (const raw of body.items ?? []) {
    const bounty = asIssue(raw as Parameters<typeof asIssue>[0]);
    if (bounty) {
      out.push(bounty);
    }
  }
  return out;
}

function sortByReward(items: Bounty[]): Bounty[] {
  return [...items].sort((a, b) => (b.rewardUsd ?? 0) - (a.rewardUsd ?? 0));
}

export async function fetchRadar(deps: RadarDeps = {}): Promise<Bounty[]> {
  const now = deps.now?.() ?? Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) {
    return cache.items;
  }
  const fetchFn = deps.fetch ?? fetch;
  const items = sortByReward(await searchGithub(fetchFn, tokenFromDeps(deps)));
  cache = { at: now, items };
  return items;
}

export function parseRadarQuery(input: { minUsd?: unknown; q?: unknown }): RadarQuery {
  const q = typeof input.q === "string" && input.q.trim() ? input.q.trim() : undefined;
  const raw = input.minUsd;
  let minUsd: number | undefined;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    minUsd = raw;
  } else if (typeof raw === "string" && raw.trim() !== "") {
    const n = Number(raw);
    if (Number.isFinite(n)) {
      minUsd = n;
    }
  }
  return { minUsd, q };
}

export function filterRadar(items: Bounty[], query: RadarQuery = {}): Bounty[] {
  let out = items;
  if (query.minUsd != null) {
    const min = query.minUsd;
    out = out.filter((b) => b.rewardUsd != null && b.rewardUsd >= min);
  }
  if (query.q) {
    const needle = query.q.toLowerCase();
    out = out.filter((b) => `${b.title} ${b.url}`.toLowerCase().includes(needle));
  }
  return sortByReward(out);
}

export function toRadarResult(bounties: Bounty[]): RadarResult {
  return {
    paid: RADAR_PRICE_USD,
    count: bounties.length,
    bounties,
  };
}

export async function runRadar(
  input: { minUsd?: unknown; q?: unknown } = {},
  deps: RadarDeps = {},
): Promise<RadarResult> {
  const query = parseRadarQuery(input);
  const items = filterRadar(await fetchRadar(deps), query);
  return toRadarResult(items);
}

export function clearRadarCache(): void {
  cache = null;
}
