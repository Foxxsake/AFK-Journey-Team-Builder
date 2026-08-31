import { optimizeTeam } from './src/engine/TeamOptimizer';
import { heroes } from './src/data/heroes';
import { gameModesById } from './src/data/modes';
import { TEAM_OPTIMIZER_CONFIG } from './src/engine/config';
import { getAllBossProfiles } from './src/data/intelligence/modeIntelligence';

const roster = heroes.map(h => ({
  heroId: h.id,
  hero: h,
  roster: { owned: true, level: 240, progression: { ascension: 'supreme_plus' as any, exclusiveWeaponLevel: 15 } }
}));

const mode = gameModesById['dream_realm'];
const bosses = getAllBossProfiles();

for (const boss of bosses) {
  const result = optimizeTeam({
    heroes: roster,
    mode,
    bossId: boss.id,
    config: TEAM_OPTIMIZER_CONFIG,
    ownedCount: roster.length
  });
  console.log(`Boss: ${boss.id}`);
  console.log(`Heroes: ${result.team.map(t => t.hero.name).join(', ')}`);
}
