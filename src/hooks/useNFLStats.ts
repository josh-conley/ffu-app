import { useState, useEffect } from 'react';
import { nflStatsService } from '../services/nfl-stats.service';
import { getCurrentNFLWeek } from '../utils/nfl-schedule';
import type { NFLWeeklyLeaders, UseNFLStatsReturn } from '../types/nfl-stats';

export const useNFLStats = (season: string = '2025'): UseNFLStatsReturn => {
  const [data, setData] = useState<NFLWeeklyLeaders | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const fetchNFLStats = async () => {
      const currentWeek = getCurrentNFLWeek();
      
      if (!currentWeek) {
        setIsLoading(false);
        setError('No active NFL week');
        return;
      }

      try {
        setIsLoading(true);
        setError(undefined);
        
        let weeklyLeaders = await nflStatsService.getWeeklyLeaders(season, currentWeek);
        
        // If current week has no meaningful data, try Week 1 (we know it has data)
        const totalPlayers = [
          ...weeklyLeaders.quarterbacks,
          ...weeklyLeaders.runningBacks,
          ...weeklyLeaders.wideReceivers,
          ...weeklyLeaders.tightEnds,
          ...weeklyLeaders.defenses
        ].length;
        
        if (totalPlayers === 0) {
          console.log(`Week ${currentWeek} has no data, trying Week 3 instead`);
          weeklyLeaders = await nflStatsService.getWeeklyLeaders(season, 3);
        }
        
        setData(weeklyLeaders);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch NFL stats';
        setError(errorMessage);
        console.error('Error fetching NFL stats:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNFLStats();
  }, [season]);

  return { data, isLoading, error };
};