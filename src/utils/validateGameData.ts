import type { Hero, Faction, MetaRating } from '@/types';
import { heroes, heroesById } from '@/data/heroes';
import { factions, factionsById } from '@/data/factions';
import { gameModes, gameModesById } from '@/data/modes';
import { metaRatings } from '@/data/meta';

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  heroId?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: number;
  warnings: number;
  infos: number;
  issues: ValidationIssue[];
}

const VALID_FACTIONS = new Set(factions.map((f) => f.id));

export function validateGameData(): ValidationResult {
  const issues: ValidationIssue[] = [];
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();

  for (const hero of heroes) {
    // Unique ID check
    if (seenIds.has(hero.id)) {
      issues.push({
        severity: 'error',
        message: `Duplicate hero ID: "${hero.id}"`,
        heroId: hero.id,
      });
    }
    seenIds.add(hero.id);

    // Unique name check
    if (seenNames.has(hero.name)) {
      issues.push({
        severity: 'error',
        message: `Duplicate hero name: "${hero.name}"`,
        heroId: hero.id,
      });
    }
    seenNames.add(hero.name);

    // Valid faction check
    if (!VALID_FACTIONS.has(hero.faction)) {
      issues.push({
        severity: 'error',
        message: `Hero "${hero.name}" has invalid faction: "${hero.faction}"`,
        heroId: hero.id,
      });
    }

    // Source check
    if (!hero.sources || hero.sources.length === 0) {
      issues.push({
        severity: 'warning',
        message: `Hero "${hero.name}" has no source information`,
        heroId: hero.id,
      });
    }

    // Empty roles warning
    if (hero.roles.length === 0) {
      issues.push({
        severity: 'info',
        message: `Hero "${hero.name}" has no assigned roles yet`,
        heroId: hero.id,
      });
    }

    // Empty skills warning
    if (!hero.skills || hero.skills.length === 0) {
      issues.push({
        severity: 'info',
        message: `Hero "${hero.name}" has no skill data yet`,
        heroId: hero.id,
      });
    }

    // Synergy reference check
    if (hero.synergies) {
      for (const syn of hero.synergies) {
        if (!heroesById[syn.heroId]) {
          issues.push({
            severity: 'error',
            message: `Hero "${hero.name}" has synergy referencing unknown hero ID: "${syn.heroId}"`,
            heroId: hero.id,
          });
        }
      }
    }

    // Counter reference check
    if (hero.counters) {
      for (const cnt of hero.counters) {
        if (!heroesById[cnt.heroId]) {
          issues.push({
            severity: 'error',
            message: `Hero "${hero.name}" has counter referencing unknown hero ID: "${cnt.heroId}"`,
            heroId: hero.id,
          });
        }
      }
    }
  }

  // Meta rating reference checks
  for (const rating of metaRatings) {
    if (!heroesById[rating.heroId]) {
      issues.push({
        severity: 'error',
        message: `Meta rating references unknown hero ID: "${rating.heroId}"`,
      });
    }
    if (!gameModesById[rating.modeId]) {
      issues.push({
        severity: 'error',
        message: `Meta rating references unknown game mode ID: "${rating.modeId}"`,
      });
    }
  }

  const errors = issues.filter((i) => i.severity === 'error').length;
  const warnings = issues.filter((i) => i.severity === 'warning').length;
  const infos = issues.filter((i) => i.severity === 'info').length;

  return {
    valid: errors === 0,
    errors,
    warnings,
    infos,
    issues,
  };
}
