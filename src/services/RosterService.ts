import type { RosterHero, Team, RosterExportData, AscensionTier } from '@/types';
import { heroesById } from '@/data/heroes';
import { ascensionTiersById, DEFAULT_ASCENSION, MAX_LEVEL_SANITY } from '@/data/progression';

const ROSTER_KEY = 'afkj_roster_v2';
const TEAMS_KEY = 'afkj_teams_v1';

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('RosterService: failed to persist', key, e);
  }
}

export interface RosterIssue {
  severity: 'error' | 'warning';
  message: string;
  heroId?: string;
}

export interface RosterValidationResult {
  valid: boolean;
  errors: number;
  warnings: number;
  issues: RosterIssue[];
}

function isNumber(v: unknown): v is number {
  return typeof v === 'number' && !isNaN(v);
}

function isAscension(v: unknown): v is AscensionTier {
  return typeof v === 'string' && v in ascensionTiersById;
}

export function validateRosterHero(entry: RosterHero): RosterIssue[] {
  const issues: RosterIssue[] = [];

  if (!entry.heroId) {
    issues.push({ severity: 'error', message: 'Roster entry has no heroId', heroId: entry.heroId });
  } else if (!heroesById[entry.heroId]) {
    issues.push({ severity: 'error', message: `Roster entry references unknown hero: "${entry.heroId}"`, heroId: entry.heroId });
  }

  if (!isNumber(entry.level) || entry.level < 0) {
    issues.push({ severity: 'error', message: `Hero "${entry.heroId}" has invalid level: ${entry.level}`, heroId: entry.heroId });
  } else if (entry.level > MAX_LEVEL_SANITY) {
    issues.push({ severity: 'warning', message: `Hero "${entry.heroId}" has unusually high level: ${entry.level}`, heroId: entry.heroId });
  }

  if (!isAscension(entry.progression?.ascension)) {
    issues.push({ severity: 'error', message: `Hero "${entry.heroId}" has invalid ascension: ${entry.progression?.ascension}`, heroId: entry.heroId });
  }

  if (entry.progression?.exclusiveWeaponLevel !== undefined) {
    if (!isNumber(entry.progression.exclusiveWeaponLevel) || entry.progression.exclusiveWeaponLevel < 0 || entry.progression.exclusiveWeaponLevel > 25) {
      issues.push({ severity: 'error', message: `Hero "${entry.heroId}" has invalid exclusive weapon level: ${entry.progression.exclusiveWeaponLevel} (must be 0–25)`, heroId: entry.heroId });
    }
  }

  if (entry.progression?.signatureLevel !== undefined) {
    if (!isNumber(entry.progression.signatureLevel) || entry.progression.signatureLevel < 0) {
      issues.push({ severity: 'error', message: `Hero "${entry.heroId}" has invalid signature level`, heroId: entry.heroId });
    }
  }

  if (entry.progression?.furnitureLevel !== undefined) {
    if (!isNumber(entry.progression.furnitureLevel) || entry.progression.furnitureLevel < 0) {
      issues.push({ severity: 'error', message: `Hero "${entry.heroId}" has invalid furniture level`, heroId: entry.heroId });
    }
  }

  if (entry.progression?.engravingLevel !== undefined) {
    if (!isNumber(entry.progression.engravingLevel) || entry.progression.engravingLevel < 0) {
      issues.push({ severity: 'error', message: `Hero "${entry.heroId}" has invalid engraving level`, heroId: entry.heroId });
    }
  }

  return issues;
}

export function validateRoster(roster: RosterHero[]): RosterValidationResult {
  const issues: RosterIssue[] = [];
  const seenIds = new Set<string>();

  for (const entry of roster) {
    if (seenIds.has(entry.heroId)) {
      issues.push({ severity: 'error', message: `Duplicate roster entry for hero: "${entry.heroId}"`, heroId: entry.heroId });
    }
    seenIds.add(entry.heroId);
    issues.push(...validateRosterHero(entry));
  }

  const errors = issues.filter((i) => i.severity === 'error').length;
  const warnings = issues.filter((i) => i.severity === 'warning').length;

  return { valid: errors === 0, errors, warnings, issues };
}

export interface ImportResult {
  success: boolean;
  roster: RosterHero[];
  error?: string;
}

export function parseRosterExport(data: unknown): ImportResult {
  if (!data || typeof data !== 'object') {
    return { success: false, roster: [], error: 'Invalid file: not a JSON object.' };
  }

  const obj = data as Record<string, unknown>;
  if (typeof obj.version !== 'number') {
    return { success: false, roster: [], error: 'Invalid roster file: missing or invalid version field.' };
  }

  if (!Array.isArray(obj.heroes)) {
    return { success: false, roster: [], error: 'Invalid roster file: missing heroes array.' };
  }

  const now = new Date().toISOString();
  const roster: RosterHero[] = [];
  const seenIds = new Set<string>();

  for (const raw of obj.heroes) {
    if (!raw || typeof raw !== 'object') {
      return { success: false, roster: [], error: 'Invalid hero entry in roster file.' };
    }
    const r = raw as Record<string, unknown>;
    const heroId = r.heroId;
    if (typeof heroId !== 'string' || !heroesById[heroId]) {
      return { success: false, roster: [], error: `Invalid or unknown hero ID: "${heroId}"` };
    }
    if (seenIds.has(heroId)) {
      return { success: false, roster: [], error: `Duplicate hero in roster file: "${heroId}"` };
    }
    seenIds.add(heroId);

    const level = typeof r.level === 'number' ? r.level : 0;
    const owned = r.owned !== false;
    const ascension = isAscension(r.ascension) ? r.ascension : DEFAULT_ASCENSION;

    const exLevel = typeof r.exclusiveWeaponLevel === 'number'
      ? r.exclusiveWeaponLevel
      : typeof r.signatureLevel === 'number'
        ? r.signatureLevel
        : undefined;

    roster.push({
      heroId,
      owned,
      level: level < 0 ? 0 : level,
      progression: {
        ascension,
        exclusiveWeaponLevel: exLevel,
        signatureLevel: exLevel,
        furnitureLevel: typeof r.furnitureLevel === 'number' ? r.furnitureLevel : undefined,
        engravingLevel: typeof r.engravingLevel === 'number' ? r.engravingLevel : undefined,
      },
      addedAt: now,
      updatedAt: now,
    });
  }

  const validation = validateRoster(roster);
  if (!validation.valid) {
    return { success: false, roster: [], error: `Roster validation failed: ${validation.issues[0]?.message ?? 'unknown error'}` };
  }

  return { success: true, roster };
}

export interface RosterService {
  getRoster(): RosterHero[];
  getRosterHero(heroId: string): RosterHero | undefined;
  saveRosterHero(hero: RosterHero): void;
  removeRosterHero(heroId: string): void;
  clearRoster(): void;
  setRoster(roster: RosterHero[]): void;
  mergeRoster(roster: RosterHero[]): void;
  exportRoster(): RosterExportData;
  importRoster(data: unknown, mode: 'replace' | 'merge'): ImportResult;
  getTeams(): Team[];
  getTeam(id: string): Team | undefined;
  saveTeam(team: Team): void;
  removeTeam(id: string): void;
  clearTeams(): void;
}

class LocalRosterService implements RosterService {
  getRoster(): RosterHero[] {
    return readJSON<RosterHero[]>(ROSTER_KEY, []);
  }

  getRosterHero(heroId: string): RosterHero | undefined {
    return this.getRoster().find((h) => h.heroId === heroId);
  }

  saveRosterHero(hero: RosterHero): void {
    const roster = this.getRoster();
    const idx = roster.findIndex((h) => h.heroId === hero.heroId);
    if (idx >= 0) {
      roster[idx] = hero;
    } else {
      roster.push(hero);
    }
    writeJSON(ROSTER_KEY, roster);
  }

  removeRosterHero(heroId: string): void {
    writeJSON(
      ROSTER_KEY,
      this.getRoster().filter((h) => h.heroId !== heroId)
    );
  }

  clearRoster(): void {
    writeJSON(ROSTER_KEY, []);
  }

  setRoster(roster: RosterHero[]): void {
    writeJSON(ROSTER_KEY, roster);
  }

  mergeRoster(incoming: RosterHero[]): void {
    const existing = this.getRoster();
    const map = new Map(existing.map((h) => [h.heroId, h]));
    for (const hero of incoming) {
      map.set(hero.heroId, hero);
    }
    writeJSON(ROSTER_KEY, Array.from(map.values()));
  }

  exportRoster(): RosterExportData {
    const roster = this.getRoster();
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      heroes: roster.map((h) => ({
        heroId: h.heroId,
        owned: h.owned,
        level: h.level,
        ascension: h.progression.ascension,
        exclusiveWeaponLevel: h.progression.exclusiveWeaponLevel ?? h.progression.signatureLevel,
        signatureLevel: h.progression.signatureLevel ?? h.progression.exclusiveWeaponLevel,
        furnitureLevel: h.progression.furnitureLevel,
        engravingLevel: h.progression.engravingLevel,
      })),
    };
  }

  importRoster(data: unknown, mode: 'replace' | 'merge'): ImportResult {
    const result = parseRosterExport(data);
    if (!result.success) return result;
    if (mode === 'replace') {
      this.setRoster(result.roster);
    } else {
      this.mergeRoster(result.roster);
    }
    return result;
  }

  getTeams(): Team[] {
    return readJSON<Team[]>(TEAMS_KEY, []);
  }

  getTeam(id: string): Team | undefined {
    return this.getTeams().find((t) => t.id === id);
  }

  saveTeam(team: Team): void {
    const teams = this.getTeams();
    const idx = teams.findIndex((t) => t.id === team.id);
    if (idx >= 0) {
      teams[idx] = team;
    } else {
      teams.push(team);
    }
    writeJSON(TEAMS_KEY, teams);
  }

  removeTeam(id: string): void {
    writeJSON(TEAMS_KEY, this.getTeams().filter((t) => t.id !== id));
  }

  clearTeams(): void {
    writeJSON(TEAMS_KEY, []);
  }
}

export const rosterService: RosterService = new LocalRosterService();
