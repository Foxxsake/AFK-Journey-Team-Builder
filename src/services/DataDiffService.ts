import type { SourceMetaRecord, MetaSnapshot } from '@/types';

/**
 * Data diff service — compares two datasets and reports what changed.
 *
 * Detects:
 *   - new heroes (in new dataset but not old)
 *   - removed heroes (in old dataset but not new)
 *   - tier changes (same hero+mode, different tier)
 *   - new records (new source for existing hero+mode)
 *   - removed records
 */

export interface DataDiff {
  newHeroIds: string[];
  removedHeroIds: string[];
  tierChanges: Array<{
    heroId: string;
    modeId: string;
    sourceId: string;
    oldTier?: string;
    newTier?: string;
    oldRating?: number;
    newRating?: number;
  }>;
  newRecords: number;
  removedRecords: number;
  totalChanges: number;
  /** Human-readable summary lines. */
  summary: string[];
}

type RecordKey = string;
function recordKey(r: SourceMetaRecord): RecordKey {
  return `${r.sourceId}::${r.heroId}::${r.modeId}`;
}

export function calculateDataDiff(
  oldRecords: SourceMetaRecord[],
  newRecords: SourceMetaRecord[]
): DataDiff {
  const oldMap = new Map<RecordKey, SourceMetaRecord>();
  for (const r of oldRecords) oldMap.set(recordKey(r), r);

  const newMap = new Map<RecordKey, SourceMetaRecord>();
  for (const r of newRecords) newMap.set(recordKey(r), r);

  // New vs old hero IDs
  const oldHeroIds = new Set(oldRecords.map((r) => r.heroId));
  const newHeroIds = new Set(newRecords.map((r) => r.heroId));

  const newHeroIdsArr = [...newHeroIds].filter((id) => !oldHeroIds.has(id));
  const removedHeroIdsArr = [...oldHeroIds].filter((id) => !newHeroIds.has(id));

  // Tier changes
  const tierChanges: DataDiff['tierChanges'] = [];
  let newRecordsCount = 0;
  let removedRecordsCount = 0;

  for (const [key, newRec] of newMap) {
    const oldRec = oldMap.get(key);
    if (!oldRec) {
      newRecordsCount++;
      continue;
    }
    // Check for tier/rating change
    if (oldRec.tier !== newRec.tier || oldRec.rating !== newRec.rating) {
      tierChanges.push({
        heroId: newRec.heroId,
        modeId: newRec.modeId,
        sourceId: newRec.sourceId,
        oldTier: oldRec.tier,
        newTier: newRec.tier,
        oldRating: oldRec.rating,
        newRating: newRec.rating,
      });
    }
  }

  for (const key of oldMap.keys()) {
    if (!newMap.has(key)) {
      removedRecordsCount++;
    }
  }

  const totalChanges =
    newHeroIdsArr.length +
    removedHeroIdsArr.length +
    tierChanges.length +
    newRecordsCount +
    removedRecordsCount;

  // Build human-readable summary
  const summary: string[] = [];
  if (newHeroIdsArr.length > 0) {
    summary.push(`${newHeroIdsArr.length} new hero${newHeroIdsArr.length > 1 ? 'es' : ''}`);
  }
  if (removedHeroIdsArr.length > 0) {
    summary.push(`${removedHeroIdsArr.length} removed hero${removedHeroIdsArr.length > 1 ? 'es' : ''}`);
  }
  if (tierChanges.length > 0) {
    summary.push(`${tierChanges.length} tier change${tierChanges.length > 1 ? 's' : ''}`);
  }
  if (newRecordsCount > 0) {
    summary.push(`${newRecordsCount} new record${newRecordsCount > 1 ? 's' : ''}`);
  }
  if (removedRecordsCount > 0) {
    summary.push(`${removedRecordsCount} removed record${removedRecordsCount > 1 ? 's' : ''}`);
  }

  return {
    newHeroIds: newHeroIdsArr,
    removedHeroIds: removedHeroIdsArr,
    tierChanges,
    newRecords: newRecordsCount,
    removedRecords: removedRecordsCount,
    totalChanges,
    summary,
  };
}

/**
 * Create meta snapshots from old records (used before applying an update).
 */
export function createSnapshotsFromRecords(
  records: SourceMetaRecord[],
  timestamp: string
): MetaSnapshot[] {
  return records.map((r) => ({
    timestamp,
    heroId: r.heroId,
    modeId: r.modeId,
    sourceId: r.sourceId,
    rating: r.rating,
    tier: r.tier,
  }));
}
