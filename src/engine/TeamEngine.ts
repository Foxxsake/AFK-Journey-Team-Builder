import type {
  Hero,
  RosterHero,
  Team,
  TeamScore,
  TeamScoreBreakdown,
  GameMode,
  Formation,
  MetaRating,
} from '@/types';

export interface TeamBuildRequest {
  roster: RosterHero[];
  heroes: Hero[];
  mode: GameMode;
  formation?: Formation;
  metaRatings?: MetaRating[];
  constraints?: {
    requiredHeroIds?: string[];
    excludedHeroIds?: string[];
    factionRestriction?: string;
  };
}

export interface TeamBuildResult {
  teams: Team[];
  bestScore?: TeamScore;
}

export interface TeamEngine {
  buildTeams(request: TeamBuildRequest): Promise<TeamBuildResult>;
  scoreTeam(
    team: Team,
    context: { heroes: Hero[]; roster: RosterHero[]; mode: GameMode; metaRatings?: MetaRating[] }
  ): Promise<TeamScore>;
}

class StubTeamEngine implements TeamEngine {
  async buildTeams(_request: TeamBuildRequest): Promise<TeamBuildResult> {
    return { teams: [] };
  }

  async scoreTeam(
    _team: Team,
    _context: {
      heroes: Hero[];
      roster: RosterHero[];
      mode: GameMode;
      metaRatings?: MetaRating[];
    }
  ): Promise<TeamScore> {
    const breakdown: TeamScoreBreakdown = {
      synergyScore: 0,
      factionBonusScore: 0,
      modeFitScore: 0,
      coverageScore: 0,
      progressionScore: 0,
    };
    return {
      total: 0,
      grade: 'D',
      breakdown,
      notes: ['Team scoring is not yet implemented.'],
      evaluatedAt: new Date().toISOString(),
    };
  }
}

export const teamEngine: TeamEngine = new StubTeamEngine();
