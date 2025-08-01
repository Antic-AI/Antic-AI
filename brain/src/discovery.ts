import fetch from "node-fetch";
import { EventEmitter } from "events";

export interface Candidate {
  mint: string;
  symbol: string;
  liqUSD: number;
  ageMins: number;
}

const DEX_URL =
  "https://api.dexscreener.com/latest/trending/pairs/solana?limit=50";
const MIN_LIQ_USD = 20000;
const MAX_AGE_MINS = 7 * 24 * 60; // 7 days

export class Discovery extends EventEmitter {
  private timer?: NodeJS.Timeout;
  private seen = new Set<string>();

  start(intervalMs = 60_000) {
    this.loop();
    this.timer = setInterval(() => this.loop(), intervalMs);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
  }

  private async loop() {
    try {
      const res = await fetch(DEX_URL);
      if (!res.ok) return;
      const json: any = await res.json();
      const now = Date.now();
      (json?.pairs ?? []).forEach((p: any) => {
        const mint: string = p.baseToken?.address;
        if (!mint || this.seen.has(mint)) return;
        const liqUSD: number = Number(p.liquidity?.usd ?? 0);
        if (liqUSD < MIN_LIQ_USD) return;
        const ageMins = (now - (p.pairCreatedAt ?? 0) * 1000) / 60000;
        if (ageMins > MAX_AGE_MINS) return;
        const cand: Candidate = {
          mint,
          symbol: p.baseToken?.symbol ?? "?",
          liqUSD,
          ageMins,
        };
        this.seen.add(mint);
        this.emit("candidate", cand);
      });
    } catch (e) {
      // swallow
    }
  }
}
