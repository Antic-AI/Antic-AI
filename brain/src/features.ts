import fetch from "node-fetch";
import { Candidate } from "./discovery.js";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { Jupiter } from "@jup-ag/core";
import BN from "bn.js";
import { loadKeypair } from "./keys.js";

const RPC = process.env.SOL_RPC ?? "https://api.mainnet-beta.solana.com";
const SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
const conn = new Connection(RPC, "confirmed");
const kp = loadKeypair();
let jup: any;
async function getJup() {
  if (jup) return jup;
  jup = await Jupiter.load({ connection: conn, cluster: "mainnet-beta", user: kp });
  return jup;
}

async function priceApi(ids: string): Promise<number> {
  const r = await fetch(`https://price.jup.ag/v4/price?ids=${ids}`);
  const j: any = await r.json();
  return j.data[ids].price as number;
}

async function computeSlip(mint: string): Promise<{ slip1: number; slip100: number }> {
  try {
    const j = await getJup();
    const outputMint = new PublicKey(mint);
    // 1 SOL
    const routes1 = await j.computeRoutes({
      inputMint: SOL_MINT,
      outputMint,
      amount: new BN(1e9),
      slippageBps: 50,
    });
    const out1 = routes1.routesInfos?.[0]?.outAmount ?? 0;
    // 100 SOL
    const routes100 = await j.computeRoutes({
      inputMint: SOL_MINT,
      outputMint,
      amount: new BN(100e9),
      slippageBps: 50,
    });
    const out100 = routes100.routesInfos?.[0]?.outAmount ?? 0;
    if (!out1 || !out100) return { slip1: 0, slip100: 0 };
    const price1 = Number(out1) / 1;
    const price100 = Number(out100) / 100;
    const slip = (price1 - price100) / price1;
    return { slip1: 0, slip100: slip };
  } catch {
    return { slip1: 0, slip100: 0 };
  }
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
  const solUsd = await priceApi(SOL_MINT.toString());

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
