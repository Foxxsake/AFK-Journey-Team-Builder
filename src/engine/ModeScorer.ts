import type { PlayerHero, GameMode } from '@/types';
import { getBossProfile } from '@/data/intelligence/modeIntelligence';

/**
 * Calculates mode-specific fit for a team.
 *
 * Different game modes value different characteristics.
 * This scorer uses the structured GameMode data and boss profiles to apply
 * mode-specific adjustments.
 */

interface ModeAdjustment {
  pveBoss: number;
  pvp: number;
  pveGeneral: number;
  seasonal: number;
}

function classifyMode(mode: GameMode): keyof ModeAdjustment {
  if (mode.id === 'dream_realm') return 'pveBoss';
  if (mode.id === 'arena' || mode.id === 'honor_duel' || mode.id === 'supreme_arena') return 'pvp';
  if (mode.id === 'abyssal_expedition') return 'seasonal';
  return 'pveGeneral';
}

export interface ModeFitResult {
  score: number;
  notes: string[];
}

export function calculateModeFit(
  heroes: PlayerHero[],
  mode: GameMode,
  bossId?: string | null
): ModeFitResult {
  if (heroes.length === 0) return { score: 50, notes: [] };

  const notes: string[] = [];
  const modeType = classifyMode(mode);
  let score = 50;

  // Mode-specific tendencies
  const hasTank = heroes.some((h) =>
    h.roles.includes('tank') || h.class === 'tank'
  );
  const hasSupport = heroes.some((h) =>
    h.roles.includes('support') || h.roles.includes('healer') || h.class === 'support'
  );
  const damageCount = heroes.filter((h) =>
    h.roles.includes('damage') ||
    h.class === 'warrior' || h.class === 'marksman' || h.class === 'mage' || h.class === 'rogue'
  ).length;

  switch (modeType) {
    case 'pveBoss': {
      // Dream Realm values high single-target damage and debuffs
      if (damageCount >= 3) score += 10;
      if (hasSupport) score += 5;
      notes.push('Dream Realm: rewards high damage output and support buffs.');

      // If a specific boss is targeted, evaluate boss counters
      if (bossId) {
        const bossProfile = getBossProfile(bossId);
        if (bossProfile) {
          const heroIdSet = new Set(heroes.map((h) => h.id));
          const matchedCounters = bossProfile.counters.filter((c) => heroIdSet.has(c.heroId));
          if (matchedCounters.length > 0) {
            const counterBonus = Math.min(25, matchedCounters.length * 5);
            score += counterBonus;
            notes.push(`Target Boss (${bossProfile.bossName}): includes ${matchedCounters.length} verified counter hero(es).`);
          }
        }
      }
      break;
    }
    case 'pvp':
      // Arena values balanced teams with frontline + damage + control
      if (hasTank) score += 10;
      if (hasSupport) score += 8;
      if (damageCount >= 2) score += 5;
      notes.push('PvP mode: rewards balanced frontline, damage, and support.');
      break;
    case 'pveGeneral':
      // Campaign values sustained progression and survivability
      if (hasTank) score += 8;
      if (hasSupport) score += 8;
      if (damageCount >= 2) score += 5;
      notes.push('Campaign: rewards survivability and sustained damage.');
      break;
    case 'seasonal':
      // Seasonal events often require diverse compositions
      score += 5;
      notes.push('Seasonal mode: composition preferences may vary.');
      break;
  }

  // Check for mode-specific ratings on heroes
  const hasModeRatings = heroes.some(
    (h) => h.modeRatings && h.modeRatings.some((mr) => mr.modeId === mode.id)
  );

  if (!hasModeRatings) {
    notes.push('No mode-specific hero ratings available — using general composition heuristics.');
  }

  return { score: Math.min(100, Math.max(0, score)), notes };
}
