"use client";
import React, { useEffect, useState } from "react";

type CandMsg = { type: "candidate"; mint: string; symbol: string; prob: number };
type TradeMsg = { type: "trade"; mint: string; symbol: string; prob: number; txid: string };
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
}

export default function Home() {
  const [cands, setCands] = useState({} as Record<string, CandRow>);
  const [trades, setTrades] = useState([] as TradeRow[]);

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
              <th>Tx</th>
            </tr>
          </thead>
          <tbody>
            {trades.map(t => (
              <tr key={t.txid}>
                <td>{new Date().toLocaleTimeString()}</td>
                <td>{t.symbol}</td>
                <td>{t.prob.toFixed(2)}</td>
                <td>
                  <a href={`https://solscan.io/tx/${t.txid}`} target="_blank">
                    link
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
