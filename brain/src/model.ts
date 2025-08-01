export function score(features: number[]): number {
  const coef = [0.00002, 0.0000003, 0.05, -0.0005, 1.2, 0.002];
  const bias = -2;
  const z = features.reduce((acc, v, i) => acc + coef[i] * v, bias);
  return 1 / (1 + Math.exp(-z));
}
