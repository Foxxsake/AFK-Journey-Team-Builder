import type { PlayerHero, Formation, EnemyTeam } from '@/types';
// Formation is already imported above — used in FormationResult.formation
import type {
  FormationResult,
  PositionedHero,
  FormationOptimizerInput,
  FormationDebugInfo,
  PositionScoringMode,
} from './types';
import { getPositionScoringMode } from './PositionScorer';
import type { OptimizerConfig } from './config';
import { getConfig } from './config';
import { getFormationsForMode } from '@/data/formations';
import { scoreHeroInSlot, buildPositionScoreMatrix } from './PositionScorer';

/**
 * FormationOptimizer — selects the best formation for a mode and
 * assigns each hero to the optimal slot within that formation.
 *
 * Process:
 *   1. Get all valid formations for the selected mode.
 *   2. For each formation, compute the optimal hero-to-slot assignment
 *      using the Hungarian algorithm (for 5x5, this is fast).
 *   3. Score each formation by the average position score of the
 *      best assignment.
 *   4. Return the highest-scoring formation + assignment.
 *
 * The combined score blends the original team score with the
 * formation/position score:
 *   combinedScore = teamScore * (1 - formationContribution)
 *                 + formationScore * formationContribution
 *
 * For small teams (<= 7 slots), the assignment is solved optimally
 * via the Hungarian algorithm. The algorithm guarantees one unique
 * hero per slot and the highest possible total assignment score.
 */

// Hungarian algorithm implementation (minimisation).
// We negate scores to convert maximisation → minimisation.
function hungarian(costMatrix: number[][]): number[] {
  const n = costMatrix.length;
  if (n === 0) return [];
  if (n === 1) return [0];

  // Pad to square matrix if needed
  const size = n;
  const cost = costMatrix.map((row) => {
    const padded = [...row];
    while (padded.length < size) padded.push(0);
    return padded;
  });

  const u = new Array(size + 1).fill(0);
  const v = new Array(size + 1).fill(0);
  const p = new Array(size + 1).fill(0);
  const way = new Array(size + 1).fill(0);

  for (let i = 1; i <= size; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array(size + 1).fill(Infinity);
    const used = new Array(size + 1).fill(false);

    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = Infinity;
      let j1 = -1;

      for (let j = 1; j <= size; j++) {
        if (!used[j]) {
          const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
          if (cur < minv[j]) {
            minv[j] = cur;
            way[j] = j0;
          }
          if (minv[j] < delta) {
            delta = minv[j];
            j1 = j;
          }
        }
      }

      for (let j = 0; j <= size; j++) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else {
          minv[j] -= delta;
        }
      }

      j0 = j1;
    } while (p[j0] !== 0);

    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0 !== 0);
  }

  // p[j] = i means column j is assigned to row i (1-indexed)
  const assignment = new Array(size).fill(-1);
  for (let j = 1; j <= size; j++) {
    if (p[j] !== 0) {
      assignment[j - 1] = p[j] - 1;
    }
  }

  return assignment;
}

function findOptimalAssignment(
  scoreMatrix: number[][]
): { assignment: number[]; totalScore: number } {
  // Convert to cost matrix (negate for minimisation)
  const costMatrix = scoreMatrix.map((row) => row.map((s) => -s));
  const assignment = hungarian(costMatrix);

  let totalScore = 0;
  for (let slotIdx = 0; slotIdx < assignment.length; slotIdx++) {
    const heroIdx = assignment[slotIdx];
    if (heroIdx >= 0 && heroIdx < scoreMatrix.length && slotIdx < scoreMatrix[heroIdx].length) {
      totalScore += scoreMatrix[heroIdx][slotIdx];
    }
  }

  return { assignment, totalScore };
}

function scoreFormation(
  heroes: PlayerHero[],
  formation: Formation,
  config: OptimizerConfig,
  enemyTeam?: EnemyTeam
): {
  assignment: number[];
  positionScores: Record<string, Record<string, number>>;
  formationScore: number;
  positionedHeroes: PositionedHero[];
  verifiedContribution: number;
  heuristicContribution: number;
} {
  const slots = formation.slots;

  // Build score matrix: [heroIdx][slotIdx]
  const scoreMatrix: number[][] = heroes.map((hero) =>
    slots.map((slot) => scoreHeroInSlot(hero, slot, config).total)
  );

  const { assignment, totalScore } = findOptimalAssignment(scoreMatrix);

  // Formation score = average position score across all slots
  const formationScore = slots.length > 0 ? totalScore / slots.length : 0;

  // Build full position score matrix for UI (heroId -> slotId -> score)
  const positionScores = buildPositionScoreMatrix(heroes, slots, config);

  // Build positioned heroes
  const positionedHeroes: PositionedHero[] = [];
  for (let slotIdx = 0; slotIdx < slots.length; slotIdx++) {
    const heroIdx = assignment[slotIdx];
    if (heroIdx >= 0 && heroIdx < heroes.length) {
      const hero = heroes[heroIdx];
      const slot = slots[slotIdx];
      const scoreResult = scoreHeroInSlot(hero, slot, config);
      const explanationParts = scoreResult.reasons.slice(0, 2);
      if (enemyTeam) {
        explanationParts.push('Enemy team detected — enemy-aware positioning is not yet implemented.');
      }
      positionedHeroes.push({
        hero,
        slotId: slot.id,
        position: slot.position,
        positionScore: scoreResult.total,
        positionExplanation: explanationParts.join(' '),
      });
    }
  }

  // Scoring transparency — currently 100% heuristic
  const scoringMode = getPositionScoringMode();
  const verifiedContribution = scoringMode === 'verified' ? 1 : scoringMode === 'mixed' ? 0.5 : 0;
  const heuristicContribution = 1 - verifiedContribution;

  return { assignment, positionScores, formationScore, positionedHeroes, verifiedContribution, heuristicContribution };
}

export function optimizeFormation(
  input: FormationOptimizerInput,
  configOverride?: OptimizerConfig
): FormationResult {
  const startTime = performance.now();
  const config = configOverride ?? getConfig();
  const { heroes, modeId, teamScore, enemyTeam } = input;
  const warnings: string[] = [];

  // Get valid formations for this mode
  const validFormations = getFormationsForMode(modeId);

  if (validFormations.length === 0) {
    warnings.push(`Formation optimisation unavailable for this mode (${modeId}).`);
    return {
      formationId: '',
      formationName: 'No formation available',
      positions: [],
      formationScore: 0,
      combinedScore: teamScore,
      teamScore,
      positionScores: {},
      alternatives: [],
      warnings,
      positionScoringMode: getPositionScoringMode(),
      debug: input.debug
        ? {
            formationsEvaluated: 0,
            assignmentsEvaluated: 0,
            bestFormationId: '',
            formationScores: [],
            durationMs: performance.now() - startTime,
            verifiedContribution: 0,
            heuristicContribution: 1,
            positionScoringMode: getPositionScoringMode(),
          }
        : undefined,
    };
  }

  // Validate team size matches formation slot count
  const matchingFormations = validFormations.filter((f) => f.slots.length === heroes.length);
  if (matchingFormations.length === 0) {
    warnings.push(
      `Team size (${heroes.length}) doesn't match any formation slot count for this mode.`
    );
    return {
      formationId: '',
      formationName: 'No matching formation',
      positions: [],
      formationScore: 0,
      combinedScore: teamScore,
      teamScore,
      positionScores: {},
      alternatives: [],
      warnings,
      positionScoringMode: getPositionScoringMode(),
      debug: input.debug
        ? {
            formationsEvaluated: validFormations.length,
            assignmentsEvaluated: 0,
            bestFormationId: '',
            formationScores: [],
            durationMs: performance.now() - startTime,
            verifiedContribution: 0,
            heuristicContribution: 1,
            positionScoringMode: getPositionScoringMode(),
          }
        : undefined,
    };
  }

  // Evaluate each formation
  const formationResults: Array<{
    formation: Formation;
    formationScore: number;
    positionedHeroes: PositionedHero[];
    positionScores: Record<string, Record<string, number>>;
    combinedScore: number;
  }> = [];

  let assignmentsEvaluated = 0;
  let verifiedContrib = 0;
  let heuristicContrib = 1;

  for (const formation of matchingFormations) {
    const result = scoreFormation(heroes, formation, config, enemyTeam);
    assignmentsEvaluated += 1;
    verifiedContrib = result.verifiedContribution;
    heuristicContrib = result.heuristicContribution;

    const combinedScore =
      teamScore * (1 - config.formationContribution) +
      result.formationScore * config.formationContribution;

    formationResults.push({
      formation,
      formationScore: result.formationScore,
      positionedHeroes: result.positionedHeroes,
      positionScores: result.positionScores,
      combinedScore: Math.round(combinedScore * 10) / 10,
    });
  }

  // Sort by combined score descending
  formationResults.sort((a, b) => b.combinedScore - a.combinedScore);

  const best = formationResults[0];
  const alternatives = formationResults.slice(1).map((r) => ({
    formationId: r.formation.id,
    formationName: r.formation.name,
    formationScore: Math.round(r.formationScore * 10) / 10,
    combinedScore: r.combinedScore,
  }));

  const durationMs = performance.now() - startTime;

  const scoringMode = getPositionScoringMode();

  const debug: FormationDebugInfo | undefined = input.debug
    ? {
        formationsEvaluated: matchingFormations.length,
        assignmentsEvaluated,
        bestFormationId: best.formation.id,
        formationScores: formationResults.map((r) => ({
          formationId: r.formation.id,
          score: Math.round(r.formationScore * 10) / 10,
        })),
        durationMs,
        verifiedContribution: verifiedContrib,
        heuristicContribution: heuristicContrib,
        positionScoringMode: scoringMode,
      }
    : undefined;

  // Data limitation note
  if (best.formation.confidence === 'low') {
    warnings.push(
      'Formation layout is based on provisional data (low confidence). Position recommendations may not reflect exact in-game mechanics.'
    );
  }

  return {
    formationId: best.formation.id,
    formationName: best.formation.name,
    formation: best.formation,
    positions: best.positionedHeroes,
    formationScore: Math.round(best.formationScore * 10) / 10,
    combinedScore: best.combinedScore,
    teamScore,
    positionScores: best.positionScores,
    alternatives,
    warnings,
    positionScoringMode: scoringMode,
    debug,
  };
}

/**
 * Convenience function: assign hero positions for a given team + formation.
 * Used when the formation is already chosen.
 */
export function assignHeroPositions(
  heroes: PlayerHero[],
  formation: Formation,
  configOverride?: OptimizerConfig
): { positions: PositionedHero[]; positionScores: Record<string, Record<string, number>>; formationScore: number } {
  const config = configOverride ?? getConfig();
  const result = scoreFormation(heroes, formation, config);
  return {
    positions: result.positionedHeroes,
    positionScores: result.positionScores,
    formationScore: result.formationScore,
  };
}
