import type { PlayerHero, HeroRole, HeroClass } from '@/types';

/**
 * Maps a hero's class to the roles it typically fulfills.
 *
 * This is a structural mapping based on the class system defined
 * in the game data — not an invented assignment. If a hero has
 * explicitly assigned roles in the dataset, those take priority.
 */
const CLASS_ROLE_HINTS: Record<HeroClass, HeroRole[]> = {
  warrior: ['damage'],
  tank: ['tank'],
  marksman: ['damage'],
  mage: ['damage'],
  rogue: ['damage'],
  support: ['support'],
};

/**
 * Calculates role balance for a team.
 *
 * If the dataset has explicit role assignments for heroes, those
 * are used. If not (as is currently the case), class-based hints
 * are used as a transparent fallback.
 *
 * The score rewards having at least one frontline (tank) and
 * spread of roles/classes. It does NOT enforce arbitrary
 * requirements — it simply measures coverage.
 */
export function calculateRoleBalance(heroes: PlayerHero[]): number {
  if (heroes.length === 0) return 0;

  // Collect all roles: explicit first, then class-based hint
  const roleSet = new Set<HeroRole>();
  const classSet = new Set<HeroClass>();

  for (const hero of heroes) {
    classSet.add(hero.class);
    if (hero.roles && hero.roles.length > 0) {
      hero.roles.forEach((r) => roleSet.add(r));
    } else {
      const hints = CLASS_ROLE_HINTS[hero.class];
      if (hints) hints.forEach((r) => roleSet.add(r));
    }
  }

  let score = 0;

  // Having a tank (frontline) is valuable — 30 points
  if (roleSet.has('tank')) {
    score += 30;
  }

  // Having support or healer — 25 points
  if (roleSet.has('support') || roleSet.has('healer')) {
    score += 25;
  }

  // Having damage — 20 points
  if (roleSet.has('damage')) {
    score += 20;
  }

  // Class diversity — up to 25 points based on unique classes
  const classDiversity = Math.min(1, classSet.size / heroes.length);
  score += classDiversity * 25;

  return Math.min(100, score);
}
