import { Candidate } from "./discovery.js";
import { RiskMetrics } from "./risk.js";

export function buildState(featureVec: number[], risk: RiskMetrics): Float32Array {
  // concat features + risk metrics (sd, var95, exposure)
  const arr = new Float32Array([...featureVec, risk.sd, risk.var95, risk.exposure]);
  return arr;
}
