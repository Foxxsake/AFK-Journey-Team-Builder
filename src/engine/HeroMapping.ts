import type { SourceHeroMapping, SourceConfidence } from '@/types';
import { heroesById } from '@/data/heroes';

/**
 * Source hero mapping — maps source-specific hero names to our
 * canonical hero IDs. This prevents duplicate heroes when sources
 * use slightly different names.
 *
 * Currently, all source hero names match canonical names exactly.
 * This mapping table exists for when imported data uses variant names.
 */

const heroNameIndex: Record<string, string> = Object.values(heroesById).reduce(
  (acc, hero) => {
    acc[hero.name.toLowerCase()] = hero.id;
    if (hero.displayName) {
      acc[hero.displayName.toLowerCase()] = hero.id;
    }
    return acc;
  },
  {} as Record<string, string>
);

/** Default empty mapping — will grow as imported data arrives. */
export const heroMappings: SourceHeroMapping[] = [];

/**
 * Resolve a source hero name to a canonical hero ID.
 * Returns null if the hero is unknown.
 */
export function resolveHeroId(
  sourceId: string,
  sourceHeroName: string,
  mappings: SourceHeroMapping[] = heroMappings
): { canonicalHeroId: string | null; confidence: SourceConfidence } {
  // 1. Check explicit mappings first
  const mapping = mappings.find(
    (m) => m.sourceId === sourceId && m.sourceHeroName === sourceHeroName
  );
  if (mapping) {
    return { canonicalHeroId: mapping.canonicalHeroId, confidence: mapping.confidence };
  }

  // 2. Try exact name match (case-insensitive)
  const canonicalId = heroNameIndex[sourceHeroName.toLowerCase()];
  if (canonicalId) {
    return { canonicalHeroId: canonicalId, confidence: 'high' };
  }

  // 3. Try fuzzy match — remove special chars and compare
  const normalized = sourceHeroName.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const [name, id] of Object.entries(heroNameIndex)) {
    if (name.replace(/[^a-z0-9]/g, '') === normalized) {
      return { canonicalHeroId: id, confidence: 'medium' };
    }
  }

  // 4. Unknown hero
  return { canonicalHeroId: null, confidence: 'low' };
}

/**
 * Detect unknown heroes in a set of source records.
 * Returns a list of source hero names that don't map to any canonical hero.
 */
export function detectUnknownHeroes(
  records: Array<{ sourceId: string; sourceHeroName: string }>,
  mappings: SourceHeroMapping[] = heroMappings
): Array<{ sourceId: string; sourceHeroName: string }> {
  const unknown: Array<{ sourceId: string; sourceHeroName: string }> = [];
  for (const record of records) {
    const { canonicalHeroId } = resolveHeroId(
      record.sourceId,
      record.sourceHeroName,
      mappings
    );
    if (!canonicalHeroId) {
      unknown.push(record);
    }
  }
  return unknown;
}

/**
 * Detect duplicate mappings (same source + same name mapping to different IDs).
 */
export function detectDuplicateMappings(
  mappings: SourceHeroMapping[]
): Array<{ sourceId: string; sourceHeroName: string; ids: string[] }> {
  const grouped: Record<string, string[]> = {};
  for (const m of mappings) {
    const key = `${m.sourceId}::${m.sourceHeroName}`;
    if (!grouped[key]) grouped[key] = [];
    if (!grouped[key].includes(m.canonicalHeroId)) {
      grouped[key].push(m.canonicalHeroId);
    }
  }

  const duplicates: Array<{ sourceId: string; sourceHeroName: string; ids: string[] }> = [];
  for (const [key, ids] of Object.entries(grouped)) {
    if (ids.length > 1) {
      const [sourceId, sourceHeroName] = key.split('::');
      duplicates.push({ sourceId, sourceHeroName, ids });
    }
  }
  return duplicates;
}
