import type { AscensionTier } from '@/types';

export interface AscensionTierInfo {
  id: AscensionTier;
  label: string;
  shortLabel: string;
  order: number;
}

/**
 * AFK Journey ascension progression tiers.
 *
 * The exact tier names and order are based on publicly available
 * AFK Journey game information. If the game's progression system
 * changes, update this single file — the rest of the app reads
 * from this structure.
 */
export const ascensionTiers: AscensionTierInfo[] = [
  { id: 'elite', label: 'Elite', shortLabel: 'E', order: 0 },
  { id: 'elite_plus', label: 'Elite+', shortLabel: 'E+', order: 1 },
  { id: 'epic', label: 'Epic', shortLabel: 'Ep', order: 2 },
  { id: 'epic_plus', label: 'Epic+', shortLabel: 'Ep+', order: 3 },
  { id: 'legendary', label: 'Legendary', shortLabel: 'L', order: 4 },
  { id: 'legendary_plus', label: 'Legendary+', shortLabel: 'L+', order: 5 },
  { id: 'mythic', label: 'Mythic', shortLabel: 'M', order: 6 },
  { id: 'mythic_plus', label: 'Mythic+', shortLabel: 'M+', order: 7 },
  { id: 'supreme', label: 'Supreme', shortLabel: 'S', order: 8 },
  { id: 'supreme_plus', label: 'Supreme+', shortLabel: 'S+', order: 9 },
  { id: 'paragon_1', label: 'Paragon 1', shortLabel: 'P1', order: 10 },
  { id: 'paragon_2', label: 'Paragon 2', shortLabel: 'P2', order: 11 },
  { id: 'paragon_3', label: 'Paragon 3', shortLabel: 'P3', order: 12 },
  { id: 'paragon_4', label: 'Paragon 4', shortLabel: 'P4', order: 13 },
];

// Mapping for legacy tiers to their canonical equivalent
const legacyTierMap: Partial<Record<AscensionTier, AscensionTierInfo>> = {
  ascended: { id: 'ascended', label: 'Supreme', shortLabel: 'S', order: 8 },
  ascended_1: { id: 'ascended_1', label: 'Supreme+', shortLabel: 'S+', order: 9 },
  ascended_2: { id: 'ascended_2', label: 'Paragon 1', shortLabel: 'P1', order: 10 },
  ascended_3: { id: 'ascended_3', label: 'Paragon 2', shortLabel: 'P2', order: 11 },
  ascended_4: { id: 'ascended_4', label: 'Paragon 3', shortLabel: 'P3', order: 12 },
  ascended_5: { id: 'ascended_5', label: 'Paragon 4', shortLabel: 'P4', order: 13 },
};

export const ascensionTiersById: Record<AscensionTier, AscensionTierInfo> =
  ascensionTiers.reduce(
    (acc, t) => {
      acc[t.id] = t;
      return acc;
    },
    { ...legacyTierMap } as Record<AscensionTier, AscensionTierInfo>
  );

export const DEFAULT_ASCENSION: AscensionTier = 'elite';

/**
 * Maximum hero level is not hard-capped here because the game's
 * level cap can change with updates. We use a generous sanity
 * bound (9999) purely to reject obviously invalid input, not to
 * model the actual game cap.
 */
export const MAX_LEVEL_SANITY = 9999;
