import fetch from "node-fetch";
import { Candidate } from "./discovery.js";

export interface FeatureVec {
  vec: number[]; // ordered feature list
  names: string[];
}

// pulls extra metrics for a candidate and builds feature vector
export async function buildFeatures(c: Candidate, sentiment: { score: number; volume: number }): Promise<FeatureVec> {
  const dexUrl = `https://api.dexscreener.com/latest/dex/tokens/${c.mint}`;
  let volume24h = 0;
  let price1hDelta = 0;
  try {
    const r = await fetch(dexUrl);
    if (r.ok) {
      const j: any = await r.json();
      const pair = j?.pairs?.[0];
      if (pair) {
        volume24h = Number(pair.volume?.h24 ?? 0);
        price1hDelta = Number(pair.priceChange?.h1 ?? 0);
      }
    }
  } catch {}

  const names = [
    "liqUSD",
    "volume24h",
    "price1hDelta",
    "ageMins",
    "tweetSent",
    "tweetVol",
  ];
  const vec = [
    c.liqUSD,
    volume24h,
    price1hDelta,
    c.ageMins,
    sentiment.score,
    sentiment.volume,
  ];
  return { vec, names };
}
