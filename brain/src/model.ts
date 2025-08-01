import { predict } from "./lgbm.js";

let fallbackWeights: number[] | null = null;

function fallbackScore(f: number[]): number {
  if (!fallbackWeights) {
    const base = [0.00002, 0.0000003, 0.05, -0.0005, 1.2, 0.002];
    fallbackWeights = base.concat(Array(20).fill(0.001));
  }
  const bias = -2;
  const z = f.reduce((acc, v, i) => acc + (fallbackWeights![i] ?? 0) * v, bias);
  return 1 / (1 + Math.exp(-z));
}

export async function score(features: number[]): Promise<number> {
  try {
    return await predict(features);
  } catch {
    return fallbackScore(features);
  }
}
