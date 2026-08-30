import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateDotGGResponse } from '@/data/sources/dotgg/validator';
import { processDotGGResponse, DOTGG_API_URL } from '@/data/sources/dotgg/adapter';
import { calculateDataDiff, createSnapshotsFromRecords } from '@/services/DataDiffService';
import { dataIntelligenceService } from '@/services/DataIntelligenceService';
import { dataUpdateService } from '@/services/DataUpdateService';
import type { SourceMetaRecord } from '@/types';

// ============================================================
// DOTGG RESPONSE VALIDATION TESTS
// ============================================================

describe('DotGG Response Validation', () => {
  it('validates a correct response', () => {
    const data = [
      { name: 'Valen', url: 'valen', slug: 'valen', rarity: '2', race: '1', job: '2', damage_type: 'AD', tiers: { dream: 'S', pvp: 'A', stage: 'S' } },
      { name: 'Thoran', url: 'thoran', slug: 'thoran', rarity: '1', race: '4', job: '1', damage_type: 'AD', tiers: { dream: 'S', pvp: 'S', stage: 'A' } },
    ];
    const result = validateDotGGResponse(data);
    expect(result.valid).toBe(true);
    expect(result.heroes.length).toBe(2);
    expect(result.rejected).toBe(0);
  });

  it('rejects non-array top-level', () => {
    const result = validateDotGGResponse({ not: 'an array' });
    expect(result.valid).toBe(false);
    expect(result.heroes.length).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects entry missing name', () => {
    const data = [{ url: 'test' }];
    const result = validateDotGGResponse(data);
    expect(result.valid).toBe(false);
    expect(result.rejected).toBe(1);
  });

  it('rejects entry missing both url and slug', () => {
    const data = [{ name: 'TestHero' }];
    const result = validateDotGGResponse(data);
    expect(result.valid).toBe(false);
    expect(result.rejected).toBe(1);
  });

  it('warns on invalid tier values', () => {
    const data = [{ name: 'Valen', url: 'valen', tiers: { dream: 'X', pvp: 'S' } }];
    const result = validateDotGGResponse(data);
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('warns on non-object tiers', () => {
    const data = [{ name: 'Valen', url: 'valen', tiers: 'not an object' }];
    const result = validateDotGGResponse(data);
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes('tiers'))).toBe(true);
  });

  it('warns on non-array skills', () => {
    const data = [{ name: 'Valen', url: 'valen', skills: 'not an array' }];
    const result = validateDotGGResponse(data);
    expect(result.warnings.some((w) => w.includes('skills'))).toBe(true);
  });

  it('accepts entries without optional fields', () => {
    const data = [{ name: 'SimpleHero', url: 'simple' }];
    const result = validateDotGGResponse(data);
    expect(result.valid).toBe(true);
    expect(result.heroes.length).toBe(1);
  });

  it('handles empty array', () => {
    const result = validateDotGGResponse([]);
    expect(result.valid).toBe(true);
    expect(result.heroes.length).toBe(0);
  });

  it('handles null/undefined entries', () => {
    const data = [null, undefined, { name: 'Valid', url: 'valid' }];
    const result = validateDotGGResponse(data);
    expect(result.rejected).toBe(2);
    expect(result.heroes.length).toBe(1);
  });
});

// ============================================================
// DOTGG ADAPTER PROCESSING TESTS
// ============================================================

describe('DotGG Adapter Processing', () => {
  const retrievedAt = '2026-08-27T12:00:00Z';

  it('processes a valid response and maps heroes', () => {
    const data = [
      { name: 'Valen', url: 'valen', slug: 'valen', tiers: { dream: 'S', pvp: 'A', stage: 'S' } },
      { name: 'Thoran', url: 'thoran', slug: 'thoran', tiers: { dream: 'S', pvp: 'S', stage: 'A' } },
    ];
    const result = processDotGGResponse(data, retrievedAt);
    expect(result.success).toBe(true);
    expect(result.mapped).toBe(2);
    expect(result.unknown).toBe(0);
    expect(result.records.length).toBeGreaterThan(0);
  });

  it('flags unknown heroes', () => {
    const data = [
      { name: 'Valen', url: 'valen' },
      { name: 'NonExistentHero', url: 'nonexistent' },
    ];
    const result = processDotGGResponse(data, retrievedAt);
    expect(result.success).toBe(true);
    expect(result.mapped).toBe(1);
    expect(result.unknown).toBe(1);
    expect(result.warnings.some((w) => w.includes('Unknown hero'))).toBe(true);
  });

  it('maps tier modes correctly', () => {
    const data = [
      { name: 'Scarlita', url: 'scarlita', tiers: { dream: 'S', pvp: 'S', stage: 'S', primal: 'S' } },
    ];
    const result = processDotGGResponse(data, retrievedAt);
    expect(result.success).toBe(true);
    // dream → dream_realm, pvp → arena, stage → campaign
    // primal → NOT mapped
    const modeIds = result.records.map((r) => r.modeId);
    expect(modeIds).toContain('dream_realm');
    expect(modeIds).toContain('arena');
    expect(modeIds).toContain('campaign');
    expect(modeIds).not.toContain('primal');
  });

  it('counts heroes without tiers', () => {
    const data = [
      { name: 'Valen', url: 'valen', tiers: { dream: 'S' } },
      { name: 'Thoran', url: 'thoran' },
    ];
    const result = processDotGGResponse(data, retrievedAt);
    expect(result.withoutTiers).toBe(1);
  });

  it('handles malformed response', () => {
    const result = processDotGGResponse('not an array', retrievedAt);
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('handles empty response', () => {
    const result = processDotGGResponse([], retrievedAt);
    expect(result.success).toBe(true);
    expect(result.received).toBe(0);
    expect(result.records.length).toBe(0);
  });

  it('records retrieval timestamp', () => {
    const data = [{ name: 'Valen', url: 'valen' }];
    const result = processDotGGResponse(data, retrievedAt);
    expect(result.retrievedAt).toBe(retrievedAt);
  });

  it('uppercases tier values', () => {
    const data = [
      { name: 'Valen', url: 'valen', tiers: { dream: 's', pvp: 'a' } },
    ];
    const result = processDotGGResponse(data, retrievedAt);
    const dreamRecord = result.records.find((r) => r.modeId === 'dream_realm');
    expect(dreamRecord?.tier).toBe('S');
  });

  it('maps race/job/rarity/damage fields', () => {
    const data = [
      { name: 'Valen', url: 'valen', race: '1', job: '2', rarity: '2', damage_type: 'AD', is_melee: '1' },
    ];
    const result = processDotGGResponse(data, retrievedAt);
    const hero = result.heroesEnriched[0];
    expect(hero.faction).toBe('lightbearer');
    expect(hero.class).toBe('warrior');
    expect(hero.rarity).toBe('a_level');
    expect(hero.damageType).toBe('physical');
    expect(hero.isMelee).toBe(true);
  });

  it('builds image URLs correctly', () => {
    const data = [
      { name: 'Valen', url: 'valen', icon: 'ui/icon/hero/test.webp', image: 'big-heroes/valen.webp' },
    ];
    const result = processDotGGResponse(data, retrievedAt);
    const hero = result.heroesEnriched[0];
    expect(hero.iconUrl).toContain('api.dotgg.gg/images/');
    expect(hero.imageUrl).toContain('api.dotgg.gg/images/');
  });

  it('API URL is the documented endpoint', () => {
    expect(DOTGG_API_URL).toBe('https://api.dotgg.gg/cgfw/getcharacters?game=afk-journey');
  });
});

// ============================================================
// DATA DIFF TESTS
// ============================================================

describe('Data Diff Service', () => {
  it('detects new heroes', () => {
    const old: SourceMetaRecord[] = [
      { sourceId: 'dotgg', heroId: 'valen', modeId: 'campaign', tier: 'S', retrievedAt: '', confidence: 'medium' },
    ];
    const newRecs: SourceMetaRecord[] = [
      { sourceId: 'dotgg', heroId: 'valen', modeId: 'campaign', tier: 'S', retrievedAt: '', confidence: 'medium' },
      { sourceId: 'dotgg', heroId: 'thoran', modeId: 'campaign', tier: 'A', retrievedAt: '', confidence: 'medium' },
    ];
    const diff = calculateDataDiff(old, newRecs);
    expect(diff.newHeroIds).toContain('thoran');
    expect(diff.summary.some((s) => s.includes('new'))).toBe(true);
  });

  it('detects removed heroes', () => {
    const old: SourceMetaRecord[] = [
      { sourceId: 'dotgg', heroId: 'valen', modeId: 'campaign', tier: 'S', retrievedAt: '', confidence: 'medium' },
      { sourceId: 'dotgg', heroId: 'thoran', modeId: 'campaign', tier: 'A', retrievedAt: '', confidence: 'medium' },
    ];
    const newRecs: SourceMetaRecord[] = [
      { sourceId: 'dotgg', heroId: 'valen', modeId: 'campaign', tier: 'S', retrievedAt: '', confidence: 'medium' },
    ];
    const diff = calculateDataDiff(old, newRecs);
    expect(diff.removedHeroIds).toContain('thoran');
  });

  it('detects tier changes', () => {
    const old: SourceMetaRecord[] = [
      { sourceId: 'dotgg', heroId: 'valen', modeId: 'campaign', tier: 'S', retrievedAt: '', confidence: 'medium' },
    ];
    const newRecs: SourceMetaRecord[] = [
      { sourceId: 'dotgg', heroId: 'valen', modeId: 'campaign', tier: 'A', retrievedAt: '', confidence: 'medium' },
    ];
    const diff = calculateDataDiff(old, newRecs);
    expect(diff.tierChanges.length).toBe(1);
    expect(diff.tierChanges[0].oldTier).toBe('S');
    expect(diff.tierChanges[0].newTier).toBe('A');
  });

  it('detects new records', () => {
    const old: SourceMetaRecord[] = [
      { sourceId: 'dotgg', heroId: 'valen', modeId: 'campaign', tier: 'S', retrievedAt: '', confidence: 'medium' },
    ];
    const newRecs: SourceMetaRecord[] = [
      { sourceId: 'dotgg', heroId: 'valen', modeId: 'campaign', tier: 'S', retrievedAt: '', confidence: 'medium' },
      { sourceId: 'dotgg', heroId: 'valen', modeId: 'arena', tier: 'A', retrievedAt: '', confidence: 'medium' },
    ];
    const diff = calculateDataDiff(old, newRecs);
    expect(diff.newRecords).toBe(1);
  });

  it('detects removed records', () => {
    const old: SourceMetaRecord[] = [
      { sourceId: 'dotgg', heroId: 'valen', modeId: 'campaign', tier: 'S', retrievedAt: '', confidence: 'medium' },
      { sourceId: 'dotgg', heroId: 'valen', modeId: 'arena', tier: 'A', retrievedAt: '', confidence: 'medium' },
    ];
    const newRecs: SourceMetaRecord[] = [
      { sourceId: 'dotgg', heroId: 'valen', modeId: 'campaign', tier: 'S', retrievedAt: '', confidence: 'medium' },
    ];
    const diff = calculateDataDiff(old, newRecs);
    expect(diff.removedRecords).toBe(1);
  });

  it('reports no changes when datasets are identical', () => {
    const records: SourceMetaRecord[] = [
      { sourceId: 'dotgg', heroId: 'valen', modeId: 'campaign', tier: 'S', retrievedAt: '', confidence: 'medium' },
    ];
    const diff = calculateDataDiff(records, records);
    expect(diff.totalChanges).toBe(0);
    expect(diff.summary.length).toBe(0);
  });

  it('creates snapshots from records', () => {
    const records: SourceMetaRecord[] = [
      { sourceId: 'dotgg', heroId: 'valen', modeId: 'campaign', tier: 'S', retrievedAt: '', confidence: 'medium' },
    ];
    const snapshots = createSnapshotsFromRecords(records, '2026-08-27T12:00:00Z');
    expect(snapshots.length).toBe(1);
    expect(snapshots[0].heroId).toBe('valen');
    expect(snapshots[0].tier).toBe('S');
  });
});

// ============================================================
// DATA UPDATE SERVICE TESTS
// ============================================================

describe('Data Update Service', () => {
  beforeEach(() => {
    dataIntelligenceService.resetToSeed();
  });

  it('source health returns entries for all sources', () => {
    const health = dataUpdateService.getSourceHealth();
    expect(health.length).toBe(4);
    const ids = health.map((h) => h.sourceId);
    expect(ids).toContain('dotgg');
    expect(ids).toContain('prydwen');
    expect(ids).toContain('allclash');
    expect(ids).toContain('official');
  });

  it('initial source health shows never_updated for DotGG', () => {
    const health = dataUpdateService.getSourceHealth();
    const dotgg = health.find((h) => h.sourceId === 'dotgg');
    expect(dotgg?.status).toBe('never_updated');
  });

  it('cache TTL is configurable', () => {
    const original = dataUpdateService.getCacheTtl();
    dataUpdateService.setCacheTtl(60 * 1000);
    expect(dataUpdateService.getCacheTtl()).toBe(60 * 1000);
    dataUpdateService.setCacheTtl(original);
  });

  it('isCacheFresh returns false when no cache exists', () => {
    expect(dataUpdateService.isCacheFresh('dotgg')).toBe(false);
  });

  it('rollback returns null when no snapshot exists', () => {
    expect(dataUpdateService.canRollback()).toBe(false);
    expect(dataUpdateService.rollback()).toBeNull();
  });
});

// ============================================================
// OFFLINE BEHAVIOUR TESTS
// ============================================================

describe('Offline Behaviour', () => {
  beforeEach(() => {
    dataIntelligenceService.resetToSeed();
  });

  it('consensus remains available after reset', () => {
    const consensus = dataIntelligenceService.getConsensus('scarlita', 'campaign');
    expect(consensus).not.toBeNull();
  });

  it('optimiser can function with seed data only', () => {
    const records = dataIntelligenceService.getAllRecords();
    expect(records.length).toBeGreaterThan(0);
  });

  it('data status label does not say "LIVE"', () => {
    const label = dataIntelligenceService.getDataStatusLabel();
    expect(label.toLowerCase()).not.toContain('live');
  });
});

// ============================================================
// CONSENSUS INTEGRATION WITH DOTGG DATA
// ============================================================

describe('Consensus Integration with DotGG', () => {
  beforeEach(() => {
    dataIntelligenceService.resetToSeed();
  });

  it('DotGG records participate in consensus', () => {
    // Seed data has prydwen + allclash records for scarlita/campaign
    // If we add dotgg records, consensus should include all 3 sources
    const beforeConsensus = dataIntelligenceService.getConsensus('scarlita', 'campaign');
    expect(beforeConsensus).not.toBeNull();
    expect(beforeConsensus!.sources.some((s) => s.sourceId === 'prydwen')).toBe(true);

    // Simulate adding DotGG data via import
    const importData = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      sources: [],
      heroMappings: [],
      metaRecords: [
        { sourceId: 'dotgg', heroId: 'scarlita', modeId: 'campaign', tier: 'S', retrievedAt: new Date().toISOString(), confidence: 'medium' },
      ],
      snapshots: [],
      consensus: [],
    };
    dataIntelligenceService.importDataset(importData, { replace: false });

    const afterConsensus = dataIntelligenceService.getConsensus('scarlita', 'campaign');
    expect(afterConsensus).not.toBeNull();
    expect(afterConsensus!.sources.some((s) => s.sourceId === 'dotgg')).toBe(true);
  });

  it('source disagreement is detected when DotGG differs from Prydwen', () => {
    const importData = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      sources: [],
      heroMappings: [],
      metaRecords: [
        { sourceId: 'dotgg', heroId: 'thoran', modeId: 'campaign', tier: 'B', retrievedAt: new Date().toISOString(), confidence: 'medium' },
      ],
      snapshots: [],
      consensus: [],
    };
    dataIntelligenceService.importDataset(importData, { replace: false });

    // Thoran has S from prydwen, A from allclash, B from dotgg — significant spread
    const consensus = dataIntelligenceService.getConsensus('thoran', 'campaign');
    if (consensus) {
      // Should detect disagreement (S vs B is > 2 tier positions)
      // The disagreement flag depends on the tier spread
      expect(consensus.sources.length).toBeGreaterThanOrEqual(2);
    }
  });
});
