"use client";
import React, { useEffect, useState } from "react";

type ShadowTrade = { type: "shadow_trade"; mint: string; symbol: string; alloc: number; price: number };
type ShadowClose = { type: "shadow_close"; mint: string; pnl: number };

type Msg = ShadowTrade | ShadowClose;

interface Row {
  ts: number;
  symbol: string;
  pnl?: number;
  alloc?: number;
}

export default function Shadow() {
  const [rows, setRows] = useState([] as Row[]);

  useEffect(() => {
    const ws = new WebSocket(process.env.NEXT_PUBLIC_WS ?? "ws://localhost:8080");
    ws.onmessage = e => {
      try {
        const msg: Msg = JSON.parse(e.data);
        if (msg.type === "shadow_trade") {
          setRows(r => [{ ts: Date.now(), symbol: msg.symbol, alloc: msg.alloc }, ...r]);
        } else if (msg.type === "shadow_close") {
          setRows(r => [{ ts: Date.now(), symbol: msg.mint.slice(0,4), pnl: msg.pnl }, ...r]);
        }
      } catch {}
    };
    return () => ws.close();
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600 }}>Shadow Portfolio</h1>
      <table style={{ marginTop: 16 }}>
        <thead>
          <tr>
            <th>Time</th><th>Symbol</th><th>Alloc</th><th>PnL (SOL)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r,i)=>(
            <tr key={i}>
              <td>{new Date(r.ts).toLocaleTimeString()}</td>
              <td>{r.symbol}</td>
              <td>{r.alloc?.toFixed?.(2) ?? "-"}</td>
              <td>{r.pnl?.toFixed?.(3) ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
