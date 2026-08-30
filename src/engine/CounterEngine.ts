/**
 * Counter Engine — manages hero counter relationships.
 *
 * Counter relationships are stored as directed pairs (heroId → counterHeroId)
 * meaning "heroId counters counterHeroId". The engine:
 *   - Stores explicit counter relationships (verified or heuristic)
 *   - Derives soft counters from ability effect types (e.g. anti_heal counters healing)
 *   - Looks up counters for a team against an enemy team
 *
 * All relationships are marked with evidence type. No counters are
 * invented — if no evidence exists, returns UNKNOWN.
 */

import type {
  CounterRelationship,
  CounterResult,
  CounterStrength,
  CounterCategory,
  TeamCounterResult,
  EnemyTeamAnalysis,
  EnemyThreat,
} from '@/types/intelligence';
import type { EnemyTeam } from '@/types';
import type { SourceConfidence } from '@/types';
import { getHeroEffectTypes, heroHasVerifiedEffect } from '@/data/intelligence/verifiedAbilities';
import { getHeroIntelligence, getHeroRoles } from '@/data/intelligence';

// ============================================================
// EXPLICIT COUNTER DATA (structured_source)
// ============================================================
// These counters are derived from ability interactions that are
// clear from verified ability descriptions. They are marked
// 'structured_source' evidence — not 'official' or 'verified'.

const explicitCounters: CounterRelationship[] = [
  // Nara pulls backline enemies → counters backline-dependent heroes
  {
    heroId: 'nara',
    counterHeroId: 'dionel',
    counterScore: 10,
    strength: 'soft',
    category: 'backline_disruption',
    reason: 'Nara pulls Dionel from the backline, breaking his positioning advantage.',
    gameModes: ['arena', 'supreme_arena'],
    confidence: 'medium',
    evidence: 'structured_source',
    source: 'Ability interaction analysis (wiki)',
  },
  {
    heroId: 'nara',
    counterHeroId: 'bryon',
    counterScore: 9,
    strength: 'soft',
    category: 'backline_disruption',
    reason: 'Nara pulls Bryon to the frontline, neutralizing his ranged advantage.',
    gameModes: ['arena', 'supreme_arena'],
    confidence: 'medium',
    evidence: 'structured_source',
    source: 'Ability interaction analysis (wiki)',
  },
  {
    heroId: 'nara',
    counterHeroId: 'atalanta',
    counterScore: 8,
    strength: 'situational',
    category: 'backline_disruption',
    reason: 'Nara can pull Atalanta out of her optimal range.',
    gameModes: ['arena'],
    confidence: 'low',
    evidence: 'structured_source',
    source: 'Ability interaction analysis (wiki)',
  },

  // Athalia dashes to backline → counters squishy backline heroes
  {
    heroId: 'athalia',
    counterHeroId: 'dionel',
    counterScore: 9,
    strength: 'soft',
    category: 'burst',
    reason: 'Athalia dashes to the backline and bursts Dionel, who has low survivability.',
    gameModes: ['arena', 'supreme_arena'],
    confidence: 'medium',
    evidence: 'structured_source',
    source: 'Ability interaction analysis (wiki)',
  },
  {
    heroId: 'athalia',
    counterHeroId: 'bonnie',
    counterScore: 8,
    strength: 'situational',
    category: 'burst',
    reason: 'Athalia can reach Bonnie in the backline and deal burst damage.',
    gameModes: ['arena'],
    confidence: 'low',
    evidence: 'structured_source',
    source: 'Ability interaction analysis (wiki)',
  },

  // Eironn teleports to lowest-health enemy → executes low-health targets
  {
    heroId: 'eironn',
    counterHeroId: 'shemira',
    counterScore: 7,
    strength: 'situational',
    category: 'execute',
    reason: 'Eironn targets the lowest-health enemy, which can finish off Shemira before she heals.',
    gameModes: ['arena'],
    confidence: 'low',
    evidence: 'structured_source',
    source: 'Ability interaction analysis (wiki)',
  },

  // Lucius team shield → counters burst/assassin strategies
  {
    heroId: 'lucius',
    counterHeroId: 'athalia',
    counterScore: 8,
    strength: 'soft',
    category: 'survivability',
    reason: 'Lucius team-wide shield absorbs Athalia burst damage, protecting backline allies.',
    gameModes: ['arena', 'supreme_arena'],
    confidence: 'medium',
    evidence: 'structured_source',
    source: 'Ability interaction analysis (wiki)',
  },
  {
    heroId: 'lucius',
    counterHeroId: 'eironn',
    counterScore: 7,
    strength: 'situational',
    category: 'survivability',
    reason: 'Lucius shield can absorb Eironn burst damage on the targeted ally.',
    gameModes: ['arena'],
    confidence: 'low',
    evidence: 'structured_source',
    source: 'Ability interaction analysis (wiki)',
  },

  // Pippa/Tasi crowd control → counters melee damage dealers
  {
    heroId: 'pippa',
    counterHeroId: 'brutus',
    counterScore: 7,
    strength: 'situational',
    category: 'control',
    reason: 'Pippa freezing field slows and roots Brutus, limiting his whirlwind effectiveness.',
    gameModes: ['campaign', 'arena'],
    confidence: 'low',
    evidence: 'structured_source',
    source: 'Ability interaction analysis (wiki)',
  },
  {
    heroId: 'tasi',
    counterHeroId: 'valen',
    counterScore: 6,
    strength: 'situational',
    category: 'control',
    reason: 'Tasi sleep disables Valen, preventing his bladestorm.',
    gameModes: ['campaign', 'arena'],
    confidence: 'low',
    evidence: 'structured_source',
    source: 'Ability interaction analysis (wiki)',
  },

  // Daimon shield → counters single-target burst
  {
    heroId: 'daimon',
    counterHeroId: 'cecia',
    counterScore: 6,
    strength: 'situational',
    category: 'survivability',
    reason: 'Daimon shield absorbs Cecia single-target sniper shot.',
    gameModes: ['arena'],
    confidence: 'low',
    evidence: 'structured_source',
    source: 'Ability interaction analysis (wiki)',
  },

  // Mehira charm → counters melee DPS (they attack their own team)
  {
    heroId: 'mehira',
    counterHeroId: 'scarlita',
    counterScore: 8,
    strength: 'situational',
    category: 'control',
    reason: 'Mehira charm can turn Scarlita against her own team during her charge.',
    gameModes: ['arena', 'supreme_arena'],
    confidence: 'low',
    evidence: 'structured_source',
    source: 'Ability interaction analysis (wiki)',
  },
];

// ============================================================
// DERIVED COUNTER RULES
// ============================================================
// Rules that derive counters from ability effect types.
// These are HEURISTIC — based on game logic interpretation.

interface DerivedCounterRule {
  heroEffectType: import('@/types/intelligence').AbilityEffectType;
  enemyEffectType: import('@/types/intelligence').AbilityEffectType;
  category: CounterCategory;
  strength: CounterStrength;
  reason: string;
}

const DERIVED_RULES: DerivedCounterRule[] = [
  {
    heroEffectType: 'anti_heal',
    enemyEffectType: 'healing',
    category: 'anti_heal',
    strength: 'soft',
    reason: 'Anti-heal effects reduce the effectiveness of enemy healing.',
  },
  {
    heroEffectType: 'stun',
    enemyEffectType: 'damage',
    category: 'control',
    strength: 'situational',
    reason: 'Stun interrupts enemy damage output.',
  },
  {
    heroEffectType: 'silence',
    enemyEffectType: 'damage',
    category: 'control',
    strength: 'situational',
    reason: 'Silence prevents enemy ability usage.',
  },
  {
    heroEffectType: 'displacement',
    enemyEffectType: 'survivability',
    category: 'displacement',
    strength: 'situational',
    reason: 'Displacement repositions enemies, breaking formation.',
  },
  {
    heroEffectType: 'execute',
    enemyEffectType: 'survivability',
    category: 'execute',
    strength: 'soft',
    reason: 'Execute effects are effective against high-survivability targets.',
  },
  {
    heroEffectType: 'energy_reduction',
    enemyEffectType: 'energy_gain',
    category: 'energy_disruption',
    strength: 'soft',
    reason: 'Energy reduction counters energy generation strategies.',
  },
];

// ============================================================
// COUNTER INDEX
// ============================================================

function buildCounterIndex(): Map<string, CounterRelationship[]> {
  const index = new Map<string, CounterRelationship[]>();
  const assessedAt = '2026-08-27';

  // Add explicit counters
  for (const rel of explicitCounters) {
    const list = index.get(rel.heroId) ?? [];
    list.push(rel);
    index.set(rel.heroId, list);
  }

  // Derive counters from ability effects
  const verifiedHeroIds = Object.keys(
    // Import dynamically to avoid circular dependency
    {} as Record<string, unknown>
  );

  // For each hero with verified effects, derive counters
  // We need to check all heroes — get from intelligence
  for (const heroId of Object.keys(getHeroIntelligence() ? {} : {})) {
    // This is handled below in a more efficient way
  }

  return index;
}

// More efficient: build derived counters on demand
function getDerivedCounters(heroId: string): CounterRelationship[] {
  const heroEffects = getHeroEffectTypes(heroId);
  if (heroEffects.length === 0) return [];

  const counters: CounterRelationship[] = [];

  for (const rule of DERIVED_RULES) {
    if (heroEffects.includes(rule.heroEffectType)) {
      // This hero counters enemies who rely on rule.enemyEffectType
      // We need to find which enemy heroes have that effect
      // For now, store as a general counter relationship
      counters.push({
        heroId,
        counterHeroId: '*',
        counterScore: rule.strength === 'hard' ? 15 : rule.strength === 'soft' ? 8 : 4,
        strength: rule.strength,
        category: rule.category,
        reason: rule.reason,
        gameModes: [],
        confidence: 'low',
        evidence: 'heuristic',
        source: 'Derived from ability effect analysis',
      });
    }
  }

  return counters;
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Get counter relationships for a hero (what this hero counters).
 */
export function getHeroCounters(heroId: string): CounterRelationship[] {
  const explicit = explicitCounters.filter((c) => c.heroId === heroId);
  const derived = getDerivedCounters(heroId);
  return [...explicit, ...derived];
}

/**
 * Get counter result for a hero (strong against, weak against, situational).
 */
export function getCounterResult(heroId: string): CounterResult {
  const all = getHeroCounters(heroId);
  const strongAgainst: CounterRelationship[] = [];
  const weakAgainst: CounterRelationship[] = [];
  const situational: CounterRelationship[] = [];

  // Also check who counters this hero
  const countersThisHero = explicitCounters.filter((c) => c.counterHeroId === heroId);

  for (const c of all) {
    if (c.strength === 'hard') strongAgainst.push(c);
    else if (c.strength === 'soft') strongAgainst.push(c);
    else situational.push(c);
  }

  for (const c of countersThisHero) {
    weakAgainst.push(c);
  }

  const confidence: SourceConfidence =
    all.length === 0 && countersThisHero.length === 0 ? 'unknown' :
    all.every((c) => c.evidence === 'official') ? 'high' :
    all.every((c) => c.evidence === 'official' || c.evidence === 'structured_source') ? 'medium' :
    'low';

  return {
    heroId,
    strongAgainst,
    weakAgainst,
    situational,
    confidence,
  };
}

/**
 * Calculate team counter score against an enemy team.
 *
 * Only contributes when an enemy team is provided.
 * Returns neutral (50) if no enemy team or no counter data.
 */
export function calculateTeamCounterScore(
  heroIds: string[],
  enemyTeam: EnemyTeam | null | undefined,
  modeId: string
): TeamCounterResult {
  if (!enemyTeam || !enemyTeam.heroes || enemyTeam.heroes.length === 0) {
    return {
      score: 50,
      activeCounters: [],
      counterDescriptions: [],
      confidence: 'unknown',
    };
  }

  const enemyIds = enemyTeam.heroes;
  let totalScore = 0;
  const activeCounters: CounterRelationship[] = [];
  const counterDescriptions: string[] = [];
  const confidenceLevels: SourceConfidence[] = [];

  for (const heroId of heroIds) {
    const counters = getHeroCounters(heroId);

    for (const counter of counters) {
      // Filter by mode
      if (counter.gameModes.length > 0 && !counter.gameModes.includes(modeId)) continue;

      // Wildcard counters (counterHeroId === '*') apply to any enemy
      // with the relevant effect type
      if (counter.counterHeroId === '*') {
        const enemyEffectType = DERIVED_RULES.find(
          (r) => r.category === counter.category
        )?.enemyEffectType;

        if (enemyEffectType) {
          const matchingEnemies = enemyIds.filter((eid) =>
            heroHasVerifiedEffect(eid, enemyEffectType)
          );
          if (matchingEnemies.length > 0) {
            activeCounters.push(counter);
            totalScore += counter.counterScore;
            counterDescriptions.push(
              `${heroId} counters ${matchingEnemies.length} enemy hero${matchingEnemies.length > 1 ? 'es' : ''} via ${counter.category.replace(/_/g, ' ')}.`
            );
            confidenceLevels.push(counter.confidence);
          }
        }
        continue;
      }

      // Specific counter — check if the target is on the enemy team
      if (enemyIds.includes(counter.counterHeroId)) {
        activeCounters.push(counter);
        totalScore += counter.counterScore;
        counterDescriptions.push(
          `${heroId} ${counter.strength} counters ${counter.counterHeroId}: ${counter.reason}`
        );
        confidenceLevels.push(counter.confidence);
      }
    }
  }

  const score = Math.min(100, Math.max(0, 50 + totalScore));
  const confidence: SourceConfidence =
    confidenceLevels.length === 0 ? 'unknown' :
    confidenceLevels.every((c) => c === 'high') ? 'high' :
    confidenceLevels.every((c) => c === 'high' || c === 'medium') ? 'medium' :
    'low';

  return {
    score,
    activeCounters,
    counterDescriptions,
    confidence,
  };
}

/**
 * Analyse an enemy team — identify threats, vulnerabilities, and recommended counters.
 */
export function analyseEnemyTeam(
  enemyTeam: EnemyTeam,
  availableHeroIds: string[],
  modeId: string
): EnemyTeamAnalysis {
  const threats: EnemyThreat[] = [];
  const recommendedCounters = new Set<CounterCategory>();
  const recommendedHeroes: Array<{ heroId: string; reason: string; strength: CounterStrength }> = [];
  const positioningNotes: string[] = [];

  // Analyse each enemy hero
  for (const enemyId of enemyTeam.heroes) {
    const enemyEffects = getHeroEffectTypes(enemyId);
    const enemyRoles = getHeroRoles(enemyId);
    const threatList: string[] = [];
    const vulnerableTo: CounterCategory[] = [];

    if (enemyEffects.includes('damage')) threatList.push('Deals significant damage.');
    if (enemyEffects.includes('healing')) threatList.push('Provides healing to the enemy team.');
    if (enemyEffects.includes('crowd_control') || enemyEffects.includes('stun')) threatList.push('Has crowd control capabilities.');
    if (enemyEffects.includes('energy_gain')) threatList.push('Generates energy for the enemy team.');
    if (enemyRoles.includes('assassin')) threatList.push('Assassin — threatens backline heroes.');

    // Vulnerabilities based on enemy effects
    if (enemyEffects.includes('healing')) {
      vulnerableTo.push('anti_heal');
      recommendedCounters.add('anti_heal');
    }
    if (enemyEffects.includes('survivability') || enemyRoles.includes('tank')) {
      vulnerableTo.push('frontline_break');
      recommendedCounters.add('frontline_break');
    }
    if (enemyRoles.includes('healer')) {
      vulnerableTo.push('sustain_counter');
      recommendedCounters.add('sustain_counter');
    }

    threats.push({ heroId: enemyId, threats: threatList, vulnerableTo });
  }

  // Find available heroes that counter the enemy team
  for (const heroId of availableHeroIds) {
    const counters = getHeroCounters(heroId);
    for (const c of counters) {
      if (c.gameModes.length > 0 && !c.gameModes.includes(modeId)) continue;
      if (c.counterHeroId === '*') {
        const enemyEffectType = DERIVED_RULES.find(
          (r) => r.category === c.category
        )?.enemyEffectType;
        if (enemyEffectType && enemyTeam.heroes.some((eid) => heroHasVerifiedEffect(eid, enemyEffectType))) {
          recommendedHeroes.push({
            heroId,
            reason: c.reason,
            strength: c.strength,
          });
        }
      } else if (enemyTeam.heroes.includes(c.counterHeroId)) {
        recommendedHeroes.push({
          heroId,
          reason: c.reason,
          strength: c.strength,
        });
      }
    }
  }

  // Positioning notes
  const enemyHasAssassin = enemyTeam.heroes.some((id) => getHeroRoles(id).includes('assassin'));
  if (enemyHasAssassin) {
    positioningNotes.push('Enemy team has assassins — protect backline damage dealers.');
  }
  const enemyHasControl = enemyTeam.heroes.some((id) =>
    heroHasVerifiedEffect(id, 'crowd_control') || heroHasVerifiedEffect(id, 'stun')
  );
  if (enemyHasControl) {
    positioningNotes.push('Enemy team has crowd control — consider spread positioning.');
  }

  return {
    threats,
    recommendedCounters: [...recommendedCounters],
    recommendedHeroes,
    positioningNotes,
    confidence: 'low',
  };
}

/**
 * Get all counter relationships (for export).
 */
export function getAllCounters(): CounterRelationship[] {
  return [...explicitCounters];
}
