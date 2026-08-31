import type { Hero } from '@/types';
import { heroesById } from '@/data/heroes';

/**
 * List of hero IDs with real static portraits in /public/heroes/{id}.png
 * Verified against downloaded game assets.
 */
export const AVAILABLE_HERO_PORTRAITS: Set<string> = new Set([
  'aliceth',
  'alna',
  'alsa',
  'antandra',
  'arden',
  'atalanta',
  'athalia',
  'aurora',
  'cecia',
]);

export interface HeroImageData {
  heroId: string;
  name: string;
  primaryUrl: string;
  altText: string;
  isRealAsset: boolean;
}

/**
 * Returns structured portrait image URLs for a given hero ID.
 * Resolves to the local static asset /heroes/{heroId}.png if present.
 * Returns null if the hero is unreleased or has no asset available.
 */
export function getHeroImageData(heroId: string): HeroImageData | null {
  const normalizedId = heroId?.toLowerCase().trim();
  if (!normalizedId) return null;

  const hero: Hero | undefined = heroesById[normalizedId];
  const name = hero?.name ?? normalizedId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const hasAsset = AVAILABLE_HERO_PORTRAITS.has(normalizedId);
  if (!hasAsset) {
    return null;
  }

  return {
    heroId: normalizedId,
    name,
    primaryUrl: `/heroes/${normalizedId}.png`,
    altText: `${name} portrait`,
    isRealAsset: true,
  };
}

/**
 * Validates whether a hero ID has a real static portrait file.
 */
export function hasHeroImage(heroId: string): boolean {
  return AVAILABLE_HERO_PORTRAITS.has(heroId?.toLowerCase().trim());
}

