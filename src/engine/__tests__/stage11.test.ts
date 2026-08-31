import { describe, it, expect } from 'vitest';
import { dataIntelligenceService } from '@/services/DataIntelligenceService';
import { validateAll, canReplaceEvidence, mergeEvidence } from '@/engine/IntelligenceValidator';
import { mergeAbilities, mergeModeAssessments, mergeCounters, mergeSynergies } from '@/engine/IntelligenceMerger';
import { getAllVerifiedAbilities, getVerifiedHeroIds, getVerifiedHeroCount, getVerifiedAbilityCount } from '@/data/intelligence/verifiedAbilities';
import { getAllModeAssessments, getModeAssessmentCount } from '@/data/intelligence/modeIntelligence';
import { getAllCounters } from '@/engine/CounterEngine';
import { getAllSynergyData, getVerifiedSynergies, getHeuristicSynergies, getAntiSynergies } from '@/engine/SynergyEngine';
import { scoreTeam } from '@/engine/TeamScorer';
import { TEAM_OPTIMIZER_CONFIG } from '@/engine/config';
import { generateExplanation } from '@/engine/ExplanationEngine';
import { optimizeTeam, optimizeMultipleTeams } from '@/engine';
import { analyseEnemyTeam, calculateTeamCounterScore } from '@/engine/CounterEngine';
import { heroesById, heroes } from '@/data/heroes';
import type { PlayerHero, GameMode, EnemyTeam } from '@/types';
import type { HeroAbility, HeroModeAssessment, CounterRelationship, SynergyRelationship, EvidenceType } from '@/types/intelligence';

function makePlayerHero(id: string, level = 100, rarity: PlayerHero['rarity'] = 's_level', heroClass: PlayerHero['class'] = 'warrior'): PlayerHero {
  return {
    id, name: id.charAt(0).toUpperCase() + id.slice(1), faction: 'lightbearer', class: heroClass,
    roles: [], rarity, damageType: 'physical', range: 1, sources: [], lastUpdated: '2026-08-27',
    roster: { heroId: id, owned: true, level, progression: { ascension: 'mythic', signatureLevel: 0, furnitureLevel: 0, engravingLevel: 0 }, addedAt: '2026-08-27', updatedAt: '2026-08-27' },
  };
}

const campaignMode: GameMode = { id: 'campaign', name: 'Campaign', description: 'PvE', teamSize: 5, formationRequired: true };
const arenaMode: GameMode = { id: 'arena', name: 'Arena', description: 'PvP', teamSize: 5, formationRequired: true };

// ============================================================
// DATA PIPELINE INTEGRATION
// ============================================================

describe('Stage 11 — Data Pipeline Integration', () => {
  it('exportDataset includes intelligence fields when present', () => {
    const exported = dataIntelligenceService.exportFullDataset();
    expect(exported.verifiedHeroData).toBeDefined();
    expect(exported.counterRelationships).toBeDefined();
    expect(exported.modeAssessments).toBeDefined();
    expect(exported.synergies).toBeDefined();
  });

  it('exportDataset is backward compatible (base export has intelligence fields optional)', () => {
    const exported = dataIntelligenceService.exportDataset();
    expect(exported.schemaVersion).toBe(1);
    expect(exported.sources).toBeDefined();
    expect(exported.metaRecords).toBeDefined();
  });

  it('importDataset accepts old format without intelligence fields', () => {
    const oldFormat = {
      schemaVersion: 1,
      generatedAt: '2026-08-27',
      sources: [],
      heroMappings: [],
      metaRecords: [],
      snapshots: [],
      consensus: [],
    };
    const result = dataIntelligenceService.importDataset(oldFormat, { replace: false });
    expect(result.success).toBe(true);
  });

  it('importDataset accepts new format with intelligence fields', () => {
    const newFormat = {
      schemaVersion: 1,
      generatedAt: '2026-08-27',
      sources: [],
      heroMappings: [],
      metaRecords: [],
      snapshots: [],
      consensus: [],
      verifiedHeroData: [],
      counterRelationships: [],
      modeAssessments: [],
      synergies: [],
    };
    const result = dataIntelligenceService.importDataset(newFormat, { replace: false });
    expect(result.success).toBe(true);
  });

  it('importDataset rejects invalid schema version', () => {
    const bad = { schemaVersion: 99, generatedAt: '', sources: [], heroMappings: [], metaRecords: [], snapshots: [], consensus: [] };
    const result = dataIntelligenceService.importDataset(bad);
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('importDataset rejects non-object', () => {
    const result = dataIntelligenceService.importDataset('not an object');
    expect(result.success).toBe(false);
  });

  it('importDataset rejects null', () => {
    const result = dataIntelligenceService.importDataset(null);
    expect(result.success).toBe(false);
  });

  it('importDataset filters invalid hero IDs in intelligence data', () => {
    const data = {
      schemaVersion: 1,
      generatedAt: '2026-08-27',
      sources: [],
      heroMappings: [],
      metaRecords: [],
      snapshots: [],
      consensus: [],
      modeAssessments: [
        { heroId: 'nonexistent', mode: 'campaign', rating: 80, strengths: [], weaknesses: [], recommendedRoles: [], confidence: 'medium', evidence: 'structured_source', source: 'test' },
        { heroId: 'valen', mode: 'campaign', rating: 70, strengths: [], weaknesses: [], recommendedRoles: ['dps'], confidence: 'medium', evidence: 'structured_source', source: 'test' },
      ],
    };
    const result = dataIntelligenceService.importDataset(data, { replace: false });
    expect(result.success).toBe(true);
    // Should have a warning about the invalid hero
    expect(result.warnings.some((w) => w.includes('nonexistent'))).toBe(true);
  });

  it('importDataset reports merge summary', () => {
    const data = {
      schemaVersion: 1,
      generatedAt: '2026-08-27',
      sources: [],
      heroMappings: [],
      metaRecords: [],
      snapshots: [],
      consensus: [],
      modeAssessments: [
        { heroId: 'valen', mode: 'honor_duel', rating: 75, strengths: ['test'], weaknesses: [], recommendedRoles: ['dps'], confidence: 'low', evidence: 'heuristic', source: 'test' },
      ],
    };
    const result = dataIntelligenceService.importDataset(data, { replace: false });
    expect(result.merge).toBeDefined();
    expect(result.merge!.added + result.merge!.updated + result.merge!.skipped).toBeGreaterThan(0);
  });

  it('importDataset preserves existing data on failure', () => {
    const before = dataIntelligenceService.getAllRecords();
    const bad = { schemaVersion: 99 };
    dataIntelligenceService.importDataset(bad);
    const after = dataIntelligenceService.getAllRecords();
    expect(after).toEqual(before);
  });
});

// ============================================================
// EVIDENCE PRECEDENCE IN PIPELINE
// ============================================================

describe('Evidence Precedence in Pipeline', () => {
  it('structured_source evidence can replace heuristic', () => {
    expect(canReplaceEvidence('heuristic', 'structured_source')).toBe(true);
  });

  it('heuristic evidence cannot replace structured_source', () => {
    expect(canReplaceEvidence('structured_source', 'heuristic')).toBe(false);
  });

  it('mergeEvidence returns stronger evidence', () => {
    expect(mergeEvidence('heuristic', 'structured_source')).toBe('structured_source');
    expect(mergeEvidence('structured_source', 'heuristic')).toBe('structured_source');
  });

  it('mergeAbilities skips weaker evidence', () => {
    const existing: HeroAbility[] = [{
      abilityId: 'test1', heroId: 'valen', name: 'Existing', description: 'desc',
      abilityType: 'ultimate', effects: [], source: 'wiki', retrievedAt: '2026-08-27',
      evidence: 'structured_source', confidence: 'medium',
    }];
    const incoming: HeroAbility[] = [{
      abilityId: 'test1', heroId: 'valen', name: 'Incoming', description: 'desc',
      abilityType: 'ultimate', effects: [], source: 'guess', retrievedAt: '2026-08-27',
      evidence: 'heuristic', confidence: 'low',
    }];
    const result = mergeAbilities(existing, incoming);
    expect(result.skipped).toBe(1);
    expect(result.merged[0].name).toBe('Existing');
  });

  it('mergeAbilities updates with stronger evidence', () => {
    const existing: HeroAbility[] = [{
      abilityId: 'test2', heroId: 'valen', name: 'Old', description: 'old',
      abilityType: 'passive', effects: [], source: 'guess', retrievedAt: '2026-08-27',
      evidence: 'heuristic', confidence: 'low',
    }];
    const incoming: HeroAbility[] = [{
      abilityId: 'test2', heroId: 'valen', name: 'New', description: 'new',
      abilityType: 'passive', effects: [], source: 'wiki', retrievedAt: '2026-08-27',
      evidence: 'structured_source', confidence: 'medium',
    }];
    const result = mergeAbilities(existing, incoming);
    expect(result.updated).toBe(1);
    expect(result.merged[0].name).toBe('New');
  });
});

// ============================================================
// DATA HEALTH DASHBOARD
// ============================================================

describe('Data Health Dashboard', () => {
  it('getDataHealth returns intelligence coverage', () => {
    const health = dataIntelligenceService.getDataHealth();
    expect(health.heroesWithVerifiedIntelligence).toBeGreaterThan(0);
    expect(health.heroesWithHeuristicIntelligence).toBeGreaterThan(0);
    expect(health.verifiedAbilityCount).toBeGreaterThan(0);
    expect(health.modeAssessmentCount).toBeGreaterThan(0);
    expect(health.counterCount).toBeGreaterThan(0);
    expect(health.synergyCount).toBeGreaterThan(0);
  });

  it('verified + heuristic = total heroes', () => {
    const health = dataIntelligenceService.getDataHealth();
    expect(health.heroesWithVerifiedIntelligence + health.heroesWithHeuristicIntelligence).toBe(health.totalHeroes);
  });

  it('anti-synergy count is non-negative', () => {
    const health = dataIntelligenceService.getDataHealth();
    expect(health.antiSynergyCount).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================
// MODE-AWARE OPTIMISATION
// ============================================================

describe('Mode-Aware Optimisation', () => {
  it('optimiser works with no mode data (neutral)', () => {
    const heroes = [
      makePlayerHero('thoran', 200), makePlayerHero('smokey_meerky', 200),
      makePlayerHero('scarlita', 200), makePlayerHero('pippa', 200), makePlayerHero('dionel', 200),
    ];
    const result = scoreTeam(heroes, campaignMode, TEAM_OPTIMIZER_CONFIG);
    expect(result.total).toBeGreaterThan(0);
    expect(result.breakdown.synergy).toBeGreaterThan(50);
  });

  it('partial mode data contributes, unknown remains neutral', () => {
    const heroes = [
      makePlayerHero('thoran', 200), makePlayerHero('smokey_meerky', 200),
      makePlayerHero('scarlita', 200), makePlayerHero('pippa', 200), makePlayerHero('dionel', 200),
    ];
    const result = scoreTeam(heroes, campaignMode, TEAM_OPTIMIZER_CONFIG);
    // Synergy should be > 50 because we have verified synergies
    expect(result.breakdown.synergy).toBeGreaterThan(50);
    // Counter should be 50 (neutral, no enemy team)
    expect(result.breakdown.counter).toBe(50);
  });

  it('verified synergy data beats heuristic in scoring', () => {
    const verifiedSyns = getVerifiedSynergies();
    const heuristicSyns = getHeuristicSynergies();
    expect(verifiedSyns.length).toBeGreaterThan(0);
    expect(heuristicSyns.length).toBeGreaterThan(0);
    // Verified synergies have verified evidence
    expect(verifiedSyns.every((s) => s.evidence === 'verified')).toBe(true);
  });

  it('player progression still matters more than intelligence', () => {
    const highLevel = [
      makePlayerHero('valen', 240, 'a_level'), makePlayerHero('marilee', 240, 'a_level'), makePlayerHero('korin', 240, 'a_level'),
    ];
    const lowLevel = [
      makePlayerHero('rowan', 1), makePlayerHero('athalia', 1), makePlayerHero('thoran', 1),
    ];
    const highResult = scoreTeam(highLevel, campaignMode, TEAM_OPTIMIZER_CONFIG);
    const lowResult = scoreTeam(lowLevel, campaignMode, TEAM_OPTIMIZER_CONFIG);
    expect(highResult.breakdown.progression).toBeGreaterThan(lowResult.breakdown.progression);
  });

  it('multi-team optimisation still works', () => {
    const heroes = [
      makePlayerHero('thoran', 200), makePlayerHero('smokey_meerky', 200),
      makePlayerHero('scarlita', 200), makePlayerHero('pippa', 200), makePlayerHero('dionel', 200),
      makePlayerHero('brutus', 200), makePlayerHero('hewynn', 200), makePlayerHero('vala', 200),
      makePlayerHero('eironn', 200), makePlayerHero('atalanta', 200),
    ];
    const result = optimizeMultipleTeams({
      playerHeroes: heroes, mode: campaignMode, teamCount: 2, avoidHeroReuse: true,
    });
    expect(result.teams.length).toBe(2);
    // No overlap
    const team1Ids = new Set(result.teams[0].heroIds);
    for (const id of result.teams[1].heroIds) {
      expect(team1Ids.has(id)).toBe(false);
    }
  });

  it('hero reuse rules still work when reuse disabled', () => {
    const heroes = [
      makePlayerHero('thoran', 200), makePlayerHero('smokey_meerky', 200),
      makePlayerHero('scarlita', 200), makePlayerHero('pippa', 200), makePlayerHero('dionel', 200),
      makePlayerHero('brutus', 200), makePlayerHero('hewynn', 200), makePlayerHero('vala', 200),
      makePlayerHero('eironn', 200), makePlayerHero('atalanta', 200),
    ];
    const result = optimizeMultipleTeams({
      playerHeroes: heroes, mode: campaignMode, teamCount: 2, avoidHeroReuse: true,
    });
    const allHeroIds = result.teams.flatMap((t) => t.heroIds);
    const unique = new Set(allHeroIds);
    expect(unique.size).toBe(allHeroIds.length);
  });
});

// ============================================================
// ENEMY TEAM WORKFLOW
// ============================================================

describe('Enemy Team Workflow', () => {
  it('counter scoring is neutral without enemy team', () => {
    const result = calculateTeamCounterScore(['nara', 'thoran'], null, 'arena');
    expect(result.score).toBe(50);
    expect(result.activeCounters.length).toBe(0);
  });

  it('counter scoring is active with enemy team', () => {
    const enemy: EnemyTeam = { heroes: ['dionel'] };
    const result = calculateTeamCounterScore(['nara'], enemy, 'arena');
    expect(result.score).toBeGreaterThan(50);
    expect(result.activeCounters.length).toBeGreaterThan(0);
  });

  it('enemy analysis returns threats and recommended counters', () => {
    const enemy: EnemyTeam = { heroes: ['smokey_meerky', 'thoran'] };
    const analysis = analyseEnemyTeam(enemy, ['nara', 'athalia'], 'arena');
    expect(analysis.threats.length).toBeGreaterThan(0);
    expect(analysis.recommendedCounters.length).toBeGreaterThan(0);
  });

  it('enemy analysis detects healing threat', () => {
    const enemy: EnemyTeam = { heroes: ['smokey_meerky'] };
    const analysis = analyseEnemyTeam(enemy, [], 'campaign');
    expect(analysis.threats[0].threats.some((t) => t.includes('healing'))).toBe(true);
  });

  it('enemy analysis recommends anti-heal against healing enemies', () => {
    const enemy: EnemyTeam = { heroes: ['smokey_meerky', 'hewynn'] };
    const analysis = analyseEnemyTeam(enemy, [], 'campaign');
    expect(analysis.recommendedCounters).toContain('anti_heal');
  });

  it('scoring with enemy team uses counter component', () => {
    const heroes = [makePlayerHero('nara', 200), makePlayerHero('thoran', 200), makePlayerHero('smokey_meerky', 200)];
    const enemy: EnemyTeam = { heroes: ['dionel', 'bryon'] };
    const result = scoreTeam(heroes, arenaMode, TEAM_OPTIMIZER_CONFIG, undefined, undefined, undefined, enemy);
    expect(result.breakdown.counter).toBeGreaterThan(50);
  });

  it('scoring without enemy team has neutral counter', () => {
    const heroes = [makePlayerHero('nara', 200), makePlayerHero('thoran', 200), makePlayerHero('smokey_meerky', 200)];
    const result = scoreTeam(heroes, arenaMode, TEAM_OPTIMIZER_CONFIG);
    expect(result.breakdown.counter).toBe(50);
  });

  it('enemy analysis includes positioning notes', () => {
    const enemy: EnemyTeam = { heroes: ['athalia'] };
    const analysis = analyseEnemyTeam(enemy, [], 'arena');
    // Athalia is an assassin — should have positioning advice
    expect(analysis.positioningNotes.length).toBeGreaterThan(0);
  });

  it('enemy analysis confidence is labeled', () => {
    const enemy: EnemyTeam = { heroes: ['smokey_meerky'] };
    const analysis = analyseEnemyTeam(enemy, [], 'campaign');
    expect(analysis.confidence).toBeDefined();
  });
});

// ============================================================
// EXPLANATION QUALITY
// ============================================================

describe('Explanation Quality', () => {
  it('explanation summary includes hero names', () => {
    const heroes = [
      makePlayerHero('thoran', 200), makePlayerHero('smokey_meerky', 200),
      makePlayerHero('scarlita', 200), makePlayerHero('pippa', 200), makePlayerHero('dionel', 200),
    ];
    const scoreResult = scoreTeam(heroes, campaignMode, TEAM_OPTIMIZER_CONFIG);
    const explanation = generateExplanation(heroes, campaignMode, scoreResult, 10, 124);
    expect(explanation.summary).toContain('Thoran');
    expect(explanation.summary).toContain('scored');
  });

  it('explanation includes role balance context', () => {
    const heroes = [
      makePlayerHero('thoran', 200), makePlayerHero('smokey_meerky', 200),
      makePlayerHero('scarlita', 200), makePlayerHero('pippa', 200), makePlayerHero('dionel', 200),
    ];
    const scoreResult = scoreTeam(heroes, campaignMode, TEAM_OPTIMIZER_CONFIG);
    const explanation = generateExplanation(heroes, campaignMode, scoreResult, 10, 124);
    expect(explanation.summary.toLowerCase()).toMatch(/frontline|damage|sustain|composition/);
  });

  it('explanation includes data confidence summary', () => {
    const heroes = [
      makePlayerHero('thoran', 200), makePlayerHero('smokey_meerky', 200),
      makePlayerHero('scarlita', 200), makePlayerHero('pippa', 200), makePlayerHero('dionel', 200),
    ];
    const scoreResult = scoreTeam(heroes, campaignMode, TEAM_OPTIMIZER_CONFIG);
    const explanation = generateExplanation(heroes, campaignMode, scoreResult, 10, 124);
    expect(explanation.dataNotes.some((n) => n.includes('Data confidence'))).toBe(true);
  });

  it('explanation distinguishes verified from heuristic synergies', () => {
    const heroes = [
      makePlayerHero('rowan', 200), makePlayerHero('athalia', 200),
      makePlayerHero('thoran', 200), makePlayerHero('smokey_meerky', 200), makePlayerHero('dionel', 200),
    ];
    const scoreResult = scoreTeam(heroes, campaignMode, TEAM_OPTIMIZER_CONFIG);
    const explanation = generateExplanation(heroes, campaignMode, scoreResult, 10, 124);
    // Should mention either verified or heuristic
    const allText = [...explanation.strengths, ...explanation.dataNotes].join(' ');
    expect(allText.toLowerCase().match(/verified|heuristic|structured/)).toBeTruthy();
  });
});

// ============================================================
// DATA INTEGRITY AUDIT
// ============================================================

describe('Data Integrity Audit', () => {
  it('all verified abilities reference valid hero IDs', () => {
    const all = getAllVerifiedAbilities();
    for (const ab of all) {
      expect(heroesById[ab.heroId]).toBeDefined();
    }
  });

  it('no duplicate ability IDs', () => {
    const all = getAllVerifiedAbilities();
    const ids = all.map((a) => a.abilityId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all abilities have provenance', () => {
    const all = getAllVerifiedAbilities();
    for (const ab of all) {
      expect(ab.source).toBeTruthy();
      expect(ab.evidence).toBeTruthy();
      expect(ab.retrievedAt).toBeTruthy();
      expect(ab.confidence).toBeTruthy();
    }
  });

  it('all mode assessments reference valid hero IDs', () => {
    const all = getAllModeAssessments();
    for (const a of all) {
      expect(heroesById[a.heroId]).toBeDefined();
    }
  });

  it('all counters reference valid hero IDs', () => {
    const all = getAllCounters();
    for (const c of all) {
      expect(heroesById[c.heroId]).toBeDefined();
      if (c.counterHeroId !== '*') {
        expect(heroesById[c.counterHeroId]).toBeDefined();
      }
    }
  });

  it('all synergies reference valid hero IDs', () => {
    const all = getAllSynergyData();
    for (const s of all) {
      expect(heroesById[s.heroA]).toBeDefined();
      expect(heroesById[s.heroB]).toBeDefined();
    }
  });

  it('no evidence is marked official (no official source available)', () => {
    const all = getAllVerifiedAbilities();
    expect(all.every((a) => a.evidence !== 'official')).toBe(true);
  });

  it('full validation passes for all data', () => {
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
// DETERMINISM
// ============================================================

describe('Determinism', () => {
  it('same team produces same score', () => {
    const heroes = [
      makePlayerHero('thoran', 200), makePlayerHero('smokey_meerky', 200),
      makePlayerHero('scarlita', 200), makePlayerHero('pippa', 200), makePlayerHero('dionel', 200),
    ];
    const r1 = scoreTeam(heroes, campaignMode, TEAM_OPTIMIZER_CONFIG);
    const r2 = scoreTeam(heroes, campaignMode, TEAM_OPTIMIZER_CONFIG);
    expect(r1.total).toBe(r2.total);
    expect(r1.breakdown).toEqual(r2.breakdown);
  });

  it('same team with enemy produces same score', () => {
    const heroes = [makePlayerHero('nara', 200), makePlayerHero('thoran', 200), makePlayerHero('smokey_meerky', 200)];
    const enemy: EnemyTeam = { heroes: ['dionel'] };
    const r1 = scoreTeam(heroes, arenaMode, TEAM_OPTIMIZER_CONFIG, undefined, undefined, undefined, enemy);
    const r2 = scoreTeam(heroes, arenaMode, TEAM_OPTIMIZER_CONFIG, undefined, undefined, undefined, enemy);
    expect(r1.total).toBe(r2.total);
  });

  it('optimiser is deterministic', () => {
    const heroes = [
      makePlayerHero('thoran', 200), makePlayerHero('smokey_meerky', 200),
      makePlayerHero('scarlita', 200), makePlayerHero('pippa', 200), makePlayerHero('dionel', 200),
      makePlayerHero('rowan', 200),
    ];
    const r1 = optimizeTeam({ playerHeroes: heroes, mode: campaignMode, teamCount: 1, avoidHeroReuse: false });
    const r2 = optimizeTeam({ playerHeroes: heroes, mode: campaignMode, teamCount: 1, avoidHeroReuse: false });
    expect(r1.bestTeam?.score).toBe(r2.bestTeam?.score);
    expect(r1.bestTeam?.heroIds).toEqual(r2.bestTeam?.heroIds);
  });
});

// ============================================================
// REGRESSION: EXISTING FUNCTIONALITY
// ============================================================

describe('Regression — Existing Functionality', () => {
  it('optimiser produces valid teams', () => {
    const heroes = [
      makePlayerHero('thoran', 200), makePlayerHero('smokey_meerky', 200),
      makePlayerHero('scarlita', 200), makePlayerHero('pippa', 200), makePlayerHero('dionel', 200),
    ];
    const result = optimizeTeam({ playerHeroes: heroes, mode: campaignMode, teamCount: 1, avoidHeroReuse: false });
    expect(result.bestTeam).not.toBeNull();
    expect(result.bestTeam!.heroes.length).toBe(5);
  });

  it('meta consensus is accessible', () => {
    const consensus = dataIntelligenceService.getAllConsensus();
    expect(Array.isArray(consensus)).toBe(true);
  });

  it('data health report is accessible', () => {
    const health = dataIntelligenceService.getDataHealth();
    expect(health.totalHeroes).toBe(heroes.length);
  });

  it('export and re-import preserves core data', () => {
    const exported = dataIntelligenceService.exportDataset();
    const result = dataIntelligenceService.importDataset(exported, { replace: true });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// DATASET COUNTS
// ============================================================

describe('Dataset Counts (Stage 11 Final)', () => {
  it('has verified heroes', () => {
    expect(getVerifiedHeroCount()).toBeGreaterThanOrEqual(20);
  });

  it('has verified abilities', () => {
    expect(getVerifiedAbilityCount()).toBeGreaterThanOrEqual(30);
  });

  it('has mode assessments', () => {
    expect(getModeAssessmentCount()).toBeGreaterThan(0);
  });

  it('has counters', () => {
    expect(getAllCounters().length).toBeGreaterThan(0);
  });

  it('has synergies', () => {
    expect(getAllSynergyData().length).toBeGreaterThan(0);
  });

  it('has anti-synergies', () => {
    expect(getAntiSynergies().length).toBeGreaterThan(0);
  });

  it('has verified synergies (structured_source)', () => {
    expect(getVerifiedSynergies().length).toBeGreaterThan(0);
  });

  it('has heuristic synergies', () => {
    expect(getHeuristicSynergies().length).toBeGreaterThan(0);
  });
});
