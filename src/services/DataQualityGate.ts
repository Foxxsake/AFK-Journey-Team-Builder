import type { SourceConfidence } from '@/types';
import type { DotGGHeroRaw } from '@/data/sources/dotgg/validator';

/**
 * Data Quality Gate — inspects external source data before allowing
 * it to influence the optimiser's meta consensus.
 *
 * The primary purpose is to detect suspicious/placeholder data patterns
 * that would corrupt optimiser results if fed into the consensus engine.
 *
 * Detected patterns:
 *   1. All heroes have identical tier values (e.g. all 'S')
 *      AND all evaluation scores are zero.
 *      → This is a clear placeholder/default pattern.
 *
 *   2. All evaluation scores are zero regardless of tier variety.
 *      → Suggests ratings haven't been evaluated yet.
 *
 *   3. No tier data at all across the entire response.
 *      → Source returned hero data but no ratings.
 *
 * Quality levels:
 *   "valid"      — data passes all checks, can influence consensus
 *   "suspicious" — data has red flags, must NOT influence consensus
 *                  (records are retained as raw source data)
 *   "invalid"    — data is structurally broken or empty
 */

export type DataQualityLevel = 'valid' | 'suspicious' | 'invalid';

export interface DataQualityResult {
  level: DataQualityLevel;
  confidence: SourceConfidence;
  valid: boolean;
  reasons: string[];
  recordsReceived: number;
  recordsUsable: number;
  suspiciousPatterns: string[];
  /** Human-readable explanation for UI display. */
  explanation: string;
}

/**
 * Evaluate the quality of a DotGG API response.
 *
 * @param heroes  Validated hero entries from the API
 * @returns Quality assessment
 */
export function evaluateDotGGQuality(heroes: DotGGHeroRaw[]): DataQualityResult {
  const reasons: string[] = [];
  const suspiciousPatterns: string[] = [];
  let recordsUsable = 0;

  if (heroes.length === 0) {
    return {
      level: 'invalid',
      confidence: 'unknown',
      valid: false,
      reasons: ['No heroes received from API.'],
      recordsReceived: 0,
      recordsUsable: 0,
      suspiciousPatterns: [],
      explanation: 'No data received from DotGG.',
    };
  }

  const heroesWithTiers = heroes.filter((h) => h.tiers && Object.keys(h.tiers).length > 0);
  const heroesWithEval = heroes.filter(
    (h) => h.tiersEval && Object.keys(h.tiersEval).length > 0
  );

  if (heroesWithTiers.length === 0) {
    return {
      level: 'suspicious',
      confidence: 'low',
      valid: false,
      reasons: ['No tier data found in any hero record.'],
      recordsReceived: heroes.length,
      recordsUsable: 0,
      suspiciousPatterns: ['no_tier_data'],
      explanation: 'DotGG returned hero data but no tier ratings.',
    };
  }

  // Collect all tier values across all heroes and modes
  const allTierValues: string[] = [];
  const tierValueSet = new Set<string>();

  for (const hero of heroesWithTiers) {
    for (const tier of Object.values(hero.tiers!)) {
      const upper = String(tier).toUpperCase();
      allTierValues.push(upper);
      tierValueSet.add(upper);
    }
  }

  // Pattern 1: All identical tier values
  const allSameTier = tierValueSet.size === 1;

  // Pattern 2: All evaluation scores are zero
  let allEvalZero = true;
  if (heroesWithEval.length > 0) {
    for (const hero of heroesWithEval) {
      for (const evalVal of Object.values(hero.tiersEval!)) {
        const numVal = parseFloat(String(evalVal));
        if (!isNaN(numVal) && numVal !== 0) {
          allEvalZero = false;
          break;
        }
      }
      if (!allEvalZero) break;
    }
  } else {
    // No eval data at all — treat as zero eval
    allEvalZero = true;
  }

  // Apply quality checks
  if (allSameTier && allEvalZero) {
    suspiciousPatterns.push('all_identical_tiers_with_zero_eval');
    const tierValue = allTierValues[0];
    reasons.push(
      `All ${heroesWithTiers.length} heroes with tier data have identical tier "${tierValue}" with zero evaluation scores — this appears to be placeholder/default data.`
    );
  }

  if (allSameTier && !allEvalZero) {
    // All same tier but with non-zero evals — could be legitimate if all heroes are genuinely S-tier
    // but still worth flagging for review
    suspiciousPatterns.push('all_identical_tiers');
    reasons.push(
      `All heroes share the same tier "${allTierValues[0]}". This is unusual and warrants review, but evaluation scores are non-zero.`
    );
  }

  if (!allSameTier && allEvalZero) {
    suspiciousPatterns.push('all_zero_eval');
    reasons.push(
      'All evaluation scores are zero. Tier values may be stale or unevaluated.'
    );
  }

  // Determine quality level
  let level: DataQualityLevel = 'valid';
  let confidence: SourceConfidence = 'medium';

  if (suspiciousPatterns.includes('all_identical_tiers_with_zero_eval')) {
    level = 'suspicious';
    confidence = 'low';
    recordsUsable = 0; // Suspicious data must not influence consensus
  } else if (suspiciousPatterns.includes('all_zero_eval')) {
    level = 'suspicious';
    confidence = 'low';
    recordsUsable = 0;
  } else if (suspiciousPatterns.includes('all_identical_tiers')) {
    // Flagged but still usable with reduced confidence
    level = 'valid';
    confidence = 'low';
    recordsUsable = heroesWithTiers.length;
    reasons.push('Data retained with reduced confidence due to identical tier pattern.');
  } else {
    // Normal case: varied tiers with non-zero evals
    recordsUsable = heroesWithTiers.length;
    reasons.push(`${heroesWithTiers.length} heroes have varied tier data with non-zero evaluation scores.`);
  }

  // Final validity
  const valid = level === 'valid';

  // Build explanation
  let explanation: string;
  if (level === 'suspicious') {
    explanation = 'Tier data appears suspicious — meta influence disabled. Raw records retained.';
  } else if (level === 'valid') {
    explanation = `${recordsUsable} records usable for consensus.`;
  } else {
    explanation = 'No usable data received.';
  }

  return {
    level,
    confidence,
    valid,
    reasons,
    recordsReceived: heroes.length,
    recordsUsable,
    suspiciousPatterns,
    explanation,
  };
}

/**
 * Evaluate quality from a processed DotGG fetch result's raw hero data.
 * This is a convenience wrapper for the adapter flow.
 */
export function evaluateQualityFromHeroes(
  heroes: Array<{ tiers?: Record<string, string>; tiersEval?: Record<string, string> }>
): DataQualityResult {
  // Cast to DotGGHeroRaw shape — the validator guarantees these fields
  return evaluateDotGGQuality(heroes as DotGGHeroRaw[]);
}
