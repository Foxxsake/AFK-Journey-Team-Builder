import type { SourceMetaRecord, MetaSnapshot } from '@/types';
import { fetchDotGGData, type DotGGFetchResult, type DotGGHeroData } from '@/data/sources/dotgg/adapter';
import { calculateDataDiff, createSnapshotsFromRecords, type DataDiff } from './DataDiffService';
import { dataIntelligenceService } from './DataIntelligenceService';
import type { DataQualityResult } from './DataQualityGate';

/**
 * Data Update Service — orchestrates data acquisition from sources.
 *
 * Responsibilities:
 *   - Fetch data from DotGG (and future sources)
 *   - Cache results with configurable TTL
 *   - Create snapshots before applying updates (for rollback)
 *   - Detect and report data diffs
 *   - Preserve existing data on failure
 *   - Report success/failure with detailed diagnostics
 *
 * Offline-first: after a successful update, all data is in localStorage
 * and available without network access.
 */

const CACHE_KEY = 'afkj_data_update_cache';
const SNAPSHOT_KEY = 'afkj_data_snapshot';

/** Default cache lifetime: 6 hours. */
const DEFAULT_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export interface UpdateCacheEntry {
  lastFetchAt: string;
  lastSuccessAt: string | null;
  lastError: string | null;
  sourceId: string;
  received: number;
  mapped: number;
  unknown: number;
  rejected: number;
  qualityLevel: 'valid' | 'suspicious' | 'invalid';
  qualityExplanation: string;
  metaInfluenceEnabled: boolean;
}

export interface UpdateResult {
  success: boolean;
  sourceId: string;
  retrievedAt: string;
  received: number;
  mapped: number;
  unknown: number;
  rejected: number;
  withoutTiers: number;
  errors: string[];
  warnings: string[];
  diff: DataDiff | null;
  heroesEnriched: DotGGHeroData[];
  /** Whether cached data was used instead of a fresh fetch. */
  fromCache: boolean;
  /** Data quality assessment from the quality gate. */
  quality: DataQualityResult | null;
}

export interface SnapshotEntry {
  timestamp: string;
  records: SourceMetaRecord[];
  snapshots: MetaSnapshot[];
}

interface UpdateStore {
  cache: Record<string, UpdateCacheEntry>;
  lastSnapshot: SnapshotEntry | null;
  cacheTtlMs: number;
  /** Sources whose meta data failed quality gate — excluded from consensus. */
  disabledSources: Set<string>;
  /** Raw records from suspicious sources (stored but not in consensus). */
  rawRecords: SourceMetaRecord[];
}

function loadStore(): UpdateStore {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        cache: parsed.cache ?? {},
        lastSnapshot: parsed.lastSnapshot ?? null,
        cacheTtlMs: parsed.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS,
        disabledSources: new Set(parsed.disabledSources ?? []),
        rawRecords: parsed.rawRecords ?? [],
      };
    }
  } catch {
    // localStorage unavailable
  }
  return { cache: {}, lastSnapshot: null, cacheTtlMs: DEFAULT_CACHE_TTL_MS, disabledSources: new Set(), rawRecords: [] };
}

function saveStore(s: UpdateStore): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      ...s,
      disabledSources: [...s.disabledSources],
    }));
  } catch {
    // localStorage unavailable
  }
}

const store: UpdateStore = loadStore();

// ============================================================
// PUBLIC API
// ============================================================

export const dataUpdateService = {
  /**
   * Update data from DotGG.
   * Fetches from the API, validates, creates a snapshot of current
   * data, applies the new data, and returns a diff + diagnostics.
   *
   * On failure, existing data is preserved.
   */
  async updateFromDotGG(): Promise<UpdateResult> {
    const fetchResult: DotGGFetchResult = await fetchDotGGData();
    const retrievedAt = fetchResult.retrievedAt;

    // Update cache entry (even on failure — record the attempt)
    const quality = fetchResult.quality;
    const metaInfluenceEnabled = quality?.level === 'valid';
    store.cache['dotgg'] = {
      lastFetchAt: retrievedAt,
      lastSuccessAt: fetchResult.success ? retrievedAt : store.cache['dotgg']?.lastSuccessAt ?? null,
      lastError: fetchResult.success ? null : fetchResult.errors.join('; '),
      sourceId: 'dotgg',
      received: fetchResult.received,
      mapped: fetchResult.mapped,
      unknown: fetchResult.unknown,
      rejected: fetchResult.rejected,
      qualityLevel: quality?.level ?? 'invalid',
      qualityExplanation: quality?.explanation ?? 'Unknown',
      metaInfluenceEnabled,
    };

    // If data is suspicious, mark source as disabled for consensus
    // but retain raw records for inspection
    if (quality?.level === 'suspicious') {
      store.disabledSources.add('dotgg');
      store.rawRecords = [...store.rawRecords, ...fetchResult.records];
    } else if (quality?.level === 'valid') {
      store.disabledSources.delete('dotgg');
      // Remove old raw records for this source since they're now valid
      store.rawRecords = store.rawRecords.filter((r) => r.sourceId !== 'dotgg');
    }
    saveStore(store);

    if (!fetchResult.success) {
      return {
        success: false,
        sourceId: 'dotgg',
        retrievedAt,
        received: fetchResult.received,
        mapped: fetchResult.mapped,
        unknown: fetchResult.unknown,
        rejected: fetchResult.rejected,
        withoutTiers: fetchResult.withoutTiers,
        errors: fetchResult.errors,
        warnings: fetchResult.warnings,
        diff: null,
        heroesEnriched: [],
        fromCache: false,
        quality: fetchResult.quality,
      };
    }

    // Get current records for diff
    const oldRecords = dataIntelligenceService.getAllRecords();

    // Calculate diff BEFORE applying
    const diff = calculateDataDiff(oldRecords, fetchResult.records);

    // Create snapshot of current data for rollback
    const snapshot: SnapshotEntry = {
      timestamp: retrievedAt,
      records: [...oldRecords],
      snapshots: dataIntelligenceService.getSnapshots(),
    };
    store.lastSnapshot = snapshot;
    saveStore(store);

    // If data is suspicious, do NOT import records into the consensus dataset.
    // They are retained as raw records only. Existing data is preserved.
    if (quality?.level === 'suspicious') {
      return {
        success: true,
        sourceId: 'dotgg',
        retrievedAt,
        received: fetchResult.received,
        mapped: fetchResult.mapped,
        unknown: fetchResult.unknown,
        rejected: fetchResult.rejected,
        withoutTiers: fetchResult.withoutTiers,
        errors: [],
        warnings: [...fetchResult.warnings, 'DotGG tier data flagged as suspicious — meta influence disabled. Raw records retained for inspection.'],
        diff: null,
        heroesEnriched: fetchResult.heroesEnriched,
        fromCache: false,
        quality: fetchResult.quality,
      };
    }

    // Quality is valid — merge records into the consensus dataset
    const importPayload = {
      schemaVersion: 1,
      generatedAt: retrievedAt,
      sources: [],
      heroMappings: [],
      metaRecords: fetchResult.records,
      snapshots: [],
      consensus: [],
    };

    const importResult = dataIntelligenceService.importDataset(importPayload, { replace: false });

    return {
      success: true,
      sourceId: 'dotgg',
      retrievedAt,
      received: fetchResult.received,
      mapped: fetchResult.mapped,
      unknown: fetchResult.unknown,
      rejected: fetchResult.rejected,
      withoutTiers: fetchResult.withoutTiers,
      errors: importResult.errors,
      warnings: [...fetchResult.warnings, ...importResult.warnings],
      diff,
      heroesEnriched: fetchResult.heroesEnriched,
      fromCache: false,
      quality: fetchResult.quality,
    };
  },

  /**
   * Get the cache entry for a source.
   */
  getCacheEntry(sourceId: string): UpdateCacheEntry | null {
    return store.cache[sourceId] ?? null;
  },

  /**
   * Check if cached data is fresh enough to skip a fetch.
   */
  isCacheFresh(sourceId: string): boolean {
    const entry = store.cache[sourceId];
    if (!entry || !entry.lastSuccessAt) return false;
    const age = Date.now() - new Date(entry.lastSuccessAt).getTime();
    return age < store.cacheTtlMs;
  },

  /**
   * Get cache TTL in milliseconds.
   */
  getCacheTtl(): number {
    return store.cacheTtlMs;
  },

  /**
   * Set cache TTL (milliseconds).
   */
  setCacheTtl(ms: number): void {
    store.cacheTtlMs = ms;
    saveStore(store);
  },

  /**
   * Rollback to the previous dataset snapshot.
   * Returns the snapshot that was restored, or null if none exists.
   */
  rollback(): SnapshotEntry | null {
    if (!store.lastSnapshot) return null;

    // Restore the old records by replacing current data
    const importPayload = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      sources: [],
      heroMappings: [],
      metaRecords: store.lastSnapshot.records,
      snapshots: store.lastSnapshot.snapshots,
      consensus: [],
    };

    dataIntelligenceService.importDataset(importPayload, { replace: true });

    const restored = store.lastSnapshot;
    store.lastSnapshot = null;
    saveStore(store);

    return restored;
  },

  /**
   * Check if a rollback is available.
   */
  canRollback(): boolean {
    return store.lastSnapshot !== null;
  },

  /**
   * Get the snapshot timestamp if available.
   */
  getSnapshotTimestamp(): string | null {
    return store.lastSnapshot?.timestamp ?? null;
  },

  /**
   * Get all source health entries including data quality.
   */
  getSourceHealth(): Array<{
    sourceId: string;
    status: 'available' | 'failed' | 'never_updated';
    datasetQuality: 'valid' | 'suspicious' | 'invalid' | 'unknown';
    metaInfluenceEnabled: boolean;
    qualityExplanation: string;
    lastSuccessAt: string | null;
    lastFetchAt: string | null;
    received: number;
    mapped: number;
    unknown: number;
    rejected: number;
  }> {
    const sourceIds = ['dotgg', 'prydwen', 'allclash', 'official'];
    return sourceIds.map((id) => {
      const entry = store.cache[id];
      if (!entry) {
        return {
          sourceId: id,
          status: 'never_updated' as const,
          datasetQuality: 'unknown' as const,
          metaInfluenceEnabled: id !== 'dotgg', // Non-DotGG sources always enabled
          qualityExplanation: 'No data from this source yet.',
          lastSuccessAt: null,
          lastFetchAt: null,
          received: 0,
          mapped: 0,
          unknown: 0,
          rejected: 0,
        };
      }
      return {
        sourceId: id,
        status: entry.lastSuccessAt ? 'available' : 'failed',
        datasetQuality: entry.qualityLevel,
        metaInfluenceEnabled: entry.metaInfluenceEnabled,
        qualityExplanation: entry.qualityExplanation,
        lastSuccessAt: entry.lastSuccessAt,
        lastFetchAt: entry.lastFetchAt,
        received: entry.received,
        mapped: entry.mapped,
        unknown: entry.unknown,
        rejected: entry.rejected,
      };
    });
  },

  /**
   * Get the set of sources whose meta data is disabled (failed quality gate).
   */
  getDisabledSources(): Set<string> {
    return new Set(store.disabledSources);
  },

  /**
   * Get raw records from disabled/suspicious sources (stored but not in consensus).
   */
  getRawRecords(): SourceMetaRecord[] {
    return [...store.rawRecords];
  },
};
