import type { PlayerHero, GameMode } from '@/types';
import type { ScoreBreakdown, TeamExplanation, SynergyRule } from './types';
import type { TeamScoreResult } from './TeamScorer';

/**
 * Generates human-readable explanations from actual scoring results.
 *
 * The explanation engine NEVER claims a synergy exists unless that
 * synergy is present in the matched rules or synergy engine results.
 * It NEVER invents reasons. All explanations are derived from the
 * scoring breakdown and available data.
 *
 * Explanations distinguish VERIFIED (from official/structured source)
 * from HEURISTIC (derived from interpretation) from UNKNOWN.
 */

export function generateExplanation(
  heroes: PlayerHero[],
  mode: GameMode,
  scoreResult: TeamScoreResult,
  availableHeroCount: number,
  totalHeroCount: number
): TeamExplanation {
  const breakdown = scoreResult.breakdown;
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const dataNotes: string[] = [];

  // Summary — natural language using hero names and their functions
  const heroNames = heroes.map((h) => h.name);
  const heroList = heroNames.length <= 3
    ? heroNames.join(', ')
    : `${heroNames.slice(0, 2).join(', ')}, and ${heroNames.length - 2} more`;

  let summary = `Chosen from ${availableHeroCount} owned heroes. This team of ${heroList} scored ${scoreResult.total} overall. `;

  // Add role-based context
  if (scoreResult.roleBalanceResult) {
    const rb = scoreResult.roleBalanceResult;
    if (rb.hasFrontline && rb.hasDamage && rb.hasSustain) {
      summary += 'The composition has a frontline, damage output, and sustain. ';
    } else if (rb.hasFrontline && rb.hasDamage) {
      summary += 'The composition has a frontline and damage output but lacks sustain. ';
    } else if (rb.hasDamage && !rb.hasFrontline) {
      summary += 'The composition has damage but no frontline — vulnerable to enemy pressure. ';
    }
  }

  // Add synergy context
  if (scoreResult.synergyResult && scoreResult.synergyResult.matchedSynergies.length > 0) {
    const verified = scoreResult.synergyResult.matchedSynergies.filter((s) => s.evidence === 'verified').length;
    if (verified > 0) {
      summary += `${verified} verified synerg${verified > 1 ? 'ies' : 'y'} detected. `;
    } else {
      summary += `${scoreResult.synergyResult.matchedSynergies.length} heuristic synerg${scoreResult.synergyResult.matchedSynergies.length > 1 ? 'ies' : 'y'} detected. `;
    }
  }

  // Add counter context
  if (scoreResult.counterResult && scoreResult.counterResult.activeCounters.length > 0) {
    summary += `${scoreResult.counterResult.activeCounters.length} counter matchup${scoreResult.counterResult.activeCounters.length > 1 ? 's' : ''} active against the enemy team. `;
  }

  // Strengths from enhanced role balance
  if (scoreResult.roleBalanceResult) {
    for (const strength of scoreResult.roleBalanceResult.strengths) {
      strengths.push(strength);
    }
  }

  // Progression strength
  if (breakdown.progression >= 60) {
    const highInvest = heroes.filter((h) => h.roster.level >= 100);
    if (highInvest.length > 0) {
      strengths.push(`Contains ${highInvest.length} hero${highInvest.length > 1 ? 'es' : ''} with high player investment (level 100+).`);
    } else {
      strengths.push('Good overall progression investment across the team.');
    }
  }

  if (breakdown.heroStrength >= 70) {
    strengths.push('Strong individual hero quality based on rarity and available ratings.');
  }

  // Synergy descriptions from the synergy engine
  if (scoreResult.synergyResult && scoreResult.synergyResult.synergyDescriptions.length > 0) {
    for (const desc of scoreResult.synergyResult.synergyDescriptions.slice(0, 3)) {
      strengths.push(`Synergy: ${desc}`);
    }
  }

  // Also include legacy synergy rules
  if (scoreResult.synergyRules.length > 0) {
    for (const rule of scoreResult.synergyRules.slice(0, 2)) {
      if (rule.type === 'positive' || rule.type === 'team') {
        strengths.push(`Synergy: ${rule.reason}`);
      }
    }
  }

  // Counter descriptions from the counter engine
  if (scoreResult.counterResult && scoreResult.counterResult.counterDescriptions.length > 0) {
    for (const desc of scoreResult.counterResult.counterDescriptions.slice(0, 3)) {
      strengths.push(`Counter: ${desc}`);
    }
  }

  // Weaknesses from enhanced role balance
  if (scoreResult.roleBalanceResult) {
    for (const weakness of scoreResult.roleBalanceResult.weaknesses) {
      weaknesses.push(weakness);
    }
  }

  // Anti-synergy descriptions
  if (scoreResult.synergyResult && scoreResult.synergyResult.antiSynergyDescriptions.length > 0) {
    for (const desc of scoreResult.synergyResult.antiSynergyDescriptions.slice(0, 2)) {
      weaknesses.push(`Anti-synergy: ${desc}`);
      }
  }

  // Weaknesses from low scoring components
  if (breakdown.progression < 40) {
    weaknesses.push('Low overall progression investment — leveling these heroes would improve the score.');
  }

  if (breakdown.heroStrength < 40) {
    weaknesses.push('Lower individual hero quality — this is the best available from your current roster.');
  }

  // Data notes — transparency about data limitations
  if (scoreResult.synergyResult) {
    if (scoreResult.synergyResult.matchedSynergies.length === 0 && scoreResult.synergyRules.length === 0) {
      dataNotes.push('No verified synergy rules in the dataset — synergy scoring is neutral.');
    } else {
      const allHeuristic = scoreResult.synergyResult.matchedSynergies.every((s) => s.evidence === 'heuristic');
      if (allHeuristic) {
        dataNotes.push('Synergy assessments are HEURISTIC — derived from class-based combat function interpretation, not verified game mechanics.');
      }
    }
  }

  // Role balance confidence
  if (scoreResult.roleBalanceResult) {
    if (scoreResult.roleBalanceResult.confidence === 'low') {
      dataNotes.push('Role balance assessment uses HEURISTIC data — class-based interpretation, not verified per-hero ability data.');
    } else if (scoreResult.roleBalanceResult.confidence === 'unknown') {
      dataNotes.push('Role balance assessment has UNKNOWN confidence — insufficient hero intelligence data.');
    }
  }

  // Data confidence summary
  const verifiedCount = scoreResult.synergyResult?.matchedSynergies.filter((s) => s.evidence === 'verified').length ?? 0;
  const heuristicCount = scoreResult.synergyResult?.matchedSynergies.filter((s) => s.evidence === 'heuristic').length ?? 0;
  const unknownCount = scoreResult.synergyResult && scoreResult.synergyResult.matchedSynergies.length === 0 ? 1 : 0;
  if (verifiedCount > 0 || heuristicCount > 0 || unknownCount > 0) {
    dataNotes.push(`Data confidence — Verified: ${verifiedCount}, Heuristic: ${heuristicCount}, Unknown: ${unknownCount}.`);
  }

  // Counter confidence note
  if (scoreResult.counterResult) {
    if (scoreResult.counterResult.confidence === 'unknown') {
      dataNotes.push('No counter data available — counter scoring is neutral.');
    } else if (scoreResult.counterResult.confidence === 'low') {
      dataNotes.push('Counter assessments are HEURISTIC — derived from ability effect analysis, not verified game mechanics.');
    }
  }

  if (scoreResult.modeNotes.length > 0) {
    dataNotes.push(...scoreResult.modeNotes);
  }

  if (scoreResult.factionNotes.length > 0) {
    dataNotes.push(...scoreResult.factionNotes);
  }

  // Check if heroes lack roles
  const noRolesCount = heroes.filter((h) => h.roles.length === 0).length;
  if (noRolesCount > 0) {
    dataNotes.push(`${noRolesCount} hero${noRolesCount > 1 ? 's' : ''} on this team have no assigned roles — using class-based fallback for role balance.`);
  }

  return {
    summary,
    strengths,
    weaknesses,
    dataNotes,
  };
}

function componentLabel(key: string): string {
  const labels: Record<string, string> = {
    heroStrength: 'Hero Strength',
    progression: 'Progression',
    roleBalance: 'Role Balance',
    synergy: 'Synergy',
    modeFit: 'Mode Fit',
    faction: 'Faction',
    confidence: 'Data Confidence',
    meta: 'Meta',
    counter: 'Counter',
  };
  return labels[key] ?? key;
}
