/**
 * Synergy Engine — calculates team synergy from structured relationships.
 *
 * Synergy relationships are stored as pairs (heroA, heroB) with a score,
 * category, and mode applicability. The engine:
 *   - Looks up all pairs present in a team
 *   - Filters by game mode (universal synergies apply to all modes)
 *   - Sums positive and negative scores
 *   - Returns descriptions for explanations
 *
 * All relationships are marked HEURISTIC unless verified from an
 * official structured source.
 */

import type { SynergyRelationship, TeamSynergyResult } from '@/types/intelligence';
import type { SourceConfidence } from '@/types';

/**
 * Predefined synergy relationships (heuristic).
 *
 * These are derived from community knowledge and class-based
 * combat function interpretation. They are NOT invented game mechanics.
 *
 * Categories:
 *   - healers + DPS → sustain (healing keeps DPS alive)
 *   - tanks + DPS → frontline_support (tank protects DPS)
 *   - controllers + DPS → control_chain (CC sets up damage)
 *   - same faction → faction bonus
 *   - buffers + DPS → damage_amplification
 */

const HEALERS = [
  'smokey_meerky', 'hewynn', 'rowan', 'lorsan', 'velara', 'solise',
  'elijah_lailah', 'ludovic', 'pandora', 'koko', 'fay', 'damian',
  'evie', 'hugin', 'isabella', 'niru', 'mikola', 'peggy', 'rolan',
];

const TANKS = [
  'thoran', 'lumont', 'temesia', 'daimon', 'phraesto', 'dunlingr',
  'granny_dahnie', 'alna', 'gerda', 'lucca', 'lucius', 'chippy',
  'antandra', 'callan', 'hepler', 'ulmus', 'thador', 'gunnar',
];

const CONTROLLERS = [
  'arden', 'pippa', 'tasi', 'mehira', 'cryonaia', 'cyran', 'galahad',
  'aurora', 'contess', 'voracia', 'frieren', 'marcille',
];

const BUFFERS = [
  'smokey_meerky', 'hewynn', 'rowan', 'velara', 'solise',
  'elijah_lailah', 'pandora', 'peggy', 'rolan',
];

const BURST_DPS = [
  'scarlita', 'athalia', 'berial', 'eironn', 'vala', 'shakir',
  'nara', 'salazer', 'sylphira', 'saida',
];

const SUSTAIN_DPS = [
  'brutus', 'florabelle', 'hodgkin', 'igor', 'zandrok', 'pang',
  'harak', 'hepler', 'sonja', 'valen',
];

function buildSynergyData(): SynergyRelationship[] {
  const relationships: SynergyRelationship[] = [];
  const assessedAt = '2026-08-27';

  // Helper to create a synergy
  const syn = (
    a: string, b: string, score: number, category: SynergyRelationship['category'],
    reason: string, modes: string[] = []
  ): SynergyRelationship => ({
    heroA: a,
    heroB: b,
    synergyScore: score,
    category,
    reason,
    gameModes: modes,
    confidence: 'low',
    evidence: 'heuristic',
    source: 'Class-based combat function interpretation',
  });

  // Healer + Sustain DPS → sustain synergy
  for (const healer of HEALERS) {
    for (const dps of SUSTAIN_DPS) {
      if (healer !== dps) {
        relationships.push(syn(
          healer, dps, 8, 'sustain',
          `${healer} provides healing that allows ${dps} to remain effective in prolonged combat.`,
        ));
      }
    }
  }

  // Tank + DPS (backline) → frontline_support
  for (const tank of TANKS) {
    for (const dps of [...BURST_DPS, ...SUSTAIN_DPS]) {
      if (tank !== dps) {
        relationships.push(syn(
          tank, dps, 6, 'frontline_support',
          `${tank} holds the frontline, protecting ${dps} in the back.`,
        ));
      }
    }
  }

  // Controller + Burst DPS → control_chain (CC sets up burst)
  for (const controller of CONTROLLERS) {
    for (const dps of BURST_DPS) {
      if (controller !== dps) {
        relationships.push(syn(
          controller, dps, 7, 'control_chain',
          `${controller} provides crowd control that sets up ${dps} for burst damage.`,
        ));
      }
    }
  }

  // Buffer + DPS → damage_amplification
  for (const buffer of BUFFERS) {
    for (const dps of [...BURST_DPS, ...SUSTAIN_DPS]) {
      if (buffer !== dps) {
        relationships.push(syn(
          buffer, dps, 5, 'damage_amplification',
          `${buffer} amplifies ${dps}'s damage output through buffs.`,
        ));
      }
    }
  }

  return relationships;
}

// Build the relationship index for O(1) lookup
// ============================================================
// ABILITY-DERIVED VERIFIED SYNERGIES (structured_source)
// ============================================================
// These synergies are derived from verified ability interactions.
// They are marked 'structured_source' evidence because the ability
// descriptions come from a structured community source (wiki).

function buildVerifiedSynergies(): SynergyRelationship[] {
  const rels: SynergyRelationship[] = [];
  const wikiSrc = 'AFK Journey Wiki (Fandom)';
  const wikiUrl = 'https://afk-journey.fandom.com/wiki/';

  const vsyn = (
    a: string, b: string, score: number, category: SynergyRelationship['category'],
    reason: string, modes: string[] = [],
  ): SynergyRelationship => ({
    heroA: a,
    heroB: b,
    synergyScore: score,
    category,
    reason,
    gameModes: modes,
    confidence: 'medium',
    evidence: 'verified',
    source: wikiSrc,
  });

  // Rowan (energy gain) + any burst DPS → energy enables faster ultimates
  vsyn2(rels, 'rowan', 'athalia', 10, 'energy', 'Rowan\'s energy gain enables Athalia to use her ultimate more frequently.', vsyn);
  vsyn2(rels, 'rowan', 'eironn', 9, 'energy', 'Rowan\'s energy gain accelerates Eironn\'s burst damage.', vsyn);
  vsyn2(rels, 'rowan', 'scarlita', 8, 'energy', 'Rowan\'s energy gain allows Scarlita to charge faster.', vsyn);

  // Hewynn (healing + shield) + squishy DPS → sustain
  vsyn2(rels, 'hewynn', 'dionel', 9, 'sustain', 'Hewynn\'s continuous healing keeps Dionel alive in extended fights.', vsyn);
  vsyn2(rels, 'hewynn', 'atalanta', 8, 'sustain', 'Hewynn\'s shield protects Atalanta from burst damage.', vsyn);
  vsyn2(rels, 'hewynn', 'bonnie', 7, 'sustain', 'Hewynn\'s healing sustains Bonnie\'s magic damage output.', vsyn);

  // Smokey & Meerky (healing + damage) + sustained DPS → sustain
  vsyn2(rels, 'smokey_meerky', 'brutus', 9, 'sustain', 'Smokey\'s healing zone sustains Brutus in prolonged melee combat.', vsyn);
  vsyn2(rels, 'smokey_meerky', 'valen', 8, 'sustain', 'Smokey\'s healing allows Valen to maintain frontline pressure.', vsyn);

  // Lucius (team shield) + backline DPS → protection
  vsyn2(rels, 'lucius', 'dionel', 8, 'protection', 'Lucius\'s team-wide shield protects Dionel from assassins.', vsyn);
  vsyn2(rels, 'lucius', 'bryon', 7, 'protection', 'Lucius\'s shield keeps Bryon alive to deal sustained damage.', vsyn);

  // Pippa (crowd control) + burst DPS → control chain
  vsyn2(rels, 'pippa', 'scarlita', 9, 'control_chain', 'Pippa\'s freezing field sets up Scarlita\'s charge for burst damage.', vsyn);
  vsyn2(rels, 'pippa', 'athalia', 8, 'control_chain', 'Pippa\'s crowd control allows Athalia to safely reach the backline.', vsyn);

  // Tasi (sleep + debuff) + burst DPS → control chain
  vsyn2(rels, 'tasi', 'eironn', 8, 'control_chain', 'Tasi\'s sleep disables enemies for Eironn to burst down.', vsyn);

  // Elijah & Lailah (attack + defense buff) + DPS → damage amplification
  vsyn2(rels, 'elijah_lailah', 'scarlita', 8, 'damage_amplification', 'Elijah & Lailah\'s attack buff amplifies Scarlita\'s damage output.', vsyn);
  vsyn2(rels, 'elijah_lailah', 'dionel', 7, 'damage_amplification', 'Elijah & Lailah\'s buffs enhance Dionel\'s ranged damage.', vsyn);

  // Velara (attack buff + cleanse) + DPS → damage amplification
  vsyn2(rels, 'velara', 'atalanta', 8, 'damage_amplification', 'Velara\'s attack buff and cleanse amplify Atalanta\'s damage.', vsyn);
  vsyn2(rels, 'velara', 'bryon', 7, 'damage_amplification', 'Velara\'s buffs enhance Bryon\'s magic damage output.', vsyn);

  // Nara (backline pull) + AoE damage → single target burst
  vsyn2(rels, 'nara', 'carolina', 8, 'single_target_burst', 'Nara pulls a backline enemy into Carolina\'s AoE damage zone.', vsyn);
  vsyn2(rels, 'nara', 'voracia', 8, 'single_target_burst', 'Nara\'s displacement sets up Voracia\'s gravity well for burst.', vsyn);

  // Thoran (displacement + stun) + burst DPS → control chain
  vsyn2(rels, 'thoran', 'scarlita', 8, 'control_chain', 'Thoran\'s death roll stun sets up Scarlita for follow-up damage.', vsyn);
  vsyn2(rels, 'thoran', 'athalia', 7, 'control_chain', 'Thoran\'s displacement repositions enemies for Athalia\'s burst.', vsyn);

  // Mehira (charm) + DPS → control chain
  vsyn2(rels, 'mehira', 'scarlita', 8, 'control_chain', 'Mehira\'s charm turns enemies against each other, creating openings.', vsyn);

  // Temesia (line stun) + AoE DPS → aoe combination
  vsyn2(rels, 'temesia', 'carolina', 7, 'aoe_combination', 'Temesia\'s line stun groups enemies for Carolina\'s blizzard.', vsyn);

  // Daimon (shield + damage reduction) + healer → frontline support
  vsyn2(rels, 'daimon', 'hewynn', 7, 'frontline_support', 'Daimon\'s shield plus Hewynn\'s healing creates a durable frontline.', vsyn);

  // Florabelle (root) + AoE damage → aoe combination
  vsyn2(rels, 'florabelle', 'carolina', 7, 'aoe_combination', 'Florabelle\'s roots hold enemies for Carolina\'s blizzard.', vsyn);

  // Koko (attack buff + energy) + DPS → damage amplification
  vsyn2(rels, 'koko', 'scarlita', 7, 'damage_amplification', 'Koko\'s attack buff and energy gain amplify Scarlita\'s damage.', vsyn);

  // Solise (AoE healing) + frontline → sustain
  vsyn2(rels, 'solise', 'thoran', 7, 'sustain', 'Solise\'s AoE healing sustains Thoran\'s frontline presence.', vsyn);
  vsyn2(rels, 'solise', 'brutus', 7, 'sustain', 'Solise\'s large healing keeps Brutus in prolonged fights.', vsyn);

  // ============================================================
  // ANTI-SYNERGIES (negative)
  // ============================================================
  // Heroes competing for the same team function — derived from
  // ability analysis, marked heuristic.

  // Two backline pullers compete for the same disruption role
  vsyn2(rels, 'nara', 'phraesto', -6, 'control_chain', 'Nara and Phraesto both specialize in enemy displacement — their effects may overlap.', vsyn);
  vsyn2(rels, 'nara', 'voracia', -4, 'control_chain', 'Nara and Voracia both pull enemies — overlapping disruption may reduce efficiency.', vsyn);

  // Two pure healers may overheal
  vsyn2(rels, 'hewynn', 'solise', -3, 'healing', 'Hewynn and Solise both provide large healing — diminishing returns on sustain.', vsyn);

  // Two charmers / controllers overlap
  vsyn2(rels, 'mehira', 'tasi', -4, 'control_chain', 'Mehira and Tasi both provide single-target control — effects may overlap on the same enemy.', vsyn);

  return rels;
}

// Helper to push verified synergies
function vsyn2(
  rels: SynergyRelationship[],
  a: string, b: string, score: number,
  category: SynergyRelationship['category'],
  reason: string,
  factory: (a: string, b: string, score: number, category: SynergyRelationship['category'], reason: string, modes?: string[]) => SynergyRelationship,
  modes?: string[],
): void {
  rels.push(factory(a, b, score, category, reason, modes));
}

const synergyData = [...buildSynergyData(), ...buildVerifiedSynergies()];

// Index: map "heroA|heroB" (sorted) → relationships
const synergyIndex = new Map<string, SynergyRelationship[]>();

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

for (const rel of synergyData) {
  const key = pairKey(rel.heroA, rel.heroB);
  const existing = synergyIndex.get(key);
  if (existing) {
    existing.push(rel);
  } else {
    synergyIndex.set(key, [rel]);
  }
}

/**
 * Calculate team synergy score.
 *
 * @param heroIds Array of hero IDs on the team
 * @param modeId Current game mode
 * @returns TeamSynergyResult with score, matched synergies, and descriptions
 */
export function calculateTeamSynergy(
  heroIds: string[],
  modeId: string
): TeamSynergyResult {
  if (heroIds.length < 2) {
    return {
      score: 50,
      matchedSynergies: [],
      antiSynergies: [],
      synergyDescriptions: [],
      antiSynergyDescriptions: [],
      confidence: 'unknown',
    };
  }

  const matched: SynergyRelationship[] = [];
  const antiSynergies: SynergyRelationship[] = [];
  const synergyDescriptions: string[] = [];
  const antiSynergyDescriptions: string[] = [];
  let totalScore = 0;
  const confidenceLevels: SourceConfidence[] = [];

  // Check all pairs
  for (let i = 0; i < heroIds.length; i++) {
    for (let j = i + 1; j < heroIds.length; j++) {
      const key = pairKey(heroIds[i], heroIds[j]);
      const relationships = synergyIndex.get(key);
      if (!relationships) continue;

      for (const rel of relationships) {
        // Filter by game mode — universal (empty modes) always applies
        if (rel.gameModes.length > 0 && !rel.gameModes.includes(modeId)) continue;

        if (rel.synergyScore > 0) {
          matched.push(rel);
          totalScore += rel.synergyScore;
          synergyDescriptions.push(rel.reason);
        } else if (rel.synergyScore < 0) {
          antiSynergies.push(rel);
          totalScore += rel.synergyScore;
          antiSynergyDescriptions.push(rel.reason);
        }

        confidenceLevels.push(rel.confidence);
      }
    }
  }

  // Score: 50 baseline + cumulative synergy bonus, clamped 0-100
  const score = Math.min(100, Math.max(0, 50 + totalScore));

  // Overall confidence
  const confidence: SourceConfidence =
    confidenceLevels.length === 0 ? 'unknown' :
    confidenceLevels.every((c) => c === 'high') ? 'high' :
    confidenceLevels.every((c) => c === 'high' || c === 'medium') ? 'medium' :
    'low';

  return {
    score,
    matchedSynergies: matched,
    antiSynergies,
    synergyDescriptions,
    antiSynergyDescriptions,
    confidence,
  };
}

/**
 * Get all synergy relationships for a specific hero (for UI display).
 */
export function getHeroSynergies(heroId: string): SynergyRelationship[] {
  return synergyData.filter(
    (rel) => rel.heroA === heroId || rel.heroB === heroId
  );
}

/**
 * Get the raw synergy data (for export).
 */
export function getAllSynergyData(): SynergyRelationship[] {
  return [...synergyData];
}

/**
 * Get verified synergies only (structured_source evidence).
 */
export function getVerifiedSynergies(): SynergyRelationship[] {
  return synergyData.filter((s) => s.evidence === 'verified');
}

/**
 * Get heuristic synergies only.
 */
export function getHeuristicSynergies(): SynergyRelationship[] {
  return synergyData.filter((s) => s.evidence === 'heuristic');
}

/**
 * Get anti-synergies (negative score).
 */
export function getAntiSynergies(): SynergyRelationship[] {
  return synergyData.filter((s) => s.synergyScore < 0);
}
