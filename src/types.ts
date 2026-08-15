export type Bounty = {
  source: "github";
  title: string;
  url: string;
  rewardUsd: number | null;
  asset: "USD";
};

export type RadarQuery = {
  minUsd?: number;
  q?: string;
};

export type RadarResult = {
  paid: 0.05;
  count: number;
  bounties: Bounty[];
};
