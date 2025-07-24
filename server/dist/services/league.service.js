import { getLeagueId, getAllLeagueConfigs, validateLeagueAndYear } from '../config/constants';
export class LeagueService {
    sleeperService;
    constructor(sleeperService) {
        this.sleeperService = sleeperService;
    }
    async getLeagueStandings(league, year) {
        if (!validateLeagueAndYear(league, year)) {
            throw new Error(`League ${league} for year ${year} not found`);
        }
        const leagueId = getLeagueId(league, year);
        if (!leagueId) {
            throw new Error(`League ID not found for ${league} ${year}`);
        }
        const [rosters, users] = await Promise.all([
            this.sleeperService.getLeagueRosters(leagueId),
            this.sleeperService.getLeagueUsers(leagueId)
        ]);
        const userMap = this.sleeperService.createUserMap(users);
        let standings = rosters
            .map(roster => ({
            userId: roster.owner_id,
            wins: roster.settings?.wins || 0,
            losses: roster.settings?.losses || 0,
            pointsFor: (roster.settings?.fpts || 0) + (roster.settings?.fpts_decimal || 0) / 100,
            pointsAgainst: (roster.settings?.fpts_against || 0) + (roster.settings?.fpts_against_decimal || 0) / 100,
            rank: 0 // Will be calculated after sorting
        }));
        // Get playoff results if available
        let playoffResults = [];
        try {
            const [winnersBracket, losersBracket] = await Promise.all([
                this.sleeperService.getWinnersBracket(leagueId),
                this.sleeperService.getLosersBracket(leagueId)
            ]);
            playoffResults = this.parsePlayoffResults(winnersBracket, losersBracket, rosters);
        }
        catch (error) {
            console.warn(`Could not fetch playoff results for ${league} ${year}:`, error);
        }
        // Sort standings based on playoff results if available, otherwise by regular season
        if (playoffResults.length > 0) {
            // Create a map of playoff placements
            const playoffPlacementMap = {};
            playoffResults.forEach(result => {
                playoffPlacementMap[result.userId] = result.placement;
            });
            // Sort by playoff placement first, then regular season performance for non-playoff teams
            standings = standings.sort((a, b) => {
                const aPlayoffPlace = playoffPlacementMap[a.userId];
                const bPlayoffPlace = playoffPlacementMap[b.userId];
                // Both teams made playoffs - sort by playoff placement
                if (aPlayoffPlace && bPlayoffPlace) {
                    return aPlayoffPlace - bPlayoffPlace;
                }
                // Only one team made playoffs - playoff team wins
                if (aPlayoffPlace && !bPlayoffPlace)
                    return -1;
                if (!aPlayoffPlace && bPlayoffPlace)
                    return 1;
                // Neither team made playoffs - sort by regular season record
                if (a.wins !== b.wins)
                    return b.wins - a.wins;
                return b.pointsFor - a.pointsFor;
            });
        }
        else {
            // No playoff results - sort by regular season performance
            standings = standings.sort((a, b) => {
                if (a.wins !== b.wins)
                    return b.wins - a.wins;
                return b.pointsFor - a.pointsFor;
            });
        }
        // Assign final ranks
        standings = standings.map((standing, index) => ({
            ...standing,
            rank: index + 1
        }));
        return {
            league,
            year,
            leagueId,
            standings,
            playoffResults,
            promotions: this.calculatePromotions(league, standings),
            relegations: this.calculateRelegations(league, standings)
        };
    }
    async getAllLeagueStandings() {
        const allStandings = [];
        const allLeagues = getAllLeagueConfigs();
        for (const league of allLeagues) {
            try {
                const standings = await this.getLeagueStandings(league.tier, league.year);
                allStandings.push(standings);
            }
            catch (error) {
                console.error(`Error fetching standings for ${league.tier} ${league.year}:`, error);
            }
        }
        return allStandings; // Already sorted by getAllLeagueConfigs
    }
    async getWeekMatchups(league, year, week) {
        if (!validateLeagueAndYear(league, year)) {
            throw new Error(`League ${league} for year ${year} not found`);
        }
        const leagueId = getLeagueId(league, year);
        if (!leagueId) {
            throw new Error(`League ID not found for ${league} ${year}`);
        }
        const [matchups, rosters] = await Promise.all([
            this.sleeperService.getMatchupsForWeek(leagueId, week),
            this.sleeperService.getLeagueRosters(leagueId)
        ]);
        const rosterOwnerMap = this.sleeperService.createRosterOwnerMap(rosters);
        // Group matchups by matchup_id
        const groupedMatchups = {};
        matchups.forEach(matchup => {
            if (!groupedMatchups[matchup.matchup_id]) {
                groupedMatchups[matchup.matchup_id] = [];
            }
            groupedMatchups[matchup.matchup_id].push(matchup);
        });
        // Create head-to-head matchups
        const weekMatchups = [];
        Object.values(groupedMatchups).forEach(matchupPair => {
            if (matchupPair.length === 2) {
                const [team1, team2] = matchupPair;
                const team1Owner = rosterOwnerMap[team1.roster_id];
                const team2Owner = rosterOwnerMap[team2.roster_id];
                if (team1.points > team2.points) {
                    weekMatchups.push({
                        winner: team1Owner,
                        loser: team2Owner,
                        winnerScore: team1.points,
                        loserScore: team2.points
                    });
                }
                else {
                    weekMatchups.push({
                        winner: team2Owner,
                        loser: team1Owner,
                        winnerScore: team2.points,
                        loserScore: team1.points
                    });
                }
            }
        });
        return weekMatchups;
    }
    parsePlayoffResults(winnersBracket, losersBracket, rosters) {
        const results = [];
        // Create roster ID to owner ID mapping
        const rosterToOwner = {};
        rosters.forEach(roster => {
            rosterToOwner[roster.roster_id] = roster.owner_id;
        });
        console.log('Parsing playoff results for bracket structure:');
        console.log('Winners Bracket:', JSON.stringify(winnersBracket, null, 2));
        console.log('Losers Bracket:', JSON.stringify(losersBracket, null, 2));
        // Combine all matches and sort by round (later rounds = higher placement)
        const allMatches = [...winnersBracket, ...losersBracket];
        // First, extract explicit placements from match.p values
        const explicitPlacements = new Map();
        allMatches.forEach(match => {
            if (match.p && match.w && rosterToOwner[match.w]) {
                explicitPlacements.set(rosterToOwner[match.w], match.p);
            }
            // For matches with explicit placement, loser gets next placement
            if (match.p && match.l && rosterToOwner[match.l] && match.p < 10) {
                explicitPlacements.set(rosterToOwner[match.l], match.p + 1);
            }
        });
        // Handle championship specifically
        const maxRound = Math.max(...winnersBracket.map(match => match.r));
        const championshipMatch = winnersBracket.find(match => match.r === maxRound);
        if (championshipMatch && championshipMatch.w && championshipMatch.l) {
            explicitPlacements.set(rosterToOwner[championshipMatch.w], 1);
            explicitPlacements.set(rosterToOwner[championshipMatch.l], 2);
        }
        // For consolation brackets, systematically assign positions
        // Find all playoff participants (anyone who appears in winners or losers bracket)
        const playoffParticipants = new Set();
        allMatches.forEach(match => {
            if (match.w && rosterToOwner[match.w])
                playoffParticipants.add(rosterToOwner[match.w]);
            if (match.l && rosterToOwner[match.l])
                playoffParticipants.add(rosterToOwner[match.l]);
        });
        console.log('Playoff participants found:', Array.from(playoffParticipants));
        console.log('Explicit placements found:', Object.fromEntries(explicitPlacements));
        // Create results from explicit placements
        explicitPlacements.forEach((placement, userId) => {
            results.push({
                userId,
                placement,
                placementName: this.getPlacementName(placement)
            });
        });
        // For remaining playoff participants without explicit placement,
        // assign them positions after the highest explicit placement
        const assignedUserIds = new Set(results.map(r => r.userId));
        const remainingParticipants = Array.from(playoffParticipants).filter(userId => !assignedUserIds.has(userId));
        const highestAssignedPlacement = results.length > 0 ? Math.max(...results.map(r => r.placement)) : 0;
        remainingParticipants.forEach((userId, index) => {
            const placement = highestAssignedPlacement + index + 1;
            results.push({
                userId,
                placement,
                placementName: this.getPlacementName(placement)
            });
        });
        // Remove duplicates and sort by placement
        const uniqueResults = results.filter((result, index, self) => index === self.findIndex(r => r.userId === result.userId)).sort((a, b) => a.placement - b.placement);
        console.log('Final playoff results:', uniqueResults);
        return uniqueResults;
    }
    getPlacementName(placement) {
        if (placement === 1)
            return '1st';
        if (placement === 2)
            return '2nd';
        if (placement === 3)
            return '3rd';
        return `${placement}th`;
    }
    calculatePromotions(league, standings) {
        if (league === 'PREMIER')
            return []; // No promotions from Premier
        // Typically top 2 get promoted (adjust as needed for your league rules)
        return standings.slice(0, 2).map(s => s.userId);
    }
    calculateRelegations(league, standings) {
        if (league === 'NATIONAL')
            return []; // No relegations from National
        // Typically bottom 2 get relegated (adjust as needed for your league rules)
        return standings.slice(-2).map(s => s.userId);
    }
}
//# sourceMappingURL=league.service.js.map