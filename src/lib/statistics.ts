/**
 * Calculates the Wilson Score Interval for a proportion.
 * This is much more accurate than the Normal Approximation (Wald) for small sample sizes
 * (e.g., ad clicks/conversions) and extreme probabilities (near 0% or 100%).
 * 
 * @param count Number of successes (e.g., Messages)
 * @param total Number of trials (e.g., Clicks)
 * @param z Z-score (1.0 = 68%, 1.44 = 85%, 1.96 = 95%). Default 1.0 for "Expected Range"
 * @returns [low, high] percentages (0-100)
 */
export function calculateConfidenceInterval(count: number, total: number, z = 1.0): [number, number] {
  if (total === 0) return [0, 0];

  const p = count / total;
  const n = total;
  
  // Wilson Score Interval Formula
  const factor1 = 1 / (1 + (z * z) / n);
  const factor2 = p + (z * z) / (2 * n);
  const factor3 = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));

  const low = factor1 * (factor2 - factor3);
  const high = factor1 * (factor2 + factor3);

  // Clamp between 0 and 100
  return [
    Math.max(0, low * 100), 
    Math.min(100, high * 100)
  ];
}

/**
 * Calculates the percentage contribution of each metric to the change in Sales.
 * Uses a simplified attribution model.
 */
export function calculateDecomposition(
  current: { spend: number; cpc: number; msgRate: number; closeRate: number },
  benchmark: { spend: number; cpc: number; msgRate: number; closeRate: number }
) {
  if (benchmark.spend === 0 || benchmark.cpc === 0) return null;

  // Calculate raw % changes
  const spendDiff = (current.spend - benchmark.spend) / benchmark.spend;
  // CPC inverse: Higher CPC = Lower Sales. 
  // If CPC goes 1.0 -> 1.2 (+20%), Impact is roughly -16% (1/1.2 - 1)
  const cpcImpact = (benchmark.cpc / current.cpc) - 1; 
  
  const msgRateDiff = (current.msgRate - benchmark.msgRate) / benchmark.msgRate;
  const closeRateDiff = (current.closeRate - benchmark.closeRate) / benchmark.closeRate;

  return {
    spend: spendDiff * 100,
    cpc: cpcImpact * 100,
    msgRate: msgRateDiff * 100,
    closeRate: closeRateDiff * 100,
  };
}

export const THRESHOLDS = {
  LOW_DATA_CLICKS: 100,
  LOW_DATA_MESSAGES: 10,
  WARNING_VARIANCE: -15, // % drop to trigger yellow
  CRITICAL_VARIANCE: -25, // % drop to trigger red
};
