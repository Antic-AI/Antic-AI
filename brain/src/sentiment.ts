import fetch from "node-fetch";

interface Out {
  score: number;
  volume: number;
}

const GROK_URL = process.env.GROK_URL ?? "";
const GROK_KEY = process.env.GROK_KEY ?? "";

export async function getSentiment(symbol: string): Promise<Out> {
  try {
    const prompt = `For the last 100 tweets mentioning $${symbol} on crypto twitter give sentiment score between -1 and 1 and tweet count only as json {\"score\":number,\"volume\":number}`;
    const body = {
      model: "grok-1",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    };
    const r = await fetch(GROK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROK_KEY}`,
      },
      body: JSON.stringify(body),
    });
    const txt = await r.text();
    const m = txt.match(/\{[^}]+\}/);
    if (m) {
      const j = JSON.parse(m[0]);
      if (typeof j.score === "number" && typeof j.volume === "number") return j as Out;
    }
  } catch {}
  return { score: 0, volume: 0 };
}
