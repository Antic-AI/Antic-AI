/* Placeholder quick trainer: computes average reward from replay buffer and copies a baseline policy if not present. Replace with real PPO training pipeline later. */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const replayPath = path.resolve(__dirname, '../data/replay.jsonl');
const modelDir   = path.resolve(__dirname, '../brain/model');
const policyPath = path.join(modelDir, 'policy.onnx');

let rewards = [];
if (fs.existsSync(replayPath)) {
  const lines = fs.readFileSync(replayPath, 'utf8').trim().split('\n');
  for (const l of lines) {
    try {
      const { r } = JSON.parse(l);
      rewards.push(r);
    } catch {}
  }
}
const avg = rewards.length ? (rewards.reduce((a,b)=>a+b,0)/rewards.length).toFixed(4) : 'n/a';
console.log(`replay steps: ${rewards.length}, avg reward: ${avg}`);

// Stub: if no policy file, copy baseline random ONNX (stored in repo as random.onnx)
const baseline = path.resolve(__dirname, 'random.onnx');
if (!fs.existsSync(policyPath) && fs.existsSync(baseline)) {
  fs.mkdirSync(modelDir, { recursive: true });
  fs.copyFileSync(baseline, policyPath);
  console.log('baseline policy copied to brain/model/policy.onnx');
} else {
  console.log('no training run executed (stub)');
}
