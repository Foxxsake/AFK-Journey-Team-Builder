import { describe, it, expect } from 'vitest';
import type { PlayerHero, GameMode, RosterHero } from '@/types';
import { optimizeTeam, optimizeMultipleTeams, TEAM_OPTIMIZER_CONFIG } from '../index';
import { calculateProgressionScore } from '../ProgressionScorer';
import { calculateHeroStrength } from '../HeroStrengthScorer';
import { calculateRoleBalance } from '../RoleScorer';
import { calculateSynergy } from '../SynergyScorer';
import type { OptimizerInput } from '../types';

function makeRosterHero(heroId: string, level: number, ascension: RosterHero['progression']['ascension'] = 'mythic'): RosterHero {
  return {
    heroId,
    owned: true,
    level,
    progression: { ascension },
    addedAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

function makePlayerHero(
  id: string,
  name: string,
  faction: PlayerHero['faction'],
  heroClass: PlayerHero['class'],
  rarity: PlayerHero['rarity'],
  roster: RosterHero
): PlayerHero {
  return {
    id,
    name,
    faction,
    class: heroClass,
    roles: [],
    rarity,
    damageType: 'physical',
    range: 1,
    sources: [{ sourceName: 'test', confidence: 'high' }],
    lastUpdated: '2026-01-01',
    roster,
  };
}

const testMode: GameMode = {
  id: 'test_mode',
  name: 'Test Mode',
  description: 'Test',
  teamSize: 3,
  formationRequired: false,
};

function makeTestHeroes(count: number): PlayerHero[] {
  const factions: PlayerHero['faction'][] = ['lightbearer', 'mauler', 'wilder', 'graveborn', 'celestial', 'hypogean'];
  const classes: PlayerHero['class'][] = ['warrior', 'tank', 'mage', 'marksman', 'rogue', 'support'];
  const rarities: PlayerHero['rarity'][] = ['s_level', 'a_level', 'rare_level'];

  return Array.from({ length: count }, (_, i) =>
    makePlayerHero(
      `hero_${i}`,
      `Hero ${i}`,
      factions[i % factions.length],
      classes[i % classes.length],
      rarities[i % rarities.length],
      makeRosterHero(`hero_${i}`, 100 + i * 10)
    )
  );
}

describe('Team Optimizer', () => {
  describe('Ownership', () => {
    it('only uses heroes from the provided pool', () => {
      const heroes = makeTestHeroes(6);
      const input: OptimizerInput = {
        playerHeroes: heroes,
        mode: testMode,
        teamCount: 1,
        avoidHeroReuse: true,
      };
      const result = optimizeTeam(input);
      expect(result.bestTeam).not.toBeNull();
      const teamHeroIds = new Set(result.bestTeam!.heroIds);
      for (const id of teamHeroIds) {
        expect(heroes.some((h) => h.id === id)).toBe(true);
      }
    });
  });

  describe('Team size', () => {
    it('produces teams of the correct size', () => {
      const heroes = makeTestHeroes(8);
      const input: OptimizerInput = {
        playerHeroes: heroes,
        mode: testMode,
        teamCount: 1,
        avoidHeroReuse: true,
      };
      const result = optimizeTeam(input);
      expect(result.bestTeam).not.toBeNull();
      expect(result.bestTeam!.heroIds.length).toBe(testMode.teamSize);
    });
  });

  describe('Duplicate prevention', () => {
    it('does not contain the same hero twice in a team', () => {
      const heroes = makeTestHeroes(6);
      const input: OptimizerInput = {
        playerHeroes: heroes,
        mode: testMode,
        teamCount: 1,
        avoidHeroReuse: true,
      };
      const result = optimizeTeam(input);
      expect(result.bestTeam).not.toBeNull();
      const ids = result.bestTeam!.heroIds;
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });
  });

  describe('Insufficient heroes', () => {
    it('returns warnings when not enough heroes', () => {
      const heroes = makeTestHeroes(2);
      const input: OptimizerInput = {
        playerHeroes: heroes,
        mode: testMode,
        teamCount: 1,
        avoidHeroReuse: true,
      };
      const result = optimizeTeam(input);
      expect(result.teams.length).toBe(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Determinism', () => {
    it('returns the same result for identical input', () => {
      const heroes = makeTestHeroes(7);
      const input: OptimizerInput = {
        playerHeroes: heroes,
        mode: testMode,
        teamCount: 1,
        avoidHeroReuse: true,
      };
      const result1 = optimizeTeam(input);
      const result2 = optimizeTeam(input);
      expect(result1.bestTeam?.heroIds).toEqual(result2.bestTeam?.heroIds);
      expect(result1.bestTeam?.score).toBe(result2.bestTeam?.score);
    });
  });

  describe('Progression', () => {
    it('higher progression produces a higher score', () => {
      const lowHero = makePlayerHero('a', 'A', 'lightbearer', 'warrior', 's_level', makeRosterHero('a', 10, 'elite'));
      const highHero = makePlayerHero('a', 'A', 'lightbearer', 'warrior', 's_level', makeRosterHero('a', 240, 'ascended_5'));

      const lowScore = calculateProgressionScore(lowHero);
      const highScore = calculateProgressionScore(highHero);
      expect(highScore).toBeGreaterThan(lowScore);
    });
  });

  describe('Mode differences', () => {
    it('different modes can produce different scores', () => {
      const heroes = makeTestHeroes(6);
      const pvpMode: GameMode = { ...testMode, id: 'arena' };
      const pveMode: GameMode = { ...testMode, id: 'dream_realm' };

      const input1: OptimizerInput = { playerHeroes: heroes, mode: pvpMode, teamCount: 1, avoidHeroReuse: true };
      const input2: OptimizerInput = { playerHeroes: heroes, mode: pveMode, teamCount: 1, avoidHeroReuse: true };

      const r1 = optimizeTeam(input1);
      const r2 = optimizeTeam(input2);
      // Scores may or may not differ depending on team composition,
      // but both should produce valid results
      expect(r1.bestTeam).not.toBeNull();
      expect(r2.bestTeam).not.toBeNull();
    });
  });

  describe('Synergy', () => {
    it('returns neutral score when no synergy rules exist', () => {
      const heroes = makeTestHeroes(3);
      const { score } = calculateSynergy(heroes, 'test_mode');
      expect(score).toBe(50);
    });

    it('applies positive synergy rules when provided', () => {
      const heroes = makeTestHeroes(3);
      const rules = [{
        id: 'test_synergy',
        heroIds: ['hero_0', 'hero_1'],
        type: 'positive' as const,
        score: 20,
        reason: 'Test synergy',
        confidence: 'high' as const,
      }];
      const { score, matchedRules } = calculateSynergy(heroes, 'test_mode', rules);
      expect(matchedRules.length).toBeGreaterThan(0);
      expect(score).toBeGreaterThan(50);
    });
  });

  describe('Role balance', () => {
    it('scores higher with tank and support classes', () => {
      const balanced: PlayerHero[] = [
        makePlayerHero('t', 'T', 'lightbearer', 'tank', 's_level', makeRosterHero('t', 100)),
        makePlayerHero('s', 'S', 'wilder', 'support', 's_level', makeRosterHero('s', 100)),
        makePlayerHero('d', 'D', 'mauler', 'mage', 's_level', makeRosterHero('d', 100)),
      ];
      const unbalanced: PlayerHero[] = [
        makePlayerHero('d1', 'D1', 'mauler', 'mage', 's_level', makeRosterHero('d1', 100)),
        makePlayerHero('d2', 'D2', 'mauler', 'mage', 's_level', makeRosterHero('d2', 100)),
        makePlayerHero('d3', 'D3', 'mauler', 'mage', 's_level', makeRosterHero('d3', 100)),
      ];
      expect(calculateRoleBalance(balanced)).toBeGreaterThan(calculateRoleBalance(unbalanced));
    });
  });

  describe('Hero strength fallback', () => {
    it('uses rarity fallback when no meta ratings exist', () => {
      const hero = makePlayerHero('a', 'A', 'lightbearer', 'warrior', 's_level', makeRosterHero('a', 100));
      const score = calculateHeroStrength(hero, testMode);
      expect(score).toBe(80); // s_level base
    });
  });

  describe('Invalid data handling', () => {
    it('does not crash with empty hero list', () => {
      const input: OptimizerInput = {
        playerHeroes: [],
        mode: testMode,
        teamCount: 1,
        avoidHeroReuse: true,
      };
      const result = optimizeTeam(input);
      expect(result.teams.length).toBe(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Multi-team', () => {
    it('respects avoid hero reuse', () => {
      const heroes = makeTestHeroes(9);
      const input: OptimizerInput = {
        playerHeroes: heroes,
        mode: testMode,
        teamCount: 3,
        avoidHeroReuse: true,
      };
      const result = optimizeMultipleTeams(input);
      expect(result.teams.length).toBe(3);

      // Check no hero is reused
      const allHeroIds: string[] = [];
      for (const team of result.teams) {
        allHeroIds.push(...team.heroIds);
      }
      const uniqueIds = new Set(allHeroIds);
      expect(allHeroIds.length).toBe(uniqueIds.size);
    });

    it('allows hero reuse when avoidHeroReuse is false', () => {
      const heroes = makeTestHeroes(4);
      const input: OptimizerInput = {
        playerHeroes: heroes,
        mode: testMode,
        teamCount: 2,
        avoidHeroReuse: false,
      };
      const result = optimizeMultipleTeams(input);
      expect(result.teams.length).toBe(2);
      // Reuse is allowed — may or may not reuse, but should not fail
    });

    it('reduces team count when not enough unique heroes', () => {
      const heroes = makeTestHeroes(5);
      const input: OptimizerInput = {
        playerHeroes: heroes,
        mode: testMode,
        teamCount: 3,
        avoidHeroReuse: true,
      };
      const result = optimizeMultipleTeams(input);
      // 5 heroes / 3 per team = 1 team max
      expect(result.teams.length).toBeLessThanOrEqual(1);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('warns about reduced team count in the warnings', () => {
      const heroes = makeTestHeroes(5);
      const input: OptimizerInput = {
        playerHeroes: heroes,
        mode: testMode,
        teamCount: 3,
        avoidHeroReuse: true,
      };
      const result = optimizeMultipleTeams(input);
      // Should mention the reduction
      const hasReductionWarning = result.warnings.some(w =>
        w.includes('Reducing') || w.includes('requires') || w.includes('unique heroes')
      );
      expect(hasReductionWarning).toBe(true);
    });
  });

  describe('Multi-team edge cases', () => {
    it('handles too few heroes for one team', () => {
      const heroes = makeTestHeroes(2);
      const input: OptimizerInput = {
        playerHeroes: heroes,
        mode: testMode,
        teamCount: 1,
        avoidHeroReuse: true,
      };
      const result = optimizeMultipleTeams(input);
      expect(result.teams.length).toBe(0);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.bestTeam).toBeNull();
    });

    it('handles exactly enough heroes for one team', () => {
      const heroes = makeTestHeroes(3);
      const input: OptimizerInput = {
        playerHeroes: heroes,
        mode: testMode,
        teamCount: 1,
        avoidHeroReuse: true,
      };
      const result = optimizeMultipleTeams(input);
      expect(result.teams.length).toBe(1);
      expect(result.teams[0].heroIds.length).toBe(3);
    });

    it('handles exactly enough heroes for multiple teams', () => {
      const heroes = makeTestHeroes(9);
      const input: OptimizerInput = {
        playerHeroes: heroes,
        mode: testMode,
        teamCount: 3,
        avoidHeroReuse: true,
      };
      const result = optimizeMultipleTeams(input);
      expect(result.teams.length).toBe(3);
      const allIds = result.teams.flatMap(t => t.heroIds);
      expect(new Set(allIds).size).toBe(allIds.length);
    });

    it('handles not enough unique heroes for requested teams', () => {
      const heroes = makeTestHeroes(7);
      const input: OptimizerInput = {
        playerHeroes: heroes,
        mode: testMode,
        teamCount: 3,
        avoidHeroReuse: true,
      };
      const result = optimizeMultipleTeams(input);
      // 7 / 3 = 2 teams max
      expect(result.teams.length).toBeLessThanOrEqual(2);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('handles hero reuse enabled — no crash, may reuse', () => {
      const heroes = makeTestHeroes(4);
      const input: OptimizerInput = {
        playerHeroes: heroes,
        mode: testMode,
        teamCount: 3,
        avoidHeroReuse: false,
      };
      const result = optimizeMultipleTeams(input);
      expect(result.teams.length).toBe(3);
    });

    it('handles hero reuse disabled — no hero in multiple teams', () => {
      const heroes = makeTestHeroes(9);
      const input: OptimizerInput = {
        playerHeroes: heroes,
        mode: testMode,
        teamCount: 3,
        avoidHeroReuse: true,
      };
      const result = optimizeMultipleTeams(input);
      const allIds = result.teams.flatMap(t => t.heroIds);
      expect(new Set(allIds).size).toBe(allIds.length);
    });

    it('handles empty roster gracefully', () => {
      const input: OptimizerInput = {
        playerHeroes: [],
        mode: testMode,
        teamCount: 1,
        avoidHeroReuse: true,
      };
      const result = optimizeMultipleTeams(input);
      expect(result.teams.length).toBe(0);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.bestTeam).toBeNull();
    });

    it('never creates an invalid team (wrong size) when reducing', () => {
      const heroes = makeTestHeroes(5);
      const input: OptimizerInput = {
        playerHeroes: heroes,
        mode: testMode,
        teamCount: 3,
        avoidHeroReuse: true,
      };
      const result = optimizeMultipleTeams(input);
      for (const team of result.teams) {
        expect(team.heroIds.length).toBe(testMode.teamSize);
      }
    });

    it('never duplicates a hero when reuse is disabled', () => {
      const heroes = makeTestHeroes(5);
      const input: OptimizerInput = {
        playerHeroes: heroes,
        mode: testMode,
        teamCount: 3,
        avoidHeroReuse: true,
      };
      const result = optimizeMultipleTeams(input);
      const allIds = result.teams.flatMap(t => t.heroIds);
      expect(new Set(allIds).size).toBe(allIds.length);
    });

    it('is deterministic for same input', () => {
      const heroes = makeTestHeroes(9);
      const input: OptimizerInput = {
        playerHeroes: heroes,
        mode: testMode,
        teamCount: 3,
        avoidHeroReuse: true,
      };
      const r1 = optimizeMultipleTeams(input);
      const r2 = optimizeMultipleTeams(input);
      expect(r1.teams.length).toBe(r2.teams.length);
      for (let i = 0; i < r1.teams.length; i++) {
        expect(r1.teams[i].heroIds).toEqual(r2.teams[i].heroIds);
        expect(r1.teams[i].score).toBe(r2.teams[i].score);
      }
    });
  });

  describe('Scoring breakdown', () => {
    it('produces a breakdown with all components', () => {
      const heroes = makeTestHeroes(6);
      const input: OptimizerInput = {
        playerHeroes: heroes,
        mode: testMode,
        teamCount: 1,
        avoidHeroReuse: true,
      };
      const result = optimizeTeam(input);
      expect(result.bestTeam).not.toBeNull();
      const b = result.bestTeam!.breakdown;
      expect(b).toHaveProperty('heroStrength');
      expect(b).toHaveProperty('progression');
      expect(b).toHaveProperty('roleBalance');
      expect(b).toHaveProperty('synergy');
      expect(b).toHaveProperty('modeFit');
      expect(b).toHaveProperty('faction');
      expect(b).toHaveProperty('confidence');
    });
  });
});
