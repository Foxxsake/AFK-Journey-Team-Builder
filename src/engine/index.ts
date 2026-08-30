export type {
  OptimizerInput,
  OptimizerResult,
  ScoredTeam,
  ScoreBreakdown,
  TeamExplanation,
  OptimizerConstraints,
  DebugInfo,
  SynergyRule,
  PositionedHero,
  FormationResult,
  FormationOptimizerInput,
  FormationDebugInfo,
  PositionScoringMode,
} from './types';

export {
  TEAM_OPTIMIZER_CONFIG,
  getConfig,
  totalWeight,
  type OptimizerConfig,
} from './config';

export { scoreTeam, gradeFromScore, type TeamScoreResult } from './TeamScorer';
export { optimizeTeam, type OptimizerContext } from './TeamOptimizer';
export { optimizeMultipleTeams } from './MultiTeamOptimizer';
export { generateExplanation } from './ExplanationEngine';
export { calculateProgressionScore } from './ProgressionScorer';
export { calculateHeroStrength, calculateTeamMetaScore } from './HeroStrengthScorer';
export { calculateRoleBalance } from './RoleScorer';
export { calculateSynergy } from './SynergyScorer';
export { calculateModeFit } from './ModeScorer';
export { calculateFactionScore } from './FactionScorer';
export { calculateConfidence } from './ConfidenceScorer';
export { optimizeFormation, assignHeroPositions } from './FormationOptimizer';
export { scoreHeroInSlot, buildPositionScoreMatrix, getPositionScoringMode, type PositionScoreBreakdown } from './PositionScorer';
export { calculateMetaConsensus, calculateModeConsensus, calculateAllConsensus } from './MetaConsensusEngine';
export { calculateFreshness, freshnessWeight, freshnessLabel, relativeTime } from './FreshnessCalculator';
export { calculateDataConfidence, type ConfidenceInput } from './ConfidenceCalculator';
export { resolveHeroId, detectUnknownHeroes, detectDuplicateMappings } from './HeroMapping';
export { calculateTeamSynergy, getHeroSynergies, getAllSynergyData, getVerifiedSynergies, getHeuristicSynergies, getAntiSynergies } from './SynergyEngine';
export { evaluateRoleBalance } from './RoleBalanceEvaluator';
export { getHeroCounters, getCounterResult, calculateTeamCounterScore, analyseEnemyTeam, getAllCounters } from './CounterEngine';
export { getHeroIntelligence, getHeroRoles, getHeroFunctions, heroHasRole, heroHasFunction } from '@/data/intelligence';
export { getVerifiedHeroData, getHeroAbilities, getHeroEffectTypes, heroHasVerifiedEffect, getVerifiedHeroIds, getAllVerifiedAbilities, getVerifiedAbilityCount, getVerifiedHeroCount } from '@/data/intelligence/verifiedAbilities';
export { getModeAssessment, getAllModeAssessments, getModeAssessmentCount, getBossProfile, getAllBossProfiles } from '@/data/intelligence/modeIntelligence';
export { validateAbilities, validateModeAssessments, validateCounters, validateSynergies, validateAll, canReplaceEvidence, mergeEvidence, type ValidationIssue, type ValidationResult } from './IntelligenceValidator';
export { mergeAbilities, mergeModeAssessments, mergeCounters, mergeSynergies, type MergeResult, type MergeChange } from './IntelligenceMerger';
export { EVIDENCE_RANK } from '@/types/intelligence';
export type { HeroIntelligence, HeroRoleTag, CombatFunction, SynergyRelationship, RoleBalanceResult, TeamSynergyResult, SynergyCategory, HeroAbility, HeroAbilityEffect, HeroVerifiedData, AbilityEffectType, EvidenceType, CounterRelationship, CounterResult, CounterStrength, CounterCategory, HeroModeAssessment, BossProfile, BossMechanic, BossCounter, BossTeamRecommendation, EnemyTeamAnalysis, EnemyThreat, TeamCounterResult } from '@/types/intelligence';
