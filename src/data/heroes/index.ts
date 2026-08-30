import type { Hero } from '@/types';

/**
 * AFK Journey hero database.
 *
 * Source: AFK Journey Wiki (Fandom) — https://afk-journey.fandom.com/wiki/Hero/List
 * Data extracted: August 26, 2026
 * Confidence: High (verified against wiki table)
 *
 * 124 playable heroes with verified: name, rarity, faction, class,
 * damage type, range, release date, and release version.
 *
 * INCOMPLETE FIELDS (intentionally left empty — not invented):
 *   - roles[]: Will be assigned per-hero after verifying against guides
 *   - skills[]: Will be populated from individual hero wiki pages
 *   - stats: Numerical stat values not yet extracted
 *   - synergies[]: Will be determined through gameplay analysis
 *   - counters[]: Will be determined through gameplay analysis
 *   - modeRatings[]: Will be populated from tier list data
 *   - description: Hero lore descriptions not yet extracted
 *   - imageUrl/thumbnailUrl: No copyrighted images redistributed
 *
 * DO NOT invent values for any of these fields.
 */
const fandomSource = {
  sourceName: 'AFK Journey Wiki (Fandom)',
  url: 'https://afk-journey.fandom.com/wiki/Hero/List',
  lastUpdated: '2026-08-26',
  confidence: 'high' as const,
};

const lastUpdated = '2026-08-26';

function h(
  name: string,
  rarity: Hero['rarity'],
  faction: Hero['faction'],
  heroClass: Hero['class'],
  damageType: Hero['damageType'],
  range: number,
  releaseDate: string,
  releaseVersion: string
): Hero {
  return {
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
    name,
    faction,
    class: heroClass,
    roles: [],
    rarity,
    damageType,
    range,
    sources: [fandomSource],
    releaseDate,
    releaseVersion,
    lastUpdated,
  };
}

export const heroes: Hero[] = [
  h('Aliceth', 's_level', 'celestial', 'marksman', 'physical', 8, 'September 26, 2025', '1.5.1'),
  h('Alna', 's_level', 'celestial', 'tank', 'physical', 1, 'January 08, 2026', '1.5.4'),
  h('Alsa', 's_level', 'mauler', 'mage', 'magic', 6, 'May 10, 2024', '1.1.14'),
  h('Antandra', 'a_level', 'mauler', 'tank', 'physical', 1, 'March 27, 2024', '1.0.8'),
  h('Arden', 'a_level', 'wilder', 'mage', 'magic', 5, 'March 27, 2024', '1.0'),
  h('Atalanta', 's_level', 'lightbearer', 'marksman', 'physical', 4, 'March 27, 2024', '1.0'),
  h('Athalia', 's_level', 'celestial', 'rogue', 'physical', 1, 'March 27, 2025', '1.3.3'),
  h('Aurora', 's_level', 'celestial', 'mage', 'magic', 5, 'January 30, 2026', '1.6.1'),
  h('Baelran', 's_level', 'celestial', 'warrior', 'physical', 1, 'June 26, 2025', '1.4.2'),
  h('Berial', 's_level', 'hypogean', 'rogue', 'magic', 1, 'March 27, 2024', '1.0.7'),
  h('Bonnie', 'a_level', 'graveborn', 'marksman', 'magic', 7, 'December 31, 2024', '1.2.4'),
  h('Brutus', 's_level', 'mauler', 'warrior', 'physical', 1, 'March 27, 2024', '1.0'),
  h('Bryon', 's_level', 'wilder', 'marksman', 'magic', 5, 'March 27, 2024', '1.0.3'),
  h('Callan', 'a_level', 'graveborn', 'tank', 'magic', 1, 'February 13, 2025', '1.3.1'),
  h('Carolina', 's_level', 'graveborn', 'mage', 'magic', 4, 'March 27, 2024', '1.0'),
  h('Cassadee', 's_level', 'lightbearer', 'mage', 'magic', 3, 'March 27, 2024', '1.0'),
  h('Cecia', 's_level', 'graveborn', 'marksman', 'physical', 5, 'March 27, 2024', '1.0'),
  h('Chippy', 'rare_level', 'lightbearer', 'tank', 'physical', 1, 'March 27, 2024', '1.0'),
  h('Contess', 's_level', 'hypogean', 'support', 'magic', 6, 'April 09, 2026', '1.6.3'),
  h('Cryonaia', 's_level', 'hypogean', 'mage', 'magic', 5, 'February 19, 2025', '1.3.2'),
  h('Cyran', 's_level', 'lightbearer', 'mage', 'magic', 6, 'February 26, 2025', '1.3.2'),
  h('Daimon', 's_level', 'graveborn', 'tank', 'magic', 3, 'June 05, 2025', '1.4.1'),
  h('Damian', 'a_level', 'wilder', 'support', 'magic', 20, 'March 27, 2024', '1.0'),
  h('Dionel', 's_level', 'celestial', 'marksman', 'physical', 5, 'March 27, 2024', '1.0.9'),
  h('Dunlingr', 's_level', 'celestial', 'tank', 'magic', 1, 'September 09, 2024', '1.2.1'),
  h('Eironn', 's_level', 'wilder', 'rogue', 'magic', 1, 'March 27, 2024', '1.0'),
  h('Elijah & Lailah', 's_level', 'celestial', 'support', 'magic', 6, 'January 22, 2025', '1.3.1'),
  h('Evie', 'a_level', 'lightbearer', 'support', 'magic', 20, 'May 07, 2026', '1.6.4'),
  h('Faramor', 'a_level', 'wilder', 'rogue', 'physical', 1, 'April 02, 2025', '1.3.3'),
  h('Fay', 'a_level', 'lightbearer', 'support', 'magic', 3, 'March 27, 2024', '1.0'),
  h('Florabelle', 's_level', 'wilder', 'warrior', 'physical', 5, 'April 16, 2024', '1.0'),
  h('Frieren', 's_level', 'dimensional', 'mage', 'magic', 7, 'May 01, 2026', '1.6.3'),
  h('Galahad', 's_level', 'mauler', 'mage', 'magic', 10, 'December 18, 2025', '1.5.3'),
  h('Gerda', 'a_level', 'mauler', 'tank', 'physical', 1, 'March 13, 2025', '1.3.2'),
  h('Granny Dahnie', 's_level', 'wilder', 'tank', 'physical', 1, 'March 27, 2024', '1.0'),
  h('Gunnar', 's_level', 'hypogean', 'tank', 'physical', 20, 'March 05, 2026', '1.6.2'),
  h('Gwyneth', 's_level', 'lightbearer', 'marksman', 'physical', 8, 'May 29, 2026', '1.7.1'),
  h('Hammie', 'rare_level', 'lightbearer', 'support', 'magic', 5, 'March 27, 2024', '1.0'),
  h('Harak', 's_level', 'hypogean', 'warrior', 'physical', 1, 'November 19, 2024', '1.2.3'),
  h('Hepler', 's_level', 'mauler', 'tank', 'physical', 1, 'April 09, 2026', '1.6.3'),
  h('Hewynn', 's_level', 'wilder', 'support', 'magic', 4, 'March 27, 2024', '1.0'),
  h('Himmel', 'a_level', 'dimensional', 'warrior', 'physical', 1, 'May 01, 2026', '1.6.3'),
  h('Hodgkin', 's_level', 'graveborn', 'warrior', 'physical', 1, 'November 11, 2024', '1.2.2'),
  h('Hugin', 'a_level', 'lightbearer', 'support', 'physical', 20, 'December 17, 2024', '1.2.3'),
  h('Igor', 's_level', 'graveborn', 'warrior', 'physical', 10, 'March 27, 2024', '1.0'),
  h('Indris', 's_level', 'wilder', 'marksman', 'physical', 15, 'May 23, 2025', '1.4.1'),
  h('Isabella', 'a_level', 'graveborn', 'support', 'magic', 5, 'October 10, 2025', '1.5.1'),
  h('Kafra', 'a_level', 'wilder', 'warrior', 'physical', 1, 'March 27, 2024', '1.0'),
  h('Kazim', 'a_level', 'mauler', 'marksman', 'physical', 7, 'June 12, 2026', '1.7.1'),
  h('Koko', 'a_level', 'mauler', 'support', 'physical', 4, 'March 27, 2024', '1.0.12'),
  h('Kordan', 'a_level', 'mauler', 'warrior', 'physical', 1, 'January 15, 2026', '1.5.4'),
  h('Korin', 'a_level', 'lightbearer', 'warrior', 'physical', 2, 'March 27, 2024', '1.0'),
  h('Kruger', 'a_level', 'mauler', 'warrior', 'physical', 1, 'March 27, 2024', '1.0'),
  h('Kulu', 's_level', 'hypogean', 'marksman', 'physical', 6, 'May 26, 2025', '1.4.1'),
  h('Laios', 'a_level', 'dimensional', 'warrior', 'physical', 1, 'November 28, 2025', '1.5.2'),
  h('Lamentis', 's_level', 'hypogean', 'marksman', 'magic', 7, 'July 02, 2026', '1.7.2'),
  h('Lenya', 'a_level', 'wilder', 'rogue', 'physical', 1, 'September 03, 2024', '1.1.17'),
  h('Lily May', 's_level', 'wilder', 'rogue', 'magic', 3, 'August 08, 2024', '1.1.16'),
  h('Lorsan', 's_level', 'wilder', 'support', 'magic', 5, 'January 17, 2025', '1.3.1'),
  h('Lucca', 'a_level', 'lightbearer', 'tank', 'physical', 1, 'October 29, 2024', '1.2.2'),
  h('Lucius', 'a_level', 'lightbearer', 'tank', 'physical', 1, 'March 27, 2024', '1.0'),
  h('Lucy', 'a_level', 'dimensional', 'mage', 'magic', 3, 'May 01, 2025', '1.3.4'),
  h('Ludovic', 's_level', 'graveborn', 'support', 'magic', 6, 'July 11, 2024', '1.1.16'),
  h('Lumont', 's_level', 'mauler', 'tank', 'physical', 1, 'March 27, 2024', '1.0'),
  h('Lyca', 'a_level', 'wilder', 'marksman', 'physical', 5, 'March 27, 2024', '1.0'),
  h('Marcille', 's_level', 'dimensional', 'mage', 'magic', 6, 'November 28, 2025', '1.5.2'),
  h('Marilee', 'a_level', 'lightbearer', 'marksman', 'physical', 5, 'March 27, 2024', '1.0'),
  h('Mehira', 's_level', 'hypogean', 'mage', 'magic', 3, 'October 30, 2025', '1.5.2'),
  h('Mikola', 's_level', 'mauler', 'support', 'physical', 1, 'August 19, 2024', '1.1.17'),
  h('Mirael', 'a_level', 'lightbearer', 'mage', 'magic', 3, 'March 27, 2024', '1.0'),
  h('Nara', 's_level', 'graveborn', 'rogue', 'physical', 1, 'September 09, 2024', '1.2.1'),
  h('Natsu', 's_level', 'dimensional', 'warrior', 'magic', 1, 'May 01, 2025', '1.3.4'),
  h('Nazrik', 's_level', 'mauler', 'marksman', 'physical', 7, 'October 30, 2025', '1.5.2'),
  h('Nerion', 'a_level', 'graveborn', 'marksman', 'magic', 7, 'May 15, 2026', '1.6.4'),
  h('Niru', 'a_level', 'graveborn', 'support', 'magic', 1, 'March 27, 2024', '1.0'),
  h('Odie', 'a_level', 'mauler', 'marksman', 'magic', 5, 'March 27, 2024', '1.0'),
  h('Orion', 's_level', 'lightbearer', 'warrior', 'magic', 1, 'July 17, 2026', '1.7.2'),
  h('Pandora', 's_level', 'dimensional', 'support', 'magic', 5, 'August 01, 2025', '1.4.3'),
  h('Pang', 's_level', 'wilder', 'warrior', 'physical', 1, 'August 01, 2025', '1.4.3'),
  h('Parisa', 'a_level', 'wilder', 'mage', 'magic', 5, 'March 27, 2024', '1.0'),
  h('Peggy', 's_level', 'lightbearer', 'support', 'physical', 6, 'July 02, 2026', '1.7.2'),
  h('Perseus', 's_level', 'lightbearer', 'warrior', 'physical', 1, 'September 26, 2025', '1.5.1'),
  h('Phraesto', 's_level', 'hypogean', 'tank', 'magic', 1, 'June 06, 2024', '1.1.15'),
  h('Pippa', 's_level', 'wilder', 'mage', 'magic', 5, 'March 20, 2026', '1.6.2'),
  h('Ravion', 's_level', 'wilder', 'rogue', 'physical', 4, 'September 19, 2025', '1.4.4'),
  h('Reinier', 's_level', 'hypogean', 'support', 'magic', 5, 'March 27, 2024', '1.0.9'),
  h('Rhys', 's_level', 'mauler', 'marksman', 'physical', 6, 'March 27, 2024', '1.0.10'),
  h('Rolan', 's_level', 'celestial', 'support', 'magic', 10, 'August 06, 2026', '1.7.3'),
  h('Rowan', 's_level', 'lightbearer', 'support', 'magic', 3, 'March 27, 2024', '1.0'),
  h('Saida', 's_level', 'hypogean', 'rogue', 'magic', 1, 'August 01, 2025', '1.4.3'),
  h('Salazer', 'a_level', 'graveborn', 'rogue', 'physical', 1, 'March 27, 2024', '1.0'),
  h('Satrana', 'a_level', 'mauler', 'mage', 'magic', 1, 'March 27, 2024', '1.0'),
  h('Scarlita', 's_level', 'celestial', 'warrior', 'physical', 1, 'March 27, 2024', '1.0.7'),
  h('Seth', 'a_level', 'mauler', 'rogue', 'physical', 1, 'March 27, 2024', '1.0'),
  h('Shadewing', 'a_level', 'graveborn', 'rogue', 'magic', 1, 'November 13, 2025', '1.5.2'),
  h('Shakir', 's_level', 'mauler', 'rogue', 'physical', 1, 'March 27, 2024', '1.0'),
  h('Shemira', 's_level', 'graveborn', 'mage', 'magic', 4, 'April 24, 2025', '1.3.4'),
  h('Silven', 'a_level', 'lightbearer', 'marksman', 'magic', 7, 'February 13, 2026', '1.6.1'),
  h('Silvina', 'a_level', 'graveborn', 'rogue', 'physical', 1, 'March 27, 2024', '1.0'),
  h('Sinbad', 'a_level', 'lightbearer', 'rogue', 'physical', 1, 'October 02, 2024', '1.2.1'),
  h('Smokey & Meerky', 's_level', 'mauler', 'support', 'magic', 8, 'March 27, 2024', '1.0'),
  h('Solise', 's_level', 'wilder', 'support', 'magic', 6, 'January 30, 2026', '1.6.1'),
  h('Sonja', 's_level', 'lightbearer', 'warrior', 'physical', 1, 'November 27, 2024', '1.2.3'),
  h('Soren', 'a_level', 'mauler', 'rogue', 'physical', 1, 'May 31, 2024', '1.1.14'),
  h('Sylphira', 's_level', 'celestial', 'rogue', 'magic', 1, 'May 29, 2026', '1.7.1'),
  h('Taichi & Agumon', 's_level', 'dimensional', 'warrior', 'physical', 3, 'July 03, 2024', '1.1.16'),
  h('Talene', 's_level', 'celestial', 'mage', 'magic', 3, 'July 03, 2024', '1.1.16'),
  h('Tasi', 's_level', 'wilder', 'mage', 'magic', 4, 'October 17, 2024', '1.2.1'),
  h('Temesia', 's_level', 'lightbearer', 'tank', 'physical', 1, 'March 27, 2024', '1.0.4'),
  h('Thador', 'a_level', 'wilder', 'tank', 'physical', 1, 'July 10, 2025', '1.4.2'),
  h('Thoran', 's_level', 'graveborn', 'tank', 'physical', 1, 'March 27, 2024', '1.0'),
  h('Tilaya', 'a_level', 'wilder', 'warrior', 'physical', 1, 'January 08, 2026', '1.5.4'),
  h('Ulmus', 'a_level', 'wilder', 'tank', 'physical', 1, 'June 20, 2024', '1.1.15'),
  h('Vala', 's_level', 'lightbearer', 'rogue', 'physical', 7, 'March 27, 2024', '1.0'),
  h('Valen', 'a_level', 'lightbearer', 'warrior', 'physical', 1, 'March 27, 2024', '1.0'),
  h('Valka', 'a_level', 'graveborn', 'warrior', 'physical', 1, 'January 30, 2025', '1.3.1'),
  h('Velara', 's_level', 'wilder', 'support', 'magic', 5, 'June 26, 2025', '1.4.2'),
  h('Viperian', 'a_level', 'graveborn', 'mage', 'magic', 5, 'March 27, 2024', '1.0.6'),
  h('Voracia', 's_level', 'mauler', 'mage', 'magic', 10, 'August 06, 2026', '1.7.3'),
  h('Walker', 'a_level', 'lightbearer', 'rogue', 'physical', 2, 'March 27, 2024', '1.0.11'),
  h('Yamato & Gabumon', 's_level', 'dimensional', 'mage', 'magic', 4, 'August 18, 2026', '1.7.3'),
  h('Zandrok', 's_level', 'mauler', 'warrior', 'physical', 1, 'August 21, 2025', '1.4.3'),
  h('Zanie', 'a_level', 'lightbearer', 'marksman', 'physical', 20, 'August 28, 2025', '1.4.4'),
  h('Zorya', 's_level', 'graveborn', 'warrior', 'magic', 2, 'March 05, 2026', '1.6.2'),
];

export const heroesById: Record<string, Hero> = heroes.reduce(
  (acc, hero) => {
    acc[hero.id] = hero;
    return acc;
  },
  {} as Record<string, Hero>
);
