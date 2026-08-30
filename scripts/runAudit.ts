import { heroes, heroesById } from '../src/data/heroes';
import { gameModesById } from '../src/data/modes';
import { bossProfiles } from '../src/data/intelligence/modeIntelligence';
import { optimizeTeam } from '../src/engine/TeamOptimizer';
import { optimizeFormation } from '../src/engine/FormationOptimizer';
import type { PlayerHero, AscensionTierId, EnemyTeam } from '../src/types';

function makeHero(
  id: string,
  level = 240,
  ascension: AscensionTierId = 'supreme_plus',
  signatureLevel: number | undefined = 10,
  furnitureLevel = 0,
  engravingLevel = 0
): PlayerHero {
  const base = heroesById[id];
  if (!base) throw new Error(`Hero ${id} not found`);
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

function runAndReport(
  testName: string,
  roster: PlayerHero[],
  modeId: string,
  bossId?: string,
  enemyTeam?: EnemyTeam
) {
  console.log(`\n================================================================`);
  console.log(` AUDIT TEST: ${testName}`);
  console.log(`================================================================`);
  console.log(`Input Roster (${roster.length} heroes):`);
  console.log(roster.map((h) => `${h.name} (${h.rarity}, Asc: ${h.roster.progression.ascension}, EX: ${h.roster.progression.signatureLevel ?? 'none'})`).join(', '));
  console.log(`Selected Mode: ${modeId}${bossId ? ` | Boss: ${bossId}` : ''}${enemyTeam ? ` | Enemy Team: ${enemyTeam.heroes.join(', ')}` : ''}`);

  const mode = gameModesById[modeId];
  const optResult = optimizeTeam({
    playerHeroes: roster,
    mode,
    bossId,
    enemyTeam,
  });

  console.log(`Top ${optResult.teams.length} Recommended Teams:`);
  optResult.teams.slice(0, 3).forEach((team, idx) => {
    const formationRes = optimizeFormation({ heroes: team.heroes, mode });
    console.log(`\n--- Team #${idx + 1} (Total Score: ${team.score}) ---`);
    console.log(`Heroes: ${team.heroes.map((h) => h.name).join(', ')}`);
    console.log(`Formation: ${formationRes.formation.name} (${formationRes.formation.shape})`);
    console.log(`Slot Assignments:`);
    formationRes.assignments.forEach((a) => {
      console.log(`  - Slot ${a.slot.index} [${a.slot.roleHint}, row: ${a.slot.row}, col: ${a.slot.col}]: ${a.hero.name} (Fit Score: ${a.score.total})`);
    });
    console.log(`Score Breakdown:`);
    console.log(`  Hero Strength: ${team.breakdown.heroStrength}`);
    console.log(`  Progression: ${team.breakdown.progression}`);
    console.log(`  Role Balance: ${team.breakdown.roleBalance}`);
    console.log(`  Synergy: ${team.breakdown.synergy}`);
    console.log(`  Mode Fit: ${team.breakdown.modeFit}`);
    console.log(`  Faction: ${team.breakdown.faction}`);
    console.log(`  Confidence: ${team.breakdown.confidence}`);
    console.log(`  Meta Consensus: ${team.breakdown.meta}`);
    console.log(`  Counter: ${team.breakdown.counter}`);
  });

  if (optResult.teams.length >= 2) {
    const t1 = optResult.teams[0];
    const t2 = optResult.teams[1];
    console.log(`\nWhy #1 beats #2:`);
    console.log(`Team #1 (${t1.score}) vs Team #2 (${t2.score}): Score diff = ${t1.score - t2.score}. Key advantages:`);
    Object.entries(t1.breakdown).forEach(([k, v]) => {
      const diff = (v as number) - ((t2.breakdown as any)[k] ?? 0);
      if (diff > 0) {
        console.log(`  + ${k}: +${diff.toFixed(1)} pts (${v} vs ${(t2.breakdown as any)[k]})`);
      }
    });
  }

  if (optResult.teams.length >= 3) {
    const t1 = optResult.teams[0];
    const t3 = optResult.teams[2];
    console.log(`Why #1 beats #3:`);
    console.log(`Team #1 (${t1.score}) vs Team #3 (${t3.score}): Score diff = ${t1.score - t3.score}. Key advantages:`);
    Object.entries(t1.breakdown).forEach(([k, v]) => {
      const diff = (v as number) - ((t3.breakdown as any)[k] ?? 0);
      if (diff > 0) {
        console.log(`  + ${k}: +${diff.toFixed(1)} pts (${v} vs ${(t3.breakdown as any)[k]})`);
      }
    });
  }
}

// TEST A: Large roster containing S-tier and A-tier heroes
const testARoster: PlayerHero[] = [
  makeHero('thoran', 240, 'supreme_plus', 15),
  makeHero('cecia', 240, 'supreme_plus', 10),
  makeHero('smokey_meerky', 240, 'supreme_plus', 15),
  makeHero('rowan', 240, 'supreme_plus', 10),
  makeHero('koko', 240, 'supreme_plus', 10),
  makeHero('eironn', 240, 'supreme_plus', 15),
  makeHero('carolina', 240, 'supreme_plus', 10),
  makeHero('arden', 240, 'supreme_plus', 10), // A-tier
  makeHero('odie', 240, 'supreme_plus', 15), // A-tier
  makeHero('marilee', 240, 'supreme_plus', 15), // A-tier
  makeHero('korin', 240, 'supreme_plus', 10), // A-tier
  makeHero('kruger', 240, 'supreme_plus', 10), // A-tier
  makeHero('brutus', 240, 'supreme_plus', 10),
  makeHero('antandra', 240, 'supreme_plus', 10), // A-tier
  makeHero('hewynn', 240, 'supreme_plus', 10),
  makeHero('scarlita', 240, 'supreme_plus', 15),
  makeHero('reinier', 240, 'supreme_plus', 10),
  makeHero('shakir', 240, 'supreme_plus', 10),
  makeHero('florabelle', 240, 'supreme_plus', 10),
  makeHero('damian', 240, 'supreme_plus', 10), // A-tier
];
runAndReport('Test A: Large Roster (S-tier + A-tier)', testARoster, 'campaign');

// TEST B: Small early-game roster
const testBRoster: PlayerHero[] = [
  makeHero('valen', 80, 'elite', undefined),
  makeHero('lucius', 80, 'elite', undefined),
  makeHero('fay', 80, 'elite', undefined),
  makeHero('chippy', 60, 'rare', undefined),
  makeHero('hammie', 60, 'rare', undefined),
  makeHero('cecia', 80, 'epic', undefined),
  makeHero('antandra', 80, 'epic', undefined),
];
runAndReport('Test B: Small Early-Game Roster', testBRoster, 'campaign');

// TEST C: Advanced roster with high EX Weapon investment
const testCRoster: PlayerHero[] = [
  makeHero('thoran', 240, 'supreme_plus', 20),
  makeHero('eironn', 240, 'supreme_plus', 20),
  makeHero('carolina', 240, 'supreme_plus', 15),
  makeHero('arden', 240, 'supreme_plus', 15),
  makeHero('damian', 240, 'supreme_plus', 10),
  makeHero('marilee', 240, 'supreme_plus', 20),
  makeHero('odie', 240, 'supreme_plus', 20),
  makeHero('kruger', 240, 'supreme_plus', 15),
  makeHero('smokey_meerky', 240, 'supreme_plus', 15),
  makeHero('scarlita', 240, 'supreme_plus', 20),
  makeHero('valen', 240, 'mythic', undefined), // low investment comparison
];
runAndReport('Test C: Advanced Roster with High EX Weapon Investment', testCRoster, 'arena');

// TEST D: Arena roster with an enemy team selected
const testDRoster: PlayerHero[] = [
  makeHero('thoran', 240, 'supreme_plus', 15),
  makeHero('eironn', 240, 'supreme_plus', 15),
  makeHero('carolina', 240, 'supreme_plus', 10),
  makeHero('arden', 240, 'supreme_plus', 10),
  makeHero('rowan', 240, 'supreme_plus', 10),
  makeHero('nara', 240, 'supreme_plus', 10),
  makeHero('athalia', 240, 'supreme_plus', 15),
  makeHero('scarlita', 240, 'supreme_plus', 15),
  makeHero('hewynn', 240, 'supreme_plus', 10),
  makeHero('lucius', 240, 'supreme_plus', 10),
];
const enemyTeamD: EnemyTeam = {
  heroes: ['dionel', 'bryon', 'bonnie', 'brutus', 'antandra'],
};
runAndReport('Test D: Arena Roster with Enemy Team Selected', testDRoster, 'arena', undefined, enemyTeamD);

// TEST E: Dream Realm roster against each of the 6 bosses
const testERoster: PlayerHero[] = [
  makeHero('kruger', 240, 'supreme_plus', 15),
  makeHero('marilee', 240, 'supreme_plus', 15),
  makeHero('odie', 240, 'supreme_plus', 15),
  makeHero('smokey_meerky', 240, 'supreme_plus', 15),
  makeHero('koko', 240, 'supreme_plus', 10),
  makeHero('korin', 240, 'supreme_plus', 10),
  makeHero('reinier', 240, 'supreme_plus', 10),
  makeHero('thoran', 240, 'supreme_plus', 10),
  makeHero('cassadee', 240, 'supreme_plus', 10),
  makeHero('shakir', 240, 'supreme_plus', 10),
];

const bosses = ['necrodrakon', 'king_croaker', 'skyclops', 'snow_stomper', 'lone_gaze', 'alpha_bear'];
bosses.forEach((bossId) => {
  runAndReport(`Test E: Dream Realm Boss (${bossId})`, testERoster, 'dream_realm', bossId);
});

// TEST F: Roster where strongest individual heroes do NOT form best team due to role/synergy conflicts
const testFRoster: PlayerHero[] = [
  // 5 high raw strength heroes but all pure squishy DPS (no frontline, no sustain)
  makeHero('cecia', 240, 'supreme_plus', 20),
  makeHero('dionel', 240, 'supreme_plus', 20),
  makeHero('atalanta', 240, 'supreme_plus', 20),
  makeHero('bonnie', 240, 'supreme_plus', 20),
  makeHero('bryon', 240, 'supreme_plus', 20),
  // Balanced cohesive heroes with lower individual stats
  makeHero('thoran', 240, 'mythic_plus', 5),
  makeHero('smokey_meerky', 240, 'mythic_plus', 5),
  makeHero('rowan', 240, 'mythic_plus', 5),
];
runAndReport('Test F: Raw Strength vs Role Balance & Synergy Conflict', testFRoster, 'campaign');
