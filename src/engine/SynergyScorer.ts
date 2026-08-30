import type { PlayerHero } from '@/types';
import type { SynergyRule } from './types';

/**
 * Calculates synergy score for a team.
 *
 * Uses structured SynergyRule data. If no synergy rules exist
 * in the dataset (as is currently the case), this component
 * contributes a neutral score (50) rather than fabricating
 * synergy information.
 *
 * The neutral baseline of 50 means "no positive or negative
 * synergy detected" — it does not penalise or reward the team.
 */
export function calculateSynergy(
  heroes: PlayerHero[],
  modeId: string,
  synergyRules?: SynergyRule[]
): { score: number; matchedRules: SynergyRule[] } {
  if (!synergyRules || synergyRules.length === 0) {
    return { score: 50, matchedRules: [] };
  }

  const heroIds = new Set(heroes.map((h) => h.id));
  let totalBonus = 0;
  const matched: SynergyRule[] = [];

  for (const rule of synergyRules) {
    // Skip rules for other modes
    if (rule.modeId && rule.modeId !== modeId) continue;

    // Check if all heroes in the rule are present
    const allPresent = rule.heroIds.every((id) => heroIds.has(id));
    if (!allPresent) continue;

    matched.push(rule);
    if (rule.type === 'negative') {
      totalBonus -= rule.score;
    } else {
      totalBonus += rule.score;
    }
  }

  // Clamp to 0–100, with 50 as neutral baseline
  const score = Math.min(100, Math.max(0, 50 + totalBonus));
  return { score, matchedRules: matched };
}
