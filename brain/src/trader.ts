import { Candidate } from "./discovery.js";
import { broadcast } from "./ws.js";

const OPEN: Record<string, boolean> = {};
const PROB_TH = 0.8;

export async function maybeTrade(c: Candidate, prob: number) {
  if (prob < PROB_TH) return;
  if (OPEN[c.mint]) return;
  OPEN[c.mint] = true;
  // placeholder exec – integrate Jupiter later
  const txid = `sim-${Math.random().toString(36).slice(2, 10)}`;
  broadcast({ type: "trade", mint: c.mint, symbol: c.symbol, prob, txid });
  console.log("TRADE", c.symbol, prob.toFixed(2), txid);
}
