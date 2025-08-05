import React, { useState, useEffect, useMemo } from 'react';
// import { ErrorMessage } from '../components/Common/ErrorMessage';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import { DraftBoard } from '../components/Draft/DraftBoard';
import { MobileDraftBoard } from '../components/Draft/MobileDraftBoard';
import { DraftList } from '../components/Draft/DraftList';
import type { DraftData, UserInfo, LeagueTier } from '../types';
import { dataService } from '../services/data.service';
import { LEAGUE_NAMES, AVAILABLE_YEARS, getAvailableLeaguesForYear } from '../constants/leagues';
import { getUserInfoBySleeperId, getFFUIdBySleeperId } from '../config/constants';
import { ChevronDown } from 'lucide-react';

type ViewMode = 'board' | 'list';

export const Draft: React.FC = () => {
  const [draftData, setDraftData] = useState<DraftData | null>(null);
  const [userMap, setUserMap] = useState<Record<string, UserInfo>>({});
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [isLoading, setIsLoading] = useState(false);
  const [, setError] = useState<string | undefined>();
  const [selectedLeague, setSelectedLeague] = useState<string>('PREMIER');
  const [selectedYear, setSelectedYear] = useState<string>('2024');
  
  // Era-aware available leagues
  const availableLeagues = useMemo(() => getAvailableLeaguesForYear(selectedYear), [selectedYear]);
  
  // Reset league selection if current league is not available in selected year
  useMemo(() => {
    if (!availableLeagues.includes(selectedLeague as LeagueTier)) {
      setSelectedLeague(availableLeagues[0]); // Default to first available league
    }
  }, [availableLeagues, selectedLeague]);

  const loadDraftData = async (league: string, year: string) => {
    try {
      setIsLoading(true);
      setError(undefined);
      setDraftData(null);
      setUserMap({});

      // Load historical league data
      const historicalData = await dataService.loadHistoricalLeagueData(league.toUpperCase() as LeagueTier, year);
      
      if (!historicalData) {
        setError(`No data found for ${league.toUpperCase()} ${year}`);
        setIsLoading(false);
        return;
      }

      if (!historicalData.draftData) {
        setError(`No draft data available for ${league.toUpperCase()} ${year}`);
        setIsLoading(false);
        return;
      }

      // Create user mapping from draft data with fallback to constants
      const userMapping: Record<string, UserInfo> = {};
      
      // Extract unique user IDs from draft picks
      const uniqueUserIds = [...new Set(historicalData.draftData.picks.map(pick => pick.userInfo.userId))];
      
      uniqueUserIds.forEach(userId => {
        // Prioritize historical team names from draft data over current constants
        const pickWithUser = historicalData.draftData?.picks.find(pick => pick.userInfo.userId === userId);
        
        if (pickWithUser && pickWithUser.userInfo.teamName) {
          // Use historical team name from draft data
          userMapping[userId] = pickWithUser.userInfo;
        } else {
          // Fallback to constants if historical data not available
          const userInfo = getUserInfoBySleeperId(userId);
          
          if (userInfo) {
            const ffuUserId = getFFUIdBySleeperId(userId) || 'unknown';
            userMapping[userId] = {
              userId,
              ffuUserId,
              teamName: userInfo.teamName,
              abbreviation: userInfo.abbreviation
            };
          } else {
            // Last fallback
            const ffuUserId = getFFUIdBySleeperId(userId) || 'unknown';
            userMapping[userId] = {
              userId,
              ffuUserId,
              teamName: `User ${userId}`,
              abbreviation: 'UNK'
            };
          }
        }
      });

      setDraftData(historicalData.draftData);
      setUserMap(userMapping);

    } catch (err) {
      console.error('Failed to load draft data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load draft data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDraftData(selectedLeague, selectedYear);
  }, [selectedLeague, selectedYear]);

  return (
    <div className="max-w-5xl mx-auto px-4">
      {/* Header with Filters */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="mb-3 sm:mb-0">
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Draft History</h1>
          <p className="mt-1 sm:mt-2 text-xs sm:text-base text-gray-600 dark:text-gray-300">View past draft results and selections</p>
        </div>
        
        <div className="flex flex-row gap-2 sm:gap-4 items-end">
          <div className="space-y-1 sm:space-y-2 min-w-0 flex-shrink">
            <label className="block text-xs sm:text-sm font-heading font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide">League</label>
            <div className="relative">
              <select
                value={selectedLeague}
                onChange={(e) => setSelectedLeague(e.target.value)}
                className="block w-20 sm:w-full pl-2 sm:pl-4 pr-6 sm:pr-12 py-2 sm:py-3 text-sm sm:text-base font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-ffu-red focus:border-ffu-red rounded hover:border-gray-400 dark:hover:border-gray-500 transition-colors duration-200 appearance-none"
              >
                {availableLeagues.map((league) => (
                  <option key={league} value={league}>{LEAGUE_NAMES[league]}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-1 sm:pr-3 pointer-events-none">
                <ChevronDown className="h-3 w-3 sm:h-5 sm:w-5 text-gray-400" />
              </div>
            </div>
          </div>

          <div className="space-y-1 sm:space-y-2 min-w-0 flex-shrink">
            <label className="block text-xs sm:text-sm font-heading font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide">Year</label>
            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="block w-16 sm:w-full pl-2 sm:pl-4 pr-6 sm:pr-12 py-2 sm:py-3 text-sm sm:text-base font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-ffu-red focus:border-ffu-red rounded hover:border-gray-400 dark:hover:border-gray-500 transition-colors duration-200 appearance-none"
              >
                {AVAILABLE_YEARS.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-1 sm:pr-3 pointer-events-none">
                <ChevronDown className="h-3 w-3 sm:h-5 sm:w-5 text-gray-400" />
              </div>
            </div>
          </div>

          {draftData && !isLoading && (
            <div className="flex border border-gray-300 dark:border-gray-600 rounded overflow-hidden flex-shrink-0">
              <button
                onClick={() => setViewMode('board')}
                className={`px-4 sm:px-4 py-2 sm:py-3 text-sm sm:text-base font-medium transition-colors duration-200 ${
                  viewMode === 'board'
                    ? 'bg-ffu-red text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <span className="hidden sm:inline">Draft Board</span>
                <span className="sm:hidden">Board</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 sm:px-4 py-2 sm:py-3 text-sm sm:text-base font-medium transition-colors duration-200 border-l border-gray-300 dark:border-gray-600 ${
                  viewMode === 'list'
                    ? 'bg-ffu-red text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <span className="hidden sm:inline">Pick List</span>
                <span className="sm:hidden">List</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8">
          <LoadingSpinner />
        </div>
      )}

      {/* Error State */}
      {/* {error && (
        <div className="mb-6">
          <ErrorMessage message={error} />
        </div>
      )} */}

      {/* Draft Content */}
      {draftData && !isLoading && (
        <>
          {/* Draft Board/List */}
          {viewMode === 'board' ? (
            <>
              {/* Desktop Draft Board */}
              <div className="hidden lg:block w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] px-4">
                <DraftBoard draftData={draftData} userMap={userMap} />
              </div>
              {/* Mobile Draft Board */}
              <div className="lg:hidden w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] px-1 pb-8">
                <MobileDraftBoard draftData={draftData} userMap={userMap} />
              </div>
            </>
          ) : (
            <div className="pb-8">
              <DraftList draftData={draftData} userMap={userMap} />
            </div>
          )}
        </>
      )}
    </div>
  );
};