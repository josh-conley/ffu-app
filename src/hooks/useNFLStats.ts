import { useState, useEffect } from 'react';
import { nflStatsService } from '../services/nfl-stats.service';
import { getCurrentNFLWeek, isNFLWeekComplete } from '../utils/nfl-schedule';
import type { NFLWeeklyLeaders, UseNFLStatsReturn } from '../types/nfl-stats';

export const useNFLStats = (season: string = '2025'): UseNFLStatsReturn => {
  const [data, setData] = useState<NFLWeeklyLeaders | null>(null);
  const [week, setWeek] = useState<number | null>(null);
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

        // Show current week's stats if complete, otherwise show previous week
        let targetWeek = currentWeek;
        if (!isNFLWeekComplete(currentWeek)) {
          targetWeek = Math.max(1, currentWeek - 1);
        }

        let weeklyLeaders = await nflStatsService.getWeeklyLeaders(season, targetWeek);

        // If target week has no meaningful data, fallback to previous weeks
        const totalPlayers = [
          ...weeklyLeaders.quarterbacks,
          ...weeklyLeaders.runningBacks,
          ...weeklyLeaders.wideReceivers,
          ...weeklyLeaders.tightEnds,
          ...weeklyLeaders.defenses
        ].length;

        if (totalPlayers === 0) {
          // Try going back one week at a time until we find data
          for (let fallbackWeek = targetWeek - 1; fallbackWeek >= 1; fallbackWeek--) {
            console.log(`Week ${targetWeek} has no data, trying Week ${fallbackWeek} instead`);
            weeklyLeaders = await nflStatsService.getWeeklyLeaders(season, fallbackWeek);

            const fallbackTotal = [
              ...weeklyLeaders.quarterbacks,
              ...weeklyLeaders.runningBacks,
              ...weeklyLeaders.wideReceivers,
              ...weeklyLeaders.tightEnds,
              ...weeklyLeaders.defenses
            ].length;

            if (fallbackTotal > 0) {
              targetWeek = fallbackWeek;
              break;
            }
          }
        }

        setData(weeklyLeaders);
        setWeek(targetWeek);
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

  return { data, week, isLoading, error };
};