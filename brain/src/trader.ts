import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Jupiter } from "@jup-ag/core";
import BN from "bn.js";
import fetch from "node-fetch";
import { Candidate } from "./discovery.js";
import { broadcast } from "./ws.js";
import { loadKeypair } from "./keys.js";

const SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
const RPC = process.env.SOL_RPC ?? "https://api.mainnet-beta.solana.com";

const MAX_TRADE_SOL = Number(process.env.MAX_TRADE_SOL ?? 0.2); // per trade
const MAX_SOL_TOTAL = Number(process.env.MAX_SOL_TOTAL ?? 2);   // wallet exposure
const TP_PCT = Number(process.env.TP_PCT ?? 0.4);
const SL_PCT = Number(process.env.SL_PCT ?? 0.15);

const conn = new Connection(RPC, "confirmed");
const kp: Keypair = loadKeypair();

let jupiter: any = null;
async function getJupiter(): Promise<any> {
  if (jupiter) return jupiter;
  jupiter = await Jupiter.load({ connection: conn, cluster: "mainnet-beta", user: kp });
  return jupiter;
}

interface Position {
  mint: string;
  symbol: string;
  size: number; // token amount
  entry: number; // entry price in SOL
}
const positions: Record<string, Position> = {};
let exposure = 0;
let realized = 0;
let kill = false;

function priceApiUrl(ids: string, vs?: string) {
  return `https://price.jup.ag/v4/price?ids=${ids}${vs ? `&vsToken=${vs}` : ""}`;
}
async function getUsdPrice(mint: string): Promise<number> {
  const r = await fetch(priceApiUrl(mint));
  const j: any = await r.json();
  return j.data[mint].price as number;
}
async function getPriceInSOL(mint: string, solUsd: number): Promise<number> {
  const usd = await getUsdPrice(mint);
  return usd / solUsd;
}

import { recommendedSize, canTrade, handleTradeOutcome } from "./risk.js";
import { shadowTrade } from "./shadow.js";

export async function maybeTrade(c: Candidate, prob: number, featVec: number[]) {
  if (kill) return;
  if (positions[c.mint]) return;
  if (prob < 0.8) return;
  if (exposure >= MAX_SOL_TOTAL) return;

  if (!canTrade()) return;

  const solUsd = await getUsdPrice(SOL_MINT.toString());
  const { snapshotRisk } = await import("./risk.js");
  const riskSnap = snapshotRisk(exposure);
  const { buildState } = await import("./state.js");
  const stateVec = buildState(featVec, riskSnap);
  const { decide } = await import("./ppo.js");
  const alloc = await decide(stateVec); // -1..1
  broadcast({ type: "agent", mint: c.mint, symbol: c.symbol, alloc });
  await shadowTrade(c.mint, c.symbol, alloc, Array.from(stateVec), riskSnap);
  if (alloc <= 0) return; // long-only for now
  const dynamicSize = recommendedSize();
  const sizeSOL = Math.min(dynamicSize * alloc, MAX_TRADE_SOL, (c.liqUSD / solUsd) * 0.002);
  if (exposure + sizeSOL > MAX_SOL_TOTAL) return;

  const price = await getPriceInSOL(c.mint, solUsd);
  const lamports = Math.round(sizeSOL * 1e9);
  const txid = await executeSwap(SOL_MINT, new PublicKey(c.mint), lamports);
  if (!txid) return;

  const tokenOut = sizeSOL / price;
  positions[c.mint] = { mint: c.mint, symbol: c.symbol, size: tokenOut, entry: price };
  exposure += sizeSOL;
  broadcast({ type: "trade", mint: c.mint, symbol: c.symbol, prob, txid });
}

async function executeSwap(input: PublicKey, output: PublicKey, amount: number): Promise<string | null> {
  try {
    const jup = await getJupiter();
    const { routesInfos } = await jup.computeRoutes({
      inputMint: input,
      outputMint: output,
      amount: new BN(amount),
      slippageBps: 50,
    });
    if (!routesInfos?.length) return null;
    const route: any = routesInfos[0];
    const { txid } = await jup.execute({ route, userPublicKey: kp.publicKey });
    return txid;
  } catch {
    return null;
  }
}

async function closePosition(p: Position, reason: string) {
  const solUsd = await getUsdPrice(SOL_MINT.toString());
  const price = await getPriceInSOL(p.mint, solUsd);
  const lamportsOut = Math.round(p.size * price * 1e9);
  const txid = await executeSwap(new PublicKey(p.mint), SOL_MINT, lamportsOut);
  if (!txid) return;
  const pnl = (price - p.entry) * p.size;
  realized += pnl;
  exposure -= p.size * price;
  delete positions[p.mint];
  broadcast({ type: "close", mint: p.mint, symbol: p.symbol, pnl, reason, txid });
  handleTradeOutcome(pnl);
  if (realized < -Number(process.env.MAX_DRAWDOWN_SOL ?? 1)) {
    kill = true;
    broadcast({ type: "kill", reason: "drawdown" });
  }
}

setInterval(async () => {
  for (const k of Object.keys(positions)) {
    const p = positions[k];
    const solUsd = await getUsdPrice(SOL_MINT.toString());
    const price = await getPriceInSOL(p.mint, solUsd);
    if (price >= p.entry * (1 + TP_PCT) || price <= p.entry * (1 - SL_PCT)) {
      await closePosition(p, price >= p.entry ? "tp" : "sl");
    }
  }
}, 30_000);
