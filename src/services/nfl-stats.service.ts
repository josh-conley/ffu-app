import type { NFLWeeklyLeaders } from '../types/nfl-stats';

export class NFLStatsService {
  private baseUrl = 'https://api.sleeper.com';

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
      return rawData.map((item: any) => ({
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
        // Defense stats
        def_int: item.stats?.def_int,
        def_fum_rec: item.stats?.def_fum_rec,
        def_td: item.stats?.def_td,
        def_sack: item.stats?.def_sack
      }));
    } catch (error) {
      console.error(`Error fetching NFL stats for week ${week}:`, error);
      throw error;
    }
  }

  async getWeeklyLeaders(season: string, week: number): Promise<NFLWeeklyLeaders> {
    const stats = await this.getWeeklyStats(season, week);
    
    console.log('Transformed stats sample:', stats.slice(0, 3));
    
    // Filter for players with meaningful scores (>= 1 point half PPR)
    const playersWithPoints = stats.filter(player => (player.pts_half_ppr || 0) >= 1);
    
    console.log('Players with points:', playersWithPoints.length);
    
    // Filter and sort by position using half PPR
    const qbs = playersWithPoints
      .filter(player => player.player?.position === 'QB')
      .sort((a, b) => (b.pts_half_ppr || 0) - (a.pts_half_ppr || 0))
      .slice(0, 10);

    const rbs = playersWithPoints
      .filter(player => player.player?.position === 'RB')
      .sort((a, b) => (b.pts_half_ppr || 0) - (a.pts_half_ppr || 0))
      .slice(0, 20);

    const wrs = playersWithPoints
      .filter(player => player.player?.position === 'WR')
      .sort((a, b) => (b.pts_half_ppr || 0) - (a.pts_half_ppr || 0))
      .slice(0, 20);

    const tes = playersWithPoints
      .filter(player => player.player?.position === 'TE')
      .sort((a, b) => (b.pts_half_ppr || 0) - (a.pts_half_ppr || 0))
      .slice(0, 10);

    const defs = playersWithPoints
      .filter(player => player.player?.position === 'DEF')
      .sort((a, b) => (b.pts_half_ppr || 0) - (a.pts_half_ppr || 0))
      .slice(0, 10);

    console.log('Top QBs:', qbs.slice(0, 2));
    console.log('Top RBs:', rbs.slice(0, 2));
    console.log('Top TEs:', tes.slice(0, 2));

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