import React, { useState, useEffect } from 'react';
// import { ErrorMessage } from '../components/Common/ErrorMessage';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import { DraftBoard } from '../components/Draft/DraftBoard';
import { DraftList } from '../components/Draft/DraftList';
import type { DraftData, UserInfo, LeagueTier } from '../types';
import { dataService } from '../services/data.service';
import { LEAGUE_NAMES, AVAILABLE_YEARS } from '../constants/leagues';
import { getUserInfoBySleeperId } from '../config/constants';
import { ChevronDown } from 'lucide-react';

type ViewMode = 'board' | 'list';

export const Draft: React.FC = () => {
  const [draftData, setDraftData] = useState<DraftData | null>(null);
  const [userMap, setUserMap] = useState<Record<string, UserInfo>>({});
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [isLoading, setIsLoading] = useState(false);
  const [_error, setError] = useState<string | undefined>();
  const [selectedLeague, setSelectedLeague] = useState<string>('PREMIER');
  const [selectedYear, setSelectedYear] = useState<string>('2024');

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
        // Try to get user info from constants first
        const userInfo = getUserInfoBySleeperId(userId);
        
        if (userInfo) {
          userMapping[userId] = {
            userId,
            teamName: userInfo.teamName,
            abbreviation: userInfo.abbreviation
          };
        } else {
          // Fallback to draft pick user info if available
          const pickWithUser = historicalData.draftData?.picks.find(pick => pick.userInfo.userId === userId);
          if (pickWithUser) {
            userMapping[userId] = pickWithUser.userInfo;
          } else {
            // Last fallback
            userMapping[userId] = {
              userId,
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
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Draft History</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">View past draft results and selections</p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-4 items-end">
          <div className="space-y-2">
            <label className="block text-sm font-heading font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide">League</label>
            <div className="relative">
              <select
                value={selectedLeague}
                onChange={(e) => setSelectedLeague(e.target.value)}
                className="block w-full pl-4 pr-12 py-3 text-base font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-ffu-red focus:border-ffu-red rounded hover:border-gray-400 dark:hover:border-gray-500 transition-colors duration-200 appearance-none"
              >
                {Object.entries(LEAGUE_NAMES).map(([key, name]) => (
                  <option key={key} value={key}>{name}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <ChevronDown className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-heading font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide">Season</label>
            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="block w-full pl-4 pr-12 py-3 text-base font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-ffu-red focus:border-ffu-red rounded hover:border-gray-400 dark:hover:border-gray-500 transition-colors duration-200 appearance-none"
              >
                {AVAILABLE_YEARS.map((year) => (
                  <option key={year} value={year}>{year} Season</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <ChevronDown className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>

          {draftData && !isLoading && (
            <div className="flex border border-gray-300 dark:border-gray-600 rounded overflow-hidden">
              <button
                onClick={() => setViewMode('board')}
                className={`pl-4 pr-4 py-3 text-base font-medium transition-colors duration-200 ${
                  viewMode === 'board'
                    ? 'bg-ffu-red text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                Draft Board
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`pl-4 pr-4 py-3 text-base font-medium transition-colors duration-200 border-l border-gray-300 dark:border-gray-600 ${
                  viewMode === 'list'
                    ? 'bg-ffu-red text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                Pick List
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
            <div className="w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] px-4">
              <DraftBoard draftData={draftData} userMap={userMap} />
            </div>
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