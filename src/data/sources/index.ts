import type { MetaDataSource } from '@/types';

/**
 * Source registry — central list of all data sources the intelligence
 * layer knows about.
 *
 * RETRIEVAL METHODS — only claim methods that actually work:
 *   "manual"    — data entered by a developer, no automated retrieval
 *   "import"    — data imported via the JSON import system
 *   "api"       — source has a public API we can call (none currently)
 *   "public-web"— source is a public website (we do NOT scrape; import only)
 *
 * No source currently supports automated retrieval. All data is
 * imported or manually entered. This is intentional and honest.
 */
export const SOURCE_REGISTRY: MetaDataSource[] = [
  {
    id: 'official',
    name: 'AFK Journey Official',
    baseUrl: 'https://afkjourney.lilithgames.com',
    type: 'official',
    retrievalMethod: 'manual',
    reliability: 1.0,
    enabled: true,
    licenseNote: 'Official game data. Not currently retrieved automatically.',
  },
  {
    id: 'prydwen',
    name: 'Prydwen.gg',
    baseUrl: 'https://www.prydwen.gg/afk-journey',
    type: 'community',
    retrievalMethod: 'import',
    reliability: 0.9,
    enabled: true,
    lastChecked: undefined,
    licenseNote: 'Community tier lists and guides. Data imported manually — no automated scraping.',
  },
  {
    id: 'allclash',
    name: 'AllClash',
    baseUrl: 'https://www.allclash.com',
    type: 'community',
    retrievalMethod: 'import',
    reliability: 0.8,
    enabled: true,
    lastChecked: undefined,
    licenseNote: 'Community guides. Data imported manually — no automated scraping.',
  },
  {
    id: 'dotgg',
    name: 'DotGG',
    baseUrl: 'https://afk.dot.gg',
    type: 'community',
    retrievalMethod: 'api',
    reliability: 0.8,
    enabled: true,
    lastChecked: '2026-08-27',
    licenseNote: 'Public API at api.dotgg.gg. No authentication required. Data retrieved via documented endpoint.',
  },
  {
    id: 'afk_journey_wiki',
    name: 'AFK Journey Wiki (Fandom)',
    baseUrl: 'https://afk-journey.fandom.com',
    type: 'community',
    retrievalMethod: 'manual',
    reliability: 0.75,
    enabled: true,
    lastChecked: '2026-08-26',
    licenseNote: 'Factual game data extracted from publicly available wiki. No copyrighted text reproduced.',
  },
  {
    id: 'manual',
    name: 'Manual Entry',
    type: 'manual',
    retrievalMethod: 'manual',
    reliability: 0.6,
    enabled: true,
    licenseNote: 'Locally maintained dataset.',
  },
];

export const sourcesById: Record<string, MetaDataSource> = SOURCE_REGISTRY.reduce(
  (acc, src) => {
    acc[src.id] = src;
    return acc;
  },
  {} as Record<string, MetaDataSource>
);

/**
 * Default source reliability weights (0–1).
 *
 * Rationale:
 *   official: 1.0  — official game data is authoritative
 *   prydwen:  0.9  — widely respected, frequently updated, detailed tier lists
 *   allclash: 0.8  — reputable, good guides, slightly less granular ratings
 *   dotgg:    0.8  — reputable database, community-driven
 *   wiki:     0.75 — community wiki, good for factual data, less reliable for meta
 *   manual:   0.6  — manual entries may be outdated or subjective
 *
 * These are starting values. They are configurable and should be
 * adjusted as we learn more about each source's accuracy.
 */
export const DEFAULT_SOURCE_WEIGHTS: Record<string, number> = SOURCE_REGISTRY.reduce(
  (acc, src) => {
    acc[src.id] = src.reliability;
    return acc;
  },
  {} as Record<string, number>
);

/** Get a source's weight, falling back to 0.5 for unknown sources. */
export function getSourceWeight(sourceId: string, weights?: Record<string, number>): number {
  return weights?.[sourceId] ?? DEFAULT_SOURCE_WEIGHTS[sourceId] ?? 0.5;
}

/** Get all enabled sources. */
export function getEnabledSources(): MetaDataSource[] {
  return SOURCE_REGISTRY.filter((s) => s.enabled);
}

/** Get a source by ID. */
export function getSource(sourceId: string): MetaDataSource | undefined {
  return sourcesById[sourceId];
}
