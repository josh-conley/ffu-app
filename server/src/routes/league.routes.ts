import { Router } from 'express';
import { LeagueController } from '../controllers/league.controller';
import { LeagueService } from '../services/league.service';
import { SleeperService } from '../services/sleeper.service';

const router = Router();
const sleeperService = new SleeperService();
const leagueService = new LeagueService(sleeperService);
const leagueController = new LeagueController(leagueService);

// GET /api/leagues/standings - Get all league standings for all years
router.get('/standings', leagueController.getAllStandings.bind(leagueController));

// GET /api/leagues/history - Get complete league history organized by year
router.get('/history', leagueController.getLeagueHistory.bind(leagueController));

// GET /api/leagues/:league/:year - Get standings for specific league and year
router.get('/:league/:year', leagueController.getLeagueStandings.bind(leagueController));

// GET /api/leagues/:league/:year/:week - Get matchups for specific week
router.get('/:league/:year/:week', leagueController.getWeekMatchups.bind(leagueController));

export default router;