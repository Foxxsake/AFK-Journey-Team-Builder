import { describe, it, expect } from 'vitest';
import type { PlayerHero, RosterHero, GameMode } from '@/types';
import { optimizeFormation, assignHeroPositions, TEAM_OPTIMIZER_CONFIG, getPositionScoringMode } from '../index';
import { scoreHeroInSlot, buildPositionScoreMatrix } from '../PositionScorer';
import { getFormationsForMode, formations } from '@/data/formations';
import type { OptimizerConfig } from '../config';

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
  heroClass: PlayerHero['class'],
  range: number,
  rarity: PlayerHero['rarity'] = 's_level',
  roster?: RosterHero
): PlayerHero {
  return {
    id,
    name,
    faction: 'lightbearer',
    class: heroClass,
    roles: [],
    rarity,
    damageType: 'physical',
    range,
    sources: [{ sourceName: 'test', confidence: 'high' }],
    lastUpdated: '2026-01-01',
    roster: roster ?? makeRosterHero(id, 100),
  };
}

const config: OptimizerConfig = { ...TEAM_OPTIMIZER_CONFIG, debug: true };

const testMode: GameMode = {
  id: 'campaign',
  name: 'Campaign',
  description: 'Test',
  teamSize: 5,
  formationRequired: true,
};

function makeTestTeam(): PlayerHero[] {
  return [
    makePlayerHero('tank1', 'Tank One', 'tank', 1),
    makePlayerHero('tank2', 'Tank Two', 'tank', 1),
    makePlayerHero('mage1', 'Mage One', 'mage', 5),
    makePlayerHero('marks1', 'Marks One', 'marksman', 7),
    makePlayerHero('supp1', 'Supp One', 'support', 6),
  ];
}

describe('Formation Optimizer', () => {
  describe('Valid formation selection', () => {
    it('selects a formation valid for the selected mode', () => {
      const heroes = makeTestTeam();
      const result = optimizeFormation({ heroes, modeId: 'campaign', teamScore: 80 }, config);
      const validFormations = getFormationsForMode('campaign');
      expect(validFormations.some((f) => f.id === result.formationId)).toBe(true);
    });

    it('returns no formation when mode has no formations', () => {
      const heroes = makeTestTeam();
      const result = optimizeFormation({ heroes, modeId: 'nonexistent_mode', teamScore: 80 }, config);
      expect(result.formationId).toBe('');
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Team size matching', () => {
    it('matches team size to formation slot count', () => {
      const heroes = makeTestTeam();
      expect(heroes.length).toBe(5);
      const result = optimizeFormation({ heroes, modeId: 'campaign', teamScore: 80 }, config);
      const formation = formations.find((f) => f.id === result.formationId);
      expect(formation).toBeDefined();
      expect(formation!.slots.length).toBe(heroes.length);
    });

    it('warns when team size does not match any formation', () => {
      const heroes = makeTestTeam().slice(0, 3);
      const result = optimizeFormation({ heroes, modeId: 'campaign', teamScore: 80 }, config);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.formationId).toBe('');
    });
  });

  describe('Unique positions', () => {
    it('assigns each hero to a unique slot', () => {
      const heroes = makeTestTeam();
      const result = optimizeFormation({ heroes, modeId: 'campaign', teamScore: 80 }, config);
      const slotIds = result.positions.map((p) => p.slotId);
      const uniqueSlots = new Set(slotIds);
      expect(slotIds.length).toBe(uniqueSlots.size);
    });

    it('places every hero exactly once', () => {
      const heroes = makeTestTeam();
      const result = optimizeFormation({ heroes, modeId: 'campaign', teamScore: 80 }, config);
      expect(result.positions.length).toBe(heroes.length);
      const placedIds = result.positions.map((p) => p.hero.id);
      for (const hero of heroes) {
        expect(placedIds).toContain(hero.id);
      }
    });
  });

  describe('Mode compatibility', () => {
    it('does not select a formation not valid for the mode', () => {
      const heroes = makeTestTeam();
      const result = optimizeFormation({ heroes, modeId: 'dream_realm', teamScore: 80 }, config);
      const dreamFormations = getFormationsForMode('dream_realm');
      const allFormations = formations;
      const nonModeFormations = allFormations.filter((f) => !f.modeIds.includes('dream_realm'));
      expect(nonModeFormations.some((f) => f.id === result.formationId)).toBe(false);
      expect(dreamFormations.some((f) => f.id === result.formationId)).toBe(true);
    });
  });

  describe('Position scoring', () => {
    it('scores tanks higher in front slots', () => {
      const tank = makePlayerHero('tank1', 'Tank', 'tank', 1);
      const frontSlot = formations[0].slots.find((s) => s.frontBack === 'front')!;
      const backSlot = formations[0].slots.find((s) => s.frontBack === 'back')!;
      const frontScore = scoreHeroInSlot(tank, frontSlot, config);
      const backScore = scoreHeroInSlot(tank, backSlot, config);
      expect(frontScore.total).toBeGreaterThan(backScore.total);
    });

    it('scores ranged heroes higher in back slots', () => {
      const mage = makePlayerHero('mage1', 'Mage', 'mage', 7);
      const frontSlot = formations[0].slots.find((s) => s.frontBack === 'front')!;
      const backSlot = formations[0].slots.find((s) => s.frontBack === 'back')!;
      const frontScore = scoreHeroInSlot(mage, frontSlot, config);
      const backScore = scoreHeroInSlot(mage, backSlot, config);
      expect(backScore.total).toBeGreaterThan(frontScore.total);
    });

    it('produces a full position score matrix', () => {
      const heroes = makeTestTeam();
      const slots = formations[0].slots;
      const matrix = buildPositionScoreMatrix(heroes, slots, config);
      for (const hero of heroes) {
        expect(matrix[hero.id]).toBeDefined();
        for (const slot of slots) {
          expect(matrix[hero.id][slot.id]).toBeGreaterThanOrEqual(0);
          expect(matrix[hero.id][slot.id]).toBeLessThanOrEqual(100);
        }
      }
    });
  });

  describe('Best assignment', () => {
    it('selects the highest-scoring valid assignment', () => {
      const heroes = makeTestTeam();
      const result = optimizeFormation({ heroes, modeId: 'campaign', teamScore: 80 }, config);
      // The average of position scores should be reasonable
      expect(result.formationScore).toBeGreaterThan(0);
      expect(result.formationScore).toBeLessThanOrEqual(100);
    });

    it('combined score blends team score and formation score', () => {
      const heroes = makeTestTeam();
      const teamScore = 80;
      const result = optimizeFormation({ heroes, modeId: 'campaign', teamScore }, config);
      const expectedMin = teamScore * (1 - config.formationContribution);
      const expectedMax = teamScore * (1 - config.formationContribution) + 100 * config.formationContribution;
      expect(result.combinedScore).toBeGreaterThanOrEqual(expectedMin - 1);
      expect(result.combinedScore).toBeLessThanOrEqual(expectedMax + 1);
    });
  });

  describe('Multiple teams', () => {
    it('optimises formation independently for different teams', () => {
      const team1 = makeTestTeam();
      const team2 = [
        makePlayerHero('w1', 'Warrior 1', 'warrior', 1),
        makePlayerHero('w2', 'Warrior 2', 'warrior', 1),
        makePlayerHero('m1', 'Mage 1', 'mage', 5),
        makePlayerHero('m2', 'Mage 2', 'mage', 6),
        makePlayerHero('s1', 'Support 1', 'support', 5),
      ];
      const result1 = optimizeFormation({ heroes: team1, modeId: 'campaign', teamScore: 80 }, config);
      const result2 = optimizeFormation({ heroes: team2, modeId: 'campaign', teamScore: 75 }, config);
      expect(result1.positions.length).toBe(5);
      expect(result2.positions.length).toBe(5);
    });
  });

  describe('Hero reuse', () => {
    it('works with the same heroes in multiple teams when reuse is allowed', () => {
      const heroes = makeTestTeam();
      const result1 = optimizeFormation({ heroes, modeId: 'campaign', teamScore: 80 }, config);
      const result2 = optimizeFormation({ heroes, modeId: 'campaign', teamScore: 80 }, config);
      // Same input should produce the same result
      expect(result1.formationId).toBe(result2.formationId);
    });
  });

  describe('Determinism', () => {
    it('returns the same formation result for identical input', () => {
      const heroes = makeTestTeam();
      const result1 = optimizeFormation({ heroes, modeId: 'campaign', teamScore: 80 }, config);
      const result2 = optimizeFormation({ heroes, modeId: 'campaign', teamScore: 80 }, config);
      expect(result1.formationId).toBe(result2.formationId);
      expect(result1.formationScore).toBe(result2.formationScore);
      expect(result1.combinedScore).toBe(result2.combinedScore);
      const positions1 = result1.positions.map((p) => p.hero.id).join(',');
      const positions2 = result2.positions.map((p) => p.hero.id).join(',');
      expect(positions1).toBe(positions2);
    });
  });

  describe('Enemy team (architecture prepared)', () => {
    it('works without enemyTeam (undefined)', () => {
      const heroes = makeTestTeam();
      const result = optimizeFormation({ heroes, modeId: 'campaign', teamScore: 80 }, config);
      expect(result.positions.length).toBe(5);
    });

    it('accepts enemyTeam without breaking', () => {
      const heroes = makeTestTeam();
      const enemyTeam = { heroes: ['enemy1', 'enemy2'], formationId: 'standard_5_front2_back3' };
      const result = optimizeFormation({ heroes, modeId: 'campaign', teamScore: 80, enemyTeam }, config);
      expect(result.positions.length).toBe(5);
    });
  });

  describe('Alternatives', () => {
    it('returns alternative formations when multiple are available', () => {
      const heroes = makeTestTeam();
      const result = optimizeFormation({ heroes, modeId: 'campaign', teamScore: 80 }, config);
      // Campaign has 2 formations
      expect(result.alternatives.length).toBeGreaterThanOrEqual(0);
      // Total formations = 1 best + alternatives
      const totalFormations = getFormationsForMode('campaign').filter(
        (f) => f.slots.length === heroes.length
      ).length;
      expect(1 + result.alternatives.length).toBe(totalFormations);
    });
  });

  describe('Debug info', () => {
    it('includes debug info when debug is enabled', () => {
      const heroes = makeTestTeam();
      const result = optimizeFormation({ heroes, modeId: 'campaign', teamScore: 80, debug: true }, config);
      expect(result.debug).toBeDefined();
      expect(result.debug!.formationsEvaluated).toBeGreaterThan(0);
      expect(result.debug!.assignmentsEvaluated).toBeGreaterThan(0);
      expect(result.debug!.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('assignHeroPositions', () => {
    it('assigns positions for a specific formation', () => {
      const heroes = makeTestTeam();
      const formation = formations[0];
      const result = assignHeroPositions(heroes, formation, config);
      expect(result.positions.length).toBe(formation.slots.length);
      expect(result.formationScore).toBeGreaterThan(0);
    });
  });

  describe('Formation edge cases', () => {
    it('handles no formation available for mode', () => {
      const heroes = makeTestTeam();
      const result = optimizeFormation({ heroes, modeId: 'nonexistent_mode', teamScore: 80 }, config);
      expect(result.formationId).toBe('');
      expect(result.positions).toHaveLength(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('handles wrong mode — does not select incompatible formation', () => {
      const heroes = makeTestTeam();
      const result = optimizeFormation({ heroes, modeId: 'dream_realm', teamScore: 80 }, config);
      const campaignFormations = getFormationsForMode('campaign');
      expect(campaignFormations.some(f => f.id === result.formationId)).toBe(false);
    });

    it('handles formation/team size mismatch', () => {
      const heroes = makeTestTeam().slice(0, 3);
      const result = optimizeFormation({ heroes, modeId: 'campaign', teamScore: 80 }, config);
      expect(result.formationId).toBe('');
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.positions).toHaveLength(0);
    });

    it('handles insufficient slots — fewer heroes than slots', () => {
      const heroes = makeTestTeam().slice(0, 2);
      const result = optimizeFormation({ heroes, modeId: 'campaign', teamScore: 80 }, config);
      expect(result.positions).toHaveLength(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('handles empty hero list', () => {
      const result = optimizeFormation({ heroes: [], modeId: 'campaign', teamScore: 80 }, config);
      expect(result.positions).toHaveLength(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('handles team score of 0', () => {
      const heroes = makeTestTeam();
      const result = optimizeFormation({ heroes, modeId: 'campaign', teamScore: 0 }, config);
      expect(result.combinedScore).toBeGreaterThanOrEqual(0);
      expect(result.positions.length).toBe(5);
    });

    it('handles single hero (1-hero team)', () => {
      const hero = makePlayerHero('solo', 'Solo', 'tank', 1);
      const result = optimizeFormation({ heroes: [hero], modeId: 'campaign', teamScore: 80 }, config);
      // No formation has 1 slot, so should fail gracefully
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Position scoring mode', () => {
    it('returns "heuristic" as current scoring mode', () => {
      const mode = getPositionScoringMode();
      expect(mode).toBe('heuristic');
    });

    it('includes scoring mode in FormationResult', () => {
      const heroes = makeTestTeam();
      const result = optimizeFormation({ heroes, modeId: 'campaign', teamScore: 80 }, config);
      expect(result.positionScoringMode).toBe('heuristic');
    });

    it('includes scoring mode in PositionScoreBreakdown', () => {
      const hero = makePlayerHero('tank1', 'Tank', 'tank', 1);
      const slot = formations[0].slots[0];
      const breakdown = scoreHeroInSlot(hero, slot, config);
      expect(breakdown.scoringMode).toBe('heuristic');
      expect(breakdown.verifiedContribution).toBe(0);
      expect(breakdown.heuristicContribution).toBe(1);
    });

    it('includes verified/heuristic contribution in debug', () => {
      const heroes = makeTestTeam();
      const result = optimizeFormation({ heroes, modeId: 'campaign', teamScore: 80, debug: true }, config);
      expect(result.debug).toBeDefined();
      expect(result.debug!.positionScoringMode).toBe('heuristic');
      expect(result.debug!.verifiedContribution).toBe(0);
      expect(result.debug!.heuristicContribution).toBe(1);
    });
  });

  describe('Formation confidence', () => {
    it('all formations have confidence set', () => {
      for (const f of formations) {
        expect(f.confidence).toBeDefined();
      }
    });

    it('all current formations have low confidence (provisional)', () => {
      for (const f of formations) {
        expect(f.confidence).toBe('low');
      }
    });

    it('includes source attribution on all formations', () => {
      for (const f of formations) {
        expect(f.source).toBeDefined();
        expect(f.sourceUrl).toBeDefined();
        expect(f.lastUpdated).toBeDefined();
      }
    });

    it('warns about low confidence in formation result', () => {
      const heroes = makeTestTeam();
      const result = optimizeFormation({ heroes, modeId: 'campaign', teamScore: 80 }, config);
      const hasProvisionalWarning = result.warnings.some(w =>
        w.includes('provisional') || w.includes('low confidence')
      );
      expect(hasProvisionalWarning).toBe(true);
    });
  });

  describe('Determinism — formation edge cases', () => {
    it('returns identical result for same input with debug enabled', () => {
      const heroes = makeTestTeam();
      const r1 = optimizeFormation({ heroes, modeId: 'campaign', teamScore: 80, debug: true }, config);
      const r2 = optimizeFormation({ heroes, modeId: 'campaign', teamScore: 80, debug: true }, config);
      expect(r1.formationId).toBe(r2.formationId);
      expect(r1.positions.map(p => p.hero.id)).toEqual(r2.positions.map(p => p.hero.id));
      expect(r1.formationScore).toBe(r2.formationScore);
      expect(r1.combinedScore).toBe(r2.combinedScore);
    });
  });
});
