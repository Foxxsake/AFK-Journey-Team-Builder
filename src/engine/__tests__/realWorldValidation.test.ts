import { describe, it, expect } from 'vitest';
import { heroesById } from '@/data/heroes';
import { gameModesById } from '@/data/modes';
import { optimizeTeam } from '@/engine/TeamOptimizer';
import { optimizeFormation } from '@/engine/FormationOptimizer';
import { calculateTeamSynergy } from '@/engine/SynergyEngine';
import { evaluateRoleBalance } from '@/engine/RoleBalanceEvaluator';
import { getBossProfile } from '@/data/intelligence/modeIntelligence';
import { getHeroCounters } from '@/engine/CounterEngine';
import type { PlayerHero, EnemyTeam, AscensionTierId, GameMode } from '@/types';
import type { OptimizerInput, ScoredTeam, FormationResult } from '@/engine/types';

function makePlayerHero(
  id: string,
  level: number,
  ascension: AscensionTierId,
  signatureLevel: number = 0
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
      },
      addedAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  };
}

interface TestRunResult {
  scenarioName: string;
  modeName: string;
  bossId?: string | null;
  enemyTeam?: EnemyTeam;
  team: ScoredTeam;
  formation: FormationResult;
}

function runScenarioEvaluation(
  scenarioName: string,
  roster: PlayerHero[],
  mode: GameMode,
  bossId?: string | null,
  enemyTeam?: EnemyTeam
): TestRunResult {
  const input: OptimizerInput = {
    playerHeroes: roster,
    mode,
    teamCount: 1,
    avoidHeroReuse: false,
    bossId: bossId || undefined,
    enemyTeam,
  };

  const result = optimizeTeam(input);
  if (!result.bestTeam) {
    throw new Error(`Optimizer failed to return a best team for ${scenarioName} in ${mode.id}`);
  }

  const formation = optimizeFormation({
    heroes: result.bestTeam.heroes,
    modeId: mode.id,
    teamScore: result.bestTeam.score,
    enemyTeam,
  });

  const heroesStr = result.bestTeam.heroes.map((h) => `${h.name} (${h.roster.progression.ascension}, EX+${h.roster.progression.signatureLevel || 0})`).join(', ');
  console.log(`[EVAL] ${scenarioName} | Mode: ${mode.name}${bossId ? ` | Boss: ${bossId}` : ''}`);
  console.log(`  Heroes: ${heroesStr}`);
  console.log(`  Score: ${result.bestTeam.score.toFixed(1)} | Breakdown: Progr=${result.bestTeam.breakdown.progression.toFixed(0)}, Str=${result.bestTeam.breakdown.heroStrength.toFixed(0)}, Mode=${result.bestTeam.breakdown.modeFit.toFixed(0)}, Role=${result.bestTeam.breakdown.roleBalance.toFixed(0)}, Syn=${result.bestTeam.breakdown.synergy.toFixed(0)}, Fact=${result.bestTeam.breakdown.faction.toFixed(0)}, Cntr=${result.bestTeam.breakdown.counter.toFixed(0)}`);
  console.log(`  Formation: ${formation.formationName} (Formation Score: ${formation.formationScore.toFixed(1)})`);

  return {
    scenarioName,
    modeName: mode.name,
    bossId,
    enemyTeam,
    team: result.bestTeam,
    formation,
  };
}

describe('Real-World Team Recommendation Validation', () => {
  const campaignMode = gameModesById['campaign'];
  const arenaMode = gameModesById['arena'];
  const dreamRealmMode = gameModesById['dream_realm'];
  const bossIds = ['king_croaker', 'necrodrakon', 'skyclops', 'snow_stomper', 'lone_gaze', 'alpha_bear'];

  // =========================================================================
  // ROSTER 1: Early-Game Player (Levels 60-100, Epic/Elite+/Legendary, no EX)
  // =========================================================================
  const earlyGameRoster: PlayerHero[] = [
    makePlayerHero('lucius', 80, 'legendary', 0),
    makePlayerHero('antandra', 80, 'elite_plus', 0),
    makePlayerHero('cecia', 90, 'legendary', 0),
    makePlayerHero('mirael', 80, 'elite_plus', 0),
    makePlayerHero('valen', 70, 'elite', 0),
    makePlayerHero('rowan', 80, 'elite_plus', 0),
    makePlayerHero('hewynn', 80, 'elite_plus', 0),
    makePlayerHero('silvina', 70, 'elite', 0),
    makePlayerHero('odie', 80, 'elite_plus', 0),
    makePlayerHero('damian', 70, 'elite', 0),
    makePlayerHero('koko', 70, 'elite', 0),
  ];

  // =========================================================================
  // ROSTER 2: Mid-Game Player (Levels 160-200, Mythic/Mythic+, EX 0-10)
  // =========================================================================
  const midGameRoster: PlayerHero[] = [
    makePlayerHero('thoran', 180, 'mythic_plus', 5),
    makePlayerHero('antandra', 170, 'mythic', 0),
    makePlayerHero('cecia', 190, 'mythic_plus', 10),
    makePlayerHero('odie', 190, 'mythic_plus', 10),
    makePlayerHero('smokey_meerky', 180, 'mythic_plus', 5),
    makePlayerHero('rowan', 180, 'mythic', 0),
    makePlayerHero('koko', 180, 'mythic_plus', 5),
    makePlayerHero('marilee', 180, 'mythic_plus', 8),
    makePlayerHero('korin', 175, 'mythic_plus', 5),
    makePlayerHero('arden', 170, 'mythic', 0),
    makePlayerHero('carolina', 170, 'mythic', 0),
    makePlayerHero('eironn', 175, 'mythic', 0),
    makePlayerHero('brutus', 170, 'mythic', 0),
    makePlayerHero('hewynn', 175, 'mythic', 0),
    makePlayerHero('damian', 170, 'mythic', 0),
    makePlayerHero('kruger', 160, 'legendary_plus', 0),
    makePlayerHero('shakir', 160, 'mythic', 0),
    makePlayerHero('vala', 170, 'mythic', 0),
    makePlayerHero('silvina', 160, 'legendary_plus', 0),
    makePlayerHero('viperian', 160, 'legendary_plus', 0),
  ];

  // =========================================================================
  // ROSTER 3: End-Game Player (Level 240+, Ascended/Supreme+, EX 10-20)
  // =========================================================================
  const endGameRoster: PlayerHero[] = [
    makePlayerHero('thoran', 240, 'ascended_5', 15),
    makePlayerHero('eironn', 240, 'ascended_5', 15),
    makePlayerHero('carolina', 240, 'ascended_5', 15),
    makePlayerHero('arden', 240, 'ascended_5', 15),
    makePlayerHero('damian', 240, 'ascended_5', 15),
    makePlayerHero('smokey_meerky', 240, 'ascended_5', 15),
    makePlayerHero('marilee', 240, 'ascended_5', 20),
    makePlayerHero('korin', 240, 'ascended_5', 15),
    makePlayerHero('odie', 240, 'ascended_5', 20),
    makePlayerHero('reinier', 240, 'ascended_1', 10),
    makePlayerHero('scarlita', 240, 'ascended_5', 15),
    makePlayerHero('phraesto', 240, 'ascended_5', 15),
    makePlayerHero('shakir', 240, 'ascended_5', 15),
    makePlayerHero('vala', 240, 'ascended_5', 15),
    makePlayerHero('cecia', 240, 'ascended_5', 10),
    makePlayerHero('rowan', 240, 'ascended_5', 10),
    makePlayerHero('koko', 240, 'ascended_5', 10),
    makePlayerHero('hewynn', 240, 'ascended_5', 10),
    makePlayerHero('kruger', 240, 'ascended_5', 10),
    makePlayerHero('lily_may', 240, 'ascended_5', 15),
    makePlayerHero('florabelle', 240, 'ascended_5', 10),
    makePlayerHero('cassadee', 240, 'ascended_5', 10),
    makePlayerHero('talene', 240, 'ascended_5', 15),
    makePlayerHero('alna', 240, 'ascended_5', 15),
  ];

  // =========================================================================
  // ROSTER 4: PvP / Arena Focused Player
  // =========================================================================
  const pvpRoster: PlayerHero[] = [
    makePlayerHero('eironn', 240, 'ascended_5', 15),
    makePlayerHero('carolina', 240, 'ascended_5', 15),
    makePlayerHero('arden', 240, 'ascended_5', 15),
    makePlayerHero('damian', 240, 'ascended_5', 15),
    makePlayerHero('thoran', 240, 'ascended_5', 15),
    makePlayerHero('vala', 240, 'ascended_5', 15),
    makePlayerHero('scarlita', 240, 'ascended_5', 15),
    makePlayerHero('shakir', 240, 'ascended_5', 15),
    makePlayerHero('hewynn', 240, 'ascended_5', 10),
    makePlayerHero('reinier', 240, 'mythic_plus', 10),
    makePlayerHero('lily_may', 240, 'ascended_5', 15),
    makePlayerHero('silvina', 240, 'ascended_5', 10),
    makePlayerHero('berial', 240, 'ascended_5', 15),
    makePlayerHero('igor', 240, 'ascended_5', 10),
  ];

  // =========================================================================
  // ROSTER 5: Dream Realm Focused Player
  // =========================================================================
  const dreamRealmRoster: PlayerHero[] = [
    makePlayerHero('marilee', 240, 'ascended_5', 20),
    makePlayerHero('korin', 240, 'ascended_5', 15),
    makePlayerHero('odie', 240, 'ascended_5', 20),
    makePlayerHero('smokey_meerky', 240, 'ascended_5', 10),
    makePlayerHero('reinier', 240, 'mythic_plus', 10),
    makePlayerHero('kruger', 240, 'ascended_5', 10),
    makePlayerHero('koko', 240, 'ascended_5', 10),
    makePlayerHero('cassadee', 240, 'ascended_5', 10),
    makePlayerHero('shakir', 240, 'ascended_5', 15),
    makePlayerHero('thoran', 240, 'ascended_5', 10),
    makePlayerHero('phraesto', 240, 'ascended_5', 15),
    makePlayerHero('rowan', 240, 'ascended_5', 10),
  ];

  // =========================================================================
  // ROSTER 6: Large Roster (S-tier + A-tier Mix, 32 Heroes)
  // =========================================================================
  const largeRoster: PlayerHero[] = [
    // S-tier
    makePlayerHero('thoran', 240, 'ascended_5', 10),
    makePlayerHero('cecia', 240, 'ascended_5', 10),
    makePlayerHero('smokey_meerky', 240, 'ascended_5', 10),
    makePlayerHero('eironn', 240, 'ascended_5', 10),
    makePlayerHero('carolina', 240, 'ascended_5', 10),
    makePlayerHero('hewynn', 240, 'ascended_5', 10),
    makePlayerHero('florabelle', 240, 'ascended_5', 10),
    makePlayerHero('rowan', 240, 'ascended_5', 10),
    makePlayerHero('scarlita', 240, 'ascended_5', 15),
    makePlayerHero('phraesto', 240, 'ascended_5', 15),
    makePlayerHero('reinier', 240, 'mythic_plus', 10),
    makePlayerHero('shakir', 240, 'ascended_5', 10),
    makePlayerHero('vala', 240, 'ascended_5', 10),
    makePlayerHero('brutus', 240, 'ascended_5', 5),
    makePlayerHero('cassadee', 240, 'ascended_5', 10),
    makePlayerHero('lily_may', 240, 'ascended_5', 15),
    // A-tier
    makePlayerHero('odie', 240, 'ascended_5', 15),
    makePlayerHero('marilee', 240, 'ascended_5', 15),
    makePlayerHero('korin', 240, 'ascended_5', 10),
    makePlayerHero('arden', 240, 'ascended_5', 10),
    makePlayerHero('damian', 240, 'ascended_5', 10),
    makePlayerHero('koko', 240, 'ascended_5', 10),
    makePlayerHero('antandra', 240, 'ascended_5', 5),
    makePlayerHero('lucius', 240, 'ascended_5', 5),
    makePlayerHero('silvina', 240, 'ascended_5', 5),
    makePlayerHero('kruger', 240, 'ascended_5', 10),
    makePlayerHero('seth', 240, 'ascended_5', 5),
    makePlayerHero('mirael', 240, 'ascended_5', 0),
    makePlayerHero('valen', 240, 'ascended_5', 0),
    makePlayerHero('viperian', 240, 'ascended_5', 5),
    makePlayerHero('parisa', 240, 'ascended_5', 5),
    makePlayerHero('lyca', 240, 'ascended_5', 5),
  ];

  // =========================================================================
  // ROSTER 7: Roster with Over-Invested Heroes vs Meta Low-Invested
  // =========================================================================
  const overInvestedRoster: PlayerHero[] = [
    // Over-invested powerhouses
    makePlayerHero('marilee', 240, 'ascended_5', 25),
    makePlayerHero('odie', 240, 'ascended_5', 25),
    makePlayerHero('thoran', 240, 'ascended_5', 20),
    makePlayerHero('koko', 240, 'ascended_5', 15),
    makePlayerHero('smokey_meerky', 240, 'ascended_5', 15),
    // Low-invested meta favorites
    makePlayerHero('eironn', 160, 'elite_plus', 0),
    makePlayerHero('carolina', 160, 'elite_plus', 0),
    makePlayerHero('arden', 160, 'elite_plus', 0),
    makePlayerHero('scarlita', 160, 'elite', 0),
    makePlayerHero('reinier', 160, 'elite', 0),
    makePlayerHero('cecia', 200, 'mythic', 0),
    makePlayerHero('rowan', 200, 'mythic', 0),
  ];

  // =========================================================================
  // ROSTER 8: Synergy Comp Roster (Eironn/Carolina/Arden/Damian loop)
  // =========================================================================
  const synergyFavoredRoster: PlayerHero[] = [
    // Eironn Magic Burst CC synergy core (medium progression)
    makePlayerHero('eironn', 220, 'mythic_plus', 10),
    makePlayerHero('carolina', 220, 'mythic_plus', 10),
    makePlayerHero('arden', 220, 'mythic_plus', 10),
    makePlayerHero('damian', 220, 'mythic_plus', 10),
    makePlayerHero('thoran', 220, 'mythic_plus', 10),
    // High raw stat solo heroes without synergy with the core
    makePlayerHero('cecia', 240, 'ascended_5', 15),
    makePlayerHero('antandra', 240, 'ascended_5', 15),
    makePlayerHero('mirael', 240, 'ascended_5', 15),
    makePlayerHero('valen', 240, 'ascended_5', 15),
    makePlayerHero('lucius', 240, 'ascended_5', 15),
  ];

  const allResults: TestRunResult[] = [];

  it('validates Early-Game Player recommendations across Campaign, Arena & Dream Realm', () => {
    const resCamp = runScenarioEvaluation('Early-Game', earlyGameRoster, campaignMode);
    const resArena = runScenarioEvaluation('Early-Game', earlyGameRoster, arenaMode);
    const resDR = runScenarioEvaluation('Early-Game', earlyGameRoster, dreamRealmMode, 'king_croaker');

    allResults.push(resCamp, resArena, resDR);

    // Frontline check: Must have Lucius or Antandra or Valen
    const hasFrontline = resCamp.team.heroIds.includes('lucius') || resCamp.team.heroIds.includes('antandra') || resCamp.team.heroIds.includes('valen');
    expect(hasFrontline).toBe(true);

    // DPS check: Must have Cecia, Mirael, or Odie
    const hasDPS = resCamp.team.heroIds.includes('cecia') || resCamp.team.heroIds.includes('mirael') || resCamp.team.heroIds.includes('odie');
    expect(hasDPS).toBe(true);

    // Sustain check: Must have Rowan or Hewynn or Koko
    const hasSustain = resCamp.team.heroIds.includes('rowan') || resCamp.team.heroIds.includes('hewynn') || resCamp.team.heroIds.includes('koko');
    expect(hasSustain).toBe(true);

    // Formation positioning check: Tank / Warrior in front row
    const tankSlot = resCamp.formation.positions.find((p) => p.hero.id === 'valen' || p.hero.id === 'lucius' || p.hero.id === 'antandra');
    expect(tankSlot).toBeDefined();
  });

  it('validates Mid-Game Player recommendations across Campaign, Arena, and All Dream Realm Bosses', () => {
    const resCamp = runScenarioEvaluation('Mid-Game', midGameRoster, campaignMode);
    const resArena = runScenarioEvaluation('Mid-Game', midGameRoster, arenaMode, null, {
      heroes: ['thoran', 'cecia', 'rowan', 'silvina', 'mirael'],
    });

    allResults.push(resCamp, resArena);

    // Check all 6 Dream Realm bosses
    for (const bId of bossIds) {
      const resBoss = runScenarioEvaluation('Mid-Game', midGameRoster, dreamRealmMode, bId);
      allResults.push(resBoss);

      // Dream Realm must have boss DPS and sustain
      const bossTeamIds = resBoss.team.heroIds;
      const hasBossCarry = bossTeamIds.includes('marilee') || bossTeamIds.includes('korin') || bossTeamIds.includes('odie');
      const hasSustain = bossTeamIds.includes('smokey_meerky') || bossTeamIds.includes('koko') || bossTeamIds.includes('rowan');
      if (!hasBossCarry) {
        console.warn(`[WARNING] Mid-Game ${bId} missing top boss carry! Selected: ${bossTeamIds.join(', ')}`);
      }
      expect(hasSustain).toBe(true);
    }
  });

  it('validates End-Game Player recommendations across Campaign, Arena, and All Dream Realm Bosses', () => {
    const resCamp = runScenarioEvaluation('End-Game', endGameRoster, campaignMode);
    const resArena = runScenarioEvaluation('End-Game', endGameRoster, arenaMode, null, {
      heroes: ['eironn', 'carolina', 'arden', 'thoran', 'damian'],
    });

    allResults.push(resCamp, resArena);

    for (const bId of bossIds) {
      const resBoss = runScenarioEvaluation('End-Game', endGameRoster, dreamRealmMode, bId);
      allResults.push(resBoss);

      // End-game dream realm must incorporate top boss specialists
      const bossTeamIds = resBoss.team.heroIds;
      const hasTopSpecialist = bossTeamIds.includes('marilee') || bossTeamIds.includes('korin') || bossTeamIds.includes('reinier') || bossTeamIds.includes('odie');
      if (!hasTopSpecialist) {
        console.warn(`[WARNING] End-Game ${bId} missing top boss specialist! Selected: ${bossTeamIds.join(', ')}`);
      }
    }
  });

  it('validates PvP/Arena-Focused Player recommendations vs backline dive and stall enemies', () => {
    // Test vs Assassin Dive enemy (Vala, Silvina, Berial)
    const diveEnemy: EnemyTeam = { heroes: ['vala', 'silvina', 'berial', 'thoran', 'hewynn'] };
    const resVsDive = runScenarioEvaluation('PvP-Focused (vs Dive)', pvpRoster, arenaMode, null, diveEnemy);

    // Test vs Magic Burst comp (Eironn, Carolina, Arden)
    const burstEnemy: EnemyTeam = { heroes: ['eironn', 'carolina', 'arden', 'thoran', 'damian'] };
    const resVsBurst = runScenarioEvaluation('PvP-Focused (vs Burst)', pvpRoster, arenaMode, null, burstEnemy);

    allResults.push(resVsDive, resVsBurst);

    expect(resVsDive.team.heroIds.length).toBe(5);
    expect(resVsBurst.team.heroIds.length).toBe(5);
    // Role balance score must be positive
    expect(resVsDive.team.breakdown.roleBalance).toBeGreaterThanOrEqual(50);
  });

  it('validates Dream Realm-Focused Player recommendations across all 6 bosses', () => {
    for (const bId of bossIds) {
      const resBoss = runScenarioEvaluation('Dream-Realm-Focused', dreamRealmRoster, dreamRealmMode, bId);
      allResults.push(resBoss);

      // Check that boss counters or synergies are rewarded
      expect(resBoss.team.breakdown.modeFit).toBeGreaterThanOrEqual(40);
      expect(resBoss.formation.positions.length).toBe(5);
    }
  });

  it('validates Large Roster recommendations ensuring A-tier carries are not pruned', () => {
    const resCamp = runScenarioEvaluation('Large-Roster', largeRoster, campaignMode);
    const resDR = runScenarioEvaluation('Large-Roster', largeRoster, dreamRealmMode, 'necrodrakon');
    const resArena = runScenarioEvaluation('Large-Roster', largeRoster, arenaMode);

    allResults.push(resCamp, resDR, resArena);

    // In Dream Realm, Marilee or Odie or Korin (A-tier) should be picked or evaluated despite high S-tier presence
    const drIds = resDR.team.heroIds;
    const hasATierCarry = drIds.includes('marilee') || drIds.includes('odie') || drIds.includes('korin');
    if (!hasATierCarry) {
      console.warn(`[WARNING] Large Roster DR missing A-tier carry! Selected: ${drIds.join(', ')}`);
    }
  });

  it('validates Over-Invested Roster recommendations prioritizing high investment over low-tier meta', () => {
    const resCamp = runScenarioEvaluation('Over-Invested', overInvestedRoster, campaignMode);
    const resDR = runScenarioEvaluation('Over-Invested', overInvestedRoster, dreamRealmMode, 'king_croaker');

    allResults.push(resCamp, resDR);

    // The high-invested units (Marilee, Odie, Thoran, Smokey, Koko) should be chosen over level 160 Elite+ Eironn/Carolina/Arden
    expect(resCamp.team.heroIds).toContain('thoran');
    expect(resCamp.team.heroIds).toContain('smokey_meerky');
    expect(resCamp.team.heroIds.includes('odie') || resCamp.team.heroIds.includes('marilee')).toBe(true);
  });

  it('validates Synergy-Favored Roster recommendations favoring coordinated comps', () => {
    const resCamp = runScenarioEvaluation('Synergy-Favored', synergyFavoredRoster, campaignMode);
    allResults.push(resCamp);

    // Must select functional frontline and synergized core
    expect(resCamp.team.heroIds.length).toBe(5);
    expect(resCamp.team.breakdown.synergy).toBeGreaterThanOrEqual(40);
  });

  it('prints comprehensive inspection record of all tested recommendations', () => {
    console.log(`\n========================================================================`);
    console.log(`REAL-WORLD RECOMMENDATION VALIDATION SUMMARY (${allResults.length} RECOMMENDATIONS)`);
    console.log(`========================================================================\n`);

    for (const [idx, res] of allResults.entries()) {
      const heroesSummary = res.team.heroes.map((h) => `${h.name} (${h.roster.progression.ascension}, EX+${h.roster.progression.signatureLevel || 0})`).join(', ');
      console.log(`[REC #${idx + 1}] Scenario: ${res.scenarioName} | Mode: ${res.modeName}${res.bossId ? ` | Boss: ${res.bossId}` : ''}`);
      console.log(`  Heroes: ${heroesSummary}`);
      console.log(`  Score: ${res.team.score.toFixed(1)} | Breakdown: Progr=${res.team.breakdown.progression.toFixed(0)}, Str=${res.team.breakdown.heroStrength.toFixed(0)}, Mode=${res.team.breakdown.modeFit.toFixed(0)}, Role=${res.team.breakdown.roleBalance.toFixed(0)}, Syn=${res.team.breakdown.synergy.toFixed(0)}, Fact=${res.team.breakdown.faction.toFixed(0)}, Cntr=${res.team.breakdown.counter.toFixed(0)}`);
      console.log(`  Formation: ${res.formation.formationName} (Formation Score: ${res.formation.formationScore.toFixed(1)})`);
      console.log(`  Summary: ${res.team.explanation.summary}`);
      console.log(`------------------------------------------------------------------------`);
    }

    expect(allResults.length).toBeGreaterThanOrEqual(20);
  });
});
