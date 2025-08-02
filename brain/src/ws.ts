import * as ws from "ws";
import http from "http";

const port = Number(process.env.PORT ?? process.env.WS_PORT ?? 8080);

// Create a tiny HTTP server so platform health-checks (Railway/Vercel) get a
// 200 OK and keep the container alive. Attach WebSocketServer to the same
// underlying server so existing WS logic stays unchanged.
const server = http.createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("ok");
});

server.listen(port, () => {
  console.log(`WS+HTTP server listening on ${port}`);
});

// Attach ws to the HTTP server
// @ts-ignore
export const wss = new (ws as any).WebSocketServer({ server });

export function broadcast(data: any) {
  const json = JSON.stringify(data);
  for (const client of wss.clients) {
    // @ts-ignore – ws types use numeric enum for OPEN
    if (client.readyState === 1) client.send(json);
  }
}
