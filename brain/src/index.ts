import { Discovery } from "./discovery.js";

console.log("Antic brain booting...");

const discovery = new Discovery();
import { buildFeatures } from "./features.js";
import { score } from "./model.js";
import { SentimentStream } from "./sentimentStream.js";

interface Ranked {
  candidate: any;
  prob: number;
}
import { broadcast } from "./ws.js";
import { maybeTrade } from "./trader.js";

const top: Ranked[] = [];
const sentiment = new SentimentStream();
sentiment.start();

import { vetToken } from "./quality.js";

discovery.on("candidate", async c => {
  sentiment.track(c.symbol);
  let sent = sentiment.get(c.symbol);
  if (!sent) {
    // fallback immediate fetch
    const { getSentiment } = await import("./sentiment.js");
    sent = await getSentiment(c.symbol);
  }
  const vet = await vetToken(c.mint);
  if (!vet.ok) {
    broadcast({ type: "skip", mint: c.mint, reason: "vet_fail" });
    return;
  }
  const feat = await buildFeatures(c, sent);
  const prob = await score(feat.vec);
  broadcast({ type: "candidate", mint: c.mint, symbol: c.symbol, prob });
  await maybeTrade(c, prob);
  top.push({ candidate: c, prob });
  top.sort((a, b) => b.prob - a.prob);
  if (top.length > 10) top.pop();
});

discovery.start();
