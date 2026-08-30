/**
 * Hero Intelligence dataset.
 *
 * Derives structured combat roles and functions from VERIFIED hero data
 * (class, faction, damage type, range). All assessments are marked
 * HEURISTIC because they are derived from class/role interpretation,
 * not from verified official ability descriptions.
 *
 * The architecture supports adding VERIFIED intelligence later via
 * import. Heroes without intelligence data get 'unknown' completeness.
 */

import type { HeroIntelligence, HeroRoleTag, CombatFunction, CapabilityLevel } from '@/types/intelligence';
import type { Hero, HeroClass } from '@/types';
import { heroesById } from '@/data/heroes';

const assessedAt = '2026-08-27';

/**
 * Class-to-role mapping (heuristic).
 * A hero's class strongly implies certain combat roles, but this is
 * an interpretation, not an official game mechanic assignment.
 */
const CLASS_ROLES: Record<HeroClass, HeroRoleTag[]> = {
  tank: ['tank'],
  warrior: ['bruiser', 'dps'],
  marksman: ['dps'],
  mage: ['dps', 'controller'],
  rogue: ['assassin', 'dps'],
  support: ['support'],
};

/**
 * Class-to-function mapping (heuristic).
 */
const CLASS_FUNCTIONS: Record<HeroClass, CombatFunction[]> = {
  tank: ['frontline', 'survivability', 'protection'],
  warrior: ['frontline', 'sustained_damage'],
  marksman: ['backline', 'single_target_damage'],
  mage: ['backline', 'aoe_damage'],
  rogue: ['single_target_damage', 'disruption'],
  support: ['backline', 'buffing'],
};

/**
 * Heuristic capability assessment by class.
 * These are rough estimates based on the class archetype, not
 * verified per-hero ability data.
 */
const CLASS_CAPABILITIES: Record<HeroClass, {
  survivability: CapabilityLevel; control: CapabilityLevel; healing: CapabilityLevel;
  support: CapabilityLevel; damage: CapabilityLevel; energy: CapabilityLevel;
  summon: CapabilityLevel; buff: CapabilityLevel; debuff: CapabilityLevel;
}> = {
  tank: { survivability: 3, control: 1, healing: 0, support: 1, damage: 1, energy: 0, summon: 0, buff: 1, debuff: 1 },
  warrior: { survivability: 2, control: 1, healing: 0, support: 0, damage: 2, energy: 0, summon: 0, buff: 0, debuff: 1 },
  marksman: { survivability: 1, control: 0, healing: 0, support: 0, damage: 3, energy: 0, summon: 0, buff: 0, debuff: 0 },
  mage: { survivability: 1, control: 2, healing: 0, support: 0, damage: 3, energy: 1, summon: 0, buff: 1, debuff: 2 },
  rogue: { survivability: 1, control: 1, healing: 0, support: 0, damage: 3, energy: 0, summon: 0, buff: 0, debuff: 2 },
  support: { survivability: 1, control: 1, healing: 2, support: 3, damage: 1, energy: 2, summon: 0, buff: 3, debuff: 1 },
};

/**
 * Heroes with explicitly known support/healing/control roles.
 * These are derived from community knowledge (Prydwen guides, wiki
 * descriptions) and marked HEURISTIC.
 */
const KNOWN_SUPPORT_HEALERS = new Set([
  'smokey_meerky', 'hewynn', 'rowan', 'lorsan', 'velara', 'solise',
  'elijah_lailah', 'reinier', 'ludovic', 'pandora', 'koko', 'fay',
  'damian', 'evie', 'hugin', 'isabella', 'niru', 'mikola', 'peggy',
  'chippy', 'hammie', 'rolan',
]);

const KNOWN_CONTROLLERS = new Set([
  'arden', 'pippa', 'tasi', 'mehira', 'cryonaia', 'cyran', 'galahad',
  'aurora', 'contess', 'voracia', 'frieren', 'marcille',
]);

const KNOWN_SUMMONERS = new Set([
  'cecia', 'florabelle', 'berial', 'damian', 'igor', 'faramor', 'kulu',
]);

/**
 * Build hero intelligence from verified data + heuristic interpretation.
 */
function buildIntelligence(hero: Hero): HeroIntelligence {
  const baseRoles = CLASS_ROLES[hero.class] ?? [];
  const baseFunctions = CLASS_FUNCTIONS[hero.class] ?? [];
  const baseCaps = CLASS_CAPABILITIES[hero.class] ?? CLASS_CAPABILITIES.support;

  // Extend roles for known specializations (heuristic)
  const roles: HeroRoleTag[] = [...baseRoles];
  if (KNOWN_SUPPORT_HEALERS.has(hero.id)) {
    if (!roles.includes('healer')) roles.push('healer');
    if (!roles.includes('support')) roles.push('support');
  }
  if (KNOWN_CONTROLLERS.has(hero.id)) {
    if (!roles.includes('controller')) roles.push('controller');
  }
  if (KNOWN_SUMMONERS.has(hero.id)) {
    if (!roles.includes('summoner')) roles.push('summoner');
  }

  // Extend functions for known specializations
  const functions: CombatFunction[] = [...baseFunctions];
  if (KNOWN_SUPPORT_HEALERS.has(hero.id)) {
    if (!functions.includes('healing')) functions.push('healing');
    if (!functions.includes('buffing')) functions.push('buffing');
  }
  if (KNOWN_CONTROLLERS.has(hero.id)) {
    if (!functions.includes('crowd_control')) functions.push('crowd_control');
  }

  // Capabilities — adjust for known specializations
  const capabilities = { ...baseCaps };
  if (KNOWN_SUPPORT_HEALERS.has(hero.id)) {
    capabilities.healing = Math.max(capabilities.healing, 2) as CapabilityLevel;
    capabilities.support = Math.max(capabilities.support, 2) as CapabilityLevel;
    capabilities.buff = Math.max(capabilities.buff, 2) as CapabilityLevel;
  }
  if (KNOWN_CONTROLLERS.has(hero.id)) {
    capabilities.control = Math.max(capabilities.control, 2) as CapabilityLevel;
  }

  // Combat range from verified range stat
  const combatRange: 'melee' | 'ranged' = hero.range <= 4 ? 'melee' : 'ranged';

  // Mode relevance — all heroes are relevant in campaign (default)
  const modeRelevance: string[] = ['campaign'];

  // Weaknesses — heuristic, based on class archetype
  const weaknesses: string[] = [];
  if (hero.class === 'marksman' || hero.class === 'mage') {
    weaknesses.push('Low survivability — vulnerable to burst damage and assassins.');
  }
  if (hero.class === 'rogue') {
    weaknesses.push('Melee range with lower survivability — requires positioning support.');
  }
  if (hero.class === 'support' && !KNOWN_CONTROLLERS.has(hero.id)) {
    weaknesses.push('Limited damage output — relies on teammates for damage.');
  }
  if (hero.range >= 15) {
    weaknesses.push('Very long range — may struggle in modes that require repositioning.');
  }

  // Completeness — all heroes get at least partial intelligence from class data
  const completeness: 'full' | 'partial' | 'unknown' = 'partial';

  return {
    heroId: hero.id,
    roles: roles.map((role) => ({
      role,
      confidence: 'medium' as const,
      evidence: 'heuristic' as const,
      source: 'Class-based interpretation',
    })),
    functions: functions.map((func) => ({
      func,
      confidence: 'medium' as const,
      evidence: 'heuristic' as const,
    })),
    capabilities: {
      capabilities,
      evidence: 'heuristic' as const,
      confidence: 'medium' as const,
    },
    combatRange,
    damageType: hero.damageType,
    faction: hero.faction,
    modeRelevance,
    weaknesses,
    lastAssessed: assessedAt,
    completeness,
  };
}

// Build intelligence for all heroes
const intelligenceMap: Record<string, HeroIntelligence> = {};

for (const hero of Object.values(heroesById)) {
  intelligenceMap[hero.id] = buildIntelligence(hero);
}

export const heroIntelligence: Record<string, HeroIntelligence> = intelligenceMap;

export function getHeroIntelligence(heroId: string): HeroIntelligence | null {
  return intelligenceMap[heroId] ?? null;
}

/**
 * Get all roles for a hero (returns empty array if unknown).
 */
export function getHeroRoles(heroId: string): HeroRoleTag[] {
  const intel = intelligenceMap[heroId];
  if (!intel) return [];
  return intel.roles.map((r) => r.role);
}

/**
 * Get all combat functions for a hero (returns empty array if unknown).
 */
export function getHeroFunctions(heroId: string): CombatFunction[] {
  const intel = intelligenceMap[heroId];
  if (!intel) return [];
  return intel.functions.map((f) => f.func);
}

/**
 * Check if a hero has a specific role.
 */
export function heroHasRole(heroId: string, role: HeroRoleTag): boolean {
  return getHeroRoles(heroId).includes(role);
}

/**
 * Check if a hero has a specific combat function.
 */
export function heroHasFunction(heroId: string, func: CombatFunction): boolean {
  return getHeroFunctions(heroId).includes(func);
}
