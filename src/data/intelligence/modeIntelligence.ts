/**
 * Mode Intelligence — per-hero mode assessments and boss profiles.
 *
 * Mode assessments are populated for a SUBSET of heroes where reliable
 * community tier data is available. Heroes without assessments return
 * UNKNOWN. Boss profiles remain architecture-only — no fictional boss
 * mechanics are populated.
 *
 * Evidence: all assessments are 'structured_source' (community tier data),
 * never 'official'.
 */

import type { HeroModeAssessment, BossProfile, EvidenceType } from '@/types/intelligence';
import type { GameModeId } from '@/types';

const assessedAt = '2026-08-27';
const prydwenSource = 'Prydwen tier list';
const prydwenUrl = 'https://www.prydwen.gg/afk-journey/';

function assessment(
  heroId: string,
  mode: GameModeId,
  rating: number,
  strengths: string[],
  weaknesses: string[],
  recommendedRoles: HeroModeAssessment['recommendedRoles'],
  confidence: HeroModeAssessment['confidence'] = 'medium',
  evidence: EvidenceType = 'structured_source',
): HeroModeAssessment {
  return {
    heroId,
    mode,
    rating,
    strengths,
    weaknesses,
    recommendedRoles,
    confidence,
    evidence,
    source: prydwenSource,
  };
}

// ============================================================
// MODE ASSESSMENTS — subset with reliable tier data
// ============================================================

const modeAssessments: HeroModeAssessment[] = [
  // --- Campaign ---
  assessment('smokey_meerky', 'campaign', 88, ['Excellent healing output', 'Damage and healing combined'], ['Requires positioning for area healing'], ['healer', 'support']),
  assessment('thoran', 'campaign', 82, ['Strong frontline tank', 'Self-revive provides resilience'], ['Low damage output'], ['tank']),
  assessment('scarlita', 'campaign', 85, ['Strong bruiser with displacement', 'Good frontline damage'], ['Needs support against ranged teams'], ['bruiser', 'dps']),
  assessment('dionel', 'campaign', 80, ['Consistent ranged damage', 'Piercing shot hits multiple targets'], ['Low survivability'], ['dps']),
  assessment('brutus', 'campaign', 78, ['Good AoE damage', 'Damage reduction in melee'], ['Limited utility'], ['bruiser', 'dps']),
  assessment('rowan', 'campaign', 84, ['Energy generation accelerates team', 'Versatile support'], ['Low direct damage'], ['support', 'buffer']),
  assessment('hewynn', 'campaign', 80, ['Reliable healing', 'Shield provides protection'], ['No damage output'], ['healer', 'support']),
  assessment('lucius', 'campaign', 76, ['Team-wide shield', 'Damage reduction aura'], ['Low damage'], ['tank', 'support']),
  assessment('pippa', 'campaign', 75, ['Strong area crowd control', 'Good AoE damage'], ['Squishy — needs protection'], ['controller', 'dps']),
  assessment('athalia', 'campaign', 72, ['Backline burst damage', 'High mobility'], ['Risky — can be focused down'], ['assassin', 'dps']),
  assessment('eironn', 'campaign', 70, ['Execute potential', 'Backline access'], ['Squishy — requires setup'], ['assassin', 'dps']),
  assessment('valen', 'campaign', 68, ['Solid frontline damage', 'Stun provides utility'], ['Outclassed by higher-rarity heroes'], ['bruiser', 'dps']),

  // --- Arena ---
  assessment('smokey_meerky', 'arena', 90, ['Top-tier PvP healer', 'Area healing + damage'], ['Can be disrupted by crowd control'], ['healer', 'support']),
  assessment('athalia', 'arena', 85, ['Backline assassination', 'High burst pressure'], ['Countered by shields'], ['assassin', 'dps']),
  assessment('nara', 'arena', 82, ['Backline disruption', 'Pulls key targets'], ['Situational — depends on enemy formation'], ['assassin', 'controller']),
  assessment('lucius', 'arena', 80, ['Team shield counters burst', 'Damage reduction for allies'], ['Low offensive pressure'], ['tank', 'support']),
  assessment('rowan', 'arena', 83, ['Energy advantage in PvP', 'Accelerates ultimates'], ['Can be targeted early'], ['support', 'buffer']),
  assessment('scarlita', 'arena', 78, ['Disruption + damage', 'Knockback breaks formation'], ['Vulnerable to crowd control'], ['bruiser', 'dps']),
  assessment('mehira', 'arena', 79, ['Charm is devastating in PvP', 'Single-target control'], ['Low survivability — needs protection'], ['controller']),
  assessment('dionel', 'arena', 75, ['Consistent ranged damage', 'Piercing shot valuable'], ['Vulnerable to assassination'], ['dps']),

  // --- Supreme Arena ---
  assessment('smokey_meerky', 'supreme_arena', 92, ['Essential PvP healer', 'Best sustain in the meta'], ['Requires team built around sustain'], ['healer', 'support']),
  assessment('athalia', 'supreme_arena', 87, ['Premier backline assassin', 'Consistent burst'], ['Requires protection from counter-burst'], ['assassin', 'dps']),
  assessment('nara', 'supreme_arena', 84, ['Formation disruption is critical', 'Pulls key backline targets'], ['Must be timed correctly'], ['assassin', 'controller']),
  assessment('lucius', 'supreme_arena', 82, ['Shield is essential vs burst', 'Team-wide protection'], ['Low damage output'], ['tank', 'support']),

  // --- Dream Realm ---
  assessment('smokey_meerky', 'dream_realm', 85, ['Sustain for long boss fights', 'Healing + damage combined'], ['Boss mechanics may negate healing'], ['healer', 'support']),
  assessment('dionel', 'dream_realm', 82, ['Consistent boss damage', 'Piercing shot useful vs boss adds'], ['Boss AoE can kill squishy DPS'], ['dps']),
  assessment('scarlita', 'dream_realm', 80, ['Good boss damage', 'Disruption on boss adds'], ['Boss may resist displacement'], ['bruiser', 'dps']),
  assessment('brutus', 'dream_realm', 78, ['AoE for boss adds', 'Survivability in melee range'], ['Single-target damage limited'], ['bruiser', 'dps']),
  assessment('bryon', 'dream_realm', 83, ['Execute amplification on boss', 'Consistent ranged damage'], ['Vulnerable to boss AoE'], ['dps']),
  assessment('shemira', 'dream_realm', 79, ['Life steal sustains through boss damage', 'AoE damage'], ['Boss may resist life steal'], ['dps']),

  // --- Honor Duel ---
  assessment('athalia', 'honor_duel', 86, ['Burst damage excels in 1v1', 'Backline access'], ['Can be countered by shields'], ['assassin', 'dps']),
  assessment('scarlita', 'honor_duel', 80, ['Disruption + damage', 'Bruiser durability'], ['Vulnerable to sustained control'], ['bruiser', 'dps']),
  assessment('smokey_meerky', 'honor_duel', 82, ['Healing provides sustain advantage', 'Damage + healing dual role'], ['Can be out-damaged by burst'], ['healer', 'support']),

  // --- Abyssal Expedition ---
  assessment('smokey_meerky', 'abyssal_expedition', 84, ['Sustain for long battles', 'Versatile support'], ['May be less effective in specific encounters'], ['healer', 'support']),
  assessment('rowan', 'abyssal_expedition', 82, ['Energy generation for the team', 'Support utility'], ['Less direct impact'], ['support', 'buffer']),
  assessment('dionel', 'abyssal_expedition', 78, ['Consistent damage', 'Piercing shot for groups'], ['Survivability concerns in extended fights'], ['dps']),
];

// Build lookup map
const assessmentMap = new Map<string, HeroModeAssessment>();
for (const a of modeAssessments) {
  assessmentMap.set(`${a.heroId}::${a.mode}`, a);
}

export function getModeAssessment(heroId: string, mode: string): HeroModeAssessment | null {
  return assessmentMap.get(`${heroId}::${mode}`) ?? null;
}

export function getAllModeAssessments(): HeroModeAssessment[] {
  return [...modeAssessments];
}

export function getModeAssessmentCount(): number {
  return modeAssessments.length;
}

// ============================================================
// BOSS PROFILES
// ============================================================
// Dream Realm primary bosses with verified combat roles & known requirements.
// Sourced from structured community guide consensus (Prydwen & DotGG).

const bossProfiles: BossProfile[] = [
  {
    bossId: 'king_croaker',
    bossName: 'King Croaker',
    damageType: 'magic',
    targeting: 'frontline',
    mechanics: [
      { name: 'Insta-kill Bubble', description: 'Periodically targets closest heroes with bubbles that deal lethal execution damage if unmitigated.' },
      { name: 'Poison Waves', description: 'Deals continuous AoE magic damage requiring sustained area healing.' },
    ],
    recommendedFunctions: ['single_target_damage', 'healing', 'damage_reduction', 'shielding', 'survivability'],
    counters: [
      { heroId: 'marilee', reason: 'High single-target ranged mobility DPS that evades water hazards', confidence: 'high', evidence: 'structured_source' },
      { heroId: 'korin', reason: 'Provides shields to protect allies against bubble burst', confidence: 'high', evidence: 'structured_source' },
      { heroId: 'smokey_meerky', reason: 'Sustained area healing counters poison waves', confidence: 'high', evidence: 'structured_source' },
      { heroId: 'odie', reason: 'High single-target poison DPS for boss execution', confidence: 'high', evidence: 'structured_source' },
      { heroId: 'reinier', reason: 'Damage amplification buff on primary carry', confidence: 'high', evidence: 'structured_source' },
    ],
    confidence: 'high',
    evidence: 'structured_source',
    source: 'Prydwen & DotGG Dream Realm Guides',
  },
  {
    bossId: 'necrodrakon',
    bossName: 'Necrodrakon',
    damageType: 'magic',
    targeting: 'backline',
    mechanics: [
      { name: 'Energy Drain Miasma', description: 'Deals damage and saps energy unless units stay within safety zones or possess sustained healing.' },
      { name: 'Abyssal Crest', description: 'Targets highest DPS backline units with focused magic damage bursts.' },
    ],
    recommendedFunctions: ['single_target_damage', 'healing', 'buffing', 'energy_generation', 'haste'],
    counters: [
      { heroId: 'marilee', reason: 'Premier boss DPS whose mobility repositions out of miasma zones', confidence: 'high', evidence: 'structured_source' },
      { heroId: 'korin', reason: 'Provides consistent shields and true damage', confidence: 'high', evidence: 'structured_source' },
      { heroId: 'koko', reason: 'Team damage reduction and lifesteal buffers through miasma phases', confidence: 'high', evidence: 'structured_source' },
      { heroId: 'reinier', reason: 'Damage amplification and swaps boss proximity', confidence: 'high', evidence: 'structured_source' },
      { heroId: 'smokey_meerky', reason: 'Massive sustained health and energy regen', confidence: 'high', evidence: 'structured_source' },
    ],
    confidence: 'high',
    evidence: 'structured_source',
    source: 'Prydwen & DotGG Dream Realm Guides',
  },
  {
    bossId: 'skyclops',
    bossName: 'Skyclops',
    damageType: 'physical',
    targeting: 'frontline',
    mechanics: [
      { name: 'Prismatic Gaze', description: 'Fires high-damage eye laser sweeps and summons minions with shields.' },
      { name: 'Minion Wave Shields', description: 'Spawns minions requiring fast physical or true damage to prevent enrage.' },
    ],
    recommendedFunctions: ['aoe_damage', 'single_target_damage', 'healing', 'buffing', 'debuffing'],
    counters: [
      { heroId: 'marilee', reason: 'Top-tier sustained boss shredder', confidence: 'high', evidence: 'structured_source' },
      { heroId: 'korin', reason: 'True damage melts minion shields quickly', confidence: 'high', evidence: 'structured_source' },
      { heroId: 'kruger', reason: 'Physical defense shred significantly amplifies team physical output', confidence: 'high', evidence: 'structured_source' },
      { heroId: 'smokey_meerky', reason: 'Team attack buff and constant healing aura', confidence: 'high', evidence: 'structured_source' },
      { heroId: 'reinier', reason: 'Direct damage vulnerability debuff on boss', confidence: 'high', evidence: 'structured_source' },
    ],
    confidence: 'high',
    evidence: 'structured_source',
    source: 'Prydwen & DotGG Dream Realm Guides',
  },
  {
    bossId: 'snow_stomper',
    bossName: 'Snow Stomper',
    damageType: 'physical',
    targeting: 'frontline',
    mechanics: [
      { name: 'Blizzard Freeze', description: 'Periodically traps the highest DPS hero in a Snow Prison; requires rapid hit count to break.' },
      { name: 'Freezing Storm', description: 'Reduces team attack speed and haste across the battlefield.' },
    ],
    recommendedFunctions: ['single_target_damage', 'healing', 'haste', 'buffing', 'debuffing'],
    counters: [
      { heroId: 'marilee', reason: 'High attack frequency frees allies from ice tombs quickly', confidence: 'high', evidence: 'structured_source' },
      { heroId: 'odie', reason: 'Continuous poison ticks rapidly damage snow prison and boss', confidence: 'high', evidence: 'structured_source' },
      { heroId: 'smokey_meerky', reason: 'Haste buff offsets attack speed slows', confidence: 'high', evidence: 'structured_source' },
      { heroId: 'kruger', reason: 'Defense shred maximizes boss damage between blizzard phases', confidence: 'high', evidence: 'structured_source' },
      { heroId: 'reinier', reason: 'Amplifies DPS to break through snow barriers', confidence: 'high', evidence: 'structured_source' },
    ],
    confidence: 'high',
    evidence: 'structured_source',
    source: 'Prydwen & DotGG Dream Realm Guides',
  },
  {
    bossId: 'lone_gaze',
    bossName: 'Lone Gaze',
    damageType: 'physical',
    targeting: 'backline',
    mechanics: [
      { name: 'Blinding Mist', description: 'Creates mist fields causing attacks to miss unless units stay inside or close.' },
      { name: 'Wolf Pack Call', description: 'Summons wolves that swarm unprotected backline carries.' },
    ],
    recommendedFunctions: ['single_target_damage', 'healing', 'shielding', 'aoe_damage', 'disruption'],
    counters: [
      { heroId: 'shakir', reason: 'Aura provides damage reduction and handles wolf pack in melee', confidence: 'high', evidence: 'structured_source' },
      { heroId: 'marilee', reason: 'High sustained boss damage inside safety perimeter', confidence: 'high', evidence: 'structured_source' },
      { heroId: 'korin', reason: 'Shields protect squishy allies from wolf summons', confidence: 'high', evidence: 'structured_source' },
      { heroId: 'koko', reason: 'Team damage reduction prevents burst deaths from wolves', confidence: 'high', evidence: 'structured_source' },
      { heroId: 'smokey_meerky', reason: 'Keeps team healthy inside melee aura radius', confidence: 'high', evidence: 'structured_source' },
    ],
    confidence: 'high',
    evidence: 'structured_source',
    source: 'Prydwen & DotGG Dream Realm Guides',
  },
  {
    bossId: 'alpha_bear',
    bossName: 'Alpha Bear',
    damageType: 'physical',
    targeting: 'frontline',
    mechanics: [
      { name: 'Honey Splash', description: 'Applies stacking vulnerability and heavy physical swipes.' },
      { name: 'Enraged Roar', description: 'Massive front cone physical damage that ramps up over fight duration.' },
    ],
    recommendedFunctions: ['single_target_damage', 'debuffing', 'healing', 'buffing', 'shielding'],
    counters: [
      { heroId: 'marilee', reason: 'Out-ranges honey splashes while delivering maximum sustained DPS', confidence: 'high', evidence: 'structured_source' },
      { heroId: 'kruger', reason: 'Physical resistance reduction essential for scoring milestones', confidence: 'high', evidence: 'structured_source' },
      { heroId: 'korin', reason: 'True damage ignores escalating boss armor stacks', confidence: 'high', evidence: 'structured_source' },
      { heroId: 'smokey_meerky', reason: 'High continuous healing keeps frontline tank alive', confidence: 'high', evidence: 'structured_source' },
      { heroId: 'reinier', reason: 'Primary damage amplification enabler', confidence: 'high', evidence: 'structured_source' },
    ],
    confidence: 'high',
    evidence: 'structured_source',
    source: 'Prydwen & DotGG Dream Realm Guides',
  },
];

const bossMap = new Map<string, BossProfile>();
for (const b of bossProfiles) {
  bossMap.set(b.bossId, b);
}

export function getBossProfile(bossId: string): BossProfile | null {
  return bossMap.get(bossId) ?? null;
}

export function getAllBossProfiles(): BossProfile[] {
  return [...bossProfiles];
}
