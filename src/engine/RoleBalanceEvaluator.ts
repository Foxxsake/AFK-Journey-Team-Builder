/**
 * Role Balance Evaluator — assesses team composition balance.
 *
 * Uses Hero Intelligence data (roles, functions, capabilities) to
 * evaluate whether a team has:
 *   - Frontline presence
 *   - Damage output
 *   - Sustain (healing/shielding)
 *   - Crowd control
 *   - Excessive overlap in roles
 *
 * Returns an advisory result — does NOT reject unusual teams.
 */

import type { RoleBalanceResult, HeroRoleTag, CombatFunction } from '@/types/intelligence';
import type { SourceConfidence } from '@/types';
import { getHeroRoles, getHeroFunctions, getHeroIntelligence } from '@/data/intelligence';

export function evaluateRoleBalance(heroIds: string[]): RoleBalanceResult {
  if (heroIds.length === 0) {
    return {
      score: 0,
      strengths: [],
      weaknesses: ['Empty team.'],
      warnings: [],
      confidence: 'unknown',
      rolesPresent: [],
      functionsPresent: [],
      hasFrontline: false,
      hasDamage: false,
      hasSustain: false,
      hasControl: false,
    };
  }

  // Collect roles and functions across the team
  const roleSet = new Set<HeroRoleTag>();
  const functionSet = new Set<CombatFunction>();
  const confidenceLevels: SourceConfidence[] = [];

  for (const heroId of heroIds) {
    const roles = getHeroRoles(heroId);
    const functions = getHeroFunctions(heroId);
    roles.forEach((r) => roleSet.add(r));
    functions.forEach((f) => functionSet.add(f));

    const intel = getHeroIntelligence(heroId);
    if (intel) {
      confidenceLevels.push(intel.capabilities.confidence);
    }
  }

  const rolesPresent = [...roleSet];
  const functionsPresent = [...functionSet];

  // Key composition checks
  const hasFrontline = roleSet.has('tank') || roleSet.has('bruiser') ||
    functionSet.has('frontline');
  const hasDamage = roleSet.has('dps') || roleSet.has('assassin') ||
    functionSet.has('sustained_damage') || functionSet.has('burst_damage') ||
    functionSet.has('aoe_damage') || functionSet.has('single_target_damage');
  const hasSustain = roleSet.has('healer') || functionSet.has('healing') ||
    functionSet.has('shielding') || functionSet.has('damage_reduction');
  const hasControl = roleSet.has('controller') || functionSet.has('crowd_control');

  // Score calculation
  let score = 0;
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const warnings: string[] = [];

  // Frontline: 25 points
  if (hasFrontline) {
    score += 25;
    strengths.push('Has a frontline presence to absorb damage.');
  } else {
    weaknesses.push('No frontline — team may be vulnerable to enemy pressure.');
  }

  // Damage: 25 points
  if (hasDamage) {
    score += 25;
    strengths.push('Has damage output capability.');
  } else {
    weaknesses.push('No dedicated damage dealer — may struggle to defeat enemies.');
    warnings.push('no_damage');
  }

  // Sustain: 20 points
  if (hasSustain) {
    score += 20;
    strengths.push('Has sustain (healing or shielding) for prolonged fights.');
  } else {
    weaknesses.push('No sustain — team relies on raw damage to win quickly.');
  }

  // Control: 15 points
  if (hasControl) {
    score += 15;
    strengths.push('Has crowd control to disrupt enemies.');
  } else {
    weaknesses.push('No crowd control — enemies act freely.');
  }

  // Role diversity: up to 15 points
  const roleDiversity = Math.min(1, rolesPresent.length / Math.max(heroIds.length, 1));
  score += roleDiversity * 15;

  // Check for excessive overlap — more than 3 heroes with the same role
  const roleCounts = new Map<HeroRoleTag, number>();
  for (const heroId of heroIds) {
    for (const role of getHeroRoles(heroId)) {
      roleCounts.set(role, (roleCounts.get(role) ?? 0) + 1);
    }
  }
  for (const [role, count] of roleCounts) {
    if (count > 3) {
      warnings.push(`excessive_${role}`);
      weaknesses.push(`${count} heroes share the ${role} role — consider diversifying.`);
    }
  }

  // Confidence
  const confidence: SourceConfidence =
    confidenceLevels.length === 0 ? 'unknown' :
    confidenceLevels.every((c) => c === 'high') ? 'high' :
    confidenceLevels.every((c) => c === 'high' || c === 'medium') ? 'medium' :
    'low';

  return {
    score: Math.min(100, score),
    strengths,
    weaknesses,
    warnings,
    confidence,
    rolesPresent,
    functionsPresent,
    hasFrontline,
    hasDamage,
    hasSustain,
    hasControl,
  };
}
