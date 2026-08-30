import type { Formation, SourceConfidence } from '@/types';

/**
 * AFK Journey formation data.
 *
 * The exact formation grid layouts in AFK Journey use a hex-based
 * battlefield with front and back rows. The specific slot positions
 * (row, column, x, y) below are a PROVISIONAL representation based
 * on publicly available game information showing a 2-row, 5-slot
 * layout. They are NOT verified against official game documentation.
 *
 * Confidence is marked as "low" for all formations until official
 * or high-quality community sources confirm the exact layout.
 *
 * Each formation uses a coordinate system where:
 *   - row 0 = front row (closer to enemy)
 *   - row 1 = back row (further from enemy)
 *   - x = horizontal position (0 = leftmost)
 *   - y = vertical position (0 = front, 1 = back)
 *
 * If the game's formation system is verified to differ, update this
 * file — the rest of the app reads from this structure.
 */

const formationSource = 'AFK Journey Wiki (Fandom) — provisional';
const formationConfidence: SourceConfidence = 'low';
const lastUpdated = '2026-08-27';

export const formations: Formation[] = [
  {
    id: 'standard_5_front2_back3',
    name: 'Standard (2 Front, 3 Back)',
    modeIds: ['campaign', 'arena', 'honor_duel', 'supreme_arena'],
    slots: [
      { id: 's1', position: 1, row: 0, column: 0, x: 1, y: 0, frontBack: 'front', roleHint: 'tank' },
      { id: 's2', position: 2, row: 0, column: 1, x: 3, y: 0, frontBack: 'front', roleHint: 'tank' },
      { id: 's3', position: 3, row: 1, column: 0, x: 0, y: 1, frontBack: 'back', roleHint: 'damage' },
      { id: 's4', position: 4, row: 1, column: 1, x: 2, y: 1, frontBack: 'back', roleHint: 'damage' },
      { id: 's5', position: 5, row: 1, column: 2, x: 4, y: 1, frontBack: 'back', roleHint: 'support' },
    ],
    description: 'Two frontline tanks protecting three backline heroes.',
    source: formationSource,
    sourceUrl: 'https://afk-journey.fandom.com',
    confidence: formationConfidence,
    lastUpdated,
  },
  {
    id: 'standard_5_front3_back2',
    name: 'Standard (3 Front, 2 Back)',
    modeIds: ['campaign', 'arena', 'honor_duel', 'supreme_arena', 'abyssal_expedition'],
    slots: [
      { id: 's1', position: 1, row: 0, column: 0, x: 0, y: 0, frontBack: 'front', roleHint: 'tank' },
      { id: 's2', position: 2, row: 0, column: 1, x: 2, y: 0, frontBack: 'front', roleHint: 'damage' },
      { id: 's3', position: 3, row: 0, column: 2, x: 4, y: 0, frontBack: 'front', roleHint: 'tank' },
      { id: 's4', position: 4, row: 1, column: 0, x: 1, y: 1, frontBack: 'back', roleHint: 'damage' },
      { id: 's5', position: 5, row: 1, column: 1, x: 3, y: 1, frontBack: 'back', roleHint: 'support' },
    ],
    description: 'Three frontline heroes with two backline damage/support.',
    source: formationSource,
    sourceUrl: 'https://afk-journey.fandom.com',
    confidence: formationConfidence,
    lastUpdated,
  },
  {
    id: 'dream_realm_boss_5',
    name: 'Dream Realm Boss (5)',
    modeIds: ['dream_realm'],
    slots: [
      { id: 's1', position: 1, row: 0, column: 0, x: 1, y: 0, frontBack: 'front', roleHint: 'tank' },
      { id: 's2', position: 2, row: 0, column: 1, x: 3, y: 0, frontBack: 'front', roleHint: 'damage' },
      { id: 's3', position: 3, row: 1, column: 0, x: 0, y: 1, frontBack: 'back', roleHint: 'damage' },
      { id: 's4', position: 4, row: 1, column: 1, x: 2, y: 1, frontBack: 'back', roleHint: 'buffer' },
      { id: 's5', position: 5, row: 1, column: 2, x: 4, y: 1, frontBack: 'back', roleHint: 'debuffer' },
    ],
    description: 'Single-target DPS optimised layout for boss fights.',
    source: formationSource,
    sourceUrl: 'https://afk-journey.fandom.com',
    confidence: formationConfidence,
    lastUpdated,
  },
];

export const formationsById: Record<string, Formation> = formations.reduce(
  (acc, f) => {
    acc[f.id] = f;
    return acc;
  },
  {} as Record<string, Formation>
);

export function getFormationsForMode(modeId: string): Formation[] {
  return formations.filter((f) => f.modeIds.includes(modeId));
}
