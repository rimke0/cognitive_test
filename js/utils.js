/** Statistical helpers for summary scores (trial-level RT lists in ms). */

export function median(values) {
  const v = values.filter((x) => Number.isFinite(x)).slice().sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

export function mean(values) {
  const v = values.filter((x) => Number.isFinite(x));
  if (!v.length) return null;
  return v.reduce((a, b) => a + b, 0) / v.length;
}

export function standardDeviation(values) {
  const m = mean(values);
  if (m === null) return null;
  const v = values.filter((x) => Number.isFinite(x));
  if (v.length < 2) return null;
  const s = v.reduce((acc, x) => acc + (x - m) ** 2, 0) / (v.length - 1);
  return Math.sqrt(s);
}

/** Coefficient of variation: SD / mean (dimensionless); undefined if mean ~ 0 */
export function coefficientOfVariation(values) {
  const m = mean(values);
  const sd = standardDeviation(values);
  if (m === null || sd === null || Math.abs(m) < 1e-9) return null;
  return sd / m;
}

export function randomInt(minInclusive, maxInclusive) {
  const a = Math.ceil(minInclusive);
  const b = Math.floor(maxInclusive);
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

/** Uniform random element from a non-empty array. */
export function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Random float in [min, max) */
export function randomFloat(min, max) {
  return min + Math.random() * (max - min);
}
