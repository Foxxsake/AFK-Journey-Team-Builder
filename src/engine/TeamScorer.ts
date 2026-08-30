import type { PlayerHero, GameMode, MetaRating, MetaConsensus, EnemyTeam } from '@/types';
import type { ScoreBreakdown, SynergyRule } from './types';
import type { OptimizerConfig } from './config';
import { calculateHeroStrength, calculateTeamHeroStrength, calculateTeamMetaScore } from './HeroStrengthScorer';
import { calculateTeamProgression } from './ProgressionScorer';
import { calculateRoleBalance } from './RoleScorer';
import { calculateSynergy } from './SynergyScorer';
import { calculateModeFit } from './ModeScorer';
import { calculateFactionScore } from './FactionScorer';
import { calculateConfidence } from './ConfidenceScorer';
import { calculateTeamSynergy } from './SynergyEngine';
import { evaluateRoleBalance } from './RoleBalanceEvaluator';
import { calculateTeamCounterScore } from './CounterEngine';
import { totalWeight } from './config';

export interface TeamScoreResult {
  total: number;
  breakdown: ScoreBreakdown;
  modeNotes: string[];
  factionNotes: string[];
  synergyRules: SynergyRule[];
  /** Enhanced synergy result from the Synergy Engine. */
  synergyResult?: import('@/types/intelligence').TeamSynergyResult;
  /** Enhanced role balance result. */
  roleBalanceResult?: import('@/types/intelligence').RoleBalanceResult;
  /** Counter result against enemy team (if provided). */
  counterResult?: import('@/types/intelligence').TeamCounterResult;
}

export function scoreTeam(
  heroes: PlayerHero[],
  mode: GameMode,
  config: OptimizerConfig,
  metaRatings?: MetaRating[],
  synergyRules?: SynergyRule[],
  metaConsensus?: Map<string, MetaConsensus>,
  enemyTeam?: EnemyTeam | null,
  bossId?: string | null
): TeamScoreResult {
  const heroStrength = calculateTeamHeroStrength(heroes, mode, metaRatings, metaConsensus);
  const progression = calculateTeamProgression(heroes);
  const { score: synergy, matchedRules } = calculateSynergy(heroes, mode.id, synergyRules);
  const { score: modeFit, notes: modeNotes } = calculateModeFit(heroes, mode, bossId);
  const { score: faction, notes: factionNotes } = calculateFactionScore(heroes);
  const confidence = calculateConfidence(heroes);

  // Meta consensus score — neutral (50) if no consensus data exists
  const meta = metaConsensus
    ? calculateTeamMetaScore(heroes, mode.id, metaConsensus)
    : 50;

  // Enhanced role balance from Hero Intelligence
  const heroIds = heroes.map((h) => h.id);
  const roleBalanceResult = evaluateRoleBalance(heroIds);
  const roleBalance = roleBalanceResult.score > 0
    ? roleBalanceResult.score
    : calculateRoleBalance(heroes);

  // Enhanced synergy from Synergy Engine
  const synergyResult = calculateTeamSynergy(heroIds, mode.id);
  const finalSynergy = synergyResult.matchedSynergies.length > 0 || synergyResult.antiSynergies.length > 0
    ? synergyResult.score
    : synergy;

  // Counter scoring — only active when an enemy team is provided
  const counterResult = calculateTeamCounterScore(heroIds, enemyTeam ?? null, mode.id);
  const counter = counterResult.score;

  const breakdown: ScoreBreakdown = {
    heroStrength,
    progression,
    roleBalance,
    synergy: finalSynergy,
    modeFit,
    faction,
    confidence,
    meta,
    counter,
  };

  const weightSum = totalWeight(config);
  const total =
    weightSum > 0
      ? Math.round(
          (heroStrength * config.heroStrengthWeight +
            progression * config.progressionWeight +
            roleBalance * config.roleBalanceWeight +
            finalSynergy * config.synergyWeight +
            modeFit * config.modeFitWeight +
            faction * config.factionWeight +
            confidence * config.confidenceWeight +
            meta * config.metaWeight +
            counter * config.counterWeight) /
            weightSum
        )
      : 0;

  return {
    total: Math.min(100, Math.max(0, total)),
    breakdown,
    modeNotes,
    factionNotes,
    synergyRules: matchedRules,
    synergyResult,
    roleBalanceResult,
    counterResult,
  };
}

export function gradeFromScore(score: number): 'S' | 'A' | 'B' | 'C' | 'D' {
  if (score >= 85) return 'S';
  if (score >= 75) return 'A';
  if (score >= 60) return 'B';
  if (score >= 45) return 'C';
  return 'D';
}
