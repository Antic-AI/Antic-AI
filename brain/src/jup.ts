import { JupiterApiClient } from "@jup-ag/api";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { loadKeypair } from "./keys.js";

const RPC = process.env.SOL_RPC ?? "https://api.mainnet-beta.solana.com";
const client = new JupiterApiClient("https://quote-api.jup.ag");
const kp = loadKeypair();
const connection = new Connection(RPC, "confirmed");
const SOL_MINT = "So11111111111111111111111111111111111111112";

async function buildAndSend(route: any): Promise<string | null> {
  const { swapTransaction } = await client.swapPost({ route, userPublicKey: kp.publicKey.toBase58() });
  const tx = Transaction.from(Buffer.from(swapTransaction, "base64"));
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  tx.feePayer = kp.publicKey;
  tx.partialSign(kp);
  return connection.sendRawTransaction(tx.serialize());
}

export async function swapSOLToToken(tokenMint: string, lamports: number, slippageBps = 50) {
  try {
    const quote = await client.quoteGet({ inputMint: SOL_MINT, outputMint: tokenMint, amount: lamports.toString(), slippageBps, swapMode: "ExactIn" });
    if (!quote.routes?.length) return null;
    return await buildAndSend(quote.routes[0]);
  } catch {
    return null;
  }
}

export async function swapTokenToSOL(tokenMint: string, amountToken: number, slippageBps = 50) {
  try {
    const quote = await client.quoteGet({ inputMint: tokenMint, outputMint: SOL_MINT, amount: amountToken.toString(), slippageBps, swapMode: "ExactIn" });
    if (!quote.routes?.length) return null;
    return await buildAndSend(quote.routes[0]);
  } catch {
    return null;
  }
}

export async function quoteOutAmount(tokenMint: string, lamports: number): Promise<number> {
  try {
    const q = await client.quoteGet({ inputMint: SOL_MINT, outputMint: tokenMint, amount: lamports.toString(), swapMode: "ExactIn" });
    return Number(q.outAmount) / 1e9;
  } catch {
    return 0;
  }
}
