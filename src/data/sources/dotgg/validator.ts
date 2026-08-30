/**
 * DotGG API response validator.
 *
 * Validates the structure of the JSON returned by
 * GET https://api.dotgg.gg/cgfw/getcharacters?game=afk-journey
 *
 * Does NOT trust external JSON. Validates:
 *   - top-level is an array
 *   - each entry is an object with required fields
 *   - hero identity fields (name, url/slug)
 *   - tier values are from the known set
 *   - skill structures are arrays
 * Tolerant of optional fields (tiers, tiersEval may be absent).
 */

import { VALID_DOTGG_TIERS } from './mapping';

export interface DotGGHeroRaw {
  id: string;
  name: string;
  title?: string;
  description?: string;
  url: string;
  slug?: string;
  icon?: string;
  image?: string;
  unit_type?: string;
  damage_type?: string;
  is_melee?: string;
  race?: string;
  job?: string;
  gender?: string;
  rarity?: string;
  tag_id?: string;
  unit_job?: string;
  skills?: unknown;
  hasBigImage?: string;
  tiers?: Record<string, string>;
  tiersEval?: Record<string, string>;
}

export interface ValidationResult {
  valid: boolean;
  heroes: DotGGHeroRaw[];
  errors: string[];
  warnings: string[];
  rejected: number;
  accepted: number;
}

export function validateDotGGResponse(data: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const heroes: DotGGHeroRaw[] = [];
  let rejected = 0;

  if (!Array.isArray(data)) {
    return {
      valid: false,
      heroes: [],
      errors: ['Top-level response is not an array'],
      warnings: [],
      rejected: 0,
      accepted: 0,
    };
  }

  for (let i = 0; i < data.length; i++) {
    const entry = data[i];

    if (!entry || typeof entry !== 'object') {
      rejected++;
      errors.push(`Entry ${i}: not an object`);
      continue;
    }

    const hero = entry as Record<string, unknown>;

    // Required fields: name, url (or slug)
    if (typeof hero.name !== 'string' || hero.name.length === 0) {
      rejected++;
      errors.push(`Entry ${i}: missing or invalid "name"`);
      continue;
    }

    const url = hero.url;
    const slug = hero.slug;
    if (typeof url !== 'string' && typeof slug !== 'string') {
      rejected++;
      errors.push(`Entry ${i} (${hero.name}): missing both "url" and "slug"`);
      continue;
    }

    // Validate tiers if present
    if (hero.tiers !== undefined && hero.tiers !== null) {
      if (typeof hero.tiers !== 'object') {
        warnings.push(`Entry ${i} (${hero.name}): "tiers" is not an object — ignoring`);
        hero.tiers = undefined;
      } else {
        const tiers = hero.tiers as Record<string, unknown>;
        for (const [mode, tier] of Object.entries(tiers)) {
          if (typeof tier !== 'string' || !VALID_DOTGG_TIERS.has(tier.toUpperCase())) {
            warnings.push(`Entry ${i} (${hero.name}): invalid tier "${tier}" for mode "${mode}" — ignoring`);
            delete tiers[mode];
          }
        }
      }
    }

    // Validate skills if present
    if (hero.skills !== undefined && hero.skills !== null) {
      if (!Array.isArray(hero.skills)) {
        warnings.push(`Entry ${i} (${hero.name}): "skills" is not an array — ignoring`);
        hero.skills = undefined;
      }
    }

    heroes.push(hero as unknown as DotGGHeroRaw);
  }

  return {
    valid: errors.length === 0,
    heroes,
    errors,
    warnings,
    rejected,
    accepted: heroes.length,
  };
}
