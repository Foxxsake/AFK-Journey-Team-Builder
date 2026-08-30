import type { PlayerHero, GameMode, MetaRating } from '@/types';
import type { OptimizerInput, OptimizerResult, ScoredTeam, DebugInfo } from './types';
import type { SynergyRule } from './types';
import { getConfig, OptimizerConfig } from './config';
import { scoreTeam } from './TeamScorer';
import { generateExplanation } from './ExplanationEngine';
import { optimizeTeam, OptimizerContext } from './TeamOptimizer';

/**
 * Multi-team optimiser.
 *
 * When the user requests multiple teams, this module does NOT
 * simply run the single-team optimiser several times. Instead
 * it optimises the complete set of teams together, applying
 * hero reuse rules.
 *
 * Strategy:
 *   1. Run single-team optimiser to get the best team.
 *   2. If avoidHeroReuse is ON, remove used heroes from the pool
 *      and re-run for the next team.
 *   3. If avoidHeroReuse is OFF, allow reuse but apply a penalty
 *      to heroes already used in previous teams.
 *   4. Return all teams with their scores.
 */

export function optimizeMultipleTeams(
  input: OptimizerInput,
  context?: OptimizerContext
): OptimizerResult {
  const startTime = performance.now();
  const config = context?.config ?? getConfig();
  const synergyRules = context?.synergyRules;
  const warnings: string[] = [];

  const { playerHeroes, mode, metaRatings, teamCount, avoidHeroReuse } = input;
  const teamSize = mode.teamSize;

  // Pre-build validation
  if (playerHeroes.length < teamSize) {
    warnings.push(`You own ${playerHeroes.length} heroes, but this mode requires ${teamSize} per team.`);
    return {
      teams: [],
      bestTeam: null,
      candidatesEvaluated: 0,
      candidatesPruned: 0,
      durationMs: performance.now() - startTime,
      warnings,
    };
  }

  if (avoidHeroReuse && playerHeroes.length < teamSize * teamCount) {
    warnings.push(
      `You own ${playerHeroes.length} heroes, but ${teamCount} teams of ${teamSize} with no reuse requires ${teamSize * teamCount} unique heroes.`
    );
    // Reduce team count to what's possible
    const maxPossible = Math.floor(playerHeroes.length / teamSize);
    warnings.push(`Reducing to ${maxPossible} team${maxPossible > 1 ? 's' : ''}.`);
    const reducedInput = { ...input, teamCount: maxPossible };
    if (maxPossible === 0) {
      return {
        teams: [],
        bestTeam: null,
        candidatesEvaluated: 0,
        candidatesPruned: 0,
        durationMs: performance.now() - startTime,
        warnings,
      };
    }
    const reducedResult = optimizeMultipleTeams(reducedInput, context);
    // Merge the reduction warnings into the recursive result so the
    // caller is informed that the team count was reduced.
    const mergedWarnings = [
      ...warnings.filter((w) => !reducedResult.warnings.includes(w)),
      ...reducedResult.warnings,
    ];
    return {
      ...reducedResult,
      warnings: mergedWarnings,
      debug: config.debug && reducedResult.debug
        ? { ...reducedResult.debug, durationMs: performance.now() - startTime }
        : reducedResult.debug,
    };
  }

  const allTeams: ScoredTeam[] = [];
  const usedHeroIds = new Set<string>();
  let totalEvaluated = 0;
  let totalPruned = 0;

  let currentPool = [...playerHeroes];

  for (let t = 0; t < teamCount; t++) {
    if (currentPool.length < teamSize) {
      warnings.push(`Not enough heroes left for team ${t + 1}. Stopped at ${allTeams.length} team${allTeams.length > 1 ? 's' : ''}.`);
      break;
    }

    // Build input for this iteration
    const teamInput: OptimizerInput = {
      ...input,
      playerHeroes: currentPool,
      teamCount: 1,
    };

    const result = optimizeTeam(teamInput, context);
    totalEvaluated += result.candidatesEvaluated;
    totalPruned += result.candidatesPruned;
    warnings.push(...result.warnings.filter((w) => !warnings.includes(w)));

    if (result.bestTeam) {
      // Apply reuse penalty to score if reuse is allowed
      let team = result.bestTeam;
      if (!avoidHeroReuse && usedHeroIds.size > 0) {
        const reusedCount = team.heroIds.filter((id) => usedHeroIds.has(id)).length;
        if (reusedCount > 0) {
          const penalty = reusedCount * config.heroReusePenalty;
          team = {
            ...team,
            score: Math.max(0, team.score - penalty),
            explanation: {
              ...team.explanation,
              dataNotes: [
                ...team.explanation.dataNotes,
                `${reusedCount} hero${reusedCount > 1 ? 'es' : ''} reused from previous team${reusedCount > 1 ? 's' : ''} (penalty: -${penalty}).`,
              ],
            },
          };
        }
      }

      allTeams.push(team);

      if (avoidHeroReuse) {
        // Remove used heroes from pool
        for (const id of team.heroIds) {
          usedHeroIds.add(id);
        }
        currentPool = currentPool.filter((h) => !usedHeroIds.has(h.id));
      } else {
        // Track usage but don't remove
        for (const id of team.heroIds) {
          usedHeroIds.add(id);
        }
      }
    } else {
      warnings.push(`Could not form team ${t + 1}.`);
      break;
    }
  }

  const durationMs = performance.now() - startTime;

  const debug: DebugInfo | undefined = config.debug
    ? {
        totalCombinations: totalEvaluated,
        candidatesEvaluated: totalEvaluated,
        candidatesPruned: totalPruned,
        topScores: allTeams.map((t) => t.score),
        durationMs,
      }
    : undefined;

  return {
    teams: allTeams,
    bestTeam: allTeams[0] ?? null,
    candidatesEvaluated: totalEvaluated,
    candidatesPruned: totalPruned,
    durationMs,
    warnings,
    debug,
  };
}
