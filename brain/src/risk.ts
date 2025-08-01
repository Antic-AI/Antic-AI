import { broadcast } from "./ws.js";

const pnlHistory: number[] = [];
const window = 50; // last 50 trades
const targetVaR = 0.1; // desired VaR in SOL
const baseSize = Number(process.env.BASE_SIZE_SOL ?? 0.05);

export function recordPnl(pnl: number) {
  pnlHistory.push(pnl);
  if (pnlHistory.length > window) pnlHistory.shift();
}

function stdev(arr: number[]): number {
  const m = arr.reduce((a, b) => a + b, 0) / arr.length;
  const v = arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length;
  return Math.sqrt(v);
}

export interface RiskMetrics { sd: number; var95: number; exposure: number }
let lastSd = 0;
let lastVar = 0;
let lastExpo = 0;

export function recommendedSize(): number {
  if (pnlHistory.length < 10) return baseSize;
  const sd = stdev(pnlHistory);
  const var95 = sd * 1.65; // assuming mean ~0
  if (var95 === 0) return baseSize;
  const scale = targetVaR / var95;
  const size = Math.min(baseSize * Math.max(0.2, scale), baseSize * 5);
  lastSd = sd; lastVar = var95;
  return size;
}

export function snapshotRisk(exposure: number): RiskMetrics {
  lastExpo = exposure;
  return { sd: lastSd, var95: lastVar, exposure };
}

let lastLossTs = 0;
const cooldownMs = 5 * 60_000; // 5 min

export function canTrade(): boolean {
  return Date.now() - lastLossTs > cooldownMs;
}

export function handleTradeOutcome(pnl: number) {
  recordPnl(pnl);
  if (pnl < 0) lastLossTs = Date.now();
  broadcast({ type: "risk", sd: stdev(pnlHistory), var95: recommendedSize() });
}
