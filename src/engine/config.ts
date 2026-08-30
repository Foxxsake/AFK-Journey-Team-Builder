/**
 * Central configuration for the team optimiser.
 *
 * All weights are on a 0–1 scale and represent the relative
 * importance of each scoring component. The final team score is
 * a weighted average of all components, each normalised to 0–100.
 *
 * These values are intentionally configurable — they will be tuned
 * as the dataset improves and as we gather feedback.
 */

export interface OptimizerConfig {
  /** Weight for individual hero base strength (rarity / class). */
  heroStrengthWeight: number;
  /** Weight for player progression investment (level, ascension, etc). */
  progressionWeight: number;
  /** Weight for role coverage / balance within the team. */
  roleBalanceWeight: number;
  /** Weight for hero-to-hero synergy rules. */
  synergyWeight: number;
  /** Weight for mode-specific fit. */
  modeFitWeight: number;
  /** Weight for faction-related scoring. */
  factionWeight: number;
  /** Weight for data confidence adjustment. */
  confidenceWeight: number;
  /** Penalty applied per reused hero in multi-team optimisation. */
  heroReusePenalty: number;
  /** Maximum number of candidate teams to evaluate before pruning. */
  maxCandidates: number;
  /** Minimum team similarity threshold for alternative diversity (0–1). */
  diversityThreshold: number;
  /** Number of alternative teams to return. */
  alternativesCount: number;
  /** Whether to enable debug output. */
  debug: boolean;
  // Formation optimiser weights
  /** Weight for formation layout fit. */
  formationFitWeight: number;
  /** Weight for individual hero position fit. */
  positionFitWeight: number;
  /** Weight for survivability in position scoring. */
  survivabilityWeight: number;
  /** Weight for range-based position scoring. */
  rangeWeight: number;
  /** Weight for role hint matching in position scoring. */
  roleHintWeight: number;
  /** How much the formation score contributes to the combined score (0–1). */
  formationContribution: number;
  /** Weight for meta consensus data (tier lists, community ratings). */
  metaWeight: number;
  /** Weight for counter relevance against an enemy team. Only active when an enemy team is provided. */
  counterWeight: number;
}

export const TEAM_OPTIMIZER_CONFIG: OptimizerConfig = {
  heroStrengthWeight: 0.20,
  progressionWeight: 0.25,
  roleBalanceWeight: 0.15,
  synergyWeight: 0.15,
  modeFitWeight: 0.10,
  factionWeight: 0.05,
  confidenceWeight: 0.10,
  heroReusePenalty: 15,
  maxCandidates: 5000,
  diversityThreshold: 0.4,
  alternativesCount: 3,
  debug: false,
  // Formation defaults — tuned conservatively until verified data arrives
  formationFitWeight: 0.30,
  positionFitWeight: 0.40,
  survivabilityWeight: 0.15,
  rangeWeight: 0.10,
  roleHintWeight: 0.05,
  formationContribution: 0.15,
  metaWeight: 0.10,
  counterWeight: 0.08,
};

export function getConfig(): OptimizerConfig {
  return { ...TEAM_OPTIMIZER_CONFIG };
}

export function totalWeight(cfg: OptimizerConfig): number {
  return (
    cfg.heroStrengthWeight +
    cfg.progressionWeight +
    cfg.roleBalanceWeight +
    cfg.synergyWeight +
    cfg.modeFitWeight +
    cfg.factionWeight +
    cfg.confidenceWeight +
    cfg.metaWeight +
    cfg.counterWeight
  );
}
