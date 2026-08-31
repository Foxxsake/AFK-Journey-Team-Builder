import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import type { RosterHero, PlayerHero, Hero, FactionId, HeroRole, AscensionTier } from '@/types';
import { rosterService } from '@/services/RosterService';
import { heroes, heroesById } from '@/data/heroes';
import { DEFAULT_ASCENSION } from '@/data/progression';

function createDefaultRosterHero(heroId: string): RosterHero {
  const now = new Date().toISOString();
  return {
    heroId,
    owned: true,
    level: 1,
    progression: { ascension: DEFAULT_ASCENSION },
    addedAt: now,
    updatedAt: now,
  };
}

interface RosterContextValue {
  roster: RosterHero[];
  rosterMap: Map<string, RosterHero>;
  ownedCount: number;
  totalCount: number;
  refresh: () => void;
  toggleOwned: (heroId: string) => void;
  setOwned: (heroId: string, owned: boolean) => void;
  setLevel: (heroId: string, level: number) => void;
  setAscension: (heroId: string, ascension: AscensionTier) => void;
  setProgressionField: (heroId: string, field: 'exclusiveWeaponLevel' | 'signatureLevel' | 'furnitureLevel' | 'engravingLevel', value: number | undefined) => void;
  saveRosterHero: (hero: RosterHero) => void;
  removeHero: (heroId: string) => void;
  clearRoster: () => void;
  setRoster: (roster: RosterHero[]) => void;
  mergeRoster: (roster: RosterHero[]) => void;
  getOwnedHeroes: () => PlayerHero[];
  getPlayerHero: (heroId: string) => PlayerHero | null;
  getHeroesByFaction: (factionId: FactionId) => PlayerHero[];
  getHeroesByRole: (role: HeroRole) => PlayerHero[];
  getAvailableHeroesForTeamBuilding: () => PlayerHero[];
}

const RosterContext = createContext<RosterContextValue | null>(null);

export function RosterProvider({ children }: { children: ReactNode }) {
  const [roster, setRosterState] = useState<RosterHero[]>(() => rosterService.getRoster());

  const refresh = useCallback(() => {
    setRosterState(rosterService.getRoster());
  }, []);

  const rosterMap = useMemo(() => {
    const map = new Map<string, RosterHero>();
    for (const r of roster) {
      map.set(r.heroId, r);
    }
    return map;
  }, [roster]);

  const ownedCount = useMemo(() => roster.filter((h) => h.owned).length, [roster]);
  const totalCount = heroes.length;

  const saveRosterHero = useCallback((hero: RosterHero) => {
    rosterService.saveRosterHero(hero);
    refresh();
  }, [refresh]);

  const toggleOwned = useCallback((heroId: string) => {
    const existing = rosterService.getRosterHero(heroId);
    if (existing) {
      rosterService.saveRosterHero({ ...existing, owned: !existing.owned, updatedAt: new Date().toISOString() });
    } else {
      rosterService.saveRosterHero(createDefaultRosterHero(heroId));
    }
    refresh();
  }, [refresh]);

  const setOwned = useCallback((heroId: string, owned: boolean) => {
    const existing = rosterService.getRosterHero(heroId);
    if (existing) {
      rosterService.saveRosterHero({ ...existing, owned, updatedAt: new Date().toISOString() });
    } else {
      const hero = createDefaultRosterHero(heroId);
      hero.owned = owned;
      rosterService.saveRosterHero(hero);
    }
    refresh();
  }, [refresh]);

  const setLevel = useCallback((heroId: string, level: number) => {
    const existing = rosterService.getRosterHero(heroId);
    if (existing) {
      rosterService.saveRosterHero({ ...existing, level: Math.max(0, Math.floor(level)), updatedAt: new Date().toISOString() });
    }
    refresh();
  }, [refresh]);

  const setAscension = useCallback((heroId: string, ascension: AscensionTier) => {
    const existing = rosterService.getRosterHero(heroId);
    if (existing) {
      rosterService.saveRosterHero({
        ...existing,
        progression: { ...existing.progression, ascension },
        updatedAt: new Date().toISOString(),
      });
    }
    refresh();
  }, [refresh]);

  const setProgressionField = useCallback(
    (heroId: string, field: 'exclusiveWeaponLevel' | 'signatureLevel' | 'furnitureLevel' | 'engravingLevel', value: number | undefined) => {
      const existing = rosterService.getRosterHero(heroId);
      if (existing) {
        const updatedProg = { ...existing.progression, [field]: value };
        if (field === 'exclusiveWeaponLevel') {
          updatedProg.signatureLevel = value;
        } else if (field === 'signatureLevel') {
          updatedProg.exclusiveWeaponLevel = value;
        }
        rosterService.saveRosterHero({
          ...existing,
          progression: updatedProg,
          updatedAt: new Date().toISOString(),
        });
      }
      refresh();
    },
    [refresh]
  );

  const removeHero = useCallback((heroId: string) => {
    rosterService.removeRosterHero(heroId);
    refresh();
  }, [refresh]);

  const clearRoster = useCallback(() => {
    rosterService.clearRoster();
    refresh();
  }, [refresh]);

  const setRoster = useCallback((newRoster: RosterHero[]) => {
    rosterService.setRoster(newRoster);
    refresh();
  }, [refresh]);

  const mergeRoster = useCallback((incoming: RosterHero[]) => {
    rosterService.mergeRoster(incoming);
    refresh();
  }, [refresh]);

  const getPlayerHero = useCallback((heroId: string): PlayerHero | null => {
    const hero = heroesById[heroId];
    const rosterEntry = rosterMap.get(heroId);
    if (!hero) return null;
    if (!rosterEntry) return null;
    return { ...hero, roster: rosterEntry };
  }, [rosterMap]);

  const getOwnedHeroes = useCallback((): PlayerHero[] => {
    return roster
      .filter((r) => r.owned && heroesById[r.heroId])
      .map((r) => ({ ...heroesById[r.heroId], roster: r }));
  }, [roster]);

  const getHeroesByFaction = useCallback((factionId: FactionId): PlayerHero[] => {
    return getOwnedHeroes().filter((h) => h.faction === factionId);
  }, [getOwnedHeroes]);

  const getHeroesByRole = useCallback((role: HeroRole): PlayerHero[] => {
    return getOwnedHeroes().filter((h) => h.roles.includes(role));
  }, [getOwnedHeroes]);

  const getAvailableHeroesForTeamBuilding = useCallback((): PlayerHero[] => {
    return getOwnedHeroes();
  }, [getOwnedHeroes]);

  const value: RosterContextValue = {
    roster,
    rosterMap,
    ownedCount,
    totalCount,
    refresh,
    toggleOwned,
    setOwned,
    setLevel,
    setAscension,
    setProgressionField,
    saveRosterHero,
    removeHero,
    clearRoster,
    setRoster,
    mergeRoster,
    getOwnedHeroes,
    getPlayerHero,
    getHeroesByFaction,
    getHeroesByRole,
    getAvailableHeroesForTeamBuilding,
  };

  return <RosterContext.Provider value={value}>{children}</RosterContext.Provider>;
}

export function useRoster(): RosterContextValue {
  const ctx = useContext(RosterContext);
  if (!ctx) {
    throw new Error('useRoster must be used within a RosterProvider');
  }
  return ctx;
}
