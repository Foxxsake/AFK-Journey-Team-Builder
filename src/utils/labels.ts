import type { Faction, HeroClass, HeroRole, HeroRarity, DamageType, AscensionTier, SourceConfidence } from '@/types';

export const FACTION_LABELS: Record<string, string> = {
  lightbearer: 'Lightbearer',
  mauler: 'Mauler',
  wilder: 'Wilder',
  graveborn: 'Graveborn',
  hypogean: 'Hypogean',
  celestial: 'Celestial',
  dimensional: 'Dimensional',
};

export const CLASS_LABELS: Record<HeroClass, string> = {
  warrior: 'Warrior',
  tank: 'Tank',
  marksman: 'Marksman',
  mage: 'Mage',
  rogue: 'Rogue',
  support: 'Support',
};

export const ROLE_LABELS: Record<HeroRole, string> = {
  tank: 'Tank',
  damage: 'Damage',
  support: 'Support',
  healer: 'Healer',
  control: 'Control',
  buffer: 'Buffer',
  debuffer: 'Debuffer',
  summoner: 'Summoner',
};

export const RARITY_LABELS: Record<HeroRarity, string> = {
  s_level: 'S-Level',
  a_level: 'A-Level',
  rare_level: 'Rare',
};

export const DAMAGE_TYPE_LABELS: Record<DamageType, string> = {
  physical: 'Physical',
  magic: 'Magic',
};

export const ASCENSION_LABELS: Record<AscensionTier, string> = {
  elite: 'Elite',
  elite_plus: 'Elite+',
  legendary: 'Legendary',
  legendary_plus: 'Legendary+',
  mythic: 'Mythic',
  mythic_plus: 'Mythic+',
  ascended: 'Ascended',
  ascended_1: 'Ascended +1',
  ascended_2: 'Ascended +2',
  ascended_3: 'Ascended +3',
  ascended_4: 'Ascended +4',
  ascended_5: 'Ascended +5',
};

export const ASCENSION_ORDER: AscensionTier[] = [
  'elite',
  'elite_plus',
  'legendary',
  'legendary_plus',
  'mythic',
  'mythic_plus',
  'ascended',
  'ascended_1',
  'ascended_2',
  'ascended_3',
  'ascended_4',
  'ascended_5',
];

export const CONFIDENCE_LABELS: Record<SourceConfidence, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  unknown: 'Unknown',
};

export const CONFIDENCE_COLORS: Record<SourceConfidence, string> = {
  high: 'text-emerald-400',
  medium: 'text-amber-400',
  low: 'text-orange-400',
  unknown: 'text-slate-500',
};

export const FACTION_COLORS: Record<string, string> = {
  lightbearer: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  mauler: 'text-red-400 bg-red-500/10 border-red-500/20',
  wilder: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  graveborn: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  hypogean: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  celestial: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  dimensional: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
};

export const RARITY_COLORS: Record<HeroRarity, string> = {
  s_level: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  a_level: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  rare_level: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
};
