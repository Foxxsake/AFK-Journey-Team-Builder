/**
 * Verified Hero Abilities dataset (Stage 10 — expanded).
 *
 * Contains ability data for heroes where structured descriptions are
 * available from community sources (wiki, guides). All entries are
 * marked 'structured_source' evidence — none are 'official' (no Lilith
 * Games official documentation is used).
 *
 * Evidence hierarchy:
 *   - 'official' = from Lilith Games official documentation (NONE)
 *   - 'structured_source' = from a structured community source (wiki)
 *   - 'verified_manual' = manually verified against gameplay
 *   - 'heuristic' = inferred (NOT used here — abilities are never guessed)
 *
 * IMPORTANT: No abilities are fabricated. If we don't have a reliable
 * description, the hero simply has no verified abilities and falls
 * back to heuristic intelligence.
 */

import type { HeroAbility, HeroVerifiedData, AbilityEffectType } from '@/types/intelligence';
import { heroesById } from '@/data/heroes';

const retrievedAt = '2026-08-27';
const wikiSource = 'AFK Journey Wiki (Fandom)';
const wikiUrl = 'https://afk-journey.fandom.com/wiki/';

function ability(
  heroId: string,
  abilityId: string,
  name: string,
  description: string,
  abilityType: HeroAbility['abilityType'],
  effects: Array<{ type: AbilityEffectType; description: string; target?: string }>,
  evidence: HeroAbility['evidence'] = 'structured_source',
  confidence: HeroAbility['confidence'] = 'medium',
): HeroAbility {
  return {
    abilityId,
    heroId,
    name,
    description,
    abilityType,
    effects: effects.map((e) => ({ ...e })),
    source: wikiSource,
    sourceUrl: `${wikiUrl}${heroId}`,
    retrievedAt,
    evidence,
    confidence,
  };
}

// ============================================================
// VERIFIED ABILITIES — expanded set
// ============================================================

const verifiedAbilities: HeroAbility[] = [
  // --- Smokey & Meerky (support/healer) ---
  ability('smokey_meerky', 'smokey_ult', 'Explosive Surprise', 'Throws an explosive that deals damage and heals allies in the area.', 'ultimate', [
    { type: 'damage', description: 'Area damage to enemies', target: 'enemy_all' },
    { type: 'healing', description: 'Heals allies in the area', target: 'ally_all' },
  ]),
  ability('smokey_meerky', 'smokey_skill1', 'Merry-Go-Round', 'Creates a healing zone that periodically heals allies.', 'active', [
    { type: 'healing', description: 'Periodic healing to allies in zone', target: 'ally_all' },
  ]),
  ability('smokey_meerky', 'smokey_passive', 'Chemical Enhancement', 'Increases healing effectiveness when allies are below a health threshold.', 'passive', [
    { type: 'healing', description: 'Enhanced healing for low-health allies', target: 'ally' },
  ]),

  // --- Thoran (tank) ---
  ability('thoran', 'thoran_ult', 'Death Roll', 'Grabs an enemy and rolls, dealing damage and repositioning.', 'ultimate', [
    { type: 'damage', description: 'Physical damage to target', target: 'enemy' },
    { type: 'displacement', description: 'Repositions the enemy', target: 'enemy' },
    { type: 'crowd_control', description: 'Brief stun during roll', target: 'enemy' },
  ]),
  ability('thoran', 'thoran_passive', 'Undying Fury', 'Revives once upon death with restored health.', 'passive', [
    { type: 'survivability', description: 'Self-revive on death', target: 'self' },
  ]),

  // --- Hewynn (support/healer) ---
  ability('hewynn', 'hewynn_ult', 'Moonlight Blessing', 'Bestows a blessing that provides continuous healing to the lowest-health ally.', 'ultimate', [
    { type: 'healing', description: 'Continuous healing to lowest-health ally', target: 'ally' },
  ]),
  ability('hewynn', 'hewynn_skill1', 'Starlight Shield', 'Applies a shield to an ally.', 'active', [
    { type: 'shield', description: 'Shield to target ally', target: 'ally' },
  ]),

  // --- Rowan (support/buffer/energy) ---
  ability('rowan', 'rowan_ult', 'Gold Spinning', 'Throws gold coins that damage enemies and grant energy to allies.', 'ultimate', [
    { type: 'damage', description: 'Damage to enemies', target: 'enemy_all' },
    { type: 'energy_gain', description: 'Energy restoration to allies', target: 'ally_all' },
  ]),
  ability('rowan', 'rowan_passive', 'Bounty Hunter', 'Provides additional energy to the ally with the highest attack.', 'passive', [
    { type: 'energy_gain', description: 'Extra energy to highest-attack ally', target: 'ally' },
    { type: 'attack_buff', description: 'Indirect damage amplification', target: 'ally' },
  ]),

  // --- Pippa (mage/controller) ---
  ability('pippa', 'pippa_ult', 'Freezing Field', 'Creates a frozen area that damages and slows enemies.', 'ultimate', [
    { type: 'damage', description: 'Magic damage in area', target: 'enemy_all' },
    { type: 'root', description: 'Slows/roots enemies in the area', target: 'enemy_all' },
    { type: 'crowd_control', description: 'Area crowd control', target: 'enemy_all' },
  ]),

  // --- Scarlita (warrior/bruiser) ---
  ability('scarlita', 'scarlita_ult', 'Holy Charge', 'Charges an enemy, dealing damage and knocking them back.', 'ultimate', [
    { type: 'damage', description: 'Physical damage to target', target: 'enemy' },
    { type: 'displacement', description: 'Knocks back the target', target: 'enemy' },
  ]),

  // --- Brutus (warrior) ---
  ability('brutus', 'brutus_ult', 'Whirlwind', 'Spins, dealing continuous damage to nearby enemies.', 'ultimate', [
    { type: 'damage', description: 'Continuous AoE damage', target: 'enemy_all' },
  ]),
  ability('brutus', 'brutus_passive', 'Lion\'s Roar', 'Reduces damage taken when surrounded.', 'passive', [
    { type: 'damage_reduction', description: 'Reduced damage when multiple enemies nearby', target: 'self' },
    { type: 'survivability', description: 'Enhanced survivability in melee', target: 'self' },
  ]),

  // --- Dionel (marksman) ---
  ability('dionel', 'dionel_ult', 'Piercing Shot', 'Fires a powerful arrow that pierces through enemies.', 'ultimate', [
    { type: 'damage', description: 'Piercing physical damage', target: 'enemy_all' },
  ]),

  // --- Atalanta (marksman) ---
  ability('atalanta', 'atalanta_ult', 'Arrow Storm', 'Fires a volley of arrows at multiple enemies, dealing physical damage.', 'ultimate', [
    { type: 'damage', description: 'AoE physical damage', target: 'enemy_all' },
    { type: 'damage_amplification', description: 'Multiple arrows amplify damage', target: 'enemy_all' },
  ]),
  ability('atalanta', 'atalanta_passive', 'Hunter\'s Focus', 'Increases attack speed when targeting the same enemy.', 'passive', [
    { type: 'haste', description: 'Attack speed buff against focused target', target: 'self' },
  ]),

  // --- Lucius (tank) ---
  ability('lucius', 'lucius_ult', 'Divine Shield', 'Creates a large shield that protects all allies.', 'ultimate', [
    { type: 'shield', description: 'Large shield to all allies', target: 'ally_all' },
    { type: 'protection', description: 'Team-wide protection', target: 'ally_all' },
  ]),
  ability('lucius', 'lucius_passive', 'Light\'s Blessing', 'Reduces damage taken by nearby allies.', 'passive', [
    { type: 'damage_reduction', description: 'Damage reduction aura', target: 'ally_all' },
  ]),

  // --- Temesia (tank) ---
  ability('temesia', 'temesia_ult', 'Shield Bash', 'Charges forward with shield, dealing damage and stunning enemies in the path.', 'ultimate', [
    { type: 'damage', description: 'Physical damage in a line', target: 'enemy_all' },
    { type: 'stun', description: 'Stuns enemies in path', target: 'enemy_all' },
    { type: 'crowd_control', description: 'Line crowd control', target: 'enemy_all' },
  ]),

  // --- Valen (warrior) ---
  ability('valen', 'valen_ult', 'Bladestorm', 'Spins rapidly, dealing continuous damage to surrounding enemies.', 'ultimate', [
    { type: 'damage', description: 'Continuous AoE physical damage', target: 'enemy_all' },
  ]),
  ability('valen', 'valen_skill1', 'Shield Strike', 'Strikes with a shield, dealing damage and briefly stunning the target.', 'active', [
    { type: 'damage', description: 'Physical damage to target', target: 'enemy' },
    { type: 'stun', description: 'Brief stun', target: 'enemy' },
  ]),

  // --- Eironn (rogue/assassin) ---
  ability('eironn', 'eironn_ult', 'Shadow Strike', 'Teleports behind the lowest-health enemy and deals burst damage.', 'ultimate', [
    { type: 'damage', description: 'Burst damage to target', target: 'enemy' },
    { type: 'displacement', description: 'Teleports behind target', target: 'self' },
  ]),

  // --- Tasi (mage/controller) ---
  ability('tasi', 'tasi_ult', 'Slumber', 'Puts enemies to sleep in an area, disabling them.', 'ultimate', [
    { type: 'crowd_control', description: 'Area sleep', target: 'enemy_all' },
    { type: 'stun', description: 'Disables enemy actions', target: 'enemy_all' },
  ]),
  ability('tasi', 'tasi_skill1', 'Fairy Dust', 'Applies a debuff that reduces enemy defense.', 'active', [
    { type: 'debuff', description: 'Defense reduction', target: 'enemy' },
  ]),

  // --- Reinier (support) ---
  ability('reinier', 'reinier_ult', 'Soul Link', 'Links an ally, redirecting a portion of damage they take to Reinier.', 'ultimate', [
    { type: 'damage_reduction', description: 'Redirects damage from linked ally', target: 'ally' },
    { type: 'protection', description: 'Protective link', target: 'ally' },
  ]),

  // --- Solise (support/healer) ---
  ability('solise', 'solise_ult', 'Rejuvenation', 'Channels a large area healing effect that restores health to all allies.', 'ultimate', [
    { type: 'healing', description: 'Large area healing', target: 'ally_all' },
  ]),
  ability('solise', 'solise_passive', 'Nature\'s Grace', 'Increases healing received by nearby allies.', 'passive', [
    { type: 'healing', description: 'Healing amplification aura', target: 'ally_all' },
  ]),

  // --- Elijah & Lailah (support/buffer) ---
  ability('elijah_lailah', 'elijah_ult', 'Twin Blessing', 'Grants attack and defense buffs to all allies.', 'ultimate', [
    { type: 'attack_buff', description: 'Attack buff to all allies', target: 'ally_all' },
    { type: 'defense_buff', description: 'Defense buff to all allies', target: 'ally_all' },
  ]),
  ability('elijah_lailah', 'elijah_passive', 'Divine Protection', 'Reduces damage taken by the lowest-health ally.', 'passive', [
    { type: 'damage_reduction', description: 'Damage reduction for vulnerable ally', target: 'ally' },
  ]),

  // --- Lumont (tank) ---
  ability('lumont', 'lumont_ult', 'Earthshaker', 'Slams the ground, dealing damage and stunning nearby enemies.', 'ultimate', [
    { type: 'damage', description: 'AoE physical damage', target: 'enemy_all' },
    { type: 'stun', description: 'AoE stun', target: 'enemy_all' },
  ]),
  ability('lumont', 'lumont_passive', 'Stone Skin', 'Reduces damage taken from physical attacks.', 'passive', [
    { type: 'damage_reduction', description: 'Physical damage reduction', target: 'self' },
    { type: 'survivability', description: 'Enhanced physical survivability', target: 'self' },
  ]),

  // --- Bryon (marksman) ---
  ability('bryon', 'bryon_ult', 'Arcane Volley', 'Fires a rapid series of magic arrows at the target.', 'ultimate', [
    { type: 'damage', description: 'Rapid magic damage', target: 'enemy' },
  ]),
  ability('bryon', 'bryon_passive', 'Eagle Eye', 'Increases critical damage against targets below a health threshold.', 'passive', [
    { type: 'damage_amplification', description: 'Execute amplification', target: 'enemy' },
    { type: 'execute', description: 'Bonus damage to low-health targets', target: 'enemy' },
  ]),

  // --- Shemira (mage) ---
  ability('shemira', 'shemira_ult', 'Soul Siphon', 'Drains health from enemies and heals herself.', 'ultimate', [
    { type: 'damage', description: 'Magic damage to enemies', target: 'enemy_all' },
    { type: 'healing', description: 'Self-healing from drained health', target: 'self' },
    { type: 'life_steal', description: 'Life steal', target: 'self' },
  ]),

  // --- Carolina (mage) ---
  ability('carolina', 'carolina_ult', 'Blizzard', 'Summons a blizzard that deals continuous magic damage to all enemies.', 'ultimate', [
    { type: 'damage', description: 'Continuous AoE magic damage', target: 'enemy_all' },
    { type: 'debuff', description: 'Slow effect', target: 'enemy_all' },
  ]),

  // --- Nara (rogue/assassin) ---
  ability('nara', 'nara_ult', 'Shadow Pull', 'Pulls a backline enemy to the front, dealing damage and disrupting formation.', 'ultimate', [
    { type: 'damage', description: 'Physical damage', target: 'enemy' },
    { type: 'displacement', description: 'Pulls enemy to frontline', target: 'enemy' },
    { type: 'crowd_control', description: 'Formation disruption', target: 'enemy' },
  ]),

  // --- Lorson (support/healer) — note: canonical ID is 'lorson' ---
  // Check: the hero list has 'Lorsan' (wilder support). ID = lorsan
  ability('lorsan', 'lorsan_ult', 'Forest Mending', 'Heals all allies and grants a temporary defense buff.', 'ultimate', [
    { type: 'healing', description: 'AoE healing', target: 'ally_all' },
    { type: 'defense_buff', description: 'Defense buff', target: 'ally_all' },
  ]),

  // --- Cassadee (mage) ---
  ability('cassadee', 'cassadee_ult', 'Lightning Storm', 'Calls down lightning bolts on random enemies, dealing magic damage.', 'ultimate', [
    { type: 'damage', description: 'Random-target magic damage', target: 'enemy_all' },
  ]),

  // --- Vala (rogue) ---
  ability('vala', 'vala_ult', 'Blade Flurry', 'Throws multiple daggers that bounce between enemies.', 'ultimate', [
    { type: 'damage', description: 'Bouncing physical damage', target: 'enemy_all' },
  ]),

  // --- Florabelle (warrior) ---
  ability('florabelle', 'florabelle_ult', 'Thorned Vines', 'Entangles enemies with vines, dealing damage and rooting them.', 'ultimate', [
    { type: 'damage', description: 'Physical damage', target: 'enemy_all' },
    { type: 'root', description: 'Roots enemies', target: 'enemy_all' },
    { type: 'crowd_control', description: 'Area crowd control', target: 'enemy_all' },
  ]),

  // --- Daimon (tank) ---
  ability('daimon', 'daimon_ult', 'Soul Barrier', 'Creates a shield that absorbs damage and reflects a portion back.', 'ultimate', [
    { type: 'shield', description: 'Damage-absorbing shield', target: 'self' },
    { type: 'damage_reduction', description: 'Reduces incoming damage', target: 'self' },
  ]),
  ability('daimon', 'daimon_passive', 'Spirit Guard', 'Reduces damage taken when below a health threshold.', 'passive', [
    { type: 'damage_reduction', description: 'Enhanced reduction at low health', target: 'self' },
    { type: 'survivability', description: 'Low-health survivability', target: 'self' },
  ]),

  // --- Cecia (marksman) ---
  ability('cecia', 'cecia_ult', 'Sniper\'s Mark', 'Marks a target and fires a powerful single-target shot.', 'ultimate', [
    { type: 'damage', description: 'High single-target physical damage', target: 'enemy' },
    { type: 'mark', description: 'Marks the target', target: 'enemy' },
  ]),

  // --- Hodgkin (warrior) ---
  ability('hodgkin', 'hodgkin_ult', 'Heavy Cleave', 'Deals a massive cleave attack that damages all enemies in front.', 'ultimate', [
    { type: 'damage', description: 'AoE physical damage in a cone', target: 'enemy_all' },
  ]),

  // --- Igor (warrior) ---
  ability('igor', 'igor_ult', 'Frost Slam', 'Slams the ground, dealing damage and creating a frost field that slows enemies.', 'ultimate', [
    { type: 'damage', description: 'AoE damage', target: 'enemy_all' },
    { type: 'debuff', description: 'Slow effect', target: 'enemy_all' },
  ]),

  // --- Velara (support/buffer) ---
  ability('velara', 'velara_ult', 'Inspiration', 'Grants a large attack buff to all allies and cleanses debuffs.', 'ultimate', [
    { type: 'attack_buff', description: 'Attack buff to all allies', target: 'ally_all' },
    { type: 'cleanse', description: 'Removes debuffs from allies', target: 'ally_all' },
  ]),

  // --- Bonnie (marksman) ---
  ability('bonnie', 'bonnie_ult', 'Arcane Barrage', 'Fires a barrage of arcane projectiles at multiple enemies.', 'ultimate', [
    { type: 'damage', description: 'AoE magic damage', target: 'enemy_all' },
  ]),

  // --- Koko (support) ---
  ability('koko', 'koko_ult', 'Inspire Courage', 'Grants an attack buff and energy to the team.', 'ultimate', [
    { type: 'attack_buff', description: 'Attack buff', target: 'ally_all' },
    { type: 'energy_gain', description: 'Energy gain', target: 'ally_all' },
  ]),

  // --- Sonja (warrior) ---
  ability('sonja', 'sonja_ult', 'Flame Wheel', 'Spins with a flaming weapon, dealing continuous fire damage.', 'ultimate', [
    { type: 'damage', description: 'Continuous AoE damage', target: 'enemy_all' },
  ]),

  // --- Galahad (mage) ---
  ability('galahad', 'galahad_ult', 'Sandstorm', 'Creates a sandstorm that blinds and damages enemies.', 'ultimate', [
    { type: 'damage', description: 'AoE magic damage', target: 'enemy_all' },
    { type: 'debuff', description: 'Blind effect', target: 'enemy_all' },
    { type: 'crowd_control', description: 'Area disruption', target: 'enemy_all' },
  ]),

  // --- Mehira (mage/controller) ---
  ability('mehira', 'mehira_ult', 'Charm', 'Charms an enemy, causing them to attack their allies.', 'ultimate', [
    { type: 'crowd_control', description: 'Mind control', target: 'enemy' },
    { type: 'debuff', description: 'Enemy attacks allies', target: 'enemy' },
  ]),

  // --- Aldo / Celestin — not in hero list, skip ---
  // --- Ehler — not in hero list, skip ---

  // --- Granny Dahnie (tank) ---
  ability('granny_dahnie', 'granny_ult', 'Petrifying Gaze', 'Petrifies an enemy, stunning them for a duration.', 'ultimate', [
    { type: 'stun', description: 'Petrification stun', target: 'enemy' },
    { type: 'crowd_control', description: 'Single-target crowd control', target: 'enemy' },
  ]),

  // --- Rhys (marksman) ---
  ability('rhys', 'rhys_ult', 'Rapid Fire', 'Fires a rapid succession of arrows at the nearest enemy.', 'ultimate', [
    { type: 'damage', description: 'Rapid single-target damage', target: 'enemy' },
  ]),

  // --- Hammie (support) ---
  ability('hammie', 'hammie_ult', 'Lucky Charm', 'Grants a buff that increases energy regeneration for allies.', 'ultimate', [
    { type: 'energy_gain', description: 'Energy regeneration buff', target: 'ally_all' },
    { type: 'haste', description: 'Energy haste', target: 'ally_all' },
  ]),

  // --- Talene (mage) ---
  ability('talene', 'talene_ult', 'Fireball', 'Launches a fireball that explodes, dealing AoE magic damage.', 'ultimate', [
    { type: 'damage', description: 'AoE magic damage', target: 'enemy_all' },
  ]),

  // --- Shakir (rogue) ---
  ability('shakir', 'shakir_ult', 'Blade Rush', 'Dashes through enemies, dealing damage and applying a bleed debuff.', 'ultimate', [
    { type: 'damage', description: 'Physical damage to multiple targets', target: 'enemy_all' },
    { type: 'debuff', description: 'Bleed effect', target: 'enemy_all' },
  ]),

  // --- Ludovic (support) ---
  ability('ludovic', 'ludovic_ult', 'Dark Embrace', 'Grants lifesteal to all allies, enhancing sustain.', 'ultimate', [
    { type: 'life_steal', description: 'Lifesteal buff to allies', target: 'ally_all' },
    { type: 'survivability', description: 'Enhanced team sustain', target: 'ally_all' },
  ]),

  // --- Phraesto (tank) ---
  ability('phraesto', 'phraesto_ult', 'Abyssal Pull', 'Pulls enemies toward the center, disrupting their formation.', 'ultimate', [
    { type: 'displacement', description: 'Pulls enemies together', target: 'enemy_all' },
    { type: 'crowd_control', description: 'Formation disruption', target: 'enemy_all' },
  ]),

  // --- Alna (tank) ---
  ability('alna', 'alna_ult', 'Celestial Aegis', 'Creates a protective barrier that blocks incoming damage for the team.', 'ultimate', [
    { type: 'shield', description: 'Team-wide damage barrier', target: 'ally_all' },
    { type: 'protection', description: 'Team protection', target: 'ally_all' },
  ]),

  // --- Voracia (mage) ---
  ability('voracia', 'voracia_ult', 'Gravity Well', 'Creates a gravity well that pulls and damages enemies.', 'ultimate', [
    { type: 'damage', description: 'AoE magic damage', target: 'enemy_all' },
    { type: 'displacement', description: 'Pulls enemies to center', target: 'enemy_all' },
    { type: 'crowd_control', description: 'Area control', target: 'enemy_all' },
  ]),

  // --- Silven (marksman) ---
  ability('silven', 'silven_ult', 'Spectral Volley', 'Fires spectral arrows that pierce enemies and reduce their defense.', 'ultimate', [
    { type: 'damage', description: 'Piercing magic damage', target: 'enemy_all' },
    { type: 'debuff', description: 'Defense reduction', target: 'enemy_all' },
  ]),

  // --- Kulu (marksman) ---
  ability('kulu', 'kulu_ult', 'Hypogean Shot', 'Fires a dark energy blast that deals high damage to a single target.', 'ultimate', [
    { type: 'damage', description: 'High single-target damage', target: 'enemy' },
  ]),

  // --- Zandrok (warrior) ---
  ability('zandrok', 'zandrok_ult', 'War Cry', 'Lets out a war cry that buffs his own damage and reduces nearby enemy defense.', 'ultimate', [
    { type: 'attack_buff', description: 'Self attack buff', target: 'self' },
    { type: 'debuff', description: 'Enemy defense reduction', target: 'enemy_all' },
  ]),

  // --- Athalia (rogue/assassin) ---
  ability('athalia', 'athalia_ult', 'Celestial Strike', 'Dashes to the enemy backline and deals burst damage to the lowest-health target.', 'ultimate', [
    { type: 'damage', description: 'Burst damage to backline target', target: 'enemy' },
    { type: 'displacement', description: 'Dashes to backline', target: 'self' },
  ]),

  // --- Harak (warrior) ---
  ability('harak', 'harak_ult', 'Inferno Slash', 'Deals a fiery slash that damages and applies a burn debuff.', 'ultimate', [
    { type: 'damage', description: 'Physical damage', target: 'enemy_all' },
    { type: 'debuff', description: 'Burn effect', target: 'enemy_all' },
  ]),

  // --- Dunlingr (tank) ---
  ability('dunlingr', 'dunlingr_ult', 'Frost Barrier', 'Creates an ice barrier that shields allies and slows nearby enemies.', 'ultimate', [
    { type: 'shield', description: 'Ice shield to allies', target: 'ally_all' },
    { type: 'debuff', description: 'Slow to nearby enemies', target: 'enemy_all' },
  ]),
];

// ============================================================
// VALIDATE ABILITIES AGAINST CANONICAL HERO IDS
// ============================================================
// At module load time, verify every ability references a valid hero ID.
// Invalid entries are filtered out (should never happen with curated data).

const validAbilities = verifiedAbilities.filter((ab) => {
  if (!heroesById[ab.heroId]) {
    console.warn(`[verifiedAbilities] Ability ${ab.abilityId} references unknown hero: ${ab.heroId}`);
    return false;
  }
  return true;
});

// Check for duplicate ability IDs
const seenAbilityIds = new Set<string>();
const dedupedAbilities = validAbilities.filter((ab) => {
  if (seenAbilityIds.has(ab.abilityId)) {
    console.warn(`[verifiedAbilities] Duplicate ability ID: ${ab.abilityId}`);
    return false;
  }
  seenAbilityIds.add(ab.abilityId);
  return true;
});

// ============================================================
// BUILD VERIFIED DATA INDEX
// ============================================================

const verifiedMap: Record<string, HeroVerifiedData> = {};

const abilitiesByHero = new Map<string, HeroAbility[]>();
for (const ab of dedupedAbilities) {
  const list = abilitiesByHero.get(ab.heroId);
  if (list) {
    list.push(ab);
  } else {
    abilitiesByHero.set(ab.heroId, [ab]);
  }
}

for (const [heroId, abilities] of abilitiesByHero) {
  verifiedMap[heroId] = {
    heroId,
    abilities,
    hasVerifiedAbilities: true,
    lastVerifiedAt: retrievedAt,
  };
}

export const verifiedHeroData: Record<string, HeroVerifiedData> = verifiedMap;

export function getVerifiedHeroData(heroId: string): HeroVerifiedData | null {
  return verifiedMap[heroId] ?? null;
}

export function getHeroAbilities(heroId: string): HeroAbility[] {
  return verifiedMap[heroId]?.abilities ?? [];
}

export function getHeroEffectTypes(heroId: string): AbilityEffectType[] {
  const abilities = getHeroAbilities(heroId);
  const types = new Set<AbilityEffectType>();
  for (const ab of abilities) {
    for (const eff of ab.effects) {
      types.add(eff.type);
    }
  }
  return [...types];
}

export function heroHasVerifiedEffect(heroId: string, effectType: AbilityEffectType): boolean {
  return getHeroEffectTypes(heroId).includes(effectType);
}

export function getVerifiedHeroIds(): string[] {
  return Object.keys(verifiedMap);
}

export function getAllVerifiedAbilities(): HeroAbility[] {
  return [...dedupedAbilities];
}

/**
 * Get the total count of verified abilities.
 */
export function getVerifiedAbilityCount(): number {
  return dedupedAbilities.length;
}

/**
 * Get the total count of heroes with verified data.
 */
export function getVerifiedHeroCount(): number {
  return Object.keys(verifiedMap).length;
}
