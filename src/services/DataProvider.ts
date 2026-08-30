import type { Hero, GameMode, Formation, MetaRating, DataSource, Faction } from '@/types';
import type { Dataset } from '@/data/dataset';

export interface DataProvider {
  readonly id: string;
  readonly name: string;

  isAvailable(): boolean;
  fetchDataset(): Promise<Dataset>;
  fetchHeroes(): Promise<Hero[]>;
  fetchFactions(): Promise<Faction[]>;
  fetchGameModes(): Promise<GameMode[]>;
  fetchFormations(): Promise<Formation[]>;
  fetchMetaRatings(): Promise<MetaRating[]>;
  getSources(): DataSource[];
}

import {
  dataset as localDataset,
  DATA_VERSION,
  LAST_UPDATED,
  DATA_SOURCES,
} from '@/data/dataset';

export class LocalDataProvider implements DataProvider {
  readonly id = 'local';
  readonly name = 'Local Bundled Dataset';

  isAvailable(): boolean {
    return true;
  }

  async fetchDataset(): Promise<Dataset> {
    return structuredClone(localDataset);
  }

  async fetchHeroes(): Promise<Hero[]> {
    return structuredClone(localDataset.heroes);
  }

  async fetchFactions(): Promise<Faction[]> {
    return structuredClone(localDataset.factions);
  }

  async fetchGameModes(): Promise<GameMode[]> {
    return structuredClone(localDataset.gameModes);
  }

  async fetchFormations(): Promise<Formation[]> {
    return structuredClone(localDataset.formations);
  }

  async fetchMetaRatings(): Promise<MetaRating[]> {
    return structuredClone(localDataset.metaRatings);
  }

  getSources(): DataSource[] {
    return [...DATA_SOURCES];
  }

  get version(): string {
    return DATA_VERSION;
  }

  get lastUpdated(): string {
    return LAST_UPDATED;
  }
}

export const localDataProvider = new LocalDataProvider();

const providerRegistry: DataProvider[] = [localDataProvider];

export function registerDataProvider(provider: DataProvider): void {
  if (!providerRegistry.some((p) => p.id === provider.id)) {
    providerRegistry.push(provider);
  }
}

export function getActiveProvider(): DataProvider {
  return providerRegistry.find((p) => p.isAvailable()) ?? localDataProvider;
}

export function listDataProviders(): DataProvider[] {
  return [...providerRegistry];
}
