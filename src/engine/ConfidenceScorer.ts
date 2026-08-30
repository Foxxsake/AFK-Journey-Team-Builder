import type { PlayerHero, SourceConfidence } from '@/types';

const CONFIDENCE_VALUES: Record<SourceConfidence, number> = {
  high: 100,
  medium: 75,
  low: 50,
  unknown: 25,
};

/**
 * Calculates a data confidence score for the team.
 *
 * This reflects how reliable the underlying hero data is.
 * If heroes have high-confidence sources, the team's score
 * is more trustworthy. If data is unverified, confidence is
 * lowered — this does NOT reduce the team's actual quality,
 * but it signals to the user that the recommendation is based
 * on less reliable information.
 */
export function calculateConfidence(heroes: PlayerHero[]): number {
  if (heroes.length === 0) return 0;

  const scores = heroes.map((hero) => {
    if (!hero.sources || hero.sources.length === 0) return 25;
    const best = hero.sources.reduce(
      (best, src) => Math.max(best, CONFIDENCE_VALUES[src.confidence] ?? 25),
      0
    );
    return best;
  });

  return scores.reduce((a, b) => a + b, 0) / scores.length;
}
