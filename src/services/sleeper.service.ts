import type { SleeperLeague, SleeperUser, SleeperRoster, SleeperMatchup, SleeperDraft, SleeperDraftPick } from '../types';

export class SleeperService {
  private baseUrl = 'https://api.sleeper.app/v1';

  private async fetchWithRetry(url: string, maxRetries: number = 3): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const text = await response.text();

        // Check if response is empty or whitespace only
        if (!text.trim()) {
          throw new Error('Empty response from server');
        }

        try {
          return JSON.parse(text);
        } catch (parseError) {
          console.error(`JSON parse error (attempt ${attempt}/${maxRetries})`);
          console.error(`URL: ${url}`);
          console.error(`Response text (first 500 chars):`, text.substring(0, 500));
          console.error(`Parse error:`, parseError);

          if (attempt === maxRetries) {
            throw new Error(`Invalid JSON response after ${maxRetries} attempts: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
          }

          lastError = parseError instanceof Error ? parseError : new Error(String(parseError));
        }
      } catch (error) {
        console.warn(`Attempt ${attempt}/${maxRetries} failed for ${url}:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === maxRetries) {
          throw lastError;
        }

        // Exponential backoff: wait 1s, 2s, 4s, etc.
        const waitTime = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    throw lastError || new Error('Unknown error during fetch retry');
  }

  async getLeague(leagueId: string): Promise<SleeperLeague> {
    const url = `${this.baseUrl}/league/${leagueId}`;
    return this.fetchWithRetry(url);
  }

  async getLeagueUsers(leagueId: string): Promise<SleeperUser[]> {
    const url = `${this.baseUrl}/league/${leagueId}/users`;
    return this.fetchWithRetry(url);
  }

  async getLeagueRosters(leagueId: string): Promise<SleeperRoster[]> {
    const url = `${this.baseUrl}/league/${leagueId}/rosters`;
    return this.fetchWithRetry(url);
  }

  async getMatchupsForWeek(leagueId: string, week: number): Promise<SleeperMatchup[]> {
    const url = `${this.baseUrl}/league/${leagueId}/matchups/${week}`;
    return this.fetchWithRetry(url);
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

  async getLeagueDrafts(leagueId: string): Promise<SleeperDraft[]> {
    const response = await fetch(`${this.baseUrl}/league/${leagueId}/drafts`);
    if (!response.ok) {
      throw new Error(`Failed to fetch drafts for league ${leagueId}: ${response.statusText}`);
    }
    return response.json();
  }

  async getDraft(draftId: string): Promise<SleeperDraft> {
    const response = await fetch(`${this.baseUrl}/draft/${draftId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch draft ${draftId}: ${response.statusText}`);
    }
    return response.json();
  }

  async getDraftPicks(draftId: string): Promise<SleeperDraftPick[]> {
    const response = await fetch(`${this.baseUrl}/draft/${draftId}/picks`);
    if (!response.ok) {
      throw new Error(`Failed to fetch draft picks for draft ${draftId}: ${response.statusText}`);
    }
    return response.json();
  }

  async getUserDrafts(userId: string, sport: string = 'nfl', season: string): Promise<SleeperDraft[]> {
    const response = await fetch(`${this.baseUrl}/user/${userId}/drafts/${sport}/${season}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch drafts for user ${userId} in ${sport} ${season}: ${response.statusText}`);
    }
    return response.json();
  }

  async getNFLPlayers(): Promise<Record<string, any>> {
    const response = await fetch(`${this.baseUrl}/players/nfl`);
    if (!response.ok) {
      throw new Error(`Failed to fetch NFL players: ${response.statusText}`);
    }
    return response.json();
  }

  createPlayerMap(players: Record<string, any>): Record<string, any> {
    return players;
  }

  getPlayerById(playerId: string, playerMap: Record<string, any>): any | null {
    return playerMap[playerId] || null;
  }
}