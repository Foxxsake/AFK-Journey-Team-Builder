import type { PlayerHero, HeroRarity, MetaConsensus } from '@/types';

const RARITY_BASE: Record<HeroRarity, number> = {
  s_level: 80,
  a_level: 55,
  rare_level: 30,
};

/**
 * Calculates a 0–100 base strength score for a hero.
 *
 * Priority:
 *   1. Meta consensus rating (if available and current enough)
 *   2. Hero's mode-specific rating (if available)
 *   3. Rarity-based fallback
 *
 * Meta consensus is used when available — it combines multiple
 * source ratings into a weighted consensus. If no consensus exists,
 * falls back to hero mode ratings, then rarity.
 *
 * IMPORTANT: Meta data does NOT override roster ownership.
 * A meta-top hero the player doesn't own remains unavailable.
 */
export function calculateHeroStrength(
  hero: PlayerHero,
  mode: { id: string },
  metaRatings?: unknown,
  metaConsensus?: Map<string, MetaConsensus>
): number {
  // 1. Check for meta consensus (from the data intelligence layer)
  if (metaConsensus) {
    const consensus = metaConsensus.get(`${hero.id}::${mode.id}`);
    if (consensus && consensus.consensusRating > 0) {
      return consensus.consensusRating;
    }
  }

  // 2. Check for hero's mode-specific rating
  if (hero.modeRatings && hero.modeRatings.length > 0) {
    const modeRating = hero.modeRatings.find((mr) => mr.modeId === mode.id);
    if (modeRating?.rating != null) {
      return Math.min(100, Math.max(0, modeRating.rating * 10));
    }
  }

  // 3. Fallback: rarity-based score
  return RARITY_BASE[hero.rarity] ?? 50;
}

export function calculateTeamHeroStrength(
  heroes: PlayerHero[],
  mode: { id: string },
  metaRatings?: unknown,
  metaConsensus?: Map<string, MetaConsensus>
): number {
  if (heroes.length === 0) return 0;
  const scores = heroes.map((h) => calculateHeroStrength(h, mode, metaRatings, metaConsensus));
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

/**
 * Calculate team meta score — the average consensus rating across
 * all heroes in the team for the given mode.
 * Returns 50 (neutral) if no consensus data exists for any hero.
 */
export function calculateTeamMetaScore(
  heroes: PlayerHero[],
  modeId: string,
  metaConsensus: Map<string, MetaConsensus>
): number {
  if (heroes.length === 0) return 50;

  const scores: number[] = [];
  for (const hero of heroes) {
    const consensus = metaConsensus.get(`${hero.id}::${modeId}`);
    if (consensus) {
      // Adjust by confidence: low confidence reduces effective score toward 50
      const confidenceAdjust = consensus.confidence === 'high' ? 1.0 : consensus.confidence === 'medium' ? 0.8 : 0.6;
      const adjusted = 50 + (consensus.consensusRating - 50) * confidenceAdjust;
      scores.push(adjusted);
    }
  }

  if (scores.length === 0) return 50;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}
