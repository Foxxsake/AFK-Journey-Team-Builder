/**
 * Hero Intelligence types — structured combat-role and function data
 * for heroes, plus synergy/anti-synergy relationships.
 *
 * Every field supports a confidence classification so that verified
 * game data is never confused with heuristic interpretation.
 */

import type { SourceConfidence, GameModeId, FactionId, DamageType } from './index';

// ============================================================
// ROLES — a hero can have multiple roles
// ============================================================

export type HeroRoleTag =
  | 'tank'
  | 'bruiser'
  | 'dps'
  | 'assassin'
  | 'support'
  | 'healer'
  | 'controller'
  | 'buffer'
  | 'debuffer'
  | 'energy_support'
  | 'summoner';

export interface RoleAssignment {
  role: HeroRoleTag;
  confidence: SourceConfidence;
  /** 'verified' = from official/structured source, 'heuristic' = derived. */
  evidence: 'verified' | 'heuristic';
  source?: string;
}

// ============================================================
// COMBAT FUNCTIONS
// ============================================================

export type CombatFunction =
  | 'frontline'
  | 'backline'
  | 'sustained_damage'
  | 'burst_damage'
  | 'aoe_damage'
  | 'single_target_damage'
  | 'healing'
  | 'shielding'
  | 'damage_reduction'
  | 'crowd_control'
  | 'buffing'
  | 'debuffing'
  | 'energy_generation'
  | 'energy_reduction'
  | 'haste'
  | 'summoning'
  | 'disruption'
  | 'execute'
  | 'anti_heal'
  | 'survivability'
  | 'protection';

export interface FunctionAssignment {
  func: CombatFunction;
  confidence: SourceConfidence;
  evidence: 'verified' | 'heuristic';
}

// ============================================================
// HERO MECHANIC CAPABILITIES (0-3 scale)
// ============================================================

export type CapabilityLevel = 0 | 1 | 2 | 3;

export interface HeroCapabilities {
  survivability: CapabilityLevel;
  control: CapabilityLevel;
  healing: CapabilityLevel;
  support: CapabilityLevel;
  damage: CapabilityLevel;
  energy: CapabilityLevel;
  summon: CapabilityLevel;
  buff: CapabilityLevel;
  debuff: CapabilityLevel;
}

export interface CapabilityAssessment {
  capabilities: HeroCapabilities;
  evidence: 'verified' | 'heuristic';
  confidence: SourceConfidence;
}

// ============================================================
// HERO INTELLIGENCE — the full structured profile
// ============================================================

export interface HeroIntelligence {
  heroId: string;
  roles: RoleAssignment[];
  functions: FunctionAssignment[];
  capabilities: CapabilityAssessment;
  /** 'melee' or 'ranged' — derived from range stat. */
  combatRange: 'melee' | 'ranged';
  damageType: DamageType;
  faction: FactionId;
  /** Game modes where this hero is particularly relevant. */
  modeRelevance: GameModeId[];
  /** Known weaknesses — heuristically derived, not invented game mechanics. */
  weaknesses: string[];
  /** When this intelligence was last assessed. */
  lastAssessed: string;
  /** Overall intelligence completeness: 'full' | 'partial' | 'unknown'. */
  completeness: 'full' | 'partial' | 'unknown';
}

// ============================================================
// SYNERGY SYSTEM
// ============================================================

export type SynergyCategory =
  | 'frontline_support'
  | 'healing'
  | 'protection'
  | 'damage_amplification'
  | 'energy'
  | 'haste'
  | 'control_chain'
  | 'aoe_combination'
  | 'single_target_burst'
  | 'sustain'
  | 'summon'
  | 'faction'
  | 'debuff'
  | 'buff'
  | 'anti_enemy';

export interface SynergyRelationship {
  heroA: string;
  heroB: string;
  /** Positive = beneficial, negative = anti-synergy. */
  synergyScore: number;
  category: SynergyCategory;
  reason: string;
  /** Game modes where this synergy applies. Empty = universal. */
  gameModes: GameModeId[];
  confidence: SourceConfidence;
  evidence: 'verified' | 'heuristic';
  source?: string;
}

// ============================================================
// ROLE BALANCE RESULT
// ============================================================

export interface RoleBalanceResult {
  score: number;
  strengths: string[];
  weaknesses: string[];
  warnings: string[];
  confidence: SourceConfidence;
  /** Roles present on the team. */
  rolesPresent: HeroRoleTag[];
  /** Key functions present. */
  functionsPresent: CombatFunction[];
  /** Whether the team has a frontline. */
  hasFrontline: boolean;
  /** Whether the team has a damage dealer. */
  hasDamage: boolean;
  /** Whether the team has sustain (healing/shielding). */
  hasSustain: boolean;
  /** Whether the team has crowd control. */
  hasControl: boolean;
}

// ============================================================
// TEAM SYNERGY RESULT
// ============================================================

export interface TeamSynergyResult {
  score: number;
  matchedSynergies: SynergyRelationship[];
  antiSynergies: SynergyRelationship[];
  /** Human-readable descriptions of active synergies. */
  synergyDescriptions: string[];
  /** Human-readable descriptions of anti-synergies. */
  antiSynergyDescriptions: string[];
  confidence: SourceConfidence;
}

// ============================================================
// EVIDENCE HIERARCHY
// ============================================================

export type EvidenceType = 'official' | 'structured_source' | 'verified_manual' | 'heuristic';

export const EVIDENCE_RANK: Record<EvidenceType, number> = {
  official: 4,
  structured_source: 3,
  verified_manual: 2,
  heuristic: 1,
};

// ============================================================
// ABILITY EFFECT TAXONOMY
// ============================================================

export type AbilityEffectType =
  | 'damage'
  | 'healing'
  | 'shield'
  | 'damage_reduction'
  | 'attack_buff'
  | 'defense_buff'
  | 'haste'
  | 'energy_gain'
  | 'energy_reduction'
  | 'crowd_control'
  | 'stun'
  | 'silence'
  | 'root'
  | 'displacement'
  | 'debuff'
  | 'damage_amplification'
  | 'summon'
  | 'execute'
  | 'anti_heal'
  | 'cleanse'
  | 'immunity'
  | 'taunt'
  | 'mark'
  | 'life_steal'
  | 'survivability';

export interface HeroAbilityEffect {
  type: AbilityEffectType;
  description: string;
  /** Target: self, ally, ally_all, enemy, enemy_all, enemy_front, etc. */
  target?: string;
  /** Value or scaling note if known (not invented). */
  value?: string;
}

export type AbilityType = 'ultimate' | 'active' | 'passive';

export interface HeroAbility {
  abilityId: string;
  heroId: string;
  name: string;
  description: string;
  abilityType: AbilityType;
  effects: HeroAbilityEffect[];
  /** Damage type if the ability deals damage. */
  damageType?: DamageType;
  /** Range if known. */
  range?: number;
  cooldown?: number;
  /** Energy interaction notes. */
  energyInteraction?: string;
  // Provenance
  source: string;
  sourceUrl?: string;
  retrievedAt: string;
  evidence: EvidenceType;
  confidence: SourceConfidence;
}

// ============================================================
// VERIFIED HERO DATA — merges abilities with intelligence
// ============================================================

export interface HeroVerifiedData {
  heroId: string;
  abilities: HeroAbility[];
  /** Roles upgraded from heuristic to verified based on ability analysis. */
  verifiedRoles?: RoleAssignment[];
  /** Whether verified data is available for this hero. */
  hasVerifiedAbilities: boolean;
  lastVerifiedAt?: string;
}

// ============================================================
// COUNTER ENGINE
// ============================================================

export type CounterStrength = 'hard' | 'soft' | 'situational';

export type CounterCategory =
  | 'burst'
  | 'anti_heal'
  | 'control'
  | 'displacement'
  | 'energy_disruption'
  | 'backline_disruption'
  | 'frontline_break'
  | 'summon_counter'
  | 'sustain_counter'
  | 'buff_removal'
  | 'damage_type'
  | 'range'
  | 'survivability'
  | 'execute';

export interface CounterRelationship {
  heroId: string;
  counterHeroId: string;
  counterScore: number;
  strength: CounterStrength;
  category: CounterCategory;
  reason: string;
  gameModes: GameModeId[];
  confidence: SourceConfidence;
  evidence: EvidenceType;
  source?: string;
}

export interface CounterResult {
  heroId: string;
  /** Counters that this hero applies to enemies. */
  strongAgainst: CounterRelationship[];
  /** Heroes that counter this hero. */
  weakAgainst: CounterRelationship[];
  /** Situational counters. */
  situational: CounterRelationship[];
  confidence: SourceConfidence;
}

// ============================================================
// MODE INTELLIGENCE
// ============================================================

export interface HeroModeAssessment {
  heroId: string;
  mode: GameModeId;
  /** 0-100 rating for this mode (UNKNOWN if not assessed). */
  rating: number | null;
  strengths: string[];
  weaknesses: string[];
  recommendedRoles: HeroRoleTag[];
  confidence: SourceConfidence;
  evidence: EvidenceType;
  source?: string;
}

// ============================================================
// BOSS ARCHITECTURE (Dream Realm / boss modes)
// ============================================================

export interface BossMechanic {
  name: string;
  description: string;
  /** Effect types that this mechanic relates to. */
  effectTypes?: AbilityEffectType[];
}

export interface BossCounter {
  heroId: string;
  reason: string;
  confidence: SourceConfidence;
  evidence: EvidenceType;
}

export interface BossTeamRecommendation {
  recommendedFunctions: CombatFunction[];
  counters: BossCounter[];
  notes: string;
}

export interface BossProfile {
  bossId: string;
  bossName: string;
  mechanics: BossMechanic[];
  damageType?: DamageType;
  targeting?: string;
  phases?: string[];
  specialMechanics?: string[];
  recommendedFunctions: CombatFunction[];
  counters: BossCounter[];
  confidence: SourceConfidence;
  evidence: EvidenceType;
  source?: string;
}

// ============================================================
// ENEMY TEAM ANALYSIS
// ============================================================

export interface EnemyThreat {
  heroId: string;
  threats: string[];
  /** Counter categories this enemy is vulnerable to. */
  vulnerableTo: CounterCategory[];
}

export interface EnemyTeamAnalysis {
  threats: EnemyThreat[];
  /** Recommended counter categories for the enemy team. */
  recommendedCounters: CounterCategory[];
  /** Recommended heroes that counter the enemy team. */
  recommendedHeroes: Array<{ heroId: string; reason: string; strength: CounterStrength }>;
  /** Positioning considerations. */
  positioningNotes: string[];
  confidence: SourceConfidence;
}

// ============================================================
// TEAM COUNTER RESULT (for scoring)
// ============================================================

export interface TeamCounterResult {
  score: number;
  /** Counter relationships active on the team against the enemy. */
  activeCounters: CounterRelationship[];
  /** Human-readable descriptions. */
  counterDescriptions: string[];
  confidence: SourceConfidence;
}
