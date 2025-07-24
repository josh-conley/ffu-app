import { getUserInfoBySleeperId, getDefaultUserInfo } from '../config/constants';
export class LeagueController {
    leagueService;
    constructor(leagueService) {
        this.leagueService = leagueService;
    }
    async getAllStandings(req, res) {
        try {
            const standings = await this.leagueService.getAllLeagueStandings();
            // Enhance with user info
            const enhancedStandings = standings.map(leagueData => ({
                ...leagueData,
                standings: leagueData.standings.map(standing => ({
                    ...standing,
                    userInfo: getUserInfoBySleeperId(standing.userId) || getDefaultUserInfo()
                })),
                playoffResults: leagueData.playoffResults.map(result => ({
                    ...result,
                    userInfo: getUserInfoBySleeperId(result.userId) || getDefaultUserInfo()
                }))
            }));
            res.json(enhancedStandings);
        }
        catch (error) {
            console.error('Error fetching all standings:', error);
            res.status(500).json({ error: 'Failed to fetch standings' });
        }
    }
    async getLeagueStandings(req, res) {
        try {
            const { league, year } = req.params;
            if (!league || !year) {
                return res.status(400).json({ error: 'League and year are required' });
            }
            const leagueTier = league.toUpperCase();
            if (!['PREMIER', 'MASTERS', 'NATIONAL'].includes(leagueTier)) {
                return res.status(400).json({ error: 'Invalid league. Must be PREMIER, MASTERS, or NATIONAL' });
            }
            const standings = await this.leagueService.getLeagueStandings(leagueTier, year);
            // Enhance with user info
            const enhancedStandings = {
                ...standings,
                standings: standings.standings.map(standing => ({
                    ...standing,
                    userInfo: getUserInfoBySleeperId(standing.userId) || getDefaultUserInfo()
                })),
                playoffResults: standings.playoffResults.map(result => ({
                    ...result,
                    userInfo: getUserInfoBySleeperId(result.userId) || getDefaultUserInfo()
                }))
            };
            res.json(enhancedStandings);
        }
        catch (error) {
            console.error('Error fetching league standings:', error);
            res.status(500).json({ error: 'Failed to fetch league standings' });
        }
    }
    async getWeekMatchups(req, res) {
        try {
            const { league, year, week } = req.params;
            if (!league || !year || !week) {
                return res.status(400).json({ error: 'League, year, and week are required' });
            }
            const leagueTier = league.toUpperCase();
            if (!['PREMIER', 'MASTERS', 'NATIONAL'].includes(leagueTier)) {
                return res.status(400).json({ error: 'Invalid league. Must be PREMIER, MASTERS, or NATIONAL' });
            }
            const weekNum = parseInt(week);
            if (isNaN(weekNum) || weekNum < 1 || weekNum > 18) {
                return res.status(400).json({ error: 'Week must be a number between 1 and 18' });
            }
            const matchups = await this.leagueService.getWeekMatchups(leagueTier, year, weekNum);
            // Enhance with user info
            const enhancedMatchups = matchups.map(matchup => ({
                ...matchup,
                winnerInfo: getUserInfoBySleeperId(matchup.winner) || getDefaultUserInfo(),
                loserInfo: getUserInfoBySleeperId(matchup.loser) || getDefaultUserInfo()
            }));
            res.json({
                league: leagueTier,
                year,
                week: weekNum,
                matchups: enhancedMatchups
            });
        }
        catch (error) {
            console.error('Error fetching week matchups:', error);
            res.status(500).json({ error: 'Failed to fetch week matchups' });
        }
    }
    async getLeagueHistory(req, res) {
        try {
            const allStandings = await this.leagueService.getAllLeagueStandings();
            // Group by year and create a summary
            const historyByYear = {};
            allStandings.forEach(leagueData => {
                if (!historyByYear[leagueData.year]) {
                    historyByYear[leagueData.year] = {};
                }
                historyByYear[leagueData.year][leagueData.league] = {
                    standings: leagueData.standings.map(standing => ({
                        ...standing,
                        userInfo: getUserInfoBySleeperId(standing.userId) || getDefaultUserInfo()
                    })),
                    promotions: leagueData.promotions,
                    relegations: leagueData.relegations,
                    playoffResults: leagueData.playoffResults
                };
            });
            res.json(historyByYear);
        }
        catch (error) {
            console.error('Error fetching league history:', error);
            res.status(500).json({ error: 'Failed to fetch league history' });
        }
    }
}
//# sourceMappingURL=league.controller.js.map