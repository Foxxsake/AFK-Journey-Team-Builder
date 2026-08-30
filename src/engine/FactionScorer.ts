import type { PlayerHero, FactionId } from '@/types';

/**
 * Calculates faction-related scoring.
 *
 * IMPORTANT: AFK Journey does have faction bonuses in gameplay,
 * but the exact bonus rules are not yet verified in the dataset.
 *
 * Until verified faction bonus rules are added to the game data,
 * this scorer provides a NEUTRAL baseline (50) with a minor
 * diversity recognition — it does NOT invent specific faction
 * bonus values.
 */

export interface FactionResult {
  score: number;
  notes: string[];
}

export function calculateFactionScore(heroes: PlayerHero[]): FactionResult {
  if (heroes.length === 0) return { score: 50, notes: [] };

  const notes: string[] = [];
  const factionCounts = new Map<FactionId, number>();

  for (const hero of heroes) {
    factionCounts.set(hero.faction, (factionCounts.get(hero.faction) ?? 0) + 1);
  }

  let score = 50; // neutral baseline

  // Recognise faction concentration (3+ same faction) without
  // inventing specific bonus values. This is a mild signal.
  for (const [, count] of factionCounts) {
    if (count >= 3) {
      score += 5;
      notes.push('Team has 3+ heroes from the same faction.');
      break;
    }
  }

  // Note: exact faction bonus rules are not yet verified in the dataset.
  if (notes.length === 0) {
    notes.push('Faction bonus rules not yet verified — faction scoring is neutral.');
  }

  return { score: Math.min(100, Math.max(0, score)), notes };
}
