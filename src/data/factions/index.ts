import type { Faction } from '@/types';

export const factions: Faction[] = [
  {
    id: 'lightbearer',
    name: 'Lightbearer',
    description:
      'The Lightbearer Empire. The largest faction, serving as the starter hero pool. Heroes united by faith and civilization.',
  },
  {
    id: 'mauler',
    name: 'Mauler',
    description:
      'The Mauler Tribe. Desert-dwelling warriors and beast-kin. The second largest faction, known for aggressive combat styles.',
  },
  {
    id: 'wilder',
    name: 'Wilder',
    description:
      'The Wilder faction. Forest-dwelling nature spirits and guardians. Known for versatile magic and support capabilities.',
  },
  {
    id: 'graveborn',
    name: 'Graveborn',
    description:
      'The Graveborn. Undead and corrupted souls. Specialize in dark magic, life drain, and battlefield manipulation.',
  },
  {
    id: 'hypogean',
    name: 'Hypogean',
    description:
      'The Hypogean. Demonic entities from below. A rare faction with powerful but niche heroes.',
  },
  {
    id: 'celestial',
    name: 'Celestial',
    description:
      'The Celestial faction. Divine and heavenly beings. Powerful in PvE, especially story and campaign battles.',
  },
  {
    id: 'dimensional',
    name: 'Dimensional',
    description:
      'The Dimensional faction. Crossover heroes from other universes. Includes collaboration characters.',
  },
];

export const factionsById: Record<string, Faction> = factions.reduce(
  (acc, f) => {
    acc[f.id] = f;
    return acc;
  },
  {} as Record<string, Faction>
);
