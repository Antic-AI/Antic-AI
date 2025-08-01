import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { Jupiter } from "@jup-ag/core";
import { Connection } from "@solana/web3.js";
import { loadKeypair } from "./keys.js";
import { broadcast } from "./ws.js";
import { logStep } from "./experience.js";
import { RiskMetrics } from "./risk.js";

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

interface ShadowPos {
  entry: number;
  size: number; // token amount
}

const positions: Record<string, ShadowPos> = {};

export async function shadowTrade(mint: string, symbol: string, alloc: number, state: number[], risk: RiskMetrics) {
  const outputMint = new PublicKey(mint);
  const j = await getJup();
  const { routesInfos } = await j.computeRoutes({
    inputMint: SOL_MINT,
    outputMint,
    amount: new BN(1e9 * Math.abs(alloc)), // simulate 1 SOL * alloc
    slippageBps: 100,
  });
  const out = routesInfos?.[0]?.outAmount ?? 0;
  const price = Number(out) / Math.abs(alloc);
  positions[mint] = { entry: price, size: out / 1e9 };
  broadcast({ type: "shadow_trade", mint, symbol, alloc, price });
  // log zero reward until close
  logStep({ s: state, a: alloc, r: 0, s2: state, ts: Date.now() });
}

async function getUsd(mint: string): Promise<number> {
  const r = await fetch(`https://price.jup.ag/v4/price?ids=${mint}`);
  const j: any = await r.json();
  return j.data[mint].price;
}

export async function shadowTick() {
  for (const mint of Object.keys(positions)) {
    const pos = positions[mint];
    const usd = await getUsd(mint);
    const solUsd = await getUsd(SOL_MINT.toString());
    const p = usd / solUsd;
    const pnl = (p - pos.entry) * pos.size;
    if (Math.abs(pnl) / pos.entry > 0.3) {
      delete positions[mint];
      broadcast({ type: "shadow_close", mint, pnl });
      logStep({ s: [], a: 0, r: pnl, s2: [], ts: Date.now() });
    }
  }
}

setInterval(shadowTick, 30_000);

