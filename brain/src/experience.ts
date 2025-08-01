import fs from "fs";
import path from "path";

export interface Step {
  s: number[];
  a: number;
  r: number;
  s2: number[];
  ts: number;
}

const file = path.resolve("data/replay.jsonl");
fs.mkdirSync(path.dirname(file), { recursive: true });

export function logStep(step: Step) {
  fs.appendFile(file, JSON.stringify(step) + "\n", () => {});
}
