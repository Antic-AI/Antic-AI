import { EventEmitter } from "events";
import { getSentiment } from "./sentiment.js";

interface CacheEntry {
  score: number;
  volume: number;
  ts: number;
}

export class SentimentStream extends EventEmitter {
  private cache: Map<string, CacheEntry> = new Map();
  private queue: Set<string> = new Set();
  private timer?: NodeJS.Timeout;
  private ttlMs = 60_000;

  track(symbol: string) {
    this.queue.add(symbol);
  }

  get(symbol: string): { score: number; volume: number } | null {
    const e = this.cache.get(symbol);
    if (e && Date.now() - e.ts < this.ttlMs) return { score: e.score, volume: e.volume };
    return null;
  }

  start(interval = 5_000) {
    if (this.timer) return;
    this.timer = setInterval(() => this.loop(), interval);
  }

  private async loop() {
    const symbols = Array.from(this.queue);
    this.queue.clear();
    for (const sym of symbols) {
      try {
        const res = await getSentiment(sym);
        this.cache.set(sym, { ...res, ts: Date.now() });
        this.emit("update", sym, res);
      } catch {}
    }
  }
}
