import { JupiterApiClient } from "@jup-ag/api";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { loadKeypair } from "./keys.js";

const RPC = process.env.SOL_RPC ?? "https://api.mainnet-beta.solana.com";
const client = new JupiterApiClient("https://quote-api.jup.ag");
const kp = loadKeypair();
const connection = new Connection(RPC, "confirmed");

export async function swapSOLToToken(tokenMint: string, lamports: number, slippageBps = 50): Promise<string | null> {
  try {
    const quote = await client.quoteGet({
      amount: lamports.toString(),
      inputMint: "So11111111111111111111111111111111111111112",
      outputMint: tokenMint,
      slippageBps,
      swapMode: "ExactIn",
    });
    if (!quote.routes?.length) return null;
    const route = quote.routes[0];
    const { swapTransaction } = await client.swapPost({ route, userPublicKey: kp.publicKey.toBase58() });
    const tx = Transaction.from(Buffer.from(swapTransaction, "base64"));
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.feePayer = kp.publicKey;
    tx.partialSign(kp);
    const txid = await connection.sendRawTransaction(tx.serialize());
    return txid;
  } catch {
    return null;
  }
}

export async function quoteOutAmount(tokenMint: string, lamports: number): Promise<number> {
  try {
    const q = await client.quoteGet({ amount: lamports.toString(), inputMint: "So11111111111111111111111111111111111111112", outputMint: tokenMint, swapMode: "ExactIn" });
    return Number(q.outAmount) / 1e9;
  } catch {
    return 0;
  }
}
