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
  { id: 'legendary', label: 'Legendary', shortLabel: 'L', order: 2 },
  { id: 'legendary_plus', label: 'Legendary+', shortLabel: 'L+', order: 3 },
  { id: 'mythic', label: 'Mythic', shortLabel: 'M', order: 4 },
  { id: 'mythic_plus', label: 'Mythic+', shortLabel: 'M+', order: 5 },
  { id: 'ascended', label: 'Ascended', shortLabel: 'A', order: 6 },
  { id: 'ascended_1', label: 'Ascended +1', shortLabel: 'A+1', order: 7 },
  { id: 'ascended_2', label: 'Ascended +2', shortLabel: 'A+2', order: 8 },
  { id: 'ascended_3', label: 'Ascended +3', shortLabel: 'A+3', order: 9 },
  { id: 'ascended_4', label: 'Ascended +4', shortLabel: 'A+4', order: 10 },
  { id: 'ascended_5', label: 'Ascended +5', shortLabel: 'A+5', order: 11 },
];

export const ascensionTiersById: Record<AscensionTier, AscensionTierInfo> =
  ascensionTiers.reduce(
    (acc, t) => {
      acc[t.id] = t;
      return acc;
    },
    {} as Record<AscensionTier, AscensionTierInfo>
  );

export const DEFAULT_ASCENSION: AscensionTier = 'elite';

/**
 * Maximum hero level is not hard-capped here because the game's
 * level cap can change with updates. We use a generous sanity
 * bound (9999) purely to reject obviously invalid input, not to
 * model the actual game cap.
 */
export const MAX_LEVEL_SANITY = 9999;
