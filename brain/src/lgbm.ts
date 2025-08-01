import fs from "fs";
import path from "path";
import lightgbm from "lightgbm-js";

let booster: any;

export async function loadModel(modelPath = "model/pump_model.txt") {
  if (booster) return booster;
  const abs = path.resolve(process.cwd(), modelPath);
  if (!fs.existsSync(abs)) throw new Error("LightGBM model file missing");
  const txt = fs.readFileSync(abs, "utf8");
  booster = await lightgbm.loadModel(txt);
  return booster;
}

export async function predict(features: number[]): Promise<number> {
  const booster = await loadModel();
  const res = booster.predict([features]);
  return res[0]; // probability 0-1
}
