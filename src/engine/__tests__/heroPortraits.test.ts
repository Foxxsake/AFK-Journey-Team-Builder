import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { heroes } from '@/data/heroes';
import {
  AVAILABLE_HERO_PORTRAITS,
  getHeroImageData,
  hasHeroImage,
} from '@/services/HeroImageService';

describe('Hero Portrait Image System', () => {
  it('checks all 124 catalog heroes against the portrait registry', () => {
    expect(heroes.length).toBe(124);

    let realAssetCount = 0;
    let fallbackCount = 0;

    for (const hero of heroes) {
      const imgData = getHeroImageData(hero.id);
      const hasImage = hasHeroImage(hero.id);

      if (hasImage) {
        expect(imgData).not.toBeNull();
        expect(imgData?.isRealAsset).toBe(true);
        expect(imgData?.primaryUrl).toBe(`/heroes/${hero.id}.png`);
        realAssetCount++;
      } else {
        expect(imgData).toBeNull();
        fallbackCount++;
      }
    }

    expect(realAssetCount).toBe(AVAILABLE_HERO_PORTRAITS.size);
    expect(fallbackCount).toBe(124 - AVAILABLE_HERO_PORTRAITS.size);
    expect(realAssetCount + fallbackCount).toBe(124);
  });

  it('verifies that every mapped portrait asset physically exists in public/heroes/', () => {
    const publicHeroesDir = path.join(process.cwd(), 'public', 'heroes');
    expect(fs.existsSync(publicHeroesDir)).toBe(true);

    for (const heroId of AVAILABLE_HERO_PORTRAITS) {
      const assetPath = path.join(publicHeroesDir, `${heroId}.png`);
      expect(
        fs.existsSync(assetPath),
        `Expected asset to exist on disk: ${assetPath}`
      ).toBe(true);

      const stats = fs.statSync(assetPath);
      expect(stats.size).toBeGreaterThan(500);
    }
  });

  it('handles unknown or unreleased heroes safely with fallback', () => {
    expect(hasHeroImage('unknown_hero_xyz')).toBe(false);
    expect(getHeroImageData('unknown_hero_xyz')).toBeNull();

    // Specific heroes without static art fall back to initial avatar
    expect(hasHeroImage('rolan')).toBe(false);
    expect(hasHeroImage('taichi_agumon')).toBe(false);
    expect(hasHeroImage('voracia')).toBe(false);
    expect(hasHeroImage('yamato_gabumon')).toBe(false);
  });

  it('normalizes hero IDs gracefully (casing, whitespace)', () => {
    expect(hasHeroImage('  CECIA  ')).toBe(true);
    const data = getHeroImageData('  CECIA  ');
    expect(data?.heroId).toBe('cecia');
    expect(data?.primaryUrl).toBe('/heroes/cecia.png');
  });

  it('verifies canonical heroes with local art have real portraits', () => {
    const canonicalArtHeroes = ['cecia', 'alna', 'alsa', 'antandra', 'arden', 'atalanta', 'athalia', 'aurora', 'aliceth'];
    for (const id of canonicalArtHeroes) {
      expect(hasHeroImage(id)).toBe(true);
      const data = getHeroImageData(id);
      expect(data?.primaryUrl).toBe(`/heroes/${id}.png`);
    }
  });
});
