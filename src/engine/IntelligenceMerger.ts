/**
 * Evidence-Aware Merge — merges imported intelligence data with
 * existing data following the evidence hierarchy:
 *
 *   official > structured_source > verified_manual > heuristic > unknown
 *
 * Rules:
 *   - If existing data has STRONGER evidence, it is NOT replaced.
 *   - If incoming data has STRONGER or EQUAL evidence, it replaces/updates.
 *   - If evidence is equal, incoming data updates the existing record.
 *   - All changes are recorded for the diff system.
 *
 * This ensures imported heuristic data never overwrites verified data.
 */

import type {
  HeroAbility,
  HeroModeAssessment,
  CounterRelationship,
  SynergyRelationship,
  EvidenceType,
} from '@/types/intelligence';
import { EVIDENCE_RANK } from '@/types/intelligence';
import { canReplaceEvidence } from './IntelligenceValidator';

export interface MergeChange {
  type: 'added' | 'updated' | 'skipped';
  id: string;
  reason: string;
  field?: string;
}

export interface MergeResult<T> {
  merged: T[];
  changes: MergeChange[];
  skipped: number;
  added: number;
  updated: number;
}

// ============================================================
// ABILITY MERGING
// ============================================================

export function mergeAbilities(
  existing: HeroAbility[],
  incoming: HeroAbility[],
): MergeResult<HeroAbility> {
  const changes: MergeChange[] = [];
  const existingMap = new Map(existing.map((a) => [a.abilityId, a]));
  const result = [...existing];

  for (const inc of incoming) {
    const exist = existingMap.get(inc.abilityId);
    if (!exist) {
      result.push(inc);
      changes.push({ type: 'added', id: inc.abilityId, reason: 'New ability added' });
      continue;
    }

    if (canReplaceEvidence(exist.evidence, inc.evidence)) {
      const idx = result.findIndex((a) => a.abilityId === inc.abilityId);
      result[idx] = inc;
      changes.push({
        type: 'updated',
        id: inc.abilityId,
        reason: `Updated (evidence: ${exist.evidence} → ${inc.evidence})`,
      });
    } else {
      changes.push({
        type: 'skipped',
        id: inc.abilityId,
        reason: `Skipped — incoming evidence (${inc.evidence}) weaker than existing (${exist.evidence})`,
      });
    }
  }

  return summarize(result, changes);
}

// ============================================================
// MODE ASSESSMENT MERGING
// ============================================================

export function mergeModeAssessments(
  existing: HeroModeAssessment[],
  incoming: HeroModeAssessment[],
): MergeResult<HeroModeAssessment> {
  const changes: MergeChange[] = [];
  const existingMap = new Map(existing.map((a) => [`${a.heroId}::${a.mode}`, a]));
  const result = [...existing];

  for (const inc of incoming) {
    const key = `${inc.heroId}::${inc.mode}`;
    const exist = existingMap.get(key);
    if (!exist) {
      result.push(inc);
      changes.push({ type: 'added', id: key, reason: 'New mode assessment added' });
      continue;
    }

    if (canReplaceEvidence(exist.evidence, inc.evidence)) {
      const idx = result.findIndex((a) => a.heroId === inc.heroId && a.mode === inc.mode);
      result[idx] = inc;
      changes.push({
        type: 'updated',
        id: key,
        reason: `Updated (evidence: ${exist.evidence} → ${inc.evidence})`,
      });
    } else {
      changes.push({
        type: 'skipped',
        id: key,
        reason: `Skipped — incoming evidence (${inc.evidence}) weaker than existing (${exist.evidence})`,
      });
    }
  }

  return summarize(result, changes);
}

// ============================================================
// COUNTER MERGING
// ============================================================

export function mergeCounters(
  existing: CounterRelationship[],
  incoming: CounterRelationship[],
): MergeResult<CounterRelationship> {
  const changes: MergeChange[] = [];
  const key = (c: CounterRelationship) => `${c.heroId}→${c.counterHeroId}:${c.category}`;
  const existingMap = new Map(existing.map((c) => [key(c), c]));
  const result = [...existing];

  for (const inc of incoming) {
    const k = key(inc);
    const exist = existingMap.get(k);
    if (!exist) {
      result.push(inc);
      changes.push({ type: 'added', id: k, reason: 'New counter added' });
      continue;
    }

    if (canReplaceEvidence(exist.evidence, inc.evidence)) {
      const idx = result.findIndex((c) => key(c) === k);
      result[idx] = inc;
      changes.push({
        type: 'updated',
        id: k,
        reason: `Updated (evidence: ${exist.evidence} → ${inc.evidence})`,
      });
    } else {
      changes.push({
        type: 'skipped',
        id: k,
        reason: `Skipped — incoming evidence (${inc.evidence}) weaker than existing (${exist.evidence})`,
      });
    }
  }

  return summarize(result, changes);
}

// ============================================================
// SYNERGY MERGING
// ============================================================

export function mergeSynergies(
  existing: SynergyRelationship[],
  incoming: SynergyRelationship[],
): MergeResult<SynergyRelationship> {
  const changes: MergeChange[] = [];
  const key = (s: SynergyRelationship) => `${s.heroA}|${s.heroB}:${s.category}`;
  const existingMap = new Map(existing.map((s) => [key(s), s]));
  const result = [...existing];

  for (const inc of incoming) {
    const k = key(inc);
    const exist = existingMap.get(k);
    if (!exist) {
      result.push(inc);
      changes.push({ type: 'added', id: k, reason: 'New synergy added' });
      continue;
    }

    if (canReplaceEvidence(exist.evidence, inc.evidence)) {
      const idx = result.findIndex((s) => key(s) === k);
      result[idx] = inc;
      changes.push({
        type: 'updated',
        id: k,
        reason: `Updated (evidence: ${exist.evidence} → ${inc.evidence})`,
      });
    } else {
      changes.push({
        type: 'skipped',
        id: k,
        reason: `Skipped — incoming evidence (${inc.evidence}) weaker than existing (${exist.evidence})`,
      });
    }
  }

  return summarize(result, changes);
}

// ============================================================
// HELPER
// ============================================================

function summarize<T>(merged: T[], changes: MergeChange[]): MergeResult<T> {
  return {
    merged,
    changes,
    skipped: changes.filter((c) => c.type === 'skipped').length,
    added: changes.filter((c) => c.type === 'added').length,
    updated: changes.filter((c) => c.type === 'updated').length,
  };
}
