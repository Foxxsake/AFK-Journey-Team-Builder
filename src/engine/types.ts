import type { PlayerHero, GameMode, MetaRating, FactionId, HeroRole, SourceConfidence, EnemyTeam, Formation } from '@/types';

export interface OptimizerInput {
  playerHeroes: PlayerHero[];
  mode: GameMode;
  teamCount: number;
  avoidHeroReuse: boolean;
  metaRatings?: MetaRating[];
  metaConsensus?: Map<string, import('@/types').MetaConsensus>;
  constraints?: OptimizerConstraints;
  /** Enemy team for counter-aware scoring. Optional. */
  enemyTeam?: EnemyTeam;
  /** Boss ID for boss-specific mode scoring. Optional. */
  bossId?: string | null;
  debug?: boolean;
}

export interface OptimizerConstraints {
  requiredHeroIds?: string[];
  excludedHeroIds?: string[];
}

export interface ScoreBreakdown {
  heroStrength: number;
  progression: number;
  roleBalance: number;
  synergy: number;
  modeFit: number;
  faction: number;
  confidence: number;
  meta: number;
  /** Counter relevance score — 50 (neutral) when no enemy team. */
  counter: number;
}

export interface ScoredTeam {
  heroes: PlayerHero[];
  heroIds: string[];
  score: number;
  breakdown: ScoreBreakdown;
  explanation: TeamExplanation;
  formationId?: string;
}

export interface TeamExplanation {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  dataNotes: string[];
}

export interface OptimizerResult {
  teams: ScoredTeam[];
  bestTeam: ScoredTeam | null;
  candidatesEvaluated: number;
  candidatesPruned: number;
  durationMs: number;
  warnings: string[];
  debug?: DebugInfo;
}

export interface DebugInfo {
  totalCombinations: number;
  candidatesEvaluated: number;
  candidatesPruned: number;
  topScores: number[];
  durationMs: number;
}

export interface SynergyRule {
  id: string;
  heroIds: string[];
  modeId?: string;
  type: 'positive' | 'negative' | 'team';
  score: number;
  reason: string;
  source?: string;
  confidence: SourceConfidence;
}

export type FactionId_type = FactionId;
export type HeroRole_type = HeroRole;

export type PositionScoringMode = 'verified' | 'heuristic' | 'mixed';

export interface PositionedHero {
  hero: PlayerHero;
  slotId: string;
  position: number;
  positionScore: number;
  positionExplanation: string;
}

export interface FormationResult {
  formationId: string;
  formationName: string;
  positions: PositionedHero[];
  formationScore: number;
  combinedScore: number;
  teamScore: number;
  positionScores: Record<string, Record<string, number>>;
  alternatives: Array<{
    formationId: string;
    formationName: string;
    formationScore: number;
    combinedScore: number;
  }>;
  warnings: string[];
  /** How position scoring was derived: verified data, heuristics, or both. */
  positionScoringMode: PositionScoringMode;
  /** The formation object, for UI access to confidence/source metadata. */
  formation?: Formation;
  debug?: FormationDebugInfo;
}

export interface FormationDebugInfo {
  formationsEvaluated: number;
  assignmentsEvaluated: number;
  bestFormationId: string;
  formationScores: Array<{ formationId: string; score: number }>;
  durationMs: number;
  /** 0–1 fraction of the formation score derived from verified game data. */
  verifiedContribution: number;
  /** 0–1 fraction of the formation score derived from heuristics. */
  heuristicContribution: number;
  positionScoringMode: PositionScoringMode;
}

export interface FormationOptimizerInput {
  heroes: PlayerHero[];
  modeId: string;
  teamScore: number;
  enemyTeam?: EnemyTeam;
  debug?: boolean;
}
