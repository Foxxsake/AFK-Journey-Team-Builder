import type { DataSource, Hero, GameMode, Formation, MetaRating, Faction } from '@/types';
import { heroes } from './heroes';
import { gameModes } from './modes';
import { formations } from './formations';
import { metaRatings } from './meta';
import { factions } from './factions';

export const DATA_VERSION = '0.6.0';
export const LAST_UPDATED = '2026-08-27';

export const DATA_SOURCES: DataSource[] = [
  {
    id: 'afk_journey_wiki',
    name: 'AFK Journey Wiki (Fandom)',
    url: 'https://afk-journey.fandom.com/wiki/Hero/List',
    type: 'community',
    lastSynced: LAST_UPDATED,
    licenseNote:
      'Factual game data (names, factions, classes) extracted from publicly available wiki. No copyrighted text or images reproduced.',
  },
  {
    id: 'manual',
    name: 'Manual Entry',
    type: 'manual',
    licenseNote: 'Locally maintained dataset. No copyrighted content reproduced.',
  },
];

export interface Dataset {
  version: string;
  lastUpdated: string;
  sources: DataSource[];
  heroes: Hero[];
  factions: Faction[];
  gameModes: GameMode[];
  formations: Formation[];
  metaRatings: MetaRating[];
}

export const dataset: Dataset = {
  version: DATA_VERSION,
  lastUpdated: LAST_UPDATED,
  sources: DATA_SOURCES,
  heroes,
  factions,
  gameModes,
  formations,
  metaRatings,
};

export const DATASET_STATUS: 'incomplete' | 'partial' | 'complete' = 'partial';
