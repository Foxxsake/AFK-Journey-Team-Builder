import type { PlayerHero, Hero, RosterHero, FactionId, HeroRole } from '@/types';
import { heroes, heroesById } from '@/data/heroes';

/**
 * Combines base hero game data with player roster data.
 * This is the primary input to the future team-building engine.
 */
export function getPlayerHero(
  heroId: string,
  roster: RosterHero[]
): PlayerHero | null {
  const hero = heroesById[heroId];
  if (!hero) return null;
  const rosterEntry = roster.find((r) => r.heroId === heroId);
  if (!rosterEntry) return null;
  return { ...hero, roster: rosterEntry };
}

export function getOwnedHeroes(roster: RosterHero[]): PlayerHero[] {
  return roster
    .filter((r) => r.owned && heroesById[r.heroId])
    .map((r) => ({ ...heroesById[r.heroId], roster: r }));
}

export function getHeroesByFaction(roster: RosterHero[], factionId: FactionId): PlayerHero[] {
  return getOwnedHeroes(roster).filter((h) => h.faction === factionId);
}

export function getHeroesByRole(roster: RosterHero[], role: HeroRole): PlayerHero[] {
  return getOwnedHeroes(roster).filter((h) => h.roles.includes(role));
}

/**
 * Returns only heroes the player owns, together with their progression.
 * The eventual optimiser should use this — it never needs to inspect
 * UI components to find the player's roster.
 */
export function getAvailableHeroesForTeamBuilding(roster: RosterHero[]): PlayerHero[] {
  return getOwnedHeroes(roster);
}

export function getHighestLevel(roster: RosterHero[]): number {
  const owned = roster.filter((r) => r.owned);
  if (owned.length === 0) return 0;
  return Math.max(...owned.map((r) => r.level));
}

export function getFactionDistribution(roster: RosterHero[]): Record<string, number> {
  const dist: Record<string, number> = {};
  for (const entry of roster) {
    if (!entry.owned) continue;
    const hero = heroesById[entry.heroId];
    if (!hero) continue;
    dist[hero.faction] = (dist[hero.faction] ?? 0) + 1;
  }
  return dist;
}

export function getAllHeroes(): Hero[] {
  return heroes;
}
