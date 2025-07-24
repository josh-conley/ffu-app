export interface LeagueInfo {
  id: string;
  name: string;
  year: string;
  season: string;
}

export interface UserInfo {
  userId: string;
  teamName: string;
  abbreviation: string;
}

export interface WeekMatchup {
  winner: string;
  loser: string;
  winnerScore: number;
  loserScore: number;
}

export interface SeasonStandings {
  userId: string;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  rank: number;
}

export interface PlayoffResult {
  userId: string;
  placement: number;
  placementName: string; // '1st', '2nd', '3rd', etc.
}

export interface LeagueSeasonData {
  league: string;
  year: string;
  leagueId: string;
  standings: SeasonStandings[];
  playoffResults: PlayoffResult[];
  promotions: string[]; // User IDs promoted to higher league
  relegations: string[]; // User IDs relegated to lower league
}

export interface MemberHistory {
  userId: string;
  userInfo: UserInfo;
  seasons: {
    year: string;
    league: string;
    standing: SeasonStandings;
    playoffResult?: PlayoffResult;
    promoted?: boolean;
    relegated?: boolean;
  }[];
}

export type LeagueTier = 'PREMIER' | 'MASTERS' | 'NATIONAL';

export interface SleeperLeague {
  league_id: string;
  name: string;
  season: string;
  season_type: string;
  total_rosters: number;
  settings: {
    playoff_week_start: number;
    league_average_match: number;
  };
}

export interface SleeperUser {
  user_id: string;
  display_name: string;
  username: string;
  avatar: string;
}

export interface SleeperRoster {
  roster_id: number;
  owner_id: string;
  league_id: string;
  settings?: {
    wins?: number;
    losses?: number;
    ties?: number;
    fpts?: number;
    fpts_against?: number;
    fpts_decimal?: number;
    fpts_against_decimal?: number;
  };
}

export interface SleeperMatchup {
  roster_id: number;
  matchup_id: number;
  points: number;
  players_points: Record<string, number>;
}