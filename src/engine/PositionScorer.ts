import type { PlayerHero, HeroClass, HeroRole, FormationSlot } from '@/types';
import type { OptimizerConfig } from './config';

/**
 * PositionScoringMode — distinguishes verified game data from
 * optimisation heuristics.
 *
 *   "verified"  — Position score is derived from verified AFK Journey
 *                 positional mechanics (hero skills with explicit
 *                 positional requirements, official formation rules).
 *                 NOT currently used — no verified positional data
 *                 exists in the dataset.
 *
 *   "heuristic" — Position score is derived from generic heuristics:
 *                 class-based survivability estimates, range-based
 *                 front/back preference, and slot role hints. These
 *                 are mathematical assumptions, NOT verified game
 *                 mechanics.
 *
 *   "mixed"     — Score blends both verified and heuristic components.
 *                 Will be used when the dataset gains verified
 *                 positional abilities alongside the heuristics.
 */
export type PositionScoringMode = 'verified' | 'heuristic' | 'mixed';

/**
 * PositionScorer — calculates a positional score for a single hero
 * placed in a single formation slot.
 *
 * ================================================================
 * IMPORTANT: SCORING IS HEURISTIC, NOT VERIFIED
 * ================================================================
 *
 * The current scoring uses these HEURISTIC assumptions:
 *   1. Role hint matching — does the hero's class/roles match the
 *      slot's roleHint? (Heuristic: role hints are our own labels,
 *      not verified AFK Journey formation requirements.)
 *   2. Range fit — melee heroes (range <= 2) prefer front slots,
 *      ranged heroes (range >= 5) prefer back slots. (Heuristic:
 *      this is a common tactical pattern, not a verified AFK Journey
 *      positional mechanic.)
 *   3. Survivability — tank-class heroes get higher scores in front
 *      slots; squishy classes get higher scores in back slots.
 *      (Heuristic: survivability estimates are class-based guesses,
 *      not verified stat values.)
 *
 * NO positional abilities or mechanics are invented. If a hero has
 * verified positional requirements in their skills[], those would be
 * used here. Currently the dataset does not contain skill-level
 * positional data, so scoringMode is always "heuristic".
 *
 * All scores are normalised to 0–100.
 */

// --- HEURISTIC DATA (not verified game data) ---

/** Heuristic survivability estimates per class (0–100). NOT verified stats. */
const HEURISTIC_CLASS_SURVIVABILITY: Record<HeroClass, number> = {
  tank: 90,
  warrior: 65,
  rogue: 45,
  marksman: 35,
  mage: 35,
  support: 30,
};

/** Class-to-role fallback mapping when hero.roles is empty. */
const CLASS_ROLE_FALLBACK: Record<HeroClass, HeroRole[]> = {
  warrior: ['damage'],
  tank: ['tank'],
  marksman: ['damage'],
  mage: ['damage'],
  rogue: ['damage'],
  support: ['support'],
};

function getHeroRoles(hero: PlayerHero): HeroRole[] {
  if (hero.roles && hero.roles.length > 0) return hero.roles;
  return CLASS_ROLE_FALLBACK[hero.class] ?? [];
}

function isMelee(hero: PlayerHero): boolean {
  return hero.range <= 2;
}

function isRanged(hero: PlayerHero): boolean {
  return hero.range >= 5;
}

/**
 * Determines the current scoring mode based on available data.
 * Since no verified positional data exists yet, this always returns
 * "heuristic". When verified skill-level positional data is added,
 * update this function to detect it and return "verified" or "mixed".
 */
export function getPositionScoringMode(): PositionScoringMode {
  // No verified positional data in the current dataset.
  // All scoring is heuristic.
  return 'heuristic';
}

export interface PositionScoreBreakdown {
  roleHintMatch: number;
  rangeFit: number;
  survivabilityFit: number;
  total: number;
  reasons: string[];
  scoringMode: PositionScoringMode;
  /** 0–1 fraction of the score derived from verified data. */
  verifiedContribution: number;
  /** 0–1 fraction of the score derived from heuristics. */
  heuristicContribution: number;
}

/**
 * Scores a single hero in a single slot.
 * Returns a 0–100 score plus human-readable reasons.
 *
 * Currently uses heuristic scoring only.
 */
export function scoreHeroInSlot(
  hero: PlayerHero,
  slot: FormationSlot,
  config: OptimizerConfig
): PositionScoreBreakdown {
  const reasons: string[] = [];
  const roles = getHeroRoles(hero);
  const scoringMode = getPositionScoringMode();

  // 1. Role hint matching (0–100) — HEURISTIC
  let roleHintMatch = 50;
  if (slot.roleHint) {
    if (roles.includes(slot.roleHint)) {
      roleHintMatch = 90;
      reasons.push(`${hero.name}'s role matches the slot's hint (${slot.roleHint}).`);
    } else {
      roleHintMatch = 35;
      reasons.push(`${hero.name}'s role doesn't match the slot's hint (${slot.roleHint}).`);
    }
  } else {
    reasons.push('No role hint for this slot — neutral scoring.');
  }

  // 2. Range fit (0–100) — HEURISTIC
  let rangeFit = 50;
  const isFront = slot.frontBack === 'front';
  if (isFront && isMelee(hero)) {
    rangeFit = 85;
    reasons.push(`${hero.name} is melee (range ${hero.range}) and benefits from a frontline position.`);
  } else if (!isFront && isRanged(hero)) {
    rangeFit = 85;
    reasons.push(`${hero.name} is ranged (range ${hero.range}) and is safer in the backline.`);
  } else if (isFront && isRanged(hero)) {
    rangeFit = 30;
    reasons.push(`${hero.name} is ranged (range ${hero.range}) — frontline placement is risky.`);
  } else if (!isFront && isMelee(hero)) {
    rangeFit = 40;
    reasons.push(`${hero.name} is melee (range ${hero.range}) — backline placement reduces effectiveness.`);
  } else {
    reasons.push(`${hero.name}'s range (${hero.range}) is neutral for this position.`);
  }

  // 3. Survivability fit (0–100) — HEURISTIC
  const survivability = HEURISTIC_CLASS_SURVIVABILITY[hero.class] ?? 50;
  let survivabilityFit = 50;
  if (isFront) {
    survivabilityFit = survivability;
    if (survivability >= 70) {
      reasons.push(`${hero.name} (class: ${hero.class}) has high survivability — well-suited for the frontline.`);
    } else if (survivability < 40) {
      reasons.push(`${hero.name} (class: ${hero.class}) is fragile — frontline placement is dangerous.`);
    }
  } else {
    survivabilityFit = 100 - survivability;
    if (survivability < 45) {
      reasons.push(`${hero.name} (class: ${hero.class}) benefits from backline protection.`);
    } else if (survivability >= 70) {
      reasons.push(`${hero.name} (class: ${hero.class}) is durable enough for the frontline — backline is suboptimal.`);
    }
  }

  // Weighted total
  const weightSum =
    config.roleHintWeight + config.rangeWeight + config.survivabilityWeight;

  const total =
    weightSum > 0
      ? Math.round(
          (roleHintMatch * config.roleHintWeight +
            rangeFit * config.rangeWeight +
            survivabilityFit * config.survivabilityWeight) /
            weightSum
        )
      : 50;

  // All scoring components are heuristic in the current dataset.
  const verifiedContribution = 0;
  const heuristicContribution = 1;

  return {
    roleHintMatch,
    rangeFit,
    survivabilityFit,
    total: Math.min(100, Math.max(0, total)),
    reasons,
    scoringMode,
    verifiedContribution,
    heuristicContribution,
  };
}

/**
 * Builds a full position-score matrix: for each hero, the score
 * for every slot. Used by the UI for "compare positions" and by
 * the FormationOptimizer for the assignment algorithm.
 */
export function buildPositionScoreMatrix(
  heroes: PlayerHero[],
  slots: FormationSlot[],
  config: OptimizerConfig
): Record<string, Record<string, number>> {
  const matrix: Record<string, Record<string, number>> = {};
  for (const hero of heroes) {
    matrix[hero.id] = {};
    for (const slot of slots) {
      const result = scoreHeroInSlot(hero, slot, config);
      matrix[hero.id][slot.id] = result.total;
    }
  }
  return matrix;
}
