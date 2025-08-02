import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import fs from "fs";

export function loadKeypair(): Keypair {
  const raw = process.env.KEYPAIR;
  if (!raw || raw.trim() === "") {
    console.error("[WARN] KEYPAIR env is missing or empty – generating ephemeral keypair (trading disabled).");
    return Keypair.generate();
  }
  const kpStr = raw.trim();

  try {
    // JSON array directly in env
    if (kpStr.startsWith("[")) {
      return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(kpStr)));
    }

    // Base58 secret key string
    if (!kpStr.includes("/")) {
      return Keypair.fromSecretKey(bs58.decode(kpStr));
    }

    // Treat as file path
    const content = fs.readFileSync(kpStr, "utf8").trim();
    if (content.startsWith("[")) {
      return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(content)));
    }
    return Keypair.fromSecretKey(bs58.decode(content));
  } catch (err) {
    console.error("[WARN] Failed to parse KEYPAIR – continuing with random keypair (trading disabled).", (err as Error)?.message || err);
    return Keypair.generate();
  }
}
