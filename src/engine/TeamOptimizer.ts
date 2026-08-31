import type { PlayerHero, GameMode, MetaRating, MetaConsensus, EnemyTeam } from '@/types';
import type {
  OptimizerInput,
  OptimizerResult,
  ScoredTeam,
  OptimizerConstraints,
  DebugInfo,
} from './types';
import type { SynergyRule } from './types';
import { getConfig, OptimizerConfig } from './config';
import { scoreTeam, gradeFromScore } from './TeamScorer';
import { generateExplanation } from './ExplanationEngine';
import { calculateHeroStrength } from './HeroStrengthScorer';
import { calculateProgressionScore } from './ProgressionScorer';
import { getBossProfile } from '@/data/intelligence/modeIntelligence';
import { getHeroCounters } from './CounterEngine';

/**
 * Generates valid candidate teams from the player's owned heroes.
 *
 * Strategy:
 *   - For small rosters (combinations <= maxCandidates): exhaustive
 *   - For larger rosters: greedy pre-selection of top heroes by
 *     progression + strength, then exhaustive within that subset.
 *
 * This prevents freezing the browser on large rosters while still
 * finding strong teams.
 */

function combinations(n: number, k: number): number {
  if (k > n) return 0;
  if (k === 0 || k === n) return 1;
  let result = 1;
  for (let i = 0; i < k; i++) {
    result = (result * (n - i)) / (i + 1);
  }
  return Math.floor(result);
}

function generateCombinations<T>(arr: T[], k: number, maxCount: number): T[][] {
  const result: T[][] = [];
  const n = arr.length;
  if (k > n || k === 0) return result;

  const indices = Array.from({ length: k }, (_, i) => i);

  while (indices[0] <= n - k && result.length < maxCount) {
    result.push(indices.map((i) => arr[i]));

    // Next combination
    let i = k - 1;
    while (i >= 0 && indices[i] === n - k + i) i--;
    if (i < 0) break;
    indices[i]++;
    for (let j = i + 1; j < k; j++) {
      indices[j] = indices[j - 1] + 1;
    }
  }

  return result;
}

function calculateSimilarity(teamA: string[], teamB: string[]): number {
  const setA = new Set(teamA);
  const setB = new Set(teamB);
  let common = 0;
  for (const id of setA) {
    if (setB.has(id)) common++;
  }
  return common / Math.max(setA.size, setB.size);
}

function buildScoredTeam(
  heroes: PlayerHero[],
  mode: GameMode,
  config: OptimizerConfig,
  metaRatings: MetaRating[] | undefined,
  synergyRules: SynergyRule[] | undefined,
  availableCount: number,
  totalCount: number,
  metaConsensus?: Map<string, MetaConsensus>,
  enemyTeam?: EnemyTeam | null,
  bossId?: string | null
): ScoredTeam {
  const scoreResult = scoreTeam(heroes, mode, config, metaRatings, synergyRules, metaConsensus, enemyTeam, bossId);
  const explanation = generateExplanation(heroes, mode, scoreResult, availableCount, totalCount);

  return {
    heroes,
    heroIds: heroes.map((h) => h.id),
    score: scoreResult.total,
    breakdown: scoreResult.breakdown,
    explanation,
  };
}

export interface OptimizerContext {
  config: OptimizerConfig;
  synergyRules?: SynergyRule[];
  metaConsensus?: Map<string, MetaConsensus>;
}

export function optimizeTeam(
  input: OptimizerInput,
  context?: OptimizerContext
): OptimizerResult {
  const startTime = performance.now();
  const config = context?.config ?? getConfig();
  const synergyRules = context?.synergyRules;
  const metaConsensus = context?.metaConsensus ?? input.metaConsensus;
  const warnings: string[] = [];

  const { playerHeroes, mode, metaRatings, constraints } = input;
  const teamSize = mode.teamSize;
  const totalCount = playerHeroes.length;

  // Filter heroes based on constraints
  let available = playerHeroes;
  if (constraints?.excludedHeroIds) {
    const excluded = new Set(constraints.excludedHeroIds);
    available = available.filter((h) => !excluded.has(h.id));
  }

  // Pre-sort candidates considering strength (meta consensus/rating), progression, and role distribution
  const heroQuickScore = (h: PlayerHero): number => {
    const strength = calculateHeroStrength(h, mode, undefined, metaConsensus);
    const progression = calculateProgressionScore(h);
    return strength * 0.55 + progression * 0.45;
  };

  // If required heroes exist, ensure they're included
  let requiredIds: Set<string> | undefined;
  if (constraints?.requiredHeroIds && constraints.requiredHeroIds.length > 0) {
    requiredIds = new Set(constraints.requiredHeroIds);
    const requiredHeroes = available.filter((h) => requiredIds!.has(h.id));
    if (requiredHeroes.length > teamSize) {
      warnings.push('More required heroes than team size — cannot satisfy constraints.');
      return emptyResult(warnings, startTime, config);
    }
  }

  // Generate candidate combinations
  const totalCombinations = combinations(available.length, teamSize);
  let candidatesEvaluated = 0;
  let candidatesPruned = 0;

  let candidateGroups: PlayerHero[][];

  if (totalCombinations <= config.maxCandidates) {
    // Exhaustive evaluation
    candidateGroups = generateCombinations(available, teamSize, config.maxCandidates);
  } else {
    // Role-stratified candidate pruning to avoid dropping top A-level heroes or essential roles
    let subsetSize = teamSize;
    while (combinations(subsetSize, teamSize) <= config.maxCandidates && subsetSize < available.length) {
      subsetSize++;
    }
    subsetSize = Math.min(subsetSize, available.length);

    // Stratify by role/class while preserving required heroes
    const sorted = [...available].sort((a, b) => heroQuickScore(b) - heroQuickScore(a));
    const selectedSubset = new Set<string>();

    if (requiredIds) {
      for (const id of requiredIds) {
        selectedSubset.add(id);
      }
    }

    // Ensure best candidates from key roles (tanks, supports, damage dealers)
    const tanks = sorted.filter((h) => h.class === 'tank');
    const supports = sorted.filter((h) => h.class === 'support');
    const others = sorted.filter((h) => h.class !== 'tank' && h.class !== 'support');

    // Pick top 3 tanks, top 3 supports, and top others
    tanks.slice(0, 3).forEach((h) => selectedSubset.add(h.id));
    supports.slice(0, 3).forEach((h) => selectedSubset.add(h.id));
    others.slice(0, 6).forEach((h) => selectedSubset.add(h.id));

    // Protect boss-specific counters when a boss is targeted
    if (input.bossId) {
      const boss = getBossProfile(input.bossId);
      if (boss) {
        for (const counter of boss.counters) {
          if (available.some((h) => h.id === counter.heroId)) {
            selectedSubset.add(counter.heroId);
          }
        }
      }
    }

    // Protect enemy counters when an enemy team is provided
    if (input.enemyTeam?.heroes && input.enemyTeam.heroes.length > 0) {
      const enemyHeroSet = new Set(input.enemyTeam.heroes);
      for (const hero of available) {
        const counters = getHeroCounters(hero.id);
        const countersEnemy = counters.some(
          (c) => c.counterHeroId === '*' || enemyHeroSet.has(c.counterHeroId)
        );
        if (countersEnemy) {
          selectedSubset.add(hero.id);
        }
      }
    }

    // Fill the remaining slots up to subsetSize with highest overall quick score
    for (const h of sorted) {
      if (selectedSubset.size >= subsetSize) break;
      selectedSubset.add(h.id);
    }

    const subset = sorted.filter((h) => selectedSubset.has(h.id));
    candidateGroups = generateCombinations(subset, teamSize, config.maxCandidates);
    candidatesPruned = totalCombinations - candidateGroups.length;
    warnings.push(`Large roster: evaluated top ${subset.length} heroes (${candidateGroups.length} of ${totalCombinations} possible combinations).`);
  }

  // Score all candidates
  const scoredTeams: ScoredTeam[] = [];
  for (const group of candidateGroups) {
    // If required heroes, ensure they're in the group
    if (requiredIds) {
      const groupIds = new Set(group.map((h) => h.id));
      const hasAllRequired = [...requiredIds].every((id) => groupIds.has(id));
      if (!hasAllRequired) continue;
    }

    const scored = buildScoredTeam(
      group,
      mode,
      config,
      metaRatings,
      synergyRules,
      available.length,
      totalCount,
      metaConsensus,
      input.enemyTeam,
      input.bossId
    );
    scoredTeams.push(scored);
    candidatesEvaluated++;
  }

  if (scoredTeams.length === 0) {
    if (requiredIds) {
      warnings.push('No valid teams found that include all required heroes.');
    } else {
      warnings.push('No valid teams could be formed from the available heroes.');
    }
    return emptyResult(warnings, startTime, config);
  }

  // Sort by score descending with fully deterministic tie-breaking
  scoredTeams.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.breakdown.progression !== a.breakdown.progression) return b.breakdown.progression - a.breakdown.progression;
    if (b.breakdown.heroStrength !== a.breakdown.heroStrength) return b.breakdown.heroStrength - a.breakdown.heroStrength;
    return a.heroIds.join(',').localeCompare(b.heroIds.join(','));
  });

  // Select best + diverse alternatives
  const selectedTeams: ScoredTeam[] = [scoredTeams[0]];
  const usedSimilarity: string[][] = [scoredTeams[0].heroIds];

  for (let i = 1; i < scoredTeams.length && selectedTeams.length < config.alternativesCount + 1; i++) {
    const candidate = scoredTeams[i];
    const isDiverse = usedSimilarity.every(
      (existing) => calculateSimilarity(candidate.heroIds, existing) < 1 - config.diversityThreshold
    );
    if (isDiverse) {
      selectedTeams.push(candidate);
      usedSimilarity.push(candidate.heroIds);
    }
  }

  // If we couldn't find enough diverse alternatives, fill with best remaining
  while (selectedTeams.length < Math.min(config.alternativesCount + 1, scoredTeams.length)) {
    for (const team of scoredTeams) {
      if (!selectedTeams.includes(team)) {
        selectedTeams.push(team);
        break;
      }
    }
  }

  const durationMs = performance.now() - startTime;

  const debug: DebugInfo | undefined = config.debug
    ? {
        totalCombinations,
        candidatesEvaluated,
        candidatesPruned,
        topScores: selectedTeams.map((t) => t.score),
        durationMs,
      }
    : undefined;

  return {
    teams: selectedTeams,
    bestTeam: selectedTeams[0] ?? null,
    candidatesEvaluated,
    candidatesPruned,
    durationMs,
    warnings,
    debug,
  };
}

function emptyResult(warnings: string[], startTime: number, config: OptimizerConfig): OptimizerResult {
  return {
    teams: [],
    bestTeam: null,
    candidatesEvaluated: 0,
    candidatesPruned: 0,
    durationMs: performance.now() - startTime,
    warnings,
    debug: config.debug
      ? { totalCombinations: 0, candidatesEvaluated: 0, candidatesPruned: 0, topScores: [], durationMs: 0 }
      : undefined,
  };
}
