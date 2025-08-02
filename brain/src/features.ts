import fetch from "node-fetch";
import { Candidate } from "./discovery.js";
import { quoteOutAmount } from "./jup.js";

async function priceApi(ids: string): Promise<number> {
  const r = await fetch(`https://price.jup.ag/v4/price?ids=${ids}`);
  const j: any = await r.json();
  return j.data[ids].price as number;
}


export interface FeatureVec {
  vec: number[];
  names: string[];
}

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

  const { quoteOutAmount } = await import("./jup.js");
  const out1 = await quoteOutAmount(c.mint, 1e9);
  const out100 = await quoteOutAmount(c.mint, 100e9);
  const price1 = out1 / 1;
  const price100 = out100 / 100;
  const slip100 = price1 ? (price1 - price100) / price1 : 0;
  const SOL_MINT_ID = "So11111111111111111111111111111111111111112";
  const solUsd = await priceApi(SOL_MINT_ID);

  const names = [
    "liqUSD",
    "volume24h",
    "price1hDelta",
    "ageMins",
    "tweetSent",
    "tweetVol",
    "slip100",
    "solUsd",
  ];
  const vec = [
    c.liqUSD,
    volume24h,
    price1hDelta,
    c.ageMins,
    sentiment.score,
    sentiment.volume,
    slip100,
    solUsd,
  ];
  return { vec, names };
}
