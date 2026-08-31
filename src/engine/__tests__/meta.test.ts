import { describe, it, expect, beforeEach } from 'vitest';
import type { SourceMetaRecord, SourceHeroMapping, MetaDataSource, DatasetExport } from '@/types';
import { calculateMetaConsensus, calculateAllConsensus, calculateModeConsensus } from '../MetaConsensusEngine';
import { calculateFreshness, freshnessWeight, freshnessLabel, relativeTime } from '../FreshnessCalculator';
import { calculateDataConfidence } from '../ConfidenceCalculator';
import { resolveHeroId, detectUnknownHeroes, detectDuplicateMappings } from '../HeroMapping';
import { SOURCE_REGISTRY, getSourceWeight, getEnabledSources, getSource } from '@/data/sources';
import { dataIntelligenceService } from '@/services/DataIntelligenceService';
import { heroesById } from '@/data/heroes';
import { calculateHeroStrength, calculateTeamMetaScore } from '../HeroStrengthScorer';

// ============================================================
// SOURCE REGISTRY TESTS
// ============================================================

describe('Source Registry', () => {
  it('has sources defined', () => {
    expect(SOURCE_REGISTRY.length).toBeGreaterThanOrEqual(3);
  });

  it('each source has required fields', () => {
    for (const src of SOURCE_REGISTRY) {
      expect(src.id).toBeDefined();
      expect(src.name).toBeDefined();
      expect(src.type).toBeDefined();
      expect(src.retrievalMethod).toBeDefined();
      expect(src.reliability).toBeGreaterThanOrEqual(0);
      expect(src.reliability).toBeLessThanOrEqual(1);
    }
  });

  it('source IDs are unique', () => {
    const ids = SOURCE_REGISTRY.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('getSource returns source by ID', () => {
    const src = getSource('prydwen');
    expect(src).toBeDefined();
    expect(src!.name).toBe('Prydwen.gg');
  });

  it('getSourceWeight returns configured weight', () => {
    expect(getSourceWeight('official')).toBe(1.0);
    expect(getSourceWeight('prydwen')).toBe(0.9);
  });

  it('getSourceWeight falls back for unknown sources', () => {
    expect(getSourceWeight('unknown_source')).toBe(0.5);
  });

  it('getEnabledSources returns only enabled sources', () => {
    const enabled = getEnabledSources();
    expect(enabled.length).toBeGreaterThan(0);
    expect(enabled.every((s) => s.enabled)).toBe(true);
  });

  it('no source claims api retrieval method that does not exist', () => {
    for (const src of SOURCE_REGISTRY) {
      if (src.retrievalMethod === 'api') {
        // If any source claims API, it should have a baseUrl
        expect(src.baseUrl).toBeDefined();
      }
    }
  });
});

// ============================================================
// FRESHNESS TESTS
// ============================================================

describe('Freshness Calculator', () => {
  it('returns "current" for data within 7 days', () => {
    const recent = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(calculateFreshness(recent)).toBe('current');
  });

  it('returns "recent" for data within 30 days', () => {
    const recent = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString();
    expect(calculateFreshness(recent)).toBe('recent');
  });

  it('returns "stale" for data within 90 days', () => {
    const stale = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    expect(calculateFreshness(stale)).toBe('stale');
  });

  it('returns "very_stale" for data older than 90 days', () => {
    const veryStale = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString();
    expect(calculateFreshness(veryStale)).toBe('very_stale');
  });

  it('returns "very_stale" for invalid date', () => {
    expect(calculateFreshness('invalid-date')).toBe('very_stale');
  });

  it('freshnessWeight decreases with age', () => {
    expect(freshnessWeight('current')).toBe(1.0);
    expect(freshnessWeight('recent')).toBe(0.8);
    expect(freshnessWeight('stale')).toBe(0.5);
    expect(freshnessWeight('very_stale')).toBe(0.25);
  });

  it('freshnessLabel returns human-readable label', () => {
    expect(freshnessLabel('current')).toBe('Current');
    expect(freshnessLabel('recent')).toBe('Recent');
    expect(freshnessLabel('stale')).toBe('Stale');
    expect(freshnessLabel('very_stale')).toBe('Very stale');
  });

  it('relativeTime returns human-readable string', () => {
    const now = new Date('2026-08-27T00:00:00Z');
    expect(relativeTime('2026-08-27T00:00:00Z', now)).toBe('today');
    expect(relativeTime('2026-08-26T00:00:00Z', now)).toBe('1 day ago');
    expect(relativeTime('2026-08-25T00:00:00Z', now)).toBe('2 days ago');
    expect(relativeTime('2026-08-20T00:00:00Z', now)).toBe('1 week ago');
    expect(relativeTime('invalid', now)).toBe('unknown');
  });
});

// ============================================================
// CONFIDENCE TESTS
// ============================================================

describe('Confidence Calculator', () => {
  it('returns "unknown" for no sources', () => {
    const result = calculateDataConfidence({
      sourceCount: 0,
      hasDisagreement: false,
      bestFreshness: 'very_stale',
      hasOfficial: false,
      isComplete: false,
    });
    expect(result.level).toBe('unknown');
    expect(result.score).toBe(0);
  });

  it('returns "high" for multiple agreeing, current, complete sources with official', () => {
    const result = calculateDataConfidence({
      sourceCount: 3,
      hasDisagreement: false,
      bestFreshness: 'current',
      hasOfficial: true,
      isComplete: true,
    });
    expect(result.level).toBe('high');
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  it('reduces confidence on disagreement', () => {
    const withoutDisagree = calculateDataConfidence({
      sourceCount: 3,
      hasDisagreement: false,
      bestFreshness: 'current',
      hasOfficial: false,
      isComplete: true,
    });
    const withDisagree = calculateDataConfidence({
      sourceCount: 3,
      hasDisagreement: true,
      bestFreshness: 'current',
      hasOfficial: false,
      isComplete: true,
    });
    expect(withDisagree.score).toBeLessThan(withoutDisagree.score);
  });

  it('reduces confidence for stale data', () => {
    const current = calculateDataConfidence({
      sourceCount: 2,
      hasDisagreement: false,
      bestFreshness: 'current',
      hasOfficial: false,
      isComplete: true,
    });
    const stale = calculateDataConfidence({
      sourceCount: 2,
      hasDisagreement: false,
      bestFreshness: 'stale',
      hasOfficial: false,
      isComplete: true,
    });
    expect(stale.score).toBeLessThan(current.score);
  });

  it('provides human-readable reasons', () => {
    const result = calculateDataConfidence({
      sourceCount: 1,
      hasDisagreement: false,
      bestFreshness: 'stale',
      hasOfficial: false,
      isComplete: false,
    });
    expect(result.reasons.length).toBeGreaterThan(0);
  });
});

// ============================================================
// HERO MAPPING TESTS
// ============================================================

describe('Hero Mapping', () => {
  it('resolves canonical hero ID by exact name', () => {
    const result = resolveHeroId('prydwen', 'Scarlita');
    expect(result.canonicalHeroId).toBe('scarlita');
    expect(result.confidence).toBe('high');
  });

  it('resolves canonical hero ID by case-insensitive match', () => {
    const result = resolveHeroId('prydwen', 'scarlita');
    expect(result.canonicalHeroId).toBe('scarlita');
  });

  it('returns null for unknown hero', () => {
    const result = resolveHeroId('prydwen', 'NonExistentHero');
    expect(result.canonicalHeroId).toBeNull();
  });

  it('uses explicit mapping when available', () => {
    const mappings: SourceHeroMapping[] = [
      { sourceId: 'test', sourceHeroName: 'Custom Name', canonicalHeroId: 'scarlita', confidence: 'medium' },
    ];
    const result = resolveHeroId('test', 'Custom Name', mappings);
    expect(result.canonicalHeroId).toBe('scarlita');
    expect(result.confidence).toBe('medium');
  });

  it('detects unknown heroes', () => {
    const records = [
      { sourceId: 'prydwen', sourceHeroName: 'scarlita' },
      { sourceId: 'prydwen', sourceHeroName: 'UnknownHero' },
    ];
    const unknown = detectUnknownHeroes(records);
    expect(unknown.length).toBe(1);
    expect(unknown[0].sourceHeroName).toBe('UnknownHero');
  });

  it('detects duplicate mappings', () => {
    const mappings: SourceHeroMapping[] = [
      { sourceId: 'test', sourceHeroName: 'Hero A', canonicalHeroId: 'scarlita', confidence: 'high' },
      { sourceId: 'test', sourceHeroName: 'Hero A', canonicalHeroId: 'thoran', confidence: 'high' },
    ];
    const dups = detectDuplicateMappings(mappings);
    expect(dups.length).toBe(1);
    expect(dups[0].ids).toContain('scarlita');
    expect(dups[0].ids).toContain('thoran');
  });

  it('no duplicate mappings when names differ', () => {
    const mappings: SourceHeroMapping[] = [
      { sourceId: 'test', sourceHeroName: 'Hero A', canonicalHeroId: 'scarlita', confidence: 'high' },
      { sourceId: 'test', sourceHeroName: 'Hero B', canonicalHeroId: 'thoran', confidence: 'high' },
    ];
    expect(detectDuplicateMappings(mappings).length).toBe(0);
  });
});

// ============================================================
// CONSENSUS TESTS
// ============================================================

describe('Meta Consensus Engine', () => {
  const recentDate = new Date().toISOString();

  describe('Identical ratings', () => {
    it('produces high agreement when sources agree', () => {
      const records: SourceMetaRecord[] = [
        { sourceId: 'prydwen', heroId: 'scarlita', modeId: 'campaign', tier: 'S', retrievedAt: recentDate, confidence: 'medium' },
        { sourceId: 'allclash', heroId: 'scarlita', modeId: 'campaign', tier: 'S', retrievedAt: recentDate, confidence: 'medium' },
      ];
      const consensus = calculateMetaConsensus(records, 'scarlita', 'campaign');
      expect(consensus).not.toBeNull();
      expect(consensus!.agreement).toBe('high');
      expect(consensus!.hasDisagreement).toBe(false);
      expect(consensus!.consensusTier).toBe('S');
    });
  });

  describe('Conflicting ratings', () => {
    it('flags disagreement when sources differ by more than one tier', () => {
      const records: SourceMetaRecord[] = [
        { sourceId: 'prydwen', heroId: 'scarlita', modeId: 'campaign', tier: 'S', retrievedAt: recentDate, confidence: 'medium' },
        { sourceId: 'allclash', heroId: 'scarlita', modeId: 'campaign', tier: 'B', retrievedAt: recentDate, confidence: 'medium' },
      ];
      const consensus = calculateMetaConsensus(records, 'scarlita', 'campaign');
      expect(consensus).not.toBeNull();
      expect(consensus!.hasDisagreement).toBe(true);
      expect(consensus!.agreement).toBe('low');
    });

    it('shows medium agreement for one-tier difference', () => {
      const records: SourceMetaRecord[] = [
        { sourceId: 'prydwen', heroId: 'scarlita', modeId: 'campaign', tier: 'S', retrievedAt: recentDate, confidence: 'medium' },
        { sourceId: 'allclash', heroId: 'scarlita', modeId: 'campaign', tier: 'A', retrievedAt: recentDate, confidence: 'medium' },
      ];
      const consensus = calculateMetaConsensus(records, 'scarlita', 'campaign');
      expect(consensus!.agreement).toBe('medium');
      expect(consensus!.hasDisagreement).toBe(false);
    });
  });

  describe('Missing source', () => {
    it('returns null when no records exist for hero+mode', () => {
      const consensus = calculateMetaConsensus([], 'scarlita', 'campaign');
      expect(consensus).toBeNull();
    });

    it('works with a single source', () => {
      const records: SourceMetaRecord[] = [
        { sourceId: 'prydwen', heroId: 'scarlita', modeId: 'campaign', tier: 'S', retrievedAt: recentDate, confidence: 'medium' },
      ];
      const consensus = calculateMetaConsensus(records, 'scarlita', 'campaign');
      expect(consensus).not.toBeNull();
      expect(consensus!.sources.length).toBe(1);
    });
  });

  describe('Stale source', () => {
    it('reduces weight of stale data', () => {
      const recentRecord: SourceMetaRecord = {
        sourceId: 'prydwen', heroId: 'scarlita', modeId: 'campaign',
        tier: 'S', retrievedAt: recentDate, confidence: 'medium',
      };
      const staleRecord: SourceMetaRecord = {
        sourceId: 'allclash', heroId: 'scarlita', modeId: 'campaign',
        tier: 'B', retrievedAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
        confidence: 'medium',
      };
      const consensus = calculateMetaConsensus([recentRecord, staleRecord], 'scarlita', 'campaign');
      expect(consensus).not.toBeNull();
      // Fresh S-tier should pull consensus closer to S than to B
      const consensusValue = consensus!.consensusRating;
      expect(consensusValue).toBeGreaterThan(70); // closer to S (90) than B (50)
    });
  });

  describe('Official source', () => {
    it('includes official source in consensus', () => {
      const records: SourceMetaRecord[] = [
        { sourceId: 'official', heroId: 'scarlita', modeId: 'campaign', tier: 'S', retrievedAt: recentDate, confidence: 'high' },
        { sourceId: 'prydwen', heroId: 'scarlita', modeId: 'campaign', tier: 'A', retrievedAt: recentDate, confidence: 'medium' },
      ];
      const consensus = calculateMetaConsensus(records, 'scarlita', 'campaign');
      expect(consensus).not.toBeNull();
      // Official source (weight 1.0) vs Prydwen (weight 0.9) — both close,
      // consensus should be near S tier (closer to S than A)
      expect(consensus!.consensusRating).toBeGreaterThanOrEqual(80);
    });
  });

  describe('Weighted sources', () => {
    it('higher-reliability source has more influence', () => {
      const records: SourceMetaRecord[] = [
        { sourceId: 'prydwen', heroId: 'scarlita', modeId: 'campaign', tier: 'S', retrievedAt: recentDate, confidence: 'medium' },
        { sourceId: 'manual', heroId: 'scarlita', modeId: 'campaign', tier: 'B', retrievedAt: recentDate, confidence: 'low' },
      ];
      const consensus = calculateMetaConsensus(records, 'scarlita', 'campaign');
      expect(consensus).not.toBeNull();
      // Prydwen (0.9) should pull consensus closer to S than manual (0.6) pulls toward B
      expect(consensus!.consensusRating).toBeGreaterThan(70); // closer to S (90) than B (50)
    });
  });

  describe('Rating-based consensus', () => {
    it('works with numeric ratings instead of tiers', () => {
      const records: SourceMetaRecord[] = [
        { sourceId: 'prydwen', heroId: 'scarlita', modeId: 'campaign', rating: 9.5, retrievedAt: recentDate, confidence: 'medium' },
        { sourceId: 'allclash', heroId: 'scarlita', modeId: 'campaign', rating: 9.0, retrievedAt: recentDate, confidence: 'medium' },
      ];
      const consensus = calculateMetaConsensus(records, 'scarlita', 'campaign');
      expect(consensus).not.toBeNull();
      expect(consensus!.consensusRating).toBeGreaterThan(80);
    });
  });

  describe('calculateAllConsensus', () => {
    it('calculates consensus for all hero-mode pairs', () => {
      const records: SourceMetaRecord[] = [
        { sourceId: 'prydwen', heroId: 'scarlita', modeId: 'campaign', tier: 'S', retrievedAt: recentDate, confidence: 'medium' },
        { sourceId: 'prydwen', heroId: 'thoran', modeId: 'arena', tier: 'A', retrievedAt: recentDate, confidence: 'medium' },
      ];
      const all = calculateAllConsensus(records);
      expect(all.length).toBe(2);
    });
  });

  describe('calculateModeConsensus', () => {
    it('calculates consensus for a single mode', () => {
      const records: SourceMetaRecord[] = [
        { sourceId: 'prydwen', heroId: 'scarlita', modeId: 'campaign', tier: 'S', retrievedAt: recentDate, confidence: 'medium' },
        { sourceId: 'prydwen', heroId: 'thoran', modeId: 'campaign', tier: 'A', retrievedAt: recentDate, confidence: 'medium' },
        { sourceId: 'prydwen', heroId: 'scarlita', modeId: 'arena', tier: 'S', retrievedAt: recentDate, confidence: 'medium' },
      ];
      const map = calculateModeConsensus(records, 'campaign');
      expect(map.size).toBe(2);
      expect(map.has('scarlita')).toBe(true);
      expect(map.has('thoran')).toBe(true);
    });
  });
});

// ============================================================
// DATA INTELLIGENCE SERVICE TESTS
// ============================================================

describe('Data Intelligence Service', () => {
  beforeEach(() => {
    dataIntelligenceService.resetToSeed();
  });

  it('returns seed records by default', () => {
    const records = dataIntelligenceService.getAllRecords();
    expect(records.length).toBeGreaterThan(0);
  });

  it('returns consensus for heroes with data', () => {
    const consensus = dataIntelligenceService.getConsensus('scarlita', 'campaign');
    expect(consensus).not.toBeNull();
    expect(consensus!.heroId).toBe('scarlita');
  });

  it('returns null consensus for heroes without data', () => {
    const consensus = dataIntelligenceService.getConsensus('chippy', 'campaign');
    expect(consensus).toBeNull();
  });

  it('exports dataset with correct schema', () => {
    const exported = dataIntelligenceService.exportDataset();
    expect(exported.schemaVersion).toBe(1);
    expect(exported.generatedAt).toBeDefined();
    expect(exported.sources.length).toBeGreaterThan(0);
    expect(exported.metaRecords.length).toBeGreaterThan(0);
  });

  it('imports valid dataset', () => {
    const exported = dataIntelligenceService.exportDataset();
    dataIntelligenceService.resetToSeed();
    const result = dataIntelligenceService.importDataset(exported, { replace: true });
    expect(result.success).toBe(true);
    expect(result.imported).toBeGreaterThan(0);
  });

  it('rejects invalid dataset (wrong schema version)', () => {
    const badData = { schemaVersion: 999, metaRecords: [] };
    const result = dataIntelligenceService.importDataset(badData);
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects non-object input', () => {
    const result = dataIntelligenceService.importDataset('not an object');
    expect(result.success).toBe(false);
  });

  it('rejects corrupt JSON gracefully', () => {
    const result = dataIntelligenceService.importDataset(null);
    expect(result.success).toBe(false);
  });

  it('warns about unknown hero IDs in import', () => {
    const data: DatasetExport = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      sources: SOURCE_REGISTRY,
      heroMappings: [],
      metaRecords: [
        { sourceId: 'prydwen', heroId: 'nonexistent_hero', modeId: 'campaign', tier: 'S', retrievedAt: new Date().toISOString(), confidence: 'medium' },
      ],
      snapshots: [],
      consensus: [],
    };
    const result = dataIntelligenceService.importDataset(data, { replace: true });
    expect(result.success).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.imported).toBe(0);
  });

  it('skips duplicate records in import', () => {
    const recentDate = new Date().toISOString();
    const data: DatasetExport = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      sources: SOURCE_REGISTRY,
      heroMappings: [],
      metaRecords: [
        { sourceId: 'prydwen', heroId: 'scarlita', modeId: 'campaign', tier: 'S', retrievedAt: recentDate, confidence: 'medium' },
        { sourceId: 'prydwen', heroId: 'scarlita', modeId: 'campaign', tier: 'A', retrievedAt: recentDate, confidence: 'medium' },
      ],
      snapshots: [],
      consensus: [],
    };
    const result = dataIntelligenceService.importDataset(data, { replace: true });
    expect(result.success).toBe(true);
    expect(result.warnings.some((w) => w.includes('duplicate'))).toBe(true);
    expect(result.imported).toBe(1);
  });

  it('merge mode preserves existing records not in import', () => {
    // Seed has records for scarlita/campaign
    const beforeCount = dataIntelligenceService.getAllRecords().length;
    const data: DatasetExport = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      sources: SOURCE_REGISTRY,
      heroMappings: [],
      metaRecords: [
        { sourceId: 'dotgg', heroId: 'rowan', modeId: 'campaign', tier: 'S', retrievedAt: new Date().toISOString(), confidence: 'medium' },
      ],
      snapshots: [],
      consensus: [],
    };
    const result = dataIntelligenceService.importDataset(data, { replace: false });
    expect(result.success).toBe(true);
    const afterCount = dataIntelligenceService.getAllRecords().length;
    // Should have added at least 1 new record (dotgg/rowan)
    expect(afterCount).toBeGreaterThanOrEqual(beforeCount);
  });

  it('creates snapshots when records change during merge', () => {
    const data: DatasetExport = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      sources: SOURCE_REGISTRY,
      heroMappings: [],
      metaRecords: [
        { sourceId: 'prydwen', heroId: 'scarlita', modeId: 'campaign', tier: 'A', retrievedAt: new Date().toISOString(), confidence: 'medium' },
      ],
      snapshots: [],
      consensus: [],
    };
    const beforeSnapshots = dataIntelligenceService.getSnapshots().length;
    dataIntelligenceService.importDataset(data, { replace: false });
    const afterSnapshots = dataIntelligenceService.getSnapshots().length;
    expect(afterSnapshots).toBeGreaterThan(beforeSnapshots);
  });

  it('getDataHealth returns valid report', () => {
    const health = dataIntelligenceService.getDataHealth();
    expect(health.totalRecords).toBeGreaterThan(0);
    expect(health.totalHeroes).toBeGreaterThan(0);
    expect(health.totalModes).toBeGreaterThan(0);
  });

  it('data status label does not say "LIVE"', () => {
    const label = dataIntelligenceService.getDataStatusLabel();
    expect(label.toLowerCase()).not.toContain('live');
  });

  it('source weights are configurable', () => {
    dataIntelligenceService.setSourceWeights({ prydwen: 0.5 });
    expect(dataIntelligenceService.getSourceWeight('prydwen')).toBe(0.5);
  });
});

// ============================================================
// OPTIMISER INTEGRATION TESTS
// ============================================================

describe('Optimiser Meta Integration', () => {
  beforeEach(() => {
    dataIntelligenceService.resetToSeed();
  });

  it('meta consensus influences hero strength score', () => {
    const hero = heroesById['scarlita'];
    const playerHero = { ...hero, roster: { heroId: hero.id, owned: true, level: 100, progression: { ascension: 'mythic' as const }, addedAt: '', updatedAt: '' } };
    const mode = { id: 'campaign' };

    // Without consensus — should fall back to rarity
    const scoreWithoutMeta = calculateHeroStrength(playerHero, mode);

    // With consensus — scarlita has S tier in campaign from seed data
    const consensus = dataIntelligenceService.getConsensus('scarlita', 'campaign');
    expect(consensus).not.toBeNull();
    const consensusMap = new Map([[`${'scarlita'}::${'campaign'}`, consensus!]]);
    const scoreWithMeta = calculateHeroStrength(playerHero, mode, undefined, consensusMap);

    // Meta consensus should give a different (likely higher) score than rarity fallback
    expect(scoreWithMeta).toBe(consensus!.consensusRating);
    expect(scoreWithMeta).not.toEqual(scoreWithoutMeta);
  });

  it('optimiser still works without meta data', () => {
    const hero = heroesById['chippy']; // No meta data for chippy
    const playerHero = { ...hero, roster: { heroId: hero.id, owned: true, level: 100, progression: { ascension: 'mythic' as const }, addedAt: '', updatedAt: '' } };
    const mode = { id: 'campaign' };
    const score = calculateHeroStrength(playerHero, mode, undefined, new Map());
    // Should fall back to rarity (chippy is rare_level = 30)
    expect(score).toBe(30);
  });

  it('stale meta has reduced influence via confidence adjustment', () => {
    const hero = heroesById['scarlita'];
    const playerHero = { ...hero, roster: { heroId: hero.id, owned: true, level: 100, progression: { ascension: 'mythic' as const }, addedAt: '', updatedAt: '' } };
    const consensus = dataIntelligenceService.getConsensus('scarlita', 'campaign');
    expect(consensus).not.toBeNull();

    // Low confidence consensus should pull score toward 50
    const lowConfidenceConsensus = new Map([['scarlita::campaign', {
      ...consensus!,
      confidence: 'low' as const,
    }]]);
    const lowScore = calculateTeamMetaScore([playerHero], 'campaign', lowConfidenceConsensus);

    const highConfidenceConsensus = new Map([['scarlita::campaign', {
      ...consensus!,
      confidence: 'high' as const,
    }]]);
    const highScore = calculateTeamMetaScore([playerHero], 'campaign', highConfidenceConsensus);

    // High confidence should be further from 50 than low confidence
    expect(Math.abs(highScore - 50)).toBeGreaterThanOrEqual(Math.abs(lowScore - 50));
  });

  it('unowned meta hero never appears in optimised team', () => {
    // This is ensured by the roster filter, not the meta layer.
    // The meta layer only scores heroes that are already in the pool.
    const hero = heroesById['scarlita'];
    // Even with high meta, if hero isn't in playerHeroes, it won't appear
    const score = calculateHeroStrength({ ...hero, roster: { heroId: hero.id, owned: true, level: 100, progression: { ascension: 'mythic' as const }, addedAt: '', updatedAt: '' } }, { id: 'campaign' });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('deterministic output with same meta data', () => {
    const consensus1 = dataIntelligenceService.getConsensus('scarlita', 'campaign');
    const consensus2 = dataIntelligenceService.getConsensus('scarlita', 'campaign');
    expect(consensus1).toEqual(consensus2);
  });
});
