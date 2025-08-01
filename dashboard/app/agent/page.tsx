"use client";
import React, { useEffect, useState } from "react";

type AgentMsg = { type: "agent"; mint: string; symbol: string; alloc: number };

export default function AgentView() {
  const [events, setEvents] = useState<AgentMsg[]>([]);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_WS ?? "ws://localhost:8080";
    const ws = new WebSocket(url);
    ws.onmessage = e => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "agent") {
          setEvents(ev => [msg as AgentMsg, ...ev.slice(0, 99)]);
        }
      } catch {}
    };
    return () => ws.close();
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600 }}>Agent Decisions</h1>
      <table style={{ marginTop: 16 }}>
        <thead>
          <tr>
            <th>Time</th>
            <th>Symbol</th>
            <th>Allocation</th>
          </tr>
        </thead>
        <tbody>
          {events.map(ev => (
            <tr key={ev.mint + ev.alloc + ev.symbol + Math.random()}>
              <td>{new Date().toLocaleTimeString()}</td>
              <td>{ev.symbol}</td>
              <td>{ev.alloc.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
