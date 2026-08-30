import type { SourceConfidence, ConfidenceResult, FreshnessCategory } from '@/types';

/**
 * Confidence calculator — produces a transparent confidence score
 * based on:
 *   - number of agreeing sources
 *   - source disagreement
 *   - freshness of the data
 *   - whether any official source is present
 *   - completeness of the data
 *
 * Returns a 0–100 score, a confidence level, and human-readable
 * reasons explaining the calculation.
 */

export interface ConfidenceInput {
  /** Number of sources providing data. */
  sourceCount: number;
  /** Whether sources disagree significantly (>1 tier apart). */
  hasDisagreement: boolean;
  /** Best freshness category among the sources. */
  bestFreshness: FreshnessCategory;
  /** Whether any official source is included. */
  hasOfficial: boolean;
  /** Whether the data has all expected fields (tier or rating). */
  isComplete: boolean;
}

export function calculateDataConfidence(input: ConfidenceInput): ConfidenceResult {
  const reasons: string[] = [];
  let score = 0;

  // 1. Source count contribution (0–35)
  if (input.sourceCount === 0) {
    return {
      score: 0,
      level: 'unknown',
      reasons: ['No source data available.'],
    };
  }
  if (input.sourceCount >= 3) {
    score += 35;
    reasons.push(`${input.sourceCount} sources provide data — high coverage.`);
  } else if (input.sourceCount === 2) {
    score += 25;
    reasons.push(`${input.sourceCount} sources provide data — moderate coverage.`);
  } else {
    score += 15;
    reasons.push(`${input.sourceCount} source provides data — limited coverage.`);
  }

  // 2. Agreement contribution (0–25)
  if (input.hasDisagreement) {
    score -= 15;
    reasons.push('Sources disagree significantly — confidence reduced.');
  } else if (input.sourceCount > 1) {
    score += 25;
    reasons.push('Sources agree — confidence increased.');
  } else {
    score += 10;
    reasons.push('Single source — agreement cannot be assessed.');
  }

  // 3. Freshness contribution (0–20)
  switch (input.bestFreshness) {
    case 'current':
      score += 20;
      reasons.push('Data is current (within 7 days).');
      break;
    case 'recent':
      score += 15;
      reasons.push('Data is recent (within 30 days).');
      break;
    case 'stale':
      score += 8;
      reasons.push('Data is stale (within 90 days) — reduced confidence.');
      break;
    case 'very_stale':
      score += 3;
      reasons.push('Data is very stale (over 90 days) — significantly reduced confidence.');
      break;
  }

  // 4. Official source bonus (0–10)
  if (input.hasOfficial) {
    score += 10;
    reasons.push('Official source present — increased confidence.');
  }

  // 5. Completeness contribution (0–10)
  if (input.isComplete) {
    score += 10;
  } else {
    score += 5;
    reasons.push('Data is incomplete — some fields missing.');
  }

  score = Math.min(100, Math.max(0, score));

  let level: SourceConfidence;
  if (score >= 70) level = 'high';
  else if (score >= 45) level = 'medium';
  else if (score >= 20) level = 'low';
  else level = 'unknown';

  return { score, level, reasons };
}
