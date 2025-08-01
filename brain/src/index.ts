import { Discovery } from "./discovery.js";

console.log("Antic brain booting...");

const discovery = new Discovery();
import { getSentiment } from "./sentiment.js";
import { buildFeatures } from "./features.js";
import { score } from "./model.js";

interface Ranked {
  candidate: any;
  prob: number;
}
import { broadcast } from "./ws.js";
import { maybeTrade } from "./trader.js";

const top: Ranked[] = [];

discovery.on("candidate", async c => {
  const sent = await getSentiment(c.symbol);
  const feat = await buildFeatures(c, sent);
  const prob = score(feat.vec);
  broadcast({ type: "candidate", mint: c.mint, symbol: c.symbol, prob });
  await maybeTrade(c, prob);
  top.push({ candidate: c, prob });
  top.sort((a, b) => b.prob - a.prob);
  if (top.length > 10) top.pop();
});

discovery.start();
