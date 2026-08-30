import type {
  SourceMetaRecord,
  MetaConsensus,
  GameModeId,
  FreshnessCategory,
  SourceConfidence,
} from '@/types';
import { getSource, getSourceWeight, sourcesById } from '@/data/sources';
import { calculateFreshness, freshnessWeight } from './FreshnessCalculator';
import { calculateDataConfidence } from './ConfidenceCalculator';

/**
 * Meta consensus engine — combines ratings from multiple sources
 * into a single consensus rating for a hero in a game mode.
 *
 * The consensus is a weighted average where weights are:
 *   source reliability × freshness multiplier
 *
 * The engine does NOT blindly trust one source. It stores all
 * source records and computes its own consensus.
 *
 * Disagreement detection:
 *   If sources differ by more than one tier level, the consensus
 *   flags disagreement and reduces confidence.
 */

const TIER_ORDER = ['S+', 'S', 'A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D'];

/** Maps tier to a contiguous numeric scale (S+ = 10, S = 9, A+ = 8, ... D = 1). */
function tierToNumeric(tier?: string): number | null {
  if (!tier) return null;
  const idx = TIER_ORDER.indexOf(tier.toUpperCase());
  if (idx >= 0) return TIER_ORDER.length - idx;
  return null;
}

/** Maps a numeric value (0–100) back to a tier label. */
function numericToTier(value: number): string {
  // Map 0–100 to tier index: 100 -> S+, 90 -> S, 80 -> A+, etc.
  const tierIndex = Math.round((100 - value) / 10);
  if (tierIndex < 0) return TIER_ORDER[0];
  if (tierIndex >= TIER_ORDER.length) return TIER_ORDER[TIER_ORDER.length - 1];
  return TIER_ORDER[tierIndex];
}

function ratingToNumeric(rating?: number): number | null {
  if (rating == null) return null;
  return Math.min(10, Math.max(0, rating));
}

function normalizeTo100(value: number, scale: number): number {
  return (value / scale) * 100;
}

/**
 * Calculate meta consensus for a single hero in a single mode.
 *
 * @param records  All source meta records for this hero+mode
 * @param heroId   Canonical hero ID
 * @param modeId   Game mode ID
 * @param weights  Optional override of source weights
 */
export function calculateMetaConsensus(
  records: SourceMetaRecord[],
  heroId: string,
  modeId: GameModeId,
  weights?: Record<string, number>
): MetaConsensus | null {
  // Filter to records matching this hero and mode
  const relevant = records.filter(
    (r) => r.heroId === heroId && r.modeId === modeId
  );

  if (relevant.length === 0) return null;

  // Build per-source weighted contributions
  const sourceEntries: MetaConsensus['sources'] = [];
  const weightedValues: number[] = [];
  const weightSum: number[] = [];
  const tiers: string[] = [];

  let bestFreshness: FreshnessCategory = 'very_stale';
  const freshnessOrder: Record<FreshnessCategory, number> = {
    current: 0,
    recent: 1,
    stale: 2,
    very_stale: 3,
  };

  for (const record of relevant) {
    const source = getSource(record.sourceId);
    const sourceWeight = getSourceWeight(record.sourceId, weights);
    const freshness = calculateFreshness(record.retrievedAt);
    const fWeight = freshnessWeight(freshness);
    const combinedWeight = sourceWeight * fWeight;

    // Get a numeric value from either tier or rating
    let numericValue: number | null = null;
    if (record.rating != null) {
      numericValue = normalizeTo100(ratingToNumeric(record.rating)!, 10);
    } else if (record.tier) {
      const tierNum = tierToNumeric(record.tier);
      if (tierNum != null) {
        numericValue = normalizeTo100(tierNum, TIER_ORDER.length);
      }
    }

    if (numericValue != null) {
      weightedValues.push(numericValue * combinedWeight);
      weightSum.push(combinedWeight);
    }

    if (record.tier) tiers.push(record.tier);

    if (freshnessOrder[freshness] < freshnessOrder[bestFreshness]) {
      bestFreshness = freshness;
    }

    sourceEntries.push({
      sourceId: record.sourceId,
      sourceName: source?.name ?? record.sourceId,
      tier: record.tier,
      rating: record.rating,
      weight: combinedWeight,
      freshness,
      retrievedAt: record.retrievedAt,
    });
  }

  if (weightSum.length === 0 || weightSum.reduce((a, b) => a + b, 0) === 0) {
    return null;
  }

  // Weighted average
  const totalWeight = weightSum.reduce((a, b) => a + b, 0);
  const consensusRating = Math.round(
    weightedValues.reduce((a, b) => a + b, 0) / totalWeight
  );

  const consensusTier = numericToTier(consensusRating);

  // Agreement detection — uses tier position in TIER_ORDER,
  // not the numeric scale, so S→A (2 positions) is "medium",
  // not "low".
  const tierIndices = tiers
    .map((t) => TIER_ORDER.indexOf(t.toUpperCase()))
    .filter((idx) => idx >= 0);

  let agreement: 'high' | 'medium' | 'low' = 'high';
  let hasDisagreement = false;

  if (tierIndices.length > 1) {
    const maxIdx = Math.max(...tierIndices);
    const minIdx = Math.min(...tierIndices);
    const tierSpread = maxIdx - minIdx;

    // 0 positions = same tier = high
    // 1-2 positions = one tier step = medium
    // 3+ positions = significant disagreement = low
    if (tierSpread > 2) {
      agreement = 'low';
      hasDisagreement = true;
    } else if (tierSpread > 0) {
      agreement = 'medium';
    } else {
      agreement = 'high';
    }
  }

  // Confidence calculation
  const hasOfficial = relevant.some((r) => {
    const source = sourcesById[r.sourceId];
    return source?.type === 'official';
  });

  const isComplete = relevant.every((r) => r.tier != null || r.rating != null);

  const confidenceResult = calculateDataConfidence({
    sourceCount: relevant.length,
    hasDisagreement,
    bestFreshness,
    hasOfficial,
    isComplete,
  });

  const lastUpdated = relevant
    .map((r) => r.retrievedAt)
    .sort()
    .pop() ?? new Date().toISOString();

  return {
    heroId,
    modeId,
    consensusRating,
    consensusTier,
    agreement,
    sources: sourceEntries,
    confidence: confidenceResult.level,
    lastUpdated,
    hasDisagreement,
  };
}

/**
 * Calculate consensus for all heroes in a mode.
 * Returns a map of heroId -> MetaConsensus.
 */
export function calculateModeConsensus(
  records: SourceMetaRecord[],
  modeId: GameModeId,
  weights?: Record<string, number>
): Map<string, MetaConsensus> {
  const result = new Map<string, MetaConsensus>();

  // Get unique hero IDs from records for this mode
  const heroIds = new Set(
    records.filter((r) => r.modeId === modeId).map((r) => r.heroId)
  );

  for (const heroId of heroIds) {
    const consensus = calculateMetaConsensus(records, heroId, modeId, weights);
    if (consensus) {
      result.set(heroId, consensus);
    }
  }

  return result;
}

/**
 * Calculate consensus for all hero-mode pairs in the dataset.
 */
export function calculateAllConsensus(
  records: SourceMetaRecord[],
  weights?: Record<string, number>
): MetaConsensus[] {
  const results: MetaConsensus[] = [];

  // Get unique hero-mode pairs
  const pairs = new Set(
    records.map((r) => `${r.heroId}::${r.modeId}`)
  );

  for (const pair of pairs) {
    const [heroId, modeId] = pair.split('::');
    const consensus = calculateMetaConsensus(records, heroId, modeId, weights);
    if (consensus) {
      results.push(consensus);
    }
  }

  return results;
}
