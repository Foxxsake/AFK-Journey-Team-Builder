/**
 * DotGG API field mapping — maps DotGG's enum values to our
 * canonical types.
 *
 * Based on actual API response analysis (2026-08-27):
 *
 * DotGG race values: '1'-'6'
 *   1 = Lightbearer, 2 = Wilder, 3 = Mauler, 4 = Graveborn,
 *   5 = Celestial, 6 = Hypogean
 *
 * DotGG job values: '1'-'6'
 *   1 = Tank, 2 = Warrior, 3 = Mage, 4 = Support,
 *   5 = Marksman, 6 = Rogue
 *
 * DotGG rarity values: '1','2','3'
 *   1 = S-Level, 2 = A-Level, 3 = Rare
 *
 * DotGG damage_type: 'AD' = physical, 'AP' = magic
 *
 * DotGG tier keys: 'dream', 'primal', 'pvp', 'stage'
 *   dream  → dream_realm
 *   pvp    → arena (general PvP, not supreme arena specifically)
 *   stage  → campaign (PvE story stages)
 *   primal → (no direct match in our mode list — stored but not mapped)
 */

import type { FactionId, HeroClass, HeroRarity, DamageType, GameModeId } from '@/types';

export const DOTGG_RACE_MAP: Record<string, FactionId> = {
  '1': 'lightbearer',
  '2': 'wilder',
  '3': 'mauler',
  '4': 'graveborn',
  '5': 'celestial',
  '6': 'hypogean',
};

export const DOTGG_JOB_MAP: Record<string, HeroClass> = {
  '1': 'tank',
  '2': 'warrior',
  '3': 'mage',
  '4': 'support',
  '5': 'marksman',
  '6': 'rogue',
};

export const DOTGG_RARITY_MAP: Record<string, HeroRarity> = {
  '1': 's_level',
  '2': 'a_level',
  '3': 'rare_level',
};

export const DOTGG_DAMAGE_MAP: Record<string, DamageType> = {
  AD: 'physical',
  AP: 'magic',
};

/**
 * DotGG tier mode keys → our canonical GameModeId.
 * Only map modes where the interpretation is clear.
 * 'primal' is NOT mapped — it refers to a mode we don't have.
 */
export const DOTGG_TIER_MODE_MAP: Record<string, GameModeId> = {
  dream: 'dream_realm',
  pvp: 'arena',
  stage: 'campaign',
};

/** DotGG modes that don't map to any of our game modes. */
export const DOTGG_UNMAPPED_MODES = ['primal'];

/**
 * DotGG base image URL — images are served from this prefix.
 * We store the relative path and construct the full URL at display time.
 * We do NOT download or rehost images.
 */
export const DOTGG_IMAGE_BASE = 'https://api.dotgg.gg/images/';

export function buildDotggImageUrl(relativePath: string | undefined): string | undefined {
  if (!relativePath) return undefined;
  return DOTGG_IMAGE_BASE + relativePath;
}

/**
 * Valid tier values that DotGG may return.
 * We accept these and reject anything else.
 */
export const VALID_DOTGG_TIERS = new Set(['S+', 'S', 'A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D']);
