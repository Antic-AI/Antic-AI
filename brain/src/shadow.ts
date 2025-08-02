import { PublicKey } from "@solana/web3.js";
import { broadcast } from "./ws.js";
import { logStep } from "./experience.js";
import { RiskMetrics } from "./risk.js";
import fetch from "node-fetch";

const SOL_MINT_ID = "So11111111111111111111111111111111111111112";

interface ShadowPos {
  entry: number;
  size: number; // token amount
}

const positions: Record<string, ShadowPos> = {};

export async function shadowTrade(mint: string, symbol: string, alloc: number, state: number[], risk: RiskMetrics) {
  const { quoteOutAmount } = await import("./jup.js");
  const out = await quoteOutAmount(mint, 1e9 * Math.abs(alloc));
  const price = out / Math.abs(alloc);
  positions[mint] = { entry: price, size: out / 1e9 };
  broadcast({ type: "shadow_trade", mint, symbol, alloc, price });
  logStep({ s: state, a: alloc, r: 0, s2: state, ts: Date.now() });
}

async function getUsd(id: string): Promise<number> {
  const r = await fetch(`https://price.jup.ag/v4/price?ids=${id}`);
  const j: any = await r.json();
  return j.data[id].price;
}

export async function shadowTick() {
  for (const mint of Object.keys(positions)) {
    const pos = positions[mint];
    const usd = await getUsd(mint);
    const solUsd = await getUsd(SOL_MINT_ID);
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
