"use client";
import React, { useEffect, useState } from "react";

type CandMsg = { type: "candidate"; mint: string; symbol: string; prob: number };
type TradeMsg = { type: "trade"; mint: string; symbol: string; prob: number; txid: string; reason?: string };
type CloseMsg = { type: "close"; mint: string; symbol: string; pnl: number; reason: string; txid: string };
type KillMsg = { type: "kill"; reason: string };

type Msg = CandMsg | TradeMsg | CloseMsg | KillMsg;

interface CandRow {
  symbol: string;
  prob: number;
}
interface TradeRow {
  symbol: string;
  prob: number;
  txid: string;
  reason?: string;
}

export default function Home() {
  const [cands, setCands] = useState<Record<string, CandRow>>({});
    const [balance] = useState(10.0);
  const [pnl] = useState(1.25);
  const [winRate] = useState(66);

  const [trades, setTrades] = useState<TradeRow[]>([
    { symbol: "BONK", prob: 0.92, txid: "demo1", reason: "Momentum + sentiment" },
    { symbol: "POPC", prob: 0.88, txid: "demo2", reason: "Liquidity spike" },
  ]);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_WS ?? "ws://localhost:8080";
    const ws = new WebSocket(url);
    ws.onmessage = e => {
      try {
        const msg: Msg = JSON.parse(e.data);
        if (msg.type === "candidate") {
          setCands(c => ({ ...c, [msg.mint]: { symbol: msg.symbol, prob: msg.prob } }));
        } else if (msg.type === "trade") {
          setTrades(t => [{ symbol: msg.symbol, prob: msg.prob, txid: msg.txid }, ...t]);
        } else if (msg.type === "close") {
          setTrades(t => [{ symbol: msg.symbol, prob: msg.pnl, txid: msg.txid }, ...t]);
        }
      } catch {}
    };
    return () => ws.close();
  }, []);

  const candList: CandRow[] = (Object.values(cands) as CandRow[])
    .sort((a, b) => b.prob - a.prob)
    .slice(0, 20);

  return (
    <main style={{ padding: 24, fontFamily: "sans-serif" }}>
      <div style={{ display: 'flex', gap: 24 }}>
        <div>Balance SOL: {balance.toFixed(2)}</div>
        <div>Total PnL SOL: {pnl.toFixed(2)}</div>
        <div>Win Rate: {winRate}%</div>
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 600 }}>Antic Dashboard</h1>
      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 18 }}>Top Candidates</h2>
        <table>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Prob</th>
            </tr>
          </thead>
          <tbody>
            {candList.map(c => (
              <tr key={c.symbol}>
                <td>{c.symbol}</td>
                <td>{c.prob.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 18 }}>Trades</h2>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Symbol</th>
              <th>Prob</th>
              <th>Reason</th><th>Tx</th>
            </tr>
          </thead>
          <tbody>
            {trades.map(t => (
              <tr key={t.txid}>
                <td>{new Date().toLocaleTimeString()}</td>
                <td>{t.symbol}</td>
                <td>{t.prob.toFixed(2)}</td>
                <td>{t.reason ?? "-"}</td>
                <td><a href={`https://solscan.io/tx/${t.txid}`} target="_blank">link</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
