/**
 * DotGG API adapter — fetches hero data from the public DotGG API
 * and maps it to our internal source record format.
 *
 * Endpoint: GET https://api.dotgg.gg/cgfw/getcharacters?game=afk-journey
 * No API key required. No authentication.
 *
 * The adapter:
 *   - requests the documented endpoint
 *   - handles network errors and HTTP errors
 *   - validates the response
 *   - maps returned heroes to canonical hero IDs
 *   - extracts supported fields
 *   - records retrieval timestamp
 *   - does NOT corrupt existing data on failure
 */

import type { SourceMetaRecord } from '@/types';
import { validateDotGGResponse, type DotGGHeroRaw } from './validator';
import {
  DOTGG_TIER_MODE_MAP,
  DOTGG_RACE_MAP,
  DOTGG_JOB_MAP,
  DOTGG_RARITY_MAP,
  DOTGG_DAMAGE_MAP,
  buildDotggImageUrl,
} from './mapping';
import { resolveHeroId } from '@/engine/HeroMapping';
import { heroesById } from '@/data/heroes';
import { evaluateDotGGQuality, type DataQualityResult } from '@/services/DataQualityGate';

export const DOTGG_API_URL = 'https://api.dotgg.gg/cgfw/getcharacters?game=afk-journey';
export const DOTGG_SOURCE_ID = 'dotgg';

export interface DotGGFetchResult {
  success: boolean;
  records: SourceMetaRecord[];
  heroesEnriched: DotGGHeroData[];
  errors: string[];
  warnings: string[];
  retrievedAt: string;
  /** How many heroes were received from the API. */
  received: number;
  /** How many were successfully mapped to canonical heroes. */
  mapped: number;
  /** How many could not be mapped (unknown heroes). */
  unknown: number;
  /** How many were rejected by validation. */
  rejected: number;
  /** Heroes from the API that have no tier data. */
  withoutTiers: number;
  /** Data quality assessment — determines whether tier data can influence consensus. */
  quality: DataQualityResult;
}

export interface DotGGHeroData {
  canonicalHeroId: string | null;
  sourceHeroName: string;
  sourceSlug: string;
  title?: string;
  description?: string;
  iconUrl?: string;
  imageUrl?: string;
  faction?: string;
  class?: string;
  rarity?: string;
  damageType?: string;
  isMelee?: boolean;
  skills?: unknown;
  tiers?: Record<string, string>;
  tiersEval?: Record<string, string>;
}

/**
 * Fetch and process DotGG hero data.
 * Returns a result object — never throws.
 */
export async function fetchDotGGData(): Promise<DotGGFetchResult> {
  const retrievedAt = new Date().toISOString();

  try {
    const response = await fetch(DOTGG_API_URL, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return {
        success: false,
        records: [],
        heroesEnriched: [],
        errors: [`HTTP ${response.status} ${response.statusText}`],
        warnings: [],
        retrievedAt,
        received: 0,
        mapped: 0,
        unknown: 0,
        rejected: 0,
        withoutTiers: 0,
        quality: { level: 'invalid', confidence: 'unknown', valid: false, reasons: ['HTTP error'], recordsReceived: 0, recordsUsable: 0, suspiciousPatterns: [], explanation: 'API request failed.' },
      };
    }

    const json: unknown = await response.json();
    return processDotGGResponse(json, retrievedAt);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown network error';
    return {
      success: false,
      records: [],
      heroesEnriched: [],
      errors: [message],
      warnings: [],
      retrievedAt,
      received: 0,
      mapped: 0,
      unknown: 0,
      rejected: 0,
      withoutTiers: 0,
      quality: { level: 'invalid', confidence: 'unknown', valid: false, reasons: ['Network error: ' + message], recordsReceived: 0, recordsUsable: 0, suspiciousPatterns: [], explanation: 'Network error — existing data preserved.' },
    };
  }
}

/**
 * Process a raw API response (separated for testability).
 */
export function processDotGGResponse(
  json: unknown,
  retrievedAt: string
): DotGGFetchResult {
  const validation = validateDotGGResponse(json);

  if (!validation.valid && validation.heroes.length === 0) {
    return {
      success: false,
      records: [],
      heroesEnriched: [],
      errors: validation.errors,
      warnings: validation.warnings,
      retrievedAt,
      received: json && typeof json === 'object' && Array.isArray(json) ? (json as unknown[]).length : 0,
      mapped: 0,
      unknown: 0,
      rejected: validation.rejected,
      withoutTiers: 0,
      quality: { level: 'invalid', confidence: 'unknown', valid: false, reasons: validation.errors, recordsReceived: 0, recordsUsable: 0, suspiciousPatterns: [], explanation: 'Response failed validation.' },
    };
  }

  const records: SourceMetaRecord[] = [];
  const heroesEnriched: DotGGHeroData[] = [];
  let mapped = 0;
  let unknown = 0;
  let withoutTiers = 0;
  const warnings = [...validation.warnings];

  for (const raw of validation.heroes) {
    const sourceSlug = raw.slug ?? raw.url;
    const { canonicalHeroId } = resolveHeroId(DOTGG_SOURCE_ID, raw.name);

    // Build enriched hero data
    const enriched: DotGGHeroData = {
      canonicalHeroId,
      sourceHeroName: raw.name,
      sourceSlug,
      title: raw.title,
      description: raw.description,
      iconUrl: buildDotggImageUrl(raw.icon),
      imageUrl: buildDotggImageUrl(raw.image),
      faction: raw.race ? DOTGG_RACE_MAP[raw.race] : undefined,
      class: raw.job ? DOTGG_JOB_MAP[raw.job] : undefined,
      rarity: raw.rarity ? DOTGG_RARITY_MAP[raw.rarity] : undefined,
      damageType: raw.damage_type ? DOTGG_DAMAGE_MAP[raw.damage_type] : undefined,
      isMelee: raw.is_melee === '1',
      skills: raw.skills,
      tiers: raw.tiers,
      tiersEval: raw.tiersEval,
    };

    heroesEnriched.push(enriched);

    if (!canonicalHeroId) {
      unknown++;
      warnings.push(`Unknown hero: ${raw.name} (slug: ${sourceSlug}) — not in canonical database`);
      continue;
    }

    // Verify the mapped hero actually exists in our DB
    if (!heroesById[canonicalHeroId]) {
      unknown++;
      warnings.push(`Mapped hero ID "${canonicalHeroId}" not found in database for ${raw.name}`);
      continue;
    }

    mapped++;

    // Build source meta records from tiers
    if (raw.tiers && typeof raw.tiers === 'object') {
      for (const [dotggMode, tier] of Object.entries(raw.tiers)) {
        const modeId = DOTGG_TIER_MODE_MAP[dotggMode];
        if (!modeId) continue; // Skip unmapped modes (e.g. 'primal')

        if (typeof tier !== 'string' || tier.length === 0) continue;

        records.push({
          sourceId: DOTGG_SOURCE_ID,
          heroId: canonicalHeroId,
          modeId,
          tier: tier.toUpperCase(),
          sourceUrl: `https://afk.dot.gg/characters/${sourceSlug}`,
          retrievedAt,
          confidence: 'medium',
        });
      }
    } else {
      withoutTiers++;
    }
  }

  // Run quality gate on the raw hero data
  const quality = evaluateDotGGQuality(validation.heroes);

  // If data is suspicious, downgrade all record confidence to 'low'
  // and add quality warnings. Records are still returned for raw storage
  // but the update service will exclude them from consensus.
  if (quality.level === 'suspicious') {
    for (const r of records) {
      r.confidence = 'low';
    }
    warnings.push(`DATA QUALITY: ${quality.explanation}`);
    for (const reason of quality.reasons) {
      warnings.push(`QUALITY: ${reason}`);
    }
  }

  return {
    success: true,
    records,
    heroesEnriched,
    errors: validation.errors,
    warnings,
    retrievedAt,
    received: validation.heroes.length,
    mapped,
    unknown,
    rejected: validation.rejected,
    withoutTiers,
    quality,
  };
}
