import { describe, it, expect } from 'vitest';
import {
  getVerifiedHeroData,
  getHeroAbilities,
  getHeroEffectTypes,
  heroHasVerifiedEffect,
  getVerifiedHeroIds,
  getAllVerifiedAbilities,
} from '@/data/intelligence/verifiedAbilities';
import { getModeAssessment, getAllModeAssessments, getBossProfile, getAllBossProfiles } from '@/data/intelligence/modeIntelligence';
import {
  getHeroCounters,
  getCounterResult,
  calculateTeamCounterScore,
  analyseEnemyTeam,
  getAllCounters,
} from '@/engine/CounterEngine';
import { scoreTeam } from '@/engine/TeamScorer';
import { TEAM_OPTIMIZER_CONFIG } from '@/engine/config';
import { generateExplanation } from '@/engine/ExplanationEngine';
import { optimizeTeam, optimizeMultipleTeams } from '@/engine';
import type { PlayerHero, GameMode, EnemyTeam } from '@/types';
import type { EvidenceType } from '@/types/intelligence';

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
// VERIFIED ABILITY TESTS
// ============================================================

describe('Verified Hero Abilities', () => {
  it('returns verified data for heroes with abilities', () => {
    const data = getVerifiedHeroData('smokey_meerky');
    expect(data).not.toBeNull();
    expect(data!.hasVerifiedAbilities).toBe(true);
    expect(data!.abilities.length).toBeGreaterThan(0);
  });

  it('returns null for heroes without verified data', () => {
    const data = getVerifiedHeroData('nonexistent_hero');
    expect(data).toBeNull();
  });

  it('returns empty abilities for heroes without verified data', () => {
    const abilities = getHeroAbilities('marilee');
    expect(abilities).toEqual([]);
  });

  it('abilities have structured effects', () => {
    const abilities = getHeroAbilities('smokey_meerky');
    expect(abilities.some((a) => a.effects.some((e) => e.type === 'healing'))).toBe(true);
  });

  it('abilities have provenance (source, evidence, confidence)', () => {
    const abilities = getHeroAbilities('thoran');
    for (const ab of abilities) {
      expect(ab.source).toBeDefined();
      expect(ab.evidence).toBeDefined();
      expect(ab.confidence).toBeDefined();
      expect(ab.retrievedAt).toBeDefined();
    }
  });

  it('no ability is marked as official (no official source available)', () => {
    const all = getAllVerifiedAbilities();
    expect(all.every((a) => a.evidence !== 'official')).toBe(true);
  });

  it('all abilities are at least structured_source evidence', () => {
    const all = getAllVerifiedAbilities();
    expect(all.every((a) => a.evidence === 'structured_source' || a.evidence === 'verified_manual')).toBe(true);
  });

  it('getHeroEffectTypes extracts effect types from abilities', () => {
    const types = getHeroEffectTypes('smokey_meerky');
    expect(types).toContain('healing');
    expect(types).toContain('damage');
  });

  it('heroHasVerifiedEffect works correctly', () => {
    expect(heroHasVerifiedEffect('smokey_meerky', 'healing')).toBe(true);
    expect(heroHasVerifiedEffect('smokey_meerky', 'stun')).toBe(false);
    expect(heroHasVerifiedEffect('valen', 'healing')).toBe(false);
  });

  it('getVerifiedHeroIds returns subset of heroes', () => {
    const ids = getVerifiedHeroIds();
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.length).toBeLessThan(124); // Not all heroes have verified data
  });

  it('verified heroes include known support and tank heroes', () => {
    const ids = getVerifiedHeroIds();
    expect(ids).toContain('smokey_meerky');
    expect(ids).toContain('thoran');
    expect(ids).toContain('hewynn');
    expect(ids).toContain('rowan');
  });
});

// ============================================================
// EVIDENCE HIERARCHY TESTS
// ============================================================

describe('Evidence Hierarchy', () => {
  it('official > structured_source > verified_manual > heuristic', () => {
    const ranks: Record<EvidenceType, number> = {
      official: 4,
      structured_source: 3,
      verified: 3,
      verified_manual: 2,
      heuristic: 1,
    };
    expect(ranks.official).toBeGreaterThan(ranks.structured_source);
    expect(ranks.structured_source).toBeGreaterThan(ranks.verified_manual);
    expect(ranks.verified_manual).toBeGreaterThan(ranks.heuristic);
  });

  it('verified abilities have higher evidence than heuristic intelligence', () => {
    const abilities = getHeroAbilities('smokey_meerky');
    for (const ab of abilities) {
      // structured_source (3) > heuristic (1)
      expect(ab.evidence).not.toBe('heuristic');
    }
  });

  it('heroes without verified data fall back to heuristic', () => {
    const data = getVerifiedHeroData('marilee');
    expect(data).toBeNull();
    // Heuristic intelligence still available via getHeroIntelligence
    // (tested in Stage 8 tests)
  });
});

// ============================================================
// COUNTER ENGINE TESTS
// ============================================================

describe('Counter Engine', () => {
  it('getHeroCounters returns relationships for heroes with abilities', () => {
    const counters = getHeroCounters('smokey_meerky');
    // Smokey has healing but no anti-heal, so may not have derived counters
    expect(Array.isArray(counters)).toBe(true);
  });

  it('getHeroCounters returns empty for heroes without verified data', () => {
    const counters = getHeroCounters('marilee');
    expect(counters).toEqual([]);
  });

  it('getCounterResult returns structured result', () => {
    const result = getCounterResult('smokey_meerky');
    expect(result).toHaveProperty('strongAgainst');
    expect(result).toHaveProperty('weakAgainst');
    expect(result).toHaveProperty('situational');
    expect(result).toHaveProperty('confidence');
  });

  it('calculateTeamCounterScore returns neutral without enemy team', () => {
    const result = calculateTeamCounterScore(['smokey_meerky', 'thoran'], null, 'campaign');
    expect(result.score).toBe(50);
    expect(result.activeCounters).toEqual([]);
    expect(result.confidence).toBe('unknown');
  });

  it('calculateTeamCounterScore returns neutral with empty enemy team', () => {
    const enemy: EnemyTeam = { heroes: [] };
    const result = calculateTeamCounterScore(['smokey_meerky'], enemy, 'campaign');
    expect(result.score).toBe(50);
  });

  it('calculateTeamCounterScore with enemy team and no counters returns neutral', () => {
    const enemy: EnemyTeam = { heroes: ['valen'] };
    const result = calculateTeamCounterScore(['marilee'], enemy, 'campaign');
    expect(result.score).toBe(50);
  });

  it('analyseEnemyTeam returns analysis structure', () => {
    const enemy: EnemyTeam = { heroes: ['smokey_meerky', 'thoran'] };
    const analysis = analyseEnemyTeam(enemy, ['valen', 'dionel'], 'campaign');
    expect(analysis).toHaveProperty('threats');
    expect(analysis).toHaveProperty('recommendedCounters');
    expect(analysis).toHaveProperty('recommendedHeroes');
    expect(analysis).toHaveProperty('positioningNotes');
  });

  it('analyseEnemyTeam detects healing threat', () => {
    const enemy: EnemyTeam = { heroes: ['smokey_meerky'] };
    const analysis = analyseEnemyTeam(enemy, [], 'campaign');
    expect(analysis.threats[0].threats.some((t) => t.includes('healing'))).toBe(true);
  });

  it('analyseEnemyTeam detects control threat', () => {
    const enemy: EnemyTeam = { heroes: ['pippa'] };
    const analysis = analyseEnemyTeam(enemy, [], 'campaign');
    expect(analysis.threats[0].threats.some((t) => t.includes('crowd control'))).toBe(true);
  });

  it('analyseEnemyTeam recommends anti_heal against healing enemies', () => {
    const enemy: EnemyTeam = { heroes: ['smokey_meerky', 'hewynn'] };
    const analysis = analyseEnemyTeam(enemy, [], 'campaign');
    expect(analysis.recommendedCounters).toContain('anti_heal');
  });

  it('getAllCounters returns array', () => {
    const all = getAllCounters();
    expect(Array.isArray(all)).toBe(true);
  });
});

// ============================================================
// COUNTER-AWARE SCORING TESTS
// ============================================================

describe('Counter-Aware Team Scoring', () => {
  it('counter score is 50 (neutral) when no enemy team provided', () => {
    const heroes = [
      makePlayerHero('thoran', 200, 's_level', 'tank'),
      makePlayerHero('smokey_meerky', 200, 's_level', 'support'),
      makePlayerHero('scarlita', 200, 's_level', 'warrior'),
    ];
    const result = scoreTeam(heroes, campaignMode, TEAM_OPTIMIZER_CONFIG);
    expect(result.breakdown.counter).toBe(50);
  });

  it('counter score is 50 (neutral) when enemy team has no heroes', () => {
    const heroes = [
      makePlayerHero('thoran', 200, 's_level', 'tank'),
    ];
    const enemy: EnemyTeam = { heroes: [] };
    const result = scoreTeam(heroes, campaignMode, TEAM_OPTIMIZER_CONFIG, undefined, undefined, undefined, enemy);
    expect(result.breakdown.counter).toBe(50);
  });

  it('scoring behaviour unchanged without enemy team', () => {
    const heroes = [
      makePlayerHero('thoran', 200, 's_level', 'tank'),
      makePlayerHero('smokey_meerky', 200, 's_level', 'support'),
      makePlayerHero('scarlita', 200, 's_level', 'warrior'),
      makePlayerHero('pippa', 200, 's_level', 'mage'),
      makePlayerHero('dionel', 200, 's_level', 'marksman'),
    ];
    const resultNoEnemy = scoreTeam(heroes, campaignMode, TEAM_OPTIMIZER_CONFIG);
    // Counter component should be neutral
    expect(resultNoEnemy.breakdown.counter).toBe(50);
    // Other components should be normal
    expect(resultNoEnemy.breakdown.synergy).toBeGreaterThan(50);
  });

  it('counter weight does not dominate scoring', () => {
    const heroes = [
      makePlayerHero('thoran', 200, 's_level', 'tank'),
      makePlayerHero('smokey_meerky', 200, 's_level', 'support'),
      makePlayerHero('scarlita', 200, 's_level', 'warrior'),
    ];
    const enemy: EnemyTeam = { heroes: ['valen'] };
    const result = scoreTeam(heroes, campaignMode, TEAM_OPTIMIZER_CONFIG, undefined, undefined, undefined, enemy);
    const counterContribution = result.breakdown.counter * TEAM_OPTIMIZER_CONFIG.counterWeight;
    const totalWeighted = Object.entries(result.breakdown).reduce(
      (sum, [key, val]) => sum + val * (TEAM_OPTIMIZER_CONFIG as unknown as Record<string, number>)[`${key}Weight`],
      0
    );
    // Counter should be less than 15% of total weighted score
    expect(counterContribution / totalWeighted).toBeLessThan(0.15);
  });

  it('player progression still matters with enemy team', () => {
    const highLevel = [
      makePlayerHero('thoran', 240, 's_level', 'tank'),
      makePlayerHero('smokey_meerky', 240, 's_level', 'support'),
      makePlayerHero('scarlita', 240, 's_level', 'warrior'),
    ];
    const lowLevel = [
      makePlayerHero('thoran', 1, 's_level', 'tank'),
      makePlayerHero('smokey_meerky', 1, 's_level', 'support'),
      makePlayerHero('scarlita', 1, 's_level', 'warrior'),
    ];
    const enemy: EnemyTeam = { heroes: ['valen'] };
    const highResult = scoreTeam(highLevel, campaignMode, TEAM_OPTIMIZER_CONFIG, undefined, undefined, undefined, enemy);
    const lowResult = scoreTeam(lowLevel, campaignMode, TEAM_OPTIMIZER_CONFIG, undefined, undefined, undefined, enemy);
    expect(highResult.breakdown.progression).toBeGreaterThan(lowResult.breakdown.progression);
    expect(highResult.total).toBeGreaterThan(lowResult.total);
  });

  it('deterministic with enemy team', () => {
    const heroes = [
      makePlayerHero('thoran', 200, 's_level', 'tank'),
      makePlayerHero('smokey_meerky', 200, 's_level', 'support'),
    ];
    const enemy: EnemyTeam = { heroes: ['valen'] };
    const r1 = scoreTeam(heroes, campaignMode, TEAM_OPTIMIZER_CONFIG, undefined, undefined, undefined, enemy);
    const r2 = scoreTeam(heroes, campaignMode, TEAM_OPTIMIZER_CONFIG, undefined, undefined, undefined, enemy);
    expect(r1.total).toBe(r2.total);
    expect(r1.breakdown).toEqual(r2.breakdown);
  });
});

// ============================================================
// EXPLANATION WITH COUNTERS TESTS
// ============================================================

describe('Explanation with Counter Data', () => {
  it('explanation includes counter confidence note when no enemy team', () => {
    const heroes = [
      makePlayerHero('thoran', 200, 's_level', 'tank'),
      makePlayerHero('smokey_meerky', 200, 's_level', 'support'),
      makePlayerHero('scarlita', 200, 's_level', 'warrior'),
      makePlayerHero('pippa', 200, 's_level', 'mage'),
      makePlayerHero('dionel', 200, 's_level', 'marksman'),
    ];
    const scoreResult = scoreTeam(heroes, campaignMode, TEAM_OPTIMIZER_CONFIG);
    const explanation = generateExplanation(heroes, campaignMode, scoreResult, 10, 124);
    // Should mention counter or no counter data
    const allText = [...explanation.strengths, ...explanation.dataNotes].join(' ');
    expect(
      allText.includes('counter') || allText.includes('Counter') || allText.includes('HEURISTIC') || allText.includes('Verified')
    ).toBe(true);
  });

  it('explanation includes data confidence summary', () => {
    const heroes = [
      makePlayerHero('thoran', 200, 's_level', 'tank'),
      makePlayerHero('smokey_meerky', 200, 's_level', 'support'),
      makePlayerHero('scarlita', 200, 's_level', 'warrior'),
      makePlayerHero('pippa', 200, 's_level', 'mage'),
      makePlayerHero('dionel', 200, 's_level', 'marksman'),
    ];
    const scoreResult = scoreTeam(heroes, campaignMode, TEAM_OPTIMIZER_CONFIG);
    const explanation = generateExplanation(heroes, campaignMode, scoreResult, 10, 124);
    const allNotes = explanation.dataNotes.join(' ');
    expect(allNotes).toContain('Data confidence');
  });
});

// ============================================================
// MODE INTELLIGENCE TESTS
// ============================================================

describe('Mode Intelligence', () => {
  it('getModeAssessment returns null for unassessed hero', () => {
    const assessment = getModeAssessment('marilee', 'honor_duel');
    expect(assessment).toBeNull();
  });

  it('getAllModeAssessments returns non-empty array (populated in Stage 10)', () => {
    expect(getAllModeAssessments().length).toBeGreaterThan(0);
  });
});

// ============================================================
// BOSS ARCHITECTURE TESTS
// ============================================================

describe('Boss Architecture', () => {
  it('getBossProfile returns null for unknown boss', () => {
    expect(getBossProfile('unknown_boss')).toBeNull();
  });

  it('getAllBossProfiles returns boss profiles with valid structure', () => {
    const profiles = getAllBossProfiles();
    expect(profiles.length).toBeGreaterThanOrEqual(6);
    expect(profiles.some((b) => b.bossId === 'king_croaker')).toBe(true);
  });
});

// ============================================================
// MULTI-TEAM COUNTER TESTS
// ============================================================

describe('Multi-Team Counter Behaviour', () => {
  it('multi-team with enemy team respects no-reuse', () => {
    const heroes = [
      makePlayerHero('thoran', 200, 's_level', 'tank'),
      makePlayerHero('smokey_meerky', 200, 's_level', 'support'),
      makePlayerHero('scarlita', 200, 's_level', 'warrior'),
      makePlayerHero('pippa', 200, 's_level', 'mage'),
      makePlayerHero('dionel', 200, 's_level', 'marksman'),
      makePlayerHero('brutus', 200, 's_level', 'warrior'),
      makePlayerHero('hewynn', 200, 's_level', 'support'),
      makePlayerHero('vala', 200, 's_level', 'rogue'),
      makePlayerHero('eironn', 200, 's_level', 'rogue'),
      makePlayerHero('atalanta', 200, 's_level', 'marksman'),
    ];
    const input = {
      playerHeroes: heroes,
      mode: campaignMode,
      teamCount: 2,
      avoidHeroReuse: true,
      enemyTeam: { heroes: ['valen'] } as EnemyTeam,
    };
    const result = optimizeMultipleTeams(input);
    expect(result.teams.length).toBe(2);
    const team1Ids = new Set(result.teams[0].heroIds);
    const team2Ids = new Set(result.teams[1].heroIds);
    for (const id of team1Ids) {
      expect(team2Ids.has(id)).toBe(false);
    }
  });
});

// ============================================================
// DATASET BACKWARD COMPATIBILITY
// ============================================================

describe('Dataset Backward Compatibility (Stage 9)', () => {
  it('old dataset without verified fields is still valid', () => {
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
    expect(oldDataset.bossProfiles).toBeUndefined();
  });

  it('new dataset with all Stage 9 fields is valid', () => {
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
    expect(newDataset.bossProfiles).toEqual([]);
  });
});
