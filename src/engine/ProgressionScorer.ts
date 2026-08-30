import type { PlayerHero } from '@/types';
import { ascensionTiersById } from '@/data/progression';

/**
 * Calculates a 0–100 progression score for a single hero based on
 * the player's actual investment.
 *
 * Accounts for AFK Journey ascension milestones:
 *   - Level (40%)
 *   - Ascension tier milestone weighting (35%):
 *     Mythic+ (order 5) and Supreme/Ascended (order 6+) unlock crucial EX Weapons and stats
 *   - Signature (Exclusive Weapon) and supplemental progression (25%)
 */
export function calculateProgressionScore(hero: PlayerHero): number {
  const { roster } = hero;
  let score = 0;

  // Level: normalised against a reference of 240
  const levelScore = Math.min(100, (roster.level / 240) * 100);
  score += levelScore * 0.4;

  // Ascension: non-linear scaling recognizing high-impact milestones (Mythic+ EX unlock at tier 5+)
  const ascInfo = ascensionTiersById[roster.progression.ascension];
  if (ascInfo) {
    let ascMultiplier = 0;
    if (ascInfo.order <= 4) {
      // Elite to Mythic (order 0 to 4): 0 to 45 points
      ascMultiplier = (ascInfo.order / 4) * 45;
    } else if (ascInfo.order === 5) {
      // Mythic+ key milestone (EX Weapon unlocked): 70 points
      ascMultiplier = 70;
    } else {
      // Ascended / Supreme (+1 to +5): 75 to 100 points
      ascMultiplier = 75 + ((ascInfo.order - 6) / 5) * 25;
    }
    score += ascMultiplier * 0.35;
  }

  // Exclusive Weapon / Signature & Optional Progression fields
  let optionalScore = 0;
  let optionalCount = 0;

  if (roster.progression.signatureLevel != null) {
    // In AFK Journey, EX weapon level 10 and 15 are critical power spikes
    const sigLevel = roster.progression.signatureLevel;
    const sigScore = sigLevel >= 15 ? 100 : sigLevel >= 10 ? 80 : sigLevel >= 5 ? 50 : (sigLevel / 5) * 30;
    optionalScore += sigScore;
    optionalCount++;
  }
  if (roster.progression.furnitureLevel != null) {
    optionalScore += Math.min(100, (roster.progression.furnitureLevel / 30) * 100);
    optionalCount++;
  }
  if (roster.progression.engravingLevel != null) {
    optionalScore += Math.min(100, (roster.progression.engravingLevel / 30) * 100);
    optionalCount++;
  }

  if (optionalCount > 0) {
    score += (optionalScore / optionalCount) * 0.25;
  }

  return Math.min(100, Math.max(0, score));
}

export function calculateTeamProgression(heroes: PlayerHero[]): number {
  if (heroes.length === 0) return 0;
  const scores = heroes.map(calculateProgressionScore);
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}
