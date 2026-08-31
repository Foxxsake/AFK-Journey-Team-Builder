import { describe, it, expect } from 'vitest';
import {
  getVerifiedHeroData,
  getHeroAbilities,
  getHeroEffectTypes,
  heroHasVerifiedEffect,
  getVerifiedHeroIds,
  getAllVerifiedAbilities,
  getVerifiedAbilityCount,
  getVerifiedHeroCount,
} from '@/data/intelligence/verifiedAbilities';
import {
  getModeAssessment,
  getAllModeAssessments,
  getModeAssessmentCount,
} from '@/data/intelligence/modeIntelligence';
import {
  getHeroCounters,
  getCounterResult,
  calculateTeamCounterScore,
  getAllCounters,
} from '@/engine/CounterEngine';
import {
  calculateTeamSynergy,
  getHeroSynergies,
  getAllSynergyData,
  getVerifiedSynergies,
  getHeuristicSynergies,
  getAntiSynergies,
} from '@/engine/SynergyEngine';
import {
  validateAbilities,
  validateModeAssessments,
  validateCounters,
  validateSynergies,
  validateAll,
  canReplaceEvidence,
  mergeEvidence,
  type ValidationResult,
} from '@/engine/IntelligenceValidator';
import {
  mergeAbilities,
  mergeModeAssessments,
  mergeCounters,
  mergeSynergies,
} from '@/engine/IntelligenceMerger';
import { scoreTeam } from '@/engine/TeamScorer';
import { TEAM_OPTIMIZER_CONFIG } from '@/engine/config';
import { generateExplanation } from '@/engine/ExplanationEngine';
import { optimizeTeam } from '@/engine';
import { heroesById } from '@/data/heroes';
import type { PlayerHero, GameMode, EnemyTeam } from '@/types';
import type { HeroAbility, HeroModeAssessment, CounterRelationship, SynergyRelationship, EvidenceType } from '@/types/intelligence';

// Helpers
function makePlayerHero(
  id: string,
  level: number = 100,
  rarity: PlayerHero['rarity'] = 's_level',
  heroClass: PlayerHero['class'] = 'warrior',
): PlayerHero {
  return {
    id,
    name: id.charAt(0).toUpperCase() + id.slice(1),
    faction: 'lightbearer',
    class: heroClass,
    roles: [],
    rarity,
    damageType: 'physical',
    range: 1,
    sources: [],
    lastUpdated: '2026-08-27',
    roster: {
      heroId: id,
      owned: true,
      level,
      progression: { ascension: 'mythic', signatureLevel: 0, furnitureLevel: 0, engravingLevel: 0 },
      addedAt: '2026-08-27',
      updatedAt: '2026-08-27',
    },
  };
}

const campaignMode: GameMode = {
  id: 'campaign',
  name: 'Campaign',
  description: 'PvE story mode',
  teamSize: 5,
  formationRequired: true,
};

// ============================================================
// VERIFIED ABILITY EXPANSION TESTS
// ============================================================

describe('Stage 10 — Verified Ability Expansion', () => {
  it('has significantly more heroes with verified data than Stage 9', () => {
    const count = getVerifiedHeroCount();
    expect(count).toBeGreaterThanOrEqual(20); // Stage 9 had 7, Stage 10 should have 20+
  });

  it('has significantly more verified abilities than Stage 9', () => {
    const count = getVerifiedAbilityCount();
    expect(count).toBeGreaterThanOrEqual(30); // Stage 9 had 17, Stage 10 should have 30+
  });

  it('all verified abilities reference valid canonical hero IDs', () => {
    const all = getAllVerifiedAbilities();
    for (const ab of all) {
      expect(heroesById[ab.heroId]).toBeDefined();
    }
  });

  it('all verified abilities have provenance', () => {
    const all = getAllVerifiedAbilities();
    for (const ab of all) {
      expect(ab.source).toBeTruthy();
      expect(ab.evidence).toBeTruthy();
      expect(ab.retrievedAt).toBeTruthy();
      expect(ab.confidence).toBeTruthy();
      expect(ab.sourceUrl).toBeTruthy();
    }
  });

  it('no ability is marked official (no official source)', () => {
    const all = getAllVerifiedAbilities();
    expect(all.every((a) => a.evidence !== 'official')).toBe(true);
  });

  it('all abilities are structured_source or verified_manual', () => {
    const all = getAllVerifiedAbilities();
    expect(all.every((a) => a.evidence === 'structured_source' || a.evidence === 'verified_manual')).toBe(true);
  });

  it('no duplicate ability IDs exist', () => {
    const all = getAllVerifiedAbilities();
    const ids = all.map((a) => a.abilityId);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('new heroes from Stage 10 have verified abilities', () => {
    const ids = getVerifiedHeroIds();
    // Stage 9 had: smokey_meerky, thoran, hewynn, rowan, pippa, scarlita, brutus, dionel
    // Stage 10 should add more
    expect(ids).toContain('atalanta');
    expect(ids).toContain('lucius');
    expect(ids).toContain('temesia');
    expect(ids).toContain('valen');
    expect(ids).toContain('eironn');
    expect(ids).toContain('tasi');
    expect(ids).toContain('nara');
    expect(ids).toContain('shemira');
  });

  it('abilities have structured effects', () => {
    const ab = getHeroAbilities('lucius');
    expect(ab.some((a) => a.effects.some((e) => e.type === 'shield'))).toBe(true);
  });

  it('getHeroEffectTypes works for expanded heroes', () => {
    expect(getHeroEffectTypes('lucius')).toContain('shield');
    expect(getHeroEffectTypes('nara')).toContain('displacement');
    expect(getHeroEffectTypes('tasi')).toContain('crowd_control');
  });
});

// ============================================================
// EVIDENCE PRECEDENCE TESTS
// ============================================================

describe('Evidence Precedence', () => {
  it('official > structured_source > verified_manual > heuristic', () => {
    expect(canReplaceEvidence('heuristic', 'structured_source')).toBe(true);
    expect(canReplaceEvidence('heuristic', 'verified_manual')).toBe(true);
    expect(canReplaceEvidence('heuristic', 'official')).toBe(true);
    expect(canReplaceEvidence('structured_source', 'official')).toBe(true);
    expect(canReplaceEvidence('verified_manual', 'structured_source')).toBe(true);
  });

  it('weaker evidence cannot replace stronger evidence', () => {
    expect(canReplaceEvidence('structured_source', 'heuristic')).toBe(false);
    expect(canReplaceEvidence('official', 'heuristic')).toBe(false);
    expect(canReplaceEvidence('official', 'structured_source')).toBe(false);
    expect(canReplaceEvidence('structured_source', 'verified_manual')).toBe(false);
  });

  it('equal evidence can replace (update)', () => {
    expect(canReplaceEvidence('structured_source', 'structured_source')).toBe(true);
    expect(canReplaceEvidence('heuristic', 'heuristic')).toBe(true);
  });

  it('mergeEvidence returns the stronger evidence', () => {
    expect(mergeEvidence('heuristic', 'structured_source')).toBe('structured_source');
    expect(mergeEvidence('structured_source', 'heuristic')).toBe('structured_source');
    expect(mergeEvidence('official', 'heuristic')).toBe('official');
  });
});

// ============================================================
// EVIDENCE-AWARE MERGING TESTS
// ============================================================

describe('Evidence-Aware Merging', () => {
  it('mergeAbilities adds new abilities', () => {
    const existing: HeroAbility[] = [];
    const incoming: HeroAbility[] = [
      {
        abilityId: 'test_ab1',
        heroId: 'valen',
        name: 'Test Ability',
        description: 'Test',
        abilityType: 'ultimate',
        effects: [],
        source: 'test',
        retrievedAt: '2026-08-27',
        evidence: 'structured_source',
        confidence: 'medium',
      },
    ];
    const result = mergeAbilities(existing, incoming);
    expect(result.added).toBe(1);
    expect(result.merged.length).toBe(1);
  });

  it('mergeAbilities skips weaker evidence', () => {
    const existing: HeroAbility[] = [
      {
        abilityId: 'test_ab1',
        heroId: 'valen',
        name: 'Existing',
        description: 'Existing desc',
        abilityType: 'ultimate',
        effects: [],
        source: 'wiki',
        retrievedAt: '2026-08-27',
        evidence: 'structured_source',
        confidence: 'medium',
      },
    ];
    const incoming: HeroAbility[] = [
      {
        abilityId: 'test_ab1',
        heroId: 'valen',
        name: 'Incoming',
        description: 'Incoming desc',
        abilityType: 'ultimate',
        effects: [],
        source: 'guess',
        retrievedAt: '2026-08-27',
        evidence: 'heuristic',
        confidence: 'low',
      },
    ];
    const result = mergeAbilities(existing, incoming);
    expect(result.skipped).toBe(1);
    expect(result.merged[0].name).toBe('Existing'); // Not replaced
  });

  it('mergeAbilities updates with stronger evidence', () => {
    const existing: HeroAbility[] = [
      {
        abilityId: 'test_ab1',
        heroId: 'valen',
        name: 'Old',
        description: 'Old',
        abilityType: 'ultimate',
        effects: [],
        source: 'guess',
        retrievedAt: '2026-08-27',
        evidence: 'heuristic',
        confidence: 'low',
      },
    ];
    const incoming: HeroAbility[] = [
      {
        abilityId: 'test_ab1',
        heroId: 'valen',
        name: 'New',
        description: 'New',
        abilityType: 'ultimate',
        effects: [],
        source: 'wiki',
        retrievedAt: '2026-08-27',
        evidence: 'structured_source',
        confidence: 'medium',
      },
    ];
    const result = mergeAbilities(existing, incoming);
    expect(result.updated).toBe(1);
    expect(result.merged[0].name).toBe('New'); // Replaced
  });

  it('mergeModeAssessments skips weaker evidence', () => {
    const existing: HeroModeAssessment[] = [
      {
        heroId: 'valen',
        mode: 'campaign',
        rating: 70,
        strengths: [],
        weaknesses: [],
        recommendedRoles: ['dps'],
        confidence: 'medium',
        evidence: 'structured_source',
        source: 'wiki',
      },
    ];
    const incoming: HeroModeAssessment[] = [
      {
        heroId: 'valen',
        mode: 'campaign',
        rating: 50,
        strengths: [],
        weaknesses: [],
        recommendedRoles: ['dps'],
        confidence: 'low',
        evidence: 'heuristic',
        source: 'guess',
      },
    ];
    const result = mergeModeAssessments(existing, incoming);
    expect(result.skipped).toBe(1);
    expect(result.merged[0].rating).toBe(70); // Not replaced
  });

  it('mergeCounters adds new and skips weaker', () => {
    const existing: CounterRelationship[] = [
      {
        heroId: 'nara',
        counterHeroId: 'dionel',
        counterScore: 10,
        strength: 'soft',
        category: 'backline_disruption',
        reason: 'Pulls Dionel',
        gameModes: ['arena'],
        confidence: 'medium',
        evidence: 'structured_source',
        source: 'wiki',
      },
    ];
    const incoming: CounterRelationship[] = [
      {
        heroId: 'nara',
        counterHeroId: 'dionel',
        counterScore: 5,
        strength: 'situational',
        category: 'backline_disruption',
        reason: 'Maybe pulls Dionel',
        gameModes: ['arena'],
        confidence: 'low',
        evidence: 'heuristic',
        source: 'guess',
      },
      {
        heroId: 'nara',
        counterHeroId: 'bryon',
        counterScore: 8,
        strength: 'soft',
        category: 'backline_disruption',
        reason: 'Pulls Bryon',
        gameModes: ['arena'],
        confidence: 'medium',
        evidence: 'structured_source',
        source: 'wiki',
      },
    ];
    const result = mergeCounters(existing, incoming);
    expect(result.skipped).toBe(1);
    expect(result.added).toBe(1);
    expect(result.merged.length).toBe(2);
  });

  it('mergeSynergies respects evidence hierarchy', () => {
    const existing: SynergyRelationship[] = [
      {
        heroA: 'rowan',
        heroB: 'scarlita',
        synergyScore: 8,
        category: 'energy',
        reason: 'Energy synergy',
        gameModes: [],
        confidence: 'medium',
        evidence: 'verified',
        source: 'wiki',
      },
    ];
    const incoming: SynergyRelationship[] = [
      {
        heroA: 'rowan',
        heroB: 'scarlita',
        synergyScore: 3,
        category: 'energy',
        reason: 'Weak guess',
        gameModes: [],
        confidence: 'low',
        evidence: 'heuristic',
        source: 'guess',
      },
    ];
    const result = mergeSynergies(existing, incoming);
    expect(result.skipped).toBe(1);
    expect(result.merged[0].synergyScore).toBe(8); // Not replaced
  });
});

// ============================================================
// PROVENANCE VALIDATION TESTS
// ============================================================

describe('Provenance Validation', () => {
  it('validates all existing verified abilities pass', () => {
    const all = getAllVerifiedAbilities();
    const result = validateAbilities(all);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('detects missing provenance', () => {
    const bad: HeroAbility[] = [
      {
        abilityId: 'bad1',
        heroId: 'valen',
        name: 'Bad',
        description: 'No provenance',
        abilityType: 'ultimate',
        effects: [],
        source: '',
        retrievedAt: '',
        evidence: 'heuristic',
        confidence: 'low',
      },
    ];
    const result = validateAbilities(bad);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'MISSING_PROVENANCE')).toBe(true);
  });

  it('detects invalid hero ID', () => {
    const bad: HeroAbility[] = [
      {
        abilityId: 'bad2',
        heroId: 'nonexistent_hero',
        name: 'Bad',
        description: 'Bad hero',
        abilityType: 'ultimate',
        effects: [],
        source: 'wiki',
        retrievedAt: '2026-08-27',
        evidence: 'structured_source',
        confidence: 'medium',
      },
    ];
    const result = validateAbilities(bad);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'INVALID_HERO_ID')).toBe(true);
  });

  it('detects duplicate ability IDs', () => {
    const dups: HeroAbility[] = [
      {
        abilityId: 'dup1',
        heroId: 'valen',
        name: 'First',
        description: 'First',
        abilityType: 'ultimate',
        effects: [],
        source: 'wiki',
        retrievedAt: '2026-08-27',
        evidence: 'structured_source',
        confidence: 'medium',
      },
      {
        abilityId: 'dup1',
        heroId: 'valen',
        name: 'Second',
        description: 'Second',
        abilityType: 'ultimate',
        effects: [],
        source: 'wiki',
        retrievedAt: '2026-08-27',
        evidence: 'structured_source',
        confidence: 'medium',
      },
    ];
    const result = validateAbilities(dups);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'DUPLICATE_ABILITY_ID')).toBe(true);
  });

  it('warns on heuristic abilities', () => {
    const heuristic: HeroAbility[] = [
      {
        abilityId: 'heur1',
        heroId: 'valen',
        name: 'Guess',
        description: 'Guessed ability',
        abilityType: 'passive',
        effects: [],
        source: 'guess',
        retrievedAt: '2026-08-27',
        evidence: 'heuristic',
        confidence: 'low',
      },
    ];
    const result = validateAbilities(heuristic);
    expect(result.warnings.some((w) => w.code === 'HEURISTIC_ABILITY')).toBe(true);
  });
});

// ============================================================
// MODE ASSESSMENT VALIDATION
// ============================================================

describe('Mode Assessment Validation', () => {
  it('validates all existing mode assessments pass', () => {
    const all = getAllModeAssessments();
    const result = validateModeAssessments(all);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('detects duplicate mode assessments', () => {
    const dups: HeroModeAssessment[] = [
      {
        heroId: 'valen',
        mode: 'campaign',
        rating: 70,
        strengths: [],
        weaknesses: [],
        recommendedRoles: ['dps'],
        confidence: 'medium',
        evidence: 'structured_source',
        source: 'wiki',
      },
      {
        heroId: 'valen',
        mode: 'campaign',
        rating: 80,
        strengths: [],
        weaknesses: [],
        recommendedRoles: ['dps'],
        confidence: 'medium',
        evidence: 'structured_source',
        source: 'wiki',
      },
    ];
    const result = validateModeAssessments(dups);
    expect(result.errors.some((e) => e.code === 'DUPLICATE_MODE_ASSESSMENT')).toBe(true);
  });

  it('detects invalid rating values', () => {
    const bad: HeroModeAssessment[] = [
      {
        heroId: 'valen',
        mode: 'campaign',
        rating: 150,
        strengths: [],
        weaknesses: [],
        recommendedRoles: ['dps'],
        confidence: 'medium',
        evidence: 'structured_source',
        source: 'wiki',
      },
    ];
    const result = validateModeAssessments(bad);
    expect(result.errors.some((e) => e.code === 'INVALID_RATING')).toBe(true);
  });

  it('has mode assessments for key heroes', () => {
    expect(getModeAssessment('smokey_meerky', 'campaign')).not.toBeNull();
    expect(getModeAssessment('scarlita', 'campaign')).not.toBeNull();
    expect(getModeAssessment('athalia', 'arena')).not.toBeNull();
    expect(getModeAssessment('smokey_meerky', 'dream_realm')).not.toBeNull();
  });

  it('returns null for unassessed hero/mode', () => {
    expect(getModeAssessment('marilee', 'honor_duel')).toBeNull();
  });

  it('has a non-zero assessment count', () => {
    expect(getModeAssessmentCount()).toBeGreaterThan(0);
  });
});

// ============================================================
// COUNTER VALIDATION
// ============================================================

describe('Counter Validation', () => {
  it('validates all existing counters pass', () => {
    const all = getAllCounters();
    const result = validateCounters(all);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('has explicit counter relationships', () => {
    const all = getAllCounters();
    expect(all.length).toBeGreaterThan(0);
  });

  it('Nara counters backline heroes', () => {
    const naraCounters = getAllCounters().filter((c) => c.heroId === 'nara');
    expect(naraCounters.length).toBeGreaterThan(0);
    expect(naraCounters.some((c) => c.counterHeroId === 'dionel')).toBe(true);
  });

  it('Athalia counters squishy backline', () => {
    const athaliaCounters = getAllCounters().filter((c) => c.heroId === 'athalia');
    expect(athaliaCounters.some((c) => c.counterHeroId === 'dionel')).toBe(true);
  });

  it('Lucius counters burst assassins', () => {
    const luciusCounters = getAllCounters().filter((c) => c.heroId === 'lucius');
    expect(luciusCounters.some((c) => c.counterHeroId === 'athalia')).toBe(true);
  });

  it('detects invalid counter hero ID', () => {
    const bad: CounterRelationship[] = [
      {
        heroId: 'nonexistent',
        counterHeroId: 'valen',
        counterScore: 5,
        strength: 'soft',
        category: 'burst',
        reason: 'Bad',
        gameModes: [],
        confidence: 'low',
        evidence: 'heuristic',
        source: 'test',
      },
    ];
    const result = validateCounters(bad);
    expect(result.errors.some((e) => e.code === 'INVALID_HERO_ID')).toBe(true);
  });
});

// ============================================================
// SYNERGY EXPANSION TESTS
// ============================================================

describe('Synergy Expansion', () => {
  it('has verified synergies (verified)', () => {
    const verified = getVerifiedSynergies();
    expect(verified.length).toBeGreaterThan(0);
    expect(verified.every((s) => s.evidence === 'verified')).toBe(true);
  });

  it('has heuristic synergies', () => {
    const heuristic = getHeuristicSynergies();
    expect(heuristic.length).toBeGreaterThan(0);
    expect(heuristic.every((s) => s.evidence === 'heuristic')).toBe(true);
  });

  it('has anti-synergies', () => {
    const anti = getAntiSynergies();
    expect(anti.length).toBeGreaterThan(0);
    expect(anti.every((s) => s.synergyScore < 0)).toBe(true);
  });

  it('Rowan has verified energy synergies', () => {
    const rowanSyns = getHeroSynergies('rowan').filter((s) => s.evidence === 'verified');
    expect(rowanSyns.some((s) => s.category === 'energy')).toBe(true);
  });

  it('Hewynn has verified sustain synergies', () => {
    const hewynnSyns = getHeroSynergies('hewynn').filter((s) => s.evidence === 'verified');
    expect(hewynnSyns.some((s) => s.category === 'sustain')).toBe(true);
  });

  it('Nara has anti-synergy with Phraesto', () => {
    const naraAnti = getAntiSynergies().filter((s) =>
      (s.heroA === 'nara' && s.heroB === 'phraesto') ||
      (s.heroA === 'phraesto' && s.heroB === 'nara')
    );
    expect(naraAnti.length).toBeGreaterThan(0);
  });

  it('validated synergies all pass', () => {
    const all = getAllSynergyData();
    const result = validateSynergies(all);
    expect(result.valid).toBe(true);
  });

  it('verified synergy scores are higher than heuristic on average', () => {
    const verified = getVerifiedSynergies().filter((s) => s.synergyScore > 0);
    const heuristic = getHeuristicSynergies().filter((s) => s.synergyScore > 0);
    if (verified.length > 0 && heuristic.length > 0) {
      const avgVerified = verified.reduce((s, r) => s + r.synergyScore, 0) / verified.length;
      const avgHeuristic = heuristic.reduce((s, r) => s + r.synergyScore, 0) / heuristic.length;
      // Verified synergies should be at least as strong
      expect(avgVerified).toBeGreaterThanOrEqual(avgHeuristic - 2); // Allow small tolerance
    }
  });
});

// ============================================================
// FULL VALIDATION TEST
// ============================================================

describe('Full Validation', () => {
  it('validateAll passes for all existing data', () => {
    const result = validateAll(
      getAllVerifiedAbilities(),
      getAllModeAssessments(),
      getAllCounters(),
      getAllSynergyData(),
    );
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });
});

// ============================================================
// OPTIMISER INTEGRATION TESTS
// ============================================================

describe('Optimiser Integration with Expanded Data', () => {
  it('verified synergies influence team score', () => {
    const heroes = [
      makePlayerHero('rowan', 200, 's_level', 'support'),
      makePlayerHero('athalia', 200, 's_level', 'rogue'),
      makePlayerHero('thoran', 200, 's_level', 'tank'),
      makePlayerHero('smokey_meerky', 200, 's_level', 'support'),
      makePlayerHero('dionel', 200, 's_level', 'marksman'),
    ];
    const result = scoreTeam(heroes, campaignMode, TEAM_OPTIMIZER_CONFIG);
    expect(result.breakdown.synergy).toBeGreaterThan(50);
    expect(result.synergyResult!.matchedSynergies.length).toBeGreaterThan(0);
    // Some synergies should be verified
    const verified = result.synergyResult!.matchedSynergies.filter((s) => s.evidence === 'verified');
    expect(verified.length).toBeGreaterThan(0);
  });

  it('player progression still matters more than intelligence', () => {
    const highLevel = [
      makePlayerHero('valen', 240, 'a_level', 'warrior'),
      makePlayerHero('marilee', 240, 'a_level', 'marksman'),
      makePlayerHero('korin', 240, 'a_level', 'warrior'),
    ];
    const lowLevel = [
      makePlayerHero('rowan', 1, 's_level', 'support'),
      makePlayerHero('athalia', 1, 's_level', 'rogue'),
      makePlayerHero('thoran', 1, 's_level', 'tank'),
    ];
    const highResult = scoreTeam(highLevel, campaignMode, TEAM_OPTIMIZER_CONFIG);
    const lowResult = scoreTeam(lowLevel, campaignMode, TEAM_OPTIMIZER_CONFIG);
    expect(highResult.breakdown.progression).toBeGreaterThan(lowResult.breakdown.progression);
  });

  it('deterministic results', () => {
    const heroes = [
      makePlayerHero('rowan', 200, 's_level', 'support'),
      makePlayerHero('athalia', 200, 's_level', 'rogue'),
      makePlayerHero('thoran', 200, 's_level', 'tank'),
    ];
    const r1 = scoreTeam(heroes, campaignMode, TEAM_OPTIMIZER_CONFIG);
    const r2 = scoreTeam(heroes, campaignMode, TEAM_OPTIMIZER_CONFIG);
    expect(r1.total).toBe(r2.total);
    expect(r1.breakdown).toEqual(r2.breakdown);
  });

  it('counter scoring with explicit counters against enemy', () => {
    const heroes = [
      makePlayerHero('nara', 200, 's_level', 'rogue'),
      makePlayerHero('thoran', 200, 's_level', 'tank'),
      makePlayerHero('smokey_meerky', 200, 's_level', 'support'),
    ];
    const arenaMode: GameMode = { id: 'arena', name: 'Arena', description: 'PvP', teamSize: 5, formationRequired: true };
    const enemy: EnemyTeam = { heroes: ['dionel', 'bryon'] };
    const result = scoreTeam(heroes, arenaMode, TEAM_OPTIMIZER_CONFIG, undefined, undefined, undefined, enemy);
    // Nara counters Dionel and Byron in arena — counter score should be > 50
    expect(result.breakdown.counter).toBeGreaterThan(50);
    expect(result.counterResult!.activeCounters.length).toBeGreaterThan(0);
  });

  it('optimiser still produces valid teams', () => {
    const heroes = [
      makePlayerHero('thoran', 200, 's_level', 'tank'),
      makePlayerHero('smokey_meerky', 200, 's_level', 'support'),
      makePlayerHero('scarlita', 200, 's_level', 'warrior'),
      makePlayerHero('pippa', 200, 's_level', 'mage'),
      makePlayerHero('dionel', 200, 's_level', 'marksman'),
      makePlayerHero('rowan', 200, 's_level', 'support'),
    ];
    const input = {
      playerHeroes: heroes,
      mode: campaignMode,
      teamCount: 1,
      avoidHeroReuse: false,
    };
    const result = optimizeTeam(input);
    expect(result.bestTeam).not.toBeNull();
    expect(result.bestTeam!.heroes.length).toBe(5);
  });
});

// ============================================================
// DATASET COMPATIBILITY
// ============================================================

describe('Dataset Backward Compatibility (Stage 10)', () => {
  it('old dataset without Stage 9/10 fields is still valid', () => {
    const oldDataset: Record<string, unknown> = {
      schemaVersion: 1,
      generatedAt: '2026-08-27',
      sources: [],
      heroMappings: [],
      metaRecords: [],
      snapshots: [],
      consensus: [],
    };
    expect(oldDataset.verifiedHeroData).toBeUndefined();
    expect(oldDataset.counterRelationships).toBeUndefined();
    expect(oldDataset.modeAssessments).toBeUndefined();
  });

  it('new dataset with all fields is valid', () => {
    const newDataset = {
      schemaVersion: 1,
      generatedAt: '2026-08-27',
      sources: [],
      heroMappings: [],
      metaRecords: [],
      snapshots: [],
      consensus: [],
      heroIntelligence: [],
      synergies: [],
      verifiedHeroData: [],
      counterRelationships: [],
      modeAssessments: [],
      bossProfiles: [],
    };
    expect(newDataset.verifiedHeroData).toEqual([]);
    expect(newDataset.counterRelationships).toEqual([]);
    expect(newDataset.modeAssessments).toEqual([]);
  });
});

// ============================================================
// EMPTY/PARTIAL DATASET TESTS
// ============================================================

describe('Empty and Partial Datasets', () => {
  it('validateAbilities with empty array passes', () => {
    const result = validateAbilities([]);
    expect(result.valid).toBe(true);
  });

  it('validateModeAssessments with empty array passes', () => {
    const result = validateModeAssessments([]);
    expect(result.valid).toBe(true);
  });

  it('validateCounters with empty array passes', () => {
    const result = validateCounters([]);
    expect(result.valid).toBe(true);
  });

  it('validateSynergies with empty array passes', () => {
    const result = validateSynergies([]);
    expect(result.valid).toBe(true);
  });

  it('mergeAbilities with empty existing adds all incoming', () => {
    const incoming: HeroAbility[] = [
      {
        abilityId: 'new1',
        heroId: 'valen',
        name: 'New',
        description: 'New',
        abilityType: 'ultimate',
        effects: [],
        source: 'wiki',
        retrievedAt: '2026-08-27',
        evidence: 'structured_source',
        confidence: 'medium',
      },
    ];
    const result = mergeAbilities([], incoming);
    expect(result.added).toBe(1);
    expect(result.merged.length).toBe(1);
  });

  it('mergeAbilities with empty incoming keeps all existing', () => {
    const existing: HeroAbility[] = [
      {
        abilityId: 'exist1',
        heroId: 'valen',
        name: 'Existing',
        description: 'Existing',
        abilityType: 'ultimate',
        effects: [],
        source: 'wiki',
        retrievedAt: '2026-08-27',
        evidence: 'structured_source',
        confidence: 'medium',
      },
    ];
    const result = mergeAbilities(existing, []);
    expect(result.merged.length).toBe(1);
    expect(result.added).toBe(0);
    expect(result.updated).toBe(0);
  });
});

// ============================================================
// INVALID RELATIONSHIP TESTS
// ============================================================

describe('Invalid Relationships', () => {
  it('synergy with invalid heroA is detected', () => {
    const bad: SynergyRelationship[] = [
      {
        heroA: 'nonexistent',
        heroB: 'valen',
        synergyScore: 5,
        category: 'sustain',
        reason: 'Bad',
        gameModes: [],
        confidence: 'low',
        evidence: 'heuristic',
        source: 'test',
      },
    ];
    const result = validateSynergies(bad);
    expect(result.errors.some((e) => e.code === 'INVALID_HERO_ID')).toBe(true);
  });

  it('counter with invalid target hero is detected', () => {
    const bad: CounterRelationship[] = [
      {
        heroId: 'nara',
        counterHeroId: 'nonexistent',
        counterScore: 5,
        strength: 'soft',
        category: 'burst',
        reason: 'Bad',
        gameModes: [],
        confidence: 'low',
        evidence: 'heuristic',
        source: 'test',
      },
    ];
    const result = validateCounters(bad);
    expect(result.errors.some((e) => e.code === 'INVALID_HERO_ID')).toBe(true);
  });
});

// ============================================================
// EXPLANATION TESTS
// ============================================================

describe('Explanation with Expanded Data', () => {
  it('explanation includes verified synergy descriptions', () => {
    const heroes = [
      makePlayerHero('rowan', 200, 's_level', 'support'),
      makePlayerHero('athalia', 200, 's_level', 'rogue'),
      makePlayerHero('thoran', 200, 's_level', 'tank'),
      makePlayerHero('smokey_meerky', 200, 's_level', 'support'),
      makePlayerHero('dionel', 200, 's_level', 'marksman'),
    ];
    const scoreResult = scoreTeam(heroes, campaignMode, TEAM_OPTIMIZER_CONFIG);
    const explanation = generateExplanation(heroes, campaignMode, scoreResult, 10, 124);
    // Should mention synergy
    const synergyMentions = explanation.strengths.filter((s) => s.includes('Synergy'));
    expect(synergyMentions.length).toBeGreaterThan(0);
  });

  it('explanation includes data confidence summary', () => {
    const heroes = [
      makePlayerHero('rowan', 200, 's_level', 'support'),
      makePlayerHero('athalia', 200, 's_level', 'rogue'),
      makePlayerHero('thoran', 200, 's_level', 'tank'),
    ];
    const scoreResult = scoreTeam(heroes, campaignMode, TEAM_OPTIMIZER_CONFIG);
    const explanation = generateExplanation(heroes, campaignMode, scoreResult, 10, 124);
    expect(explanation.dataNotes.some((n) => n.includes('Data confidence'))).toBe(true);
  });
});
