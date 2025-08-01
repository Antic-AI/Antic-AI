import WebSocket from "ws";

const port = Number(process.env.PORT ?? process.env.WS_PORT ?? 8080);
export const wss = new WebSocket.Server({ port });

export function broadcast(data: any) {
  const json = JSON.stringify(data);
  for (const c of wss.clients) {
    if (c.readyState === 1) c.send(json);
  }
}

console.log(`WS listening ${port}`);
