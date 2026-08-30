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
  'baelran',
  'berial',
  'bonnie',
  'brutus',
  'bryon',
  'callan',
  'carolina',
  'cassadee',
  'cecia',
  'chippy',
  'contess',
  'cryonaia',
  'cyran',
  'daimon',
  'damian',
  'dionel',
  'dunlingr',
  'eironn',
  'elijah_lailah',
  'evie',
  'faramor',
  'fay',
  'florabelle',
  'frieren',
  'galahad',
  'gerda',
  'granny_dahnie',
  'gunnar',
  'gwyneth',
  'hammie',
  'harak',
  'hepler',
  'hewynn',
  'himmel',
  'hodgkin',
  'hugin',
  'igor',
  'indris',
  'isabella',
  'kafra',
  'kazim',
  'koko',
  'kordan',
  'korin',
  'kruger',
  'kulu',
  'laios',
  'lamentis',
  'lenya',
  'lily_may',
  'lorsan',
  'lucca',
  'lucius',
  'lucy',
  'ludovic',
  'lumont',
  'lyca',
  'marcille',
  'marilee',
  'mehira',
  'mikola',
  'mirael',
  'nara',
  'natsu',
  'nazrik',
  'nerion',
  'niru',
  'odie',
  'orion',
  'pandora',
  'pang',
  'parisa',
  'peggy',
  'perseus',
  'phraesto',
  'pippa',
  'ravion',
  'reinier',
  'rhys',
  'rowan',
  'saida',
  'salazer',
  'satrana',
  'scarlita',
  'seth',
  'shadewing',
  'shakir',
  'shemira',
  'silven',
  'silvina',
  'sinbad',
  'smokey_meerky',
  'solise',
  'sonja',
  'soren',
  'sylphira',
  'talene',
  'tasi',
  'temesia',
  'thador',
  'thoran',
  'tilaya',
  'ulmus',
  'vala',
  'valen',
  'valka',
  'velara',
  'viperian',
  'walker',
  'zandrok',
  'zanie',
  'zorya',
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

