import ws from "ws";

const port = Number(process.env.PORT ?? process.env.WS_PORT ?? 8080);
export const wss = new ws.Server({ port });

export function broadcast(data: any) {
  const json = JSON.stringify(data);
  for (const client of wss.clients) {
    // @ts-ignore
    if (client.readyState === 1) client.send(json);
  }
}

console.log(`WS listening ${port}`);
