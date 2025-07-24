export class SleeperService {
    baseUrl = 'https://api.sleeper.app/v1';
    async getLeague(leagueId) {
        const response = await fetch(`${this.baseUrl}/league/${leagueId}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch league ${leagueId}: ${response.statusText}`);
        }
        return response.json();
    }
    async getLeagueUsers(leagueId) {
        const response = await fetch(`${this.baseUrl}/league/${leagueId}/users`);
        if (!response.ok) {
            throw new Error(`Failed to fetch users for league ${leagueId}: ${response.statusText}`);
        }
        return response.json();
    }
    async getLeagueRosters(leagueId) {
        const response = await fetch(`${this.baseUrl}/league/${leagueId}/rosters`);
        if (!response.ok) {
            throw new Error(`Failed to fetch rosters for league ${leagueId}: ${response.statusText}`);
        }
        return response.json();
    }
    async getMatchupsForWeek(leagueId, week) {
        const response = await fetch(`${this.baseUrl}/league/${leagueId}/matchups/${week}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch matchups for league ${leagueId} week ${week}: ${response.statusText}`);
        }
        return response.json();
    }
    async getWinnersBracket(leagueId) {
        const response = await fetch(`${this.baseUrl}/league/${leagueId}/winners_bracket`);
        if (!response.ok) {
            throw new Error(`Failed to fetch winners bracket for league ${leagueId}: ${response.statusText}`);
        }
        return response.json();
    }
    async getLosersBracket(leagueId) {
        const response = await fetch(`${this.baseUrl}/league/${leagueId}/losers_bracket`);
        if (!response.ok) {
            throw new Error(`Failed to fetch losers bracket for league ${leagueId}: ${response.statusText}`);
        }
        return response.json();
    }
    async getUser(userId) {
        const response = await fetch(`${this.baseUrl}/user/${userId}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch user ${userId}: ${response.statusText}`);
        }
        return response.json();
    }
    createRosterOwnerMap(rosters) {
        const map = {};
        rosters.forEach(roster => {
            map[roster.roster_id] = roster.owner_id;
        });
        return map;
    }
    createUserMap(users) {
        const map = {};
        users.forEach(user => {
            map[user.user_id] = user;
        });
        return map;
    }
}
//# sourceMappingURL=sleeper.service.js.map