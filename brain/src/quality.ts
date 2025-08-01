import fetch from "node-fetch";

export interface VetResult {
  ok: boolean;
  holders: number;
  creatorPct: number;
}

const CACHE = new Map<string, VetResult>();

export async function vetToken(mint: string): Promise<VetResult> {
  if (CACHE.has(mint)) return CACHE.get(mint)!;
  try {
    const url = `https://public-api.birdeye.so/defi/token_stats?address=${mint}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error("bad resp");
    const j: any = await r.json();
    const data = j?.data ?? {};
    const holders = Number(data.holders ?? 0);
    const creatorPct = Number(data.creator_hold_percent ?? 0);
    const ok = holders >= 200 && creatorPct <= 10;
    const res = { ok, holders, creatorPct };
    CACHE.set(mint, res);
    return res;
  } catch {
    const res = { ok: false, holders: 0, creatorPct: 100 };
    CACHE.set(mint, res);
    return res;
  }
}
