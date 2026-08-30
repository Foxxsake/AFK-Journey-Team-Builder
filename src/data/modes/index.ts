import type { GameMode } from '@/types';

export const gameModes: GameMode[] = [
  {
    id: 'campaign',
    name: 'Campaign',
    description: 'The main PvE story campaign progression.',
    teamSize: 5,
    formationRequired: true,
  },
  {
    id: 'arena',
    name: 'Arena (PvP)',
    description: 'Player-versus-player ranked battles.',
    teamSize: 5,
    formationRequired: true,
  },
  {
    id: 'dream_realm',
    name: 'Dream Realm',
    description: 'Boss-focused PvE mode with high HP targets.',
    teamSize: 5,
    formationRequired: true,
  },
  {
    id: 'honor_duel',
    name: 'Honor Duel',
    description: 'Rotating PvP ruleset with restrictions.',
    teamSize: 5,
    formationRequired: true,
  },
  {
    id: 'supreme_arena',
    name: 'Supreme Arena',
    description: 'Top-tier PvP competitive mode.',
    teamSize: 5,
    formationRequired: true,
  },
  {
    id: 'abyssal_expedition',
    name: 'Abyssal Expedition',
    description: 'Seasonal large-scale PvE event.',
    teamSize: 5,
    formationRequired: false,
  },
];

export const gameModesById: Record<string, GameMode> = gameModes.reduce(
  (acc, mode) => {
    acc[mode.id] = mode;
    return acc;
  },
  {} as Record<string, GameMode>
);
