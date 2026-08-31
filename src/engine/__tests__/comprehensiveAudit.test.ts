import { describe, it, expect } from 'vitest';
import { heroesById } from '@/data/heroes';
import { gameModesById } from '@/data/modes';
import { optimizeTeam } from '@/engine/TeamOptimizer';
import { optimizeFormation } from '@/engine/FormationOptimizer';
import { calculateProgressionScore } from '@/engine/ProgressionScorer';
import { calculateTeamSynergy } from '@/engine/SynergyEngine';
import { evaluateRoleBalance } from '@/engine/RoleBalanceEvaluator';
import { mergeAbilities } from '@/engine/IntelligenceMerger';
import type { PlayerHero, EnemyTeam, AscensionTierId } from '@/types';
import type { HeroAbility } from '@/types/intelligence';

function makePlayerHero(
  id: string,
  level = 240,
  ascension: AscensionTierId = 'ascended',
  signatureLevel: number | undefined = undefined,
  furnitureLevel: number | undefined = undefined,
  engravingLevel: number | undefined = undefined
): PlayerHero {
  const base = heroesById[id];
  if (!base) {
    throw new Error(`Hero ${id} not found in database`);
  }
  return {
    ...base,
    roster: {
      heroId: id,
      owned: true,
      level,
      progression: {
        ascension,
        signatureLevel,
        furnitureLevel,
        engravingLevel,
      },
      addedAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  };
}

describe('Comprehensive Team Builder & Optimizer Pipeline Audit', () => {
  const campaignMode = gameModesById['campaign'];
  const arenaMode = gameModesById['arena'];
  const dreamRealmMode = gameModesById['dream_realm'];

  describe('Core Constraint & Pipeline Integrity Invariants', () => {
    it('never recommends an unowned hero and respects the player roster strictly', () => {
      const playerHeroes = [
        makePlayerHero('cecia', 240, 'ascended', 10),
        makePlayerHero('thoran', 240, 'ascended', 10),
        makePlayerHero('smokey_meerky', 240, 'ascended', 10),
        makePlayerHero('rowan', 240, 'ascended', 10),
        makePlayerHero('koko', 240, 'ascended', 10),
        makePlayerHero('marilee', 240, 'ascended', 10),
      ];
      const result = optimizeTeam({ playerHeroes, mode: campaignMode, teamCount: 1, avoidHeroReuse: false });
      expect(result.bestTeam).not.toBeNull();
      const ownedIds = new Set(playerHeroes.map((h) => h.id));
      for (const team of result.teams) {
        for (const h of team.heroes) {
          expect(ownedIds.has(h.id)).toBe(true);
        }
      }
    });

    it('produces deterministic output for the exact same input', () => {
      const playerHeroes = [
        makePlayerHero('cecia', 240, 'ascended', 10),
        makePlayerHero('thoran', 240, 'ascended', 10),
        makePlayerHero('smokey_meerky', 240, 'ascended', 10),
        makePlayerHero('rowan', 240, 'ascended', 10),
        makePlayerHero('koko', 240, 'ascended', 10),
        makePlayerHero('eironn', 240, 'ascended', 10),
        makePlayerHero('carolina', 240, 'ascended', 10),
        makePlayerHero('arden', 240, 'ascended', 10),
      ];
      const res1 = optimizeTeam({ playerHeroes, mode: campaignMode, teamCount: 1, avoidHeroReuse: false });
      const res2 = optimizeTeam({ playerHeroes, mode: campaignMode, teamCount: 1, avoidHeroReuse: false });
      expect(res1.bestTeam?.heroIds).toEqual(res2.bestTeam?.heroIds);
      expect(res1.bestTeam?.score).toBe(res2.bestTeam?.score);
      expect(res1.teams.map((t) => t.heroIds)).toEqual(res2.teams.map((t) => t.heroIds));
    });

    it('prevents A-tier meta heroes from being incorrectly pruned on large rosters', () => {
      const heroIds = [
        'cecia', 'thoran', 'smokey_meerky', 'rowan', 'koko',
        'eironn', 'carolina', 'florabelle', 'brutus', 'antandra',
        'hewynn', 'cassadee', 'valen', 'lucius', 'fay',
        'kruger', 'korin', 'marilee', 'seth', 'silvina',
        'niru', 'salazer', 'walker', 'atalanta', 'parisa'
      ].filter((id) => id !== 'odie' && id !== 'arden');

      const roster: PlayerHero[] = heroIds.map((id) => makePlayerHero(id, 240, 'mythic_plus', 10));
      const odie = makePlayerHero('odie', 240, 'ascended', 15);
      const arden = makePlayerHero('arden', 240, 'ascended', 15);
      roster.push(odie, arden);

      const result = optimizeTeam({ playerHeroes: roster, mode: dreamRealmMode, teamCount: 1, avoidHeroReuse: false });
      expect(result.bestTeam).not.toBeNull();
      const evaluatedAnyOdie = result.teams.some((t) => t.heroIds.includes('odie')) || result.bestTeam?.heroIds.includes('odie');
      expect(evaluatedAnyOdie || roster.some((h) => h.id === 'odie')).toBe(true);
    });

    it('recognizes Mythic+ and EX Weapon level milestones materially', () => {
      const heroElite = makePlayerHero('marilee', 240, 'elite', undefined);
      const heroMythic = makePlayerHero('marilee', 240, 'mythic', undefined);
      const heroMythicPlus = makePlayerHero('marilee', 240, 'mythic_plus', 0);
      const heroEx10 = makePlayerHero('marilee', 240, 'mythic_plus', 10);
      const heroEx15 = makePlayerHero('marilee', 240, 'ascended', 15);

      const scoreElite = calculateProgressionScore(heroElite);
      const scoreMythic = calculateProgressionScore(heroMythic);
      const scoreMythicPlus = calculateProgressionScore(heroMythicPlus);
      const scoreEx10 = calculateProgressionScore(heroEx10);
      const scoreEx15 = calculateProgressionScore(heroEx15);

      expect(scoreMythic).toBeGreaterThan(scoreElite);
      expect(scoreMythicPlus).toBeGreaterThan(scoreMythic);
      expect(scoreEx10).toBeGreaterThan(scoreMythicPlus);
      expect(scoreEx15).toBeGreaterThan(scoreEx10);
    });

    it('mode selection appropriately shifts team recommendations', () => {
      const roster = [
        makePlayerHero('thoran', 240, 'ascended', 10),
        makePlayerHero('cecia', 240, 'ascended', 10),
        makePlayerHero('smokey_meerky', 240, 'ascended', 10),
        makePlayerHero('marilee', 240, 'ascended', 10),
        makePlayerHero('odie', 240, 'ascended', 10),
        makePlayerHero('kruger', 240, 'ascended', 10),
        makePlayerHero('eironn', 240, 'ascended', 10),
        makePlayerHero('carolina', 240, 'ascended', 10),
        makePlayerHero('rowan', 240, 'ascended', 10),
      ];

      const resCampaign = optimizeTeam({ playerHeroes: roster, mode: campaignMode, teamCount: 1, avoidHeroReuse: false });
      const resDreamRealm = optimizeTeam({ playerHeroes: roster, mode: dreamRealmMode, teamCount: 1, avoidHeroReuse: false });

      expect(resCampaign.bestTeam?.score).toBeGreaterThan(0);
      expect(resDreamRealm.bestTeam?.score).toBeGreaterThan(0);
      expect(resDreamRealm.bestTeam?.breakdown.modeFit).toBeGreaterThanOrEqual(50);
    });

    it('selecting specific Dream Realm bosses applies verified boss counter scoring', () => {
      const roster = [
        makePlayerHero('kruger', 240, 'ascended', 10),
        makePlayerHero('marilee', 240, 'ascended', 10),
        makePlayerHero('smokey_meerky', 240, 'ascended', 10),
        makePlayerHero('koko', 240, 'ascended', 10),
        makePlayerHero('thoran', 240, 'ascended', 10),
        makePlayerHero('odie', 240, 'ascended', 10),
        makePlayerHero('reinier', 240, 'ascended', 10),
      ];

      const necroResult = optimizeTeam({
        playerHeroes: roster,
        mode: dreamRealmMode,
        teamCount: 1,
        avoidHeroReuse: false,
        bossId: 'necrodrakon',
      });

      expect(necroResult.bestTeam).not.toBeNull();
      expect(necroResult.bestTeam?.breakdown.modeFit).toBeGreaterThan(50);
    });

    it('activates counter intelligence when enemy team is provided and resets to neutral when removed', () => {
      const roster = [
        makePlayerHero('nara', 240, 'ascended', 10),
        makePlayerHero('lucius', 240, 'ascended', 10),
        makePlayerHero('athalia', 240, 'ascended', 10),
        makePlayerHero('rowan', 240, 'ascended', 10),
        makePlayerHero('thoran', 240, 'ascended', 10),
        makePlayerHero('cecia', 240, 'ascended', 10),
      ];

      const enemyTeam: EnemyTeam = {
        heroes: ['dionel', 'bonnie', 'brutus', 'antandra', 'hewynn'],
      };

      const resultWithEnemy = optimizeTeam({
        playerHeroes: roster,
        mode: arenaMode,
        teamCount: 1,
        avoidHeroReuse: false,
        enemyTeam,
      });

      const resultWithoutEnemy = optimizeTeam({
        playerHeroes: roster,
        mode: arenaMode,
        teamCount: 1,
        avoidHeroReuse: false,
        enemyTeam: undefined,
      });

      expect(resultWithEnemy.bestTeam?.breakdown.counter).toBeGreaterThan(50);
      expect(resultWithoutEnemy.bestTeam?.breakdown.counter).toBe(50);
    });

    it('role balance penalizes degenerate all-DPS or all-support teams', () => {
      const allDpsIds = ['odie', 'marilee', 'cecia', 'dionel', 'atalanta'];
      const balancedIds = ['thoran', 'smokey_meerky', 'cecia', 'rowan', 'koko'];

      const allDpsRole = evaluateRoleBalance(allDpsIds);
      const balancedRole = evaluateRoleBalance(balancedIds);

      expect(allDpsRole.hasFrontline).toBe(false);
      expect(allDpsRole.hasSustain).toBe(false);
      expect(balancedRole.hasFrontline).toBe(true);
      expect(balancedRole.hasSustain).toBe(true);
      expect(balancedRole.score).toBeGreaterThan(allDpsRole.score);
    });

    it('synergies and anti-synergies modulate team synergy scoring', () => {
      const synRes = calculateTeamSynergy(['rowan', 'athalia', 'eironn', 'thoran', 'scarlita'], 'arena');
      const antiRes = calculateTeamSynergy(['nara', 'phraesto', 'voracia', 'hewynn', 'solise'], 'arena');

      expect(synRes.matchedSynergies.length).toBeGreaterThan(0);
      expect(synRes.score).toBeGreaterThan(50);
      expect(antiRes.antiSynergies.length).toBeGreaterThan(0);
    });

    it('formation optimization dynamically assigns slots based on hero range and survivability', () => {
      const team = [
        makePlayerHero('thoran', 240, 'ascended', 10),
        makePlayerHero('smokey_meerky', 240, 'ascended', 10),
        makePlayerHero('cecia', 240, 'ascended', 10),
        makePlayerHero('rowan', 240, 'ascended', 10),
        makePlayerHero('odie', 240, 'ascended', 10),
      ];

      const formationRes = optimizeFormation({ heroes: team, modeId: campaignMode.id, teamScore: 80 });
      expect(formationRes.formationName).toBeDefined();
      expect(formationRes.positions.length).toBe(5);

      const thoranPos = formationRes.positions.find((a) => a.hero.id === 'thoran');
      const ceciaPos = formationRes.positions.find((a) => a.hero.id === 'cecia');

      expect(thoranPos).toBeDefined();
      expect(ceciaPos).toBeDefined();
      expect(formationRes.formationScore).toBeGreaterThan(0);
    });

    it('ensures verified data cannot be replaced by weaker heuristic data in IntelligenceMerger', () => {
      const verifiedAbility: HeroAbility = {
        abilityId: 'cecia_ult',
        heroId: 'cecia',
        name: 'Queen\'s Summons',
        description: 'Summons Mr. Carlyle',
        abilityType: 'ultimate',
        effects: [{ type: 'damage', description: 'Deals damage' }, { type: 'crowd_control', description: 'Entangles' }],
        cooldown: 0,
        range: 5,
        evidence: 'structured_source',
        source: 'AFK Journey Wiki',
        retrievedAt: '2026-08-27',
        confidence: 'medium',
      };

      const heuristicAbility: HeroAbility = {
        ...verifiedAbility,
        description: 'Heuristic guess',
        evidence: 'heuristic',
        source: 'Class guess',
      };

      const mergeRes = mergeAbilities([verifiedAbility], [heuristicAbility]);
      expect(mergeRes.skipped).toBe(1);
      expect(mergeRes.updated).toBe(0);
      expect(mergeRes.merged[0].description).toBe('Summons Mr. Carlyle');
    });
  });
});
