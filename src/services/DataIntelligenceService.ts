import type {
  SourceMetaRecord,
  MetaSnapshot,
  SourceHeroMapping,
  MetaConsensus,
  DatasetExport,
  GameDataVersion,
  ConfidenceResult,
} from '@/types';
import type {
  HeroAbility,
  HeroModeAssessment,
  CounterRelationship,
  SynergyRelationship,
  BossProfile,
} from '@/types/intelligence';
import { seedMetaRecords, seedMetaSnapshots, seedHeroMappings } from '@/data/metaRecords';
import { SOURCE_REGISTRY, getSourceWeight, sourcesById } from '@/data/sources';
import { heroes, heroesById } from '@/data/heroes';
import { gameModes } from '@/data/modes';
import { formations } from '@/data/formations';
import { factions } from '@/data/factions';
import { calculateMetaConsensus, calculateAllConsensus } from '@/engine/MetaConsensusEngine';
import { calculateFreshness, freshnessWeight, freshnessLabel, relativeTime } from '@/engine/FreshnessCalculator';
import { resolveHeroId, detectUnknownHeroes, detectDuplicateMappings } from '@/engine/HeroMapping';
import { DATA_VERSION, LAST_UPDATED } from '@/data/dataset';
import { getAllVerifiedAbilities, getVerifiedHeroIds } from '@/data/intelligence/verifiedAbilities';
import { getAllModeAssessments } from '@/data/intelligence/modeIntelligence';
import { getAllSynergyData } from '@/engine/SynergyEngine';
import { getAllCounters } from '@/engine/CounterEngine';
import { validateAll, type ValidationResult } from '@/engine/IntelligenceValidator';
import {
  mergeAbilities,
  mergeModeAssessments,
  mergeCounters,
  mergeSynergies,
  type MergeResult,
} from '@/engine/IntelligenceMerger';

const STORAGE_KEY = 'afkj_meta_data';
const CURRENT_SCHEMA_VERSION = 1;

interface MetaStore {
  records: SourceMetaRecord[];
  snapshots: MetaSnapshot[];
  mappings: SourceHeroMapping[];
  sourceWeights: Record<string, number>;
  gameVersion: string;
  lastImportAt: string | null;
  /** Intelligence data (added in Stage 10/11). */
  verifiedAbilities?: HeroAbility[];
  modeAssessments?: HeroModeAssessment[];
  counterRelationships?: CounterRelationship[];
  synergies?: SynergyRelationship[];
  /** Last import validation result. */
  lastImportValidation?: ValidationResult;
  /** Last import merge summary. */
  lastImportMerge?: { added: number; updated: number; skipped: number };
}

function loadStore(): MetaStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MetaStore;
      return {
        records: parsed.records ?? [],
        snapshots: parsed.snapshots ?? [],
        mappings: parsed.mappings ?? [],
        sourceWeights: parsed.sourceWeights ?? {},
        gameVersion: parsed.gameVersion ?? 'unknown',
        lastImportAt: parsed.lastImportAt ?? null,
        verifiedAbilities: parsed.verifiedAbilities,
        modeAssessments: parsed.modeAssessments,
        counterRelationships: parsed.counterRelationships,
        synergies: parsed.synergies,
        lastImportValidation: parsed.lastImportValidation,
        lastImportMerge: parsed.lastImportMerge,
      };
    }
  } catch {
    // localStorage unavailable or corrupt — fall through to defaults
  }

  return {
    records: [...seedMetaRecords],
    snapshots: [...seedMetaSnapshots],
    mappings: [...seedHeroMappings],
    sourceWeights: {},
    gameVersion: 'unknown',
    lastImportAt: null,
  };
}

function saveStore(s: MetaStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // localStorage unavailable — data is session-only
  }
}

let store: MetaStore = loadStore();

const consensusCache = new Map<string, MetaConsensus>();
let consensusCacheDirty = true;

function rebuildConsensusCache(): void {
  consensusCache.clear();
  const all = calculateAllConsensus(store.records, store.sourceWeights);
  for (const c of all) {
    consensusCache.set(`${c.heroId}::${c.modeId}`, c);
  }
  consensusCacheDirty = false;
}

function ensureCache(): void {
  if (consensusCacheDirty) {
    rebuildConsensusCache();
  }
}

// ============================================================
// PUBLIC API
// ============================================================

export const dataIntelligenceService = {
  // --- Records ---

  getAllRecords(): SourceMetaRecord[] {
    return [...store.records];
  },

  getRecordsForHero(heroId: string): SourceMetaRecord[] {
    return store.records.filter((r) => r.heroId === heroId);
  },

  getRecordsForHeroMode(heroId: string, modeId: string): SourceMetaRecord[] {
    return store.records.filter((r) => r.heroId === heroId && r.modeId === modeId);
  },

  // --- Consensus ---

  getConsensus(heroId: string, modeId: string): MetaConsensus | null {
    ensureCache();
    return consensusCache.get(`${heroId}::${modeId}`) ?? null;
  },

  getAllConsensus(): MetaConsensus[] {
    ensureCache();
    return Array.from(consensusCache.values());
  },

  // --- Snapshots ---

  getSnapshots(): MetaSnapshot[] {
    return [...store.snapshots];
  },

  addSnapshot(snapshot: MetaSnapshot): void {
    store.snapshots.push(snapshot);
    saveStore(store);
  },

  // --- Mappings ---

  getMappings(): SourceHeroMapping[] {
    return [...store.mappings];
  },

  resolveHero(sourceId: string, sourceHeroName: string) {
    return resolveHeroId(sourceId, sourceHeroName, store.mappings);
  },

  // --- Source weights ---

  getSourceWeights(): Record<string, number> {
    return { ...store.sourceWeights };
  },

  setSourceWeights(weights: Record<string, number>): void {
    store.sourceWeights = { ...weights };
    consensusCacheDirty = true;
    saveStore(store);
  },

  getSourceWeight(sourceId: string): number {
    return getSourceWeight(sourceId, store.sourceWeights);
  },

  // --- Freshness ---

  getFreshness(retrievedAt: string) {
    return calculateFreshness(retrievedAt);
  },

  freshnessLabel(category: ReturnType<typeof calculateFreshness>): string {
    return freshnessLabel(category);
  },

  relativeTime(retrievedAt: string): string {
    return relativeTime(retrievedAt);
  },

  // --- Game version ---

  getGameVersion(): string {
    return store.gameVersion;
  },

  // --- Import / Export ---

  exportDataset(): DatasetExport {
    ensureCache();
    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      gameVersion: store.gameVersion,
      generatedAt: new Date().toISOString(),
      sources: SOURCE_REGISTRY,
      heroMappings: store.mappings,
      metaRecords: store.records,
      snapshots: store.snapshots,
      consensus: Array.from(consensusCache.values()),
      // Intelligence fields
      verifiedHeroData: store.verifiedAbilities
        ? Array.from(groupAbilitiesByHero(store.verifiedAbilities).values())
        : undefined,
      counterRelationships: store.counterRelationships,
      modeAssessments: store.modeAssessments,
      synergies: store.synergies,
    };
  },

  exportFullDataset(): DatasetExport {
    ensureCache();
    const base = this.exportDataset();
    return {
      ...base,
      verifiedHeroData: groupAbilitiesByHero(getAllVerifiedAbilities()).size > 0
        ? Array.from(groupAbilitiesByHero(getAllVerifiedAbilities()).values())
        : undefined,
      counterRelationships: getAllCounters(),
      modeAssessments: getAllModeAssessments(),
      synergies: getAllSynergyData(),
    };
  },

  importDataset(
    data: unknown,
    options?: { replace?: boolean }
  ): { success: boolean; errors: string[]; warnings: string[]; imported: number; validation?: ValidationResult; merge?: { added: number; updated: number; skipped: number } } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let imported = 0;

    if (!data || typeof data !== 'object') {
      return { success: false, errors: ['Invalid dataset: not an object'], warnings, imported: 0 };
    }

    const ds = data as Partial<DatasetExport>;

    if (ds.schemaVersion !== CURRENT_SCHEMA_VERSION) {
      errors.push(`Schema version mismatch: expected ${CURRENT_SCHEMA_VERSION}, got ${ds.schemaVersion ?? 'missing'}`);
      return { success: false, errors, warnings, imported: 0 };
    }

    // Validate records
    const newRecords = ds.metaRecords ?? [];
    const validRecords: SourceMetaRecord[] = [];
    const seenKeys = new Set<string>();

    for (let i = 0; i < newRecords.length; i++) {
      const r = newRecords[i];
      if (!r.sourceId || !r.heroId || !r.modeId || !r.retrievedAt) {
        errors.push(`Record ${i}: missing required fields (sourceId, heroId, modeId, retrievedAt)`);
        continue;
      }

      if (!heroesById[r.heroId]) {
        warnings.push(`Record ${i}: unknown hero ID "${r.heroId}" — skipped`);
        continue;
      }

      const key = `${r.sourceId}::${r.heroId}::${r.modeId}`;
      if (seenKeys.has(key)) {
        warnings.push(`Record ${i}: duplicate (source=${r.sourceId}, hero=${r.heroId}, mode=${r.modeId}) — skipped`);
        continue;
      }
      seenKeys.add(key);
      validRecords.push(r);
    }

    // Validate intelligence fields if present
    const incomingAbilities = ds.verifiedHeroData
      ? ds.verifiedHeroData.flatMap((vd) => vd.abilities ?? [])
      : [];
    const incomingAssessments = ds.modeAssessments ?? [];
    const incomingCounters = ds.counterRelationships ?? [];
    const incomingSynergies = ds.synergies ?? [];

    const validation = validateAll(incomingAbilities, incomingAssessments, incomingCounters, incomingSynergies);

    // Report validation issues as warnings (don't fail the whole import for intelligence data)
    for (const err of validation.errors) {
      warnings.push(`Intelligence validation: ${err.message}`);
    }

    // Filter out invalid intelligence records
    const validAbilities = incomingAbilities.filter((a) => {
      const issue = validation.errors.find(
        (e) => e.code === 'INVALID_HERO_ID' && e.field === 'heroId' && e.message.includes(a.abilityId)
      );
      return !issue;
    });
    const validAssessments = incomingAssessments.filter((a) => heroesById[a.heroId]);
    const validCounters = incomingCounters.filter(
      (c) => heroesById[c.heroId] && (c.counterHeroId === '*' || heroesById[c.counterHeroId])
    );
    const validSynergies = incomingSynergies.filter((s) => heroesById[s.heroA] && heroesById[s.heroB]);

    if (errors.length > 0) {
      return { success: false, errors, warnings, imported: 0, validation, merge: { added: 0, updated: 0, skipped: 0 } };
    }

    // Merge or replace meta records
    if (options?.replace) {
      store.records = validRecords;
      store.mappings = ds.heroMappings ?? [];
      store.snapshots = ds.snapshots ?? [];
    } else {
      const existingKeys = new Set(
        store.records.map((r) => `${r.sourceId}::${r.heroId}::${r.modeId}`)
      );

      for (const newRec of validRecords) {
        const key = `${newRec.sourceId}::${newRec.heroId}::${newRec.modeId}`;
        const existing = store.records.find(
          (r) => `${r.sourceId}::${r.heroId}::${r.modeId}` === key
        );
        if (existing && (existing.tier !== newRec.tier || existing.rating !== newRec.rating)) {
          store.snapshots.push({
            timestamp: existing.retrievedAt,
            heroId: existing.heroId,
            modeId: existing.modeId,
            sourceId: existing.sourceId,
            rating: existing.rating,
            tier: existing.tier,
          });
        }
      }

      const newKeys = new Set(validRecords.map((r) => `${r.sourceId}::${r.heroId}::${r.modeId}`));
      const kept = store.records.filter(
        (r) => !newKeys.has(`${r.sourceId}::${r.heroId}::${r.modeId}`)
      );
      store.records = [...kept, ...validRecords];

      if (ds.heroMappings) {
        const existingMappingKeys = new Set(
          store.mappings.map((m) => `${m.sourceId}::${m.sourceHeroName}`)
        );
        for (const m of ds.heroMappings) {
          if (!existingMappingKeys.has(`${m.sourceId}::${m.sourceHeroName}`)) {
            store.mappings.push(m);
          }
        }
      }

      if (ds.snapshots) {
        store.snapshots.push(...ds.snapshots);
      }
    }

    // Evidence-aware merge for intelligence data
    const mergeSummary = { added: 0, updated: 0, skipped: 0 };

    if (validAbilities.length > 0 || options?.replace) {
      const existingAbilities = options?.replace ? [] : (store.verifiedAbilities ?? getAllVerifiedAbilities());
      const abMerge = mergeAbilities(existingAbilities, validAbilities);
      store.verifiedAbilities = abMerge.merged;
      mergeSummary.added += abMerge.added;
      mergeSummary.updated += abMerge.updated;
      mergeSummary.skipped += abMerge.skipped;
    }

    if (validAssessments.length > 0 || options?.replace) {
      const existingAssessments = options?.replace ? [] : (store.modeAssessments ?? getAllModeAssessments());
      const maMerge = mergeModeAssessments(existingAssessments, validAssessments);
      store.modeAssessments = maMerge.merged;
      mergeSummary.added += maMerge.added;
      mergeSummary.updated += maMerge.updated;
      mergeSummary.skipped += maMerge.skipped;
    }

    if (validCounters.length > 0 || options?.replace) {
      const existingCounters = options?.replace ? [] : (store.counterRelationships ?? getAllCounters());
      const coMerge = mergeCounters(existingCounters, validCounters);
      store.counterRelationships = coMerge.merged;
      mergeSummary.added += coMerge.added;
      mergeSummary.updated += coMerge.updated;
      mergeSummary.skipped += coMerge.skipped;
    }

    if (validSynergies.length > 0 || options?.replace) {
      const existingSynergies = options?.replace ? [] : (store.synergies ?? getAllSynergyData());
      const syMerge = mergeSynergies(existingSynergies, validSynergies);
      store.synergies = syMerge.merged;
      mergeSummary.added += syMerge.added;
      mergeSummary.updated += syMerge.updated;
      mergeSummary.skipped += syMerge.skipped;
    }

    store.gameVersion = ds.gameVersion ?? store.gameVersion;
    store.lastImportAt = new Date().toISOString();
    store.lastImportValidation = validation;
    store.lastImportMerge = mergeSummary;
    consensusCacheDirty = true;
    saveStore(store);
    imported = validRecords.length;

    return { success: true, errors, warnings, imported, validation, merge: mergeSummary };
  },

  // --- Data Health ---

  getDataHealth(): DataHealthReport {
    const records = store.records;
    const unknown = detectUnknownHeroes(
      records.map((r) => ({ sourceId: r.sourceId, sourceHeroName: r.heroId }))
    );
    const duplicateMappings = detectDuplicateMappings(store.mappings);

    const staleRecords = records.filter((r) => {
      const f = calculateFreshness(r.retrievedAt);
      return f === 'stale' || f === 'very_stale';
    });

    const disagreements: Array<{ heroId: string; modeId: string }> = [];
    ensureCache();
    for (const [key, consensus] of consensusCache) {
      if (consensus.hasDisagreement) {
        const [heroId, modeId] = key.split('::');
        disagreements.push({ heroId, modeId });
      }
    }

    const heroesWithMeta = new Set(records.map((r) => r.heroId));
    const heroesWithoutMeta = heroes
      .filter((h) => !heroesWithMeta.has(h.id))
      .map((h) => h.id);

    // Intelligence coverage
    const verifiedHeroIds = new Set(getVerifiedHeroIds());
    const heroesWithVerified = heroes.filter((h) => verifiedHeroIds.has(h.id)).length;
    const heroesWithHeuristic = heroes.length - heroesWithVerified;
    const verifiedAbilityCount = getAllVerifiedAbilities().length;
    const modeAssessmentCount = getAllModeAssessments().length;
    const counterCount = getAllCounters().length;
    const synergyCount = getAllSynergyData().length;
    const antiSynergyCount = getAllSynergyData().filter((s) => s.synergyScore < 0).length;

    return {
      totalRecords: records.length,
      totalSources: SOURCE_REGISTRY.filter((s) => s.enabled).length,
      sourcesWithRecords: new Set(records.map((r) => r.sourceId)).size,
      staleRecordCount: staleRecords.length,
      unknownHeroCount: unknown.length,
      duplicateMappingCount: duplicateMappings.length,
      disagreementCount: disagreements.length,
      heroesWithoutMetaCount: heroesWithoutMeta.length,
      totalHeroes: heroes.length,
      totalModes: gameModes.length,
      totalFormations: formations.length,
      totalFactions: factions.length,
      unknownHeroes: unknown,
      duplicateMappings,
      disagreements,
      heroesWithoutMeta: heroesWithoutMeta.slice(0, 20),
      gameVersion: store.gameVersion,
      lastImportAt: store.lastImportAt,
      // Intelligence coverage
      heroesWithVerifiedIntelligence: heroesWithVerified,
      heroesWithHeuristicIntelligence: heroesWithHeuristic,
      verifiedAbilityCount,
      modeAssessmentCount,
      counterCount,
      synergyCount,
      antiSynergyCount,
      lastImportValidation: store.lastImportValidation,
      lastImportMerge: store.lastImportMerge,
    };
  },

  // --- Reset to seed ---

  resetToSeed(): void {
    store = {
      records: [...seedMetaRecords],
      snapshots: [...seedMetaSnapshots],
      mappings: [...seedHeroMappings],
      sourceWeights: {},
      gameVersion: 'unknown',
      lastImportAt: null,
    };
    consensusCacheDirty = true;
    saveStore(store);
  },

  getDataStatusLabel(): string {
    if (store.lastImportAt) {
      return `Imported dataset · ${relativeTime(store.lastImportAt)}`;
    }
    return `Current dataset (seed) · ${LAST_UPDATED}`;
  },

  isUsingCachedData(): boolean {
    return store.lastImportAt !== null;
  },

  getSchemaVersion(): number {
    return CURRENT_SCHEMA_VERSION;
  },

  // --- Intelligence data accessors ---

  getStoredVerifiedAbilities(): HeroAbility[] {
    return store.verifiedAbilities ?? getAllVerifiedAbilities();
  },

  getStoredModeAssessments(): HeroModeAssessment[] {
    return store.modeAssessments ?? getAllModeAssessments();
  },

  getStoredCounters(): CounterRelationship[] {
    return store.counterRelationships ?? getAllCounters();
  },

  getStoredSynergies(): SynergyRelationship[] {
    return store.synergies ?? getAllSynergyData();
  },
};

// Helper: group abilities by hero for DatasetExport format
function groupAbilitiesByHero(abilities: HeroAbility[]): Map<string, { heroId: string; abilities: HeroAbility[]; hasVerifiedAbilities: boolean; lastVerifiedAt: string }> {
  const map = new Map<string, { heroId: string; abilities: HeroAbility[]; hasVerifiedAbilities: boolean; lastVerifiedAt: string }>();
  for (const ab of abilities) {
    const existing = map.get(ab.heroId);
    if (existing) {
      existing.abilities.push(ab);
    } else {
      map.set(ab.heroId, {
        heroId: ab.heroId,
        abilities: [ab],
        hasVerifiedAbilities: true,
        lastVerifiedAt: ab.retrievedAt,
      });
    }
  }
  return map;
}

export interface DataHealthReport {
  totalRecords: number;
  totalSources: number;
  sourcesWithRecords: number;
  staleRecordCount: number;
  unknownHeroCount: number;
  duplicateMappingCount: number;
  disagreementCount: number;
  heroesWithoutMetaCount: number;
  totalHeroes: number;
  totalModes: number;
  totalFormations: number;
  totalFactions: number;
  unknownHeroes: Array<{ sourceId: string; sourceHeroName: string }>;
  duplicateMappings: Array<{ sourceId: string; sourceHeroName: string; ids: string[] }>;
  disagreements: Array<{ heroId: string; modeId: string }>;
  heroesWithoutMeta: string[];
  gameVersion: string;
  lastImportAt: string | null;
  // Intelligence coverage
  heroesWithVerifiedIntelligence: number;
  heroesWithHeuristicIntelligence: number;
  verifiedAbilityCount: number;
  modeAssessmentCount: number;
  counterCount: number;
  synergyCount: number;
  antiSynergyCount: number;
  lastImportValidation?: ValidationResult;
  lastImportMerge?: { added: number; updated: number; skipped: number };
}
