import type { PlayerHero } from '@/types';
import { ascensionTiersById } from '@/data/progression';

/**
 * Calculates a 0–100 progression score for a single hero based on
 * the player's actual investment.
 *
 * Accounts for AFK Journey ascension milestones:
 *   - Level (40%): normalized against reference level 240 (capped at 100)
 *   - Ascension tier milestone weighting (40%):
 *     Mythic+ (order 7) unlocks crucial EX Weapon. Supreme+ (order 9) and Paragon (order 10-13)
 *   - Exclusive Weapon level (20%): 0–25 scaling with major breakpoints at +5, +10, +15, +20, +25
 */
export function calculateProgressionScore(hero: PlayerHero): number {
  const { roster } = hero;
  let score = 0;

  // 1. Level: normalised against a reference of 240
  const levelScore = Math.min(100, (roster.level / 240) * 100);
  score += levelScore * 0.40;

  // 2. Ascension: non-linear scaling recognizing high-impact milestones (Mythic+ EX unlock at order 7)
  const ascInfo = ascensionTiersById[roster.progression.ascension];
  let ascMultiplier = 0;
  const ascOrder = ascInfo?.order ?? 0;

  if (ascOrder <= 6) {
    // Elite (0) to Mythic (6): 0 to 50 points
    ascMultiplier = (ascOrder / 6) * 50;
  } else if (ascOrder === 7) {
    // Mythic+ key milestone (EX Weapon unlocked): 70 points
    ascMultiplier = 70;
  } else if (ascOrder === 8) {
    // Supreme: 78 points
    ascMultiplier = 78;
  } else if (ascOrder === 9) {
    // Supreme+: 86 points
    ascMultiplier = 86;
  } else {
    // Paragon 1 to Paragon 4 (order 10 to 13): 90 to 100 points
    ascMultiplier = 90 + ((ascOrder - 10) / 3) * 10;
  }
  score += Math.min(100, ascMultiplier) * 0.40;

  // 3. Exclusive Weapon (EX+0 to EX+25)
  const exLevel = roster.progression.exclusiveWeaponLevel ?? roster.progression.signatureLevel;
  let exScore = 0;

  if (exLevel != null) {
    if (exLevel >= 25) {
      exScore = 100;
    } else if (exLevel >= 20) {
      exScore = 95;
    } else if (exLevel >= 15) {
      exScore = 90;
    } else if (exLevel >= 10) {
      exScore = 80;
    } else if (exLevel >= 5) {
      exScore = 55;
    } else if (exLevel > 0) {
      exScore = 30 + (exLevel / 5) * 20;
    } else {
      // EX+0 unlocked
      exScore = 20;
    }
  } else if (ascOrder >= 7) {
    // Mythic+ or above without explicit EX level defaults to base EX+0
    exScore = 20;
  } else {
    // Below Mythic+ (no EX weapon yet unlocked)
    exScore = 0;
  }

  score += Math.min(100, exScore) * 0.20;

  return Math.min(100, Math.max(0, score));
}

export function calculateTeamProgression(heroes: PlayerHero[]): number {
  if (heroes.length === 0) return 0;
  const scores = heroes.map(calculateProgressionScore);
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}
