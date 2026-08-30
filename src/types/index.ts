export type FactionId =
  | 'lightbearer'
  | 'mauler'
  | 'wilder'
  | 'graveborn'
  | 'hypogean'
  | 'celestial'
  | 'dimensional';

export type HeroClass =
  | 'warrior'
  | 'tank'
  | 'marksman'
  | 'mage'
  | 'rogue'
  | 'support';

export type HeroRarity = 's_level' | 'a_level' | 'rare_level';

export type HeroRole =
  | 'tank'
  | 'damage'
  | 'support'
  | 'healer'
  | 'control'
  | 'buffer'
  | 'debuffer'
  | 'summoner';

export type DamageType = 'physical' | 'magic';

export type SourceConfidence = 'high' | 'medium' | 'low' | 'unknown';

export type SkillType = 'ultimate' | 'active' | 'passive';

export interface SkillEffect {
  description: string;
  type?: string;
  value?: string;
}

export interface HeroSkill {
  id: string;
  name: string;
  type: SkillType;
  description: string;
  effects?: SkillEffect[];
  cooldown?: number;
  energyCost?: number;
  source?: SourceInfo;
}

export interface HeroSynergy {
  heroId: string;
  reason: string;
  strength?: number;
}

export interface HeroCounter {
  heroId: string;
  reason: string;
}

export interface HeroStats {
  hp?: number;
  attack?: number;
  defense?: number;
  accuracy?: number;
  dodge?: number;
  critRate?: number;
  critDamage?: number;
  attackSpeed?: number;
  energyRegen?: number;
  range?: number;
  damageType?: DamageType;
}

export interface SourceInfo {
  sourceName: string;
  url?: string;
  lastUpdated?: string;
  confidence: SourceConfidence;
}

export type GameModeId = string;

export interface GameMode {
  id: GameModeId;
  name: string;
  description: string;
  teamSize: number;
  formationRequired: boolean;
  notes?: string;
}

export interface ModeRating {
  modeId: GameModeId;
  rating?: number;
  tier?: string;
  notes?: string;
}

export type DataSourceId = string;

export interface DataSource {
  id: DataSourceId;
  name: string;
  url?: string;
  type: 'official' | 'community' | 'manual';
  lastSynced?: string;
  licenseNote?: string;
}

export interface Hero {
  id: string;
  name: string;
  displayName?: string;
  faction: FactionId;
  class: HeroClass;
  roles: HeroRole[];
  rarity: HeroRarity;
  description?: string;
  damageType: DamageType;
  range: number;
  skills?: HeroSkill[];
  stats?: HeroStats;
  synergies?: HeroSynergy[];
  counters?: HeroCounter[];
  modeRatings?: ModeRating[];
  sources: SourceInfo[];
  imageUrl?: string;
  thumbnailUrl?: string;
  releaseDate?: string;
  releaseVersion?: string;
  lastUpdated: string;
}

export type AscensionTier =
  | 'elite'
  | 'elite_plus'
  | 'legendary'
  | 'legendary_plus'
  | 'mythic'
  | 'mythic_plus'
  | 'ascended'
  | 'ascended_1'
  | 'ascended_2'
  | 'ascended_3'
  | 'ascended_4'
  | 'ascended_5';

export interface RosterHeroProgression {
  ascension: AscensionTier;
  signatureLevel?: number;
  furnitureLevel?: number;
  engravingLevel?: number;
  /** Reserved for future progression systems — do not populate yet. */
  equipment?: Record<string, number>;
  weapon?: Record<string, number>;
}

export interface RosterHero {
  heroId: string;
  owned: boolean;
  level: number;
  progression: RosterHeroProgression;
  addedAt: string;
  updatedAt: string;
  notes?: string;
}

export interface PlayerHero extends Hero {
  roster: RosterHero;
}

export interface RosterExportData {
  version: number;
  exportedAt: string;
  heroes: Array<{
    heroId: string;
    owned: boolean;
    level: number;
    ascension: AscensionTier;
    signatureLevel?: number;
    furnitureLevel?: number;
    engravingLevel?: number;
  }>;
}

export interface FormationSlot {
  id: string;
  position: number;
  row: number;
  column: number;
  x: number;
  y: number;
  frontBack: 'front' | 'back';
  roleHint?: HeroRole;
  heroId?: string | null;
}

export interface Formation {
  id: string;
  name: string;
  modeIds: GameModeId[];
  slots: FormationSlot[];
  description?: string;
  source?: string;
  sourceUrl?: string;
  confidence: SourceConfidence;
  lastUpdated: string;
}

export interface EnemyTeam {
  heroes: string[];
  formationId?: string;
  positions?: Array<{ heroId: string; slotId: string }>;
}

export interface Team {
  id: string;
  name: string;
  modeId: GameModeId;
  formationId?: string;
  rosterHeroIds: string[];
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface TeamScoreBreakdown {
  synergyScore: number;
  factionBonusScore: number;
  modeFitScore: number;
  coverageScore: number;
  progressionScore: number;
}

export interface TeamScore {
  total: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  breakdown: TeamScoreBreakdown;
  notes?: string[];
  evaluatedAt: string;
}

export interface MetaRating {
  heroId: string;
  modeId: GameModeId;
  rating?: number;
  tier?: string;
  usage?: string;
  recommended?: boolean;
  source?: SourceInfo;
  confidence: SourceConfidence;
  lastUpdated: string;
}

export interface Faction {
  id: FactionId;
  name: string;
  description: string;
}

// ============================================================
// DATA INTELLIGENCE & META SYSTEM TYPES
// ============================================================

/** How a source's data is retrieved. Only claim methods that actually work. */
export type RetrievalMethod = 'manual' | 'import' | 'api' | 'public-web';

/** Freshness category based on how recently data was retrieved. */
export type FreshnessCategory = 'current' | 'recent' | 'stale' | 'very_stale';

/** Extended source descriptor for the intelligence layer. */
export interface MetaDataSource {
  id: string;
  name: string;
  baseUrl?: string;
  type: 'official' | 'community' | 'manual';
  retrievalMethod: RetrievalMethod;
  /** 0–1 reliability weight. Higher = more trusted. Configurable. */
  reliability: number;
  enabled: boolean;
  lastChecked?: string;
  licenseNote?: string;
}

/** A single source's rating for a hero in a mode. */
export interface SourceMetaRecord {
  sourceId: string;
  heroId: string;
  modeId: GameModeId;
  /** Tier label as published by the source (e.g. "S", "A", "B"). */
  tier?: string;
  /** Numeric rating 0–10 if the source uses one. */
  rating?: number;
  /** Whether the source explicitly recommends this hero for this mode. */
  recommended?: boolean;
  sourceUrl?: string;
  retrievedAt: string;
  confidence: SourceConfidence;
}

/** Maps a source's hero name to our canonical hero ID. */
export interface SourceHeroMapping {
  sourceId: string;
  sourceHeroName: string;
  canonicalHeroId: string;
  confidence: SourceConfidence;
}

/** Historical snapshot of a single source rating. */
export interface MetaSnapshot {
  timestamp: string;
  heroId: string;
  modeId: GameModeId;
  sourceId: string;
  rating?: number;
  tier?: string;
}

/** Result of meta consensus calculation for one hero in one mode. */
export interface MetaConsensus {
  heroId: string;
  modeId: GameModeId;
  /** Weighted numeric consensus (0–100 scale). */
  consensusRating: number;
  /** Consensus tier label. */
  consensusTier: string;
  /** "high" | "medium" | "low" — how much sources agree. */
  agreement: 'high' | 'medium' | 'low';
  /** Per-source breakdown used to build the consensus. */
  sources: Array<{
    sourceId: string;
    sourceName: string;
    tier?: string;
    rating?: number;
    weight: number;
    freshness: FreshnessCategory;
    retrievedAt: string;
  }>;
  confidence: SourceConfidence;
  lastUpdated: string;
  /** True if sources disagree by more than one tier. */
  hasDisagreement: boolean;
}

/** Result of a confidence calculation. */
export interface ConfidenceResult {
  score: number;
  level: SourceConfidence;
  reasons: string[];
}

/** Game patch / version info. */
export interface GameDataVersion {
  version: string;
  detectedAt: string;
  notes?: string;
}

/** Schema for importable/exportable datasets. */
export interface DatasetExport {
  schemaVersion: number;
  gameVersion?: string;
  generatedAt: string;
  sources: MetaDataSource[];
  heroMappings: SourceHeroMapping[];
  metaRecords: SourceMetaRecord[];
  snapshots: MetaSnapshot[];
  consensus: MetaConsensus[];
  /** Hero intelligence data (optional — backward compatible). */
  heroIntelligence?: import('./intelligence').HeroIntelligence[];
  /** Synergy relationships (optional — backward compatible). */
  synergies?: import('./intelligence').SynergyRelationship[];
  /** Verified hero ability data (optional — backward compatible). */
  verifiedHeroData?: import('./intelligence').HeroVerifiedData[];
  /** Counter relationships (optional — backward compatible). */
  counterRelationships?: import('./intelligence').CounterRelationship[];
  /** Mode assessments (optional — backward compatible). */
  modeAssessments?: import('./intelligence').HeroModeAssessment[];
  /** Boss profiles (optional — backward compatible). */
  bossProfiles?: import('./intelligence').BossProfile[];
}
