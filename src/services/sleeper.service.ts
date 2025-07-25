import type { SleeperLeague, SleeperUser, SleeperRoster, SleeperMatchup } from '../types';

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

  async getAllSeasonMatchups(leagueId: string, startWeek: number = 1, endWeek: number = 17): Promise<{week: number, matchups: SleeperMatchup[]}[]> {
    // Create an array of all week requests in parallel
    const weekPromises = [];
    for (let week = startWeek; week <= endWeek; week++) {
      weekPromises.push(
        this.getMatchupsForWeek(leagueId, week)
          .then(matchups => ({ week, matchups }))
          .catch(error => {
            console.warn(`Failed to fetch week ${week} for league ${leagueId}:`, error);
            return { week, matchups: [] };
          })
      );
    }

    // Wait for all weeks to complete in parallel
    const results = await Promise.all(weekPromises);
    return results.filter(result => result.matchups.length > 0);
  }
}