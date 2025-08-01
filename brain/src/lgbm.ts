import fs from "fs";
import path from "path";

let booster: any = null;

async function lazyLoad() {
  if (booster !== null) return booster;
  try {
    // dynamic import so build doesn’t fail if package missing
    const lgbm = await import("lightgbm-js");
    const modelPath = path.resolve("model/pump_model.txt");
    if (!fs.existsSync(modelPath)) throw new Error("model missing");
    const txt = fs.readFileSync(modelPath, "utf8");
    booster = await lgbm.default.loadModel(txt);
    return booster;
  } catch {
    booster = undefined; // sentinel for unavailable
    return booster;
  }
}

export async function predict(features: number[]): Promise<number> {
  const b = await lazyLoad();
  if (!b) {
    // fallback linear heuristic
    const w = [0.00002, 0.0000003, 0.05, -0.0005, 1.2, 0.002];
    const bias = -2;
    const z = features.reduce((acc, v, i) => acc + (w[i] ?? 0.001) * v, bias);
    return 1 / (1 + Math.exp(-z));
  }
  const res = b.predict([features]);
  return res[0] as number;
}
