import ort from "onnxruntime-node";

let session: ort.InferenceSession | null = null;

import fs from "fs";
let lastM = 0;
export async function loadPolicy(modelPath = "model/policy.onnx") {
  if (session) return session;
  try {
    session = await ort.InferenceSession.create(modelPath, { executionProviders: ["cpu"] });
    console.log("PPO policy loaded");
  } catch {
    console.warn("PPO model missing, using random allocation");
  }
  return session;
}

// hot reload checker
setInterval(() => {
  const p = "model/policy.onnx";
  if (!fs.existsSync(p)) return;
  const m = fs.statSync(p).mtimeMs;
  if (m > lastM) {
    lastM = m;
    session = null;
    console.log("policy hot-reload scheduled");
  }
}, 60_000);

export async function decide(state: Float32Array): Promise<number> {
  const sess = await loadPolicy();
  if (!sess) {
    // fallback: random exploratory action -0.1..0.1
    return (Math.random() - 0.5) * 0.2;
  }
  const tensor = new ort.Tensor("float32", state, [1, state.length]);
  const feeds: Record<string, ort.Tensor> = { input: tensor };
  const results = await sess.run(feeds);
  const output = results[Object.keys(results)[0]] as ort.Tensor;
  return output.data[0] as number;
}
