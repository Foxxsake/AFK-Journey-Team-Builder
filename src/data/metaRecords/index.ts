import type { SourceMetaRecord, MetaSnapshot, SourceHeroMapping } from '@/types';

/**
 * Seed meta records — imported from community tier lists.
 *
 * IMPORTANT: This data is imported manually. No automated scraping.
 * All tier ratings come from publicly available community guides
 * and are attributed to their respective sources.
 *
 * Data current as of: 2026-08-26
 *
 * Sources used:
 *   prydwen — Prydwen.gg tier lists
 *   allclash — AllClash guide ratings
 *
 * These are EXAMPLE records using common community assessments.
 * They should be updated via the import system when fresh data arrives.
 */

const retrievedAt = '2026-08-26';

export const seedMetaRecords: SourceMetaRecord[] = [
  // Campaign mode
  { sourceId: 'prydwen', heroId: 'scarlita', modeId: 'campaign', tier: 'S', retrievedAt, confidence: 'medium', sourceUrl: 'https://www.prydwen.gg/afk-journey/tier-list' },
  { sourceId: 'prydwen', heroId: 'thoran', modeId: 'campaign', tier: 'S', retrievedAt, confidence: 'medium', sourceUrl: 'https://www.prydwen.gg/afk-journey/tier-list' },
  { sourceId: 'prydwen', heroId: 'rowan', modeId: 'campaign', tier: 'S', retrievedAt, confidence: 'medium', sourceUrl: 'https://www.prydwen.gg/afk-journey/tier-list' },
  { sourceId: 'prydwen', heroId: 'hewynn', modeId: 'campaign', tier: 'S', retrievedAt, confidence: 'medium', sourceUrl: 'https://www.prydwen.gg/afk-journey/tier-list' },
  { sourceId: 'prydwen', heroId: 'smokey_meerky', modeId: 'campaign', tier: 'S', retrievedAt, confidence: 'medium', sourceUrl: 'https://www.prydwen.gg/afk-journey/tier-list' },
  { sourceId: 'allclash', heroId: 'scarlita', modeId: 'campaign', tier: 'S', retrievedAt, confidence: 'medium' },
  { sourceId: 'allclash', heroId: 'thoran', modeId: 'campaign', tier: 'A', retrievedAt, confidence: 'medium' },
  { sourceId: 'allclash', heroId: 'rowan', modeId: 'campaign', tier: 'S', retrievedAt, confidence: 'medium' },
  { sourceId: 'allclash', heroId: 'hewynn', modeId: 'campaign', tier: 'A', retrievedAt, confidence: 'medium' },

  // Arena mode
  { sourceId: 'prydwen', heroId: 'scarlita', modeId: 'arena', tier: 'S', retrievedAt, confidence: 'medium', sourceUrl: 'https://www.prydwen.gg/afk-journey/tier-list' },
  { sourceId: 'prydwen', heroId: 'talene', modeId: 'arena', tier: 'S', retrievedAt, confidence: 'medium', sourceUrl: 'https://www.prydwen.gg/afk-journey/tier-list' },
  { sourceId: 'prydwen', heroId: 'aurora', modeId: 'arena', tier: 'S', retrievedAt, confidence: 'medium', sourceUrl: 'https://www.prydwen.gg/afk-journey/tier-list' },
  { sourceId: 'allclash', heroId: 'scarlita', modeId: 'arena', tier: 'S', retrievedAt, confidence: 'medium' },
  { sourceId: 'allclash', heroId: 'talene', modeId: 'arena', tier: 'S', retrievedAt, confidence: 'medium' },

  // Dream Realm mode
  { sourceId: 'prydwen', heroId: 'dionel', modeId: 'dream_realm', tier: 'S', retrievedAt, confidence: 'medium', sourceUrl: 'https://www.prydwen.gg/afk-journey/tier-list' },
  { sourceId: 'prydwen', heroId: 'voracia', modeId: 'dream_realm', tier: 'S', retrievedAt, confidence: 'medium', sourceUrl: 'https://www.prydwen.gg/afk-journey/tier-list' },
  { sourceId: 'allclash', heroId: 'dionel', modeId: 'dream_realm', tier: 'A', retrievedAt, confidence: 'medium' },
  { sourceId: 'allclash', heroId: 'voracia', modeId: 'dream_realm', tier: 'S', retrievedAt, confidence: 'medium' },
];

/** Historical meta snapshots — empty until data updates are imported. */
export const seedMetaSnapshots: MetaSnapshot[] = [];

/** Source hero mappings — empty until variant names need mapping. */
export const seedHeroMappings: SourceHeroMapping[] = [];
