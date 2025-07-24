import { SleeperLeague, SleeperUser, SleeperRoster, SleeperMatchup } from '../types';

export class SleeperService {
  private baseUrl = 'https://api.sleeper.app/v1';

  async getLeague(leagueId: string): Promise<SleeperLeague> {
    const response = await fetch(`${this.baseUrl}/league/${leagueId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch league ${leagueId}: ${response.statusText}`);
    }
    return response.json();
  }

  async getLeagueUsers(leagueId: string): Promise<SleeperUser[]> {
    const response = await fetch(`${this.baseUrl}/league/${leagueId}/users`);
    if (!response.ok) {
      throw new Error(`Failed to fetch users for league ${leagueId}: ${response.statusText}`);
    }
    return response.json();
  }

  async getLeagueRosters(leagueId: string): Promise<SleeperRoster[]> {
    const response = await fetch(`${this.baseUrl}/league/${leagueId}/rosters`);
    if (!response.ok) {
      throw new Error(`Failed to fetch rosters for league ${leagueId}: ${response.statusText}`);
    }
    return response.json();
  }

  async getMatchupsForWeek(leagueId: string, week: number): Promise<SleeperMatchup[]> {
    const response = await fetch(`${this.baseUrl}/league/${leagueId}/matchups/${week}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch matchups for league ${leagueId} week ${week}: ${response.statusText}`);
    }
    return response.json();
  }

  async getWinnersBracket(leagueId: string): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/league/${leagueId}/winners_bracket`);
    if (!response.ok) {
      throw new Error(`Failed to fetch winners bracket for league ${leagueId}: ${response.statusText}`);
    }
    return response.json();
  }

  async getLosersBracket(leagueId: string): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/league/${leagueId}/losers_bracket`);
    if (!response.ok) {
      throw new Error(`Failed to fetch losers bracket for league ${leagueId}: ${response.statusText}`);
    }
    return response.json();
  }

  async getUser(userId: string): Promise<SleeperUser> {
    const response = await fetch(`${this.baseUrl}/user/${userId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch user ${userId}: ${response.statusText}`);
    }
    return response.json();
  }

  createRosterOwnerMap(rosters: SleeperRoster[]): Record<number, string> {
    const map: Record<number, string> = {};
    rosters.forEach(roster => {
      map[roster.roster_id] = roster.owner_id;
    });
    return map;
  }

  createUserMap(users: SleeperUser[]): Record<string, SleeperUser> {
    const map: Record<string, SleeperUser> = {};
    users.forEach(user => {
      map[user.user_id] = user;
    });
    return map;
  }
}