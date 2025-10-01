import type { NFLWeeklyLeaders } from '../types/nfl-stats';
import { sleeperService } from './api';
import { getActiveLeagues, getUserById } from '../config/constants';

export class NFLStatsService {
  private baseUrl = 'https://api.sleeper.com';

  /**
   * Calculate custom fantasy points with our specific scoring system
   */
  private calculateCustomPoints(player: any): number {
    const position = player.player?.position;

    if (position === 'QB') {
      return this.calculateQBPoints(player);
    } else if (position === 'DEF') {
      // Use Sleeper's standard defense scoring for now
      return player.pts_half_ppr || 0;
    } else {
      // For non-QBs/non-DEF, use base half PPR + first down bonuses
      const basePoints = player.pts_half_ppr || 0;
      const rushingFirstDowns = (player.rush_fd || 0) * 0.5;
      const receivingFirstDowns = (player.rec_fd || 0) * 0.5;
      const passingFirstDowns = (player.pass_fd || 0) * 0.1;

      return basePoints + rushingFirstDowns + receivingFirstDowns + passingFirstDowns;
    }
  }

  /**
   * Custom QB scoring calculation
   * - 0.05 per passing yard
   * - 0.1 per rushing/receiving yard
   * - 0.1 per passing first down
   * - 0.5 per receiving/rushing first down
   * - -2 per interception
   * - -0.5 per fumble
   * - -1.5 per fumble LOST
   * - 6 pts per rushing/receiving TD
   * - 4 points per passing TD
   */
  private calculateQBPoints(player: any): number {
    let points = 0;

    // Passing
    points += (player.pass_yd || 0) * 0.05;           // 0.05 per passing yard
    points += (player.pass_td || 0) * 4;              // 4 per passing TD
    points += (player.pass_int || 0) * -2;            // -2 per interception
    points += (player.pass_fd || 0) * 0.1;            // 0.1 per passing first down

    // Rushing
    points += (player.rush_yd || 0) * 0.1;            // 0.1 per rushing yard
    points += (player.rush_td || 0) * 6;              // 6 per rushing TD
    points += (player.rush_fd || 0) * 0.5;            // 0.5 per rushing first down

    // Receiving (for QBs who might catch passes)
    points += (player.rec_yd || 0) * 0.1;             // 0.1 per receiving yard
    points += (player.rec_td || 0) * 6;               // 6 per receiving TD
    points += (player.rec_fd || 0) * 0.5;             // 0.5 per receiving first down

    // Fumbles
    points += (player.fum_lost || 0) * -2;            // -2 per fumble lost (fumbles with no loss = 0 points)

    return points;
  }

  /**
   * Get all starter data for current week across all FFU leagues
   */
  private async getFFUStarterData(week: number): Promise<Map<string, { userId: string, teamName: string, abbreviation: string }[]>> {
    const starterMap = new Map<string, { userId: string, teamName: string, abbreviation: string }[]>();

    try {
      // Get active leagues for 2025
      const activeLeagues = getActiveLeagues().filter(league => league.year === '2025');

      // Get matchups for all leagues in parallel
      const leaguePromises = activeLeagues.map(async (league) => {
        try {
          const [matchups, rosters] = await Promise.all([
            sleeperService.getMatchupsForWeek(league.sleeperId, week),
            sleeperService.getLeagueRosters(league.sleeperId)
          ]);

          // Create roster lookup map
          const rosterMap = new Map();
          rosters.forEach((roster: any) => {
            const user = getUserById(roster.owner_id);
            if (user) {
              rosterMap.set(roster.roster_id, {
                userId: user.sleeperId,
                teamName: user.teamName,
                abbreviation: user.abbreviation
              });
            }
          });

          // Process each matchup to get starters
          matchups.forEach((matchup: any) => {
            const teamInfo = rosterMap.get(matchup.roster_id);
            if (teamInfo && matchup.starters) {
              matchup.starters.forEach((playerId: string) => {
                const existing = starterMap.get(playerId) || [];
                existing.push(teamInfo);
                starterMap.set(playerId, existing);
              });
            }
          });
        } catch (error) {
          console.warn(`Failed to fetch starter data for ${league.tier}:`, error);
        }
      });

      await Promise.all(leaguePromises);
    } catch (error) {
      console.error('Failed to fetch FFU starter data:', error);
    }

    return starterMap;
  }

  async getWeeklyStats(season: string, week: number): Promise<any[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/stats/nfl/${season}/${week}?season_type=regular`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch NFL stats: ${response.statusText}`);
      }
      
      const rawData = await response.json();
      
      // Transform the API response to our expected format
      return rawData.map((item: any) => {
        const playerData = {
          player_id: item.player_id,
          week: item.week,
          season: item.season,
          season_type: item.season_type,
          player: item.player, // Player info is already embedded
          // Extract stats from the nested stats object
          pts_ppr: item.stats?.pts_ppr,
          pts_half_ppr: item.stats?.pts_half_ppr,
          pts_std: item.stats?.pts_std,
          pass_yd: item.stats?.pass_yd,
          pass_td: item.stats?.pass_td,
          pass_int: item.stats?.pass_int,
          rush_yd: item.stats?.rush_yd,
          rush_td: item.stats?.rush_td,
          rush_att: item.stats?.rush_att,
          rec_yd: item.stats?.rec_yd,
          rec_td: item.stats?.rec_td,
          rec: item.stats?.rec,
          rec_tgt: item.stats?.rec_tgt,
          // Fumble data
          fum: item.stats?.fum,
          fum_lost: item.stats?.fum_lost,
          // First down data
          pass_fd: item.stats?.pass_fd,
          rush_fd: item.stats?.rush_fd,
          rec_fd: item.stats?.rec_fd,
          // Defense stats (using correct Sleeper field names)
          def_int: item.stats?.int,
          def_fum_rec: item.stats?.fum_rec,
          def_td: item.stats?.td,
          def_sack: item.stats?.sack,
          def_pts_allowed: item.stats?.pts_allow,
          def_yds_allowed: item.stats?.yds_allow,
          def_safety: item.stats?.safety,
          def_tackled_for_loss: item.stats?.tkl_loss,
          def_qb_hit: item.stats?.qb_hit,
          def_passes_defended: item.stats?.def_pass_def,
          def_4_and_stop: item.stats?.def_4_and_stop
        };


        // Calculate custom points with first down bonuses
        playerData.pts_half_ppr = this.calculateCustomPoints(playerData);

        return playerData;
      });
    } catch (error) {
      console.error(`Error fetching NFL stats for week ${week}:`, error);
      throw error;
    }
  }

  async getWeeklyLeaders(season: string, week: number): Promise<NFLWeeklyLeaders> {
    // Fetch both NFL stats and FFU starter data in parallel
    const [stats, starterData] = await Promise.all([
      this.getWeeklyStats(season, week),
      this.getFFUStarterData(week)
    ]);

    // Add FFU starter info to each player
    const enrichedStats = stats.map(player => ({
      ...player,
      ffuStarters: starterData.get(player.player_id) || []
    }));
    
    // Filter for players with meaningful scores (>= 1 point half PPR)
    const playersWithPoints = enrichedStats.filter(player => (player.pts_half_ppr || 0) >= 1);
    
    console.log('Players with points:', playersWithPoints.length);
    
    // Filter and sort by position using half PPR
    const qbs = playersWithPoints
      .filter(player => player.player?.position === 'QB')
      .sort((a, b) => (b.pts_half_ppr || 0) - (a.pts_half_ppr || 0))
      .slice(0, 12);

    const rbs = playersWithPoints
      .filter(player => player.player?.position === 'RB')
      .sort((a, b) => (b.pts_half_ppr || 0) - (a.pts_half_ppr || 0))
      .slice(0, 24);

    const wrs = playersWithPoints
      .filter(player => player.player?.position === 'WR')
      .sort((a, b) => (b.pts_half_ppr || 0) - (a.pts_half_ppr || 0))
      .slice(0, 24);

    const tes = playersWithPoints
      .filter(player => player.player?.position === 'TE')
      .sort((a, b) => (b.pts_half_ppr || 0) - (a.pts_half_ppr || 0))
      .slice(0, 12);

    const defs = playersWithPoints
      .filter(player => player.player?.position === 'DEF')
      .sort((a, b) => (b.pts_half_ppr || 0) - (a.pts_half_ppr || 0))
      .slice(0, 12);

    console.log('Top QBs:', qbs.slice(0, 2));
    console.log('Top RBs:', rbs.slice(0, 2));
    console.log('Top TEs:', tes.slice(0, 2));
    console.log('Top 10 Defenses (pts_half_ppr):', defs.slice(0, 10).map(d => ({
      team: d.player?.team,
      custom_points: d.pts_half_ppr?.toFixed(2),
      sleeper_points: d.pts_std?.toFixed(2) || 'N/A',
      sacks: d.def_sack,
      ints: d.def_int,
      fum_rec: d.def_fum_rec,
      pts_allowed: d.def_pts_allowed
    })));

    return {
      quarterbacks: qbs,
      runningBacks: rbs,
      wideReceivers: wrs,
      tightEnds: tes,
      defenses: defs
    };
  }

  async getAllPlayers(): Promise<Record<string, any>> {
    try {
      const response = await fetch(`${this.baseUrl}/players/nfl`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch NFL players: ${response.statusText}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('Error fetching NFL players:', error);
      throw error;
    }
  }
}

export const nflStatsService = new NFLStatsService();