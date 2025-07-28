import { useState } from 'react';
import { useWeekMatchups, useAllSeasonMatchups } from '../hooks/useLeagues';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import { ErrorMessage } from '../components/Common/ErrorMessage';
import { TeamLogo } from '../components/Common/TeamLogo';
import { LeagueBadge } from '../components/League/LeagueBadge';
import type { LeagueTier } from '../types';

export const Matchups = () => {
  const [selectedLeague, setSelectedLeague] = useState<LeagueTier>('PREMIER');
  const [selectedYear, setSelectedYear] = useState<string>('2024');
  const [selectedWeek, setSelectedWeek] = useState<number | 'ALL'>(0); // 0 represents "All Weeks"

  const { data: weekMatchupsData, isLoading: weekLoading, error: weekError } = useWeekMatchups(
    selectedLeague,
    selectedYear,
    selectedWeek as number
  );
  const { data: allSeasonData, isLoading: seasonLoading, error: seasonError } = useAllSeasonMatchups(
    selectedLeague,
    selectedYear
  );

  // Use appropriate data based on selection
  const isShowingAllWeeks = selectedWeek === 0;
  const matchupsData = isShowingAllWeeks ? null : weekMatchupsData;
  const allWeeksData = isShowingAllWeeks ? allSeasonData : null;
  const isLoading = isShowingAllWeeks ? seasonLoading : weekLoading;
  const error = isShowingAllWeeks ? seasonError : weekError;

  const leagues: LeagueTier[] = ['PREMIER', 'MASTERS', 'NATIONAL'];

  const getLeagueName = (league: LeagueTier): string => {
    switch (league) {
      case 'PREMIER': return 'Premier';
      case 'MASTERS': return 'Masters';
      case 'NATIONAL': return 'National';
    }
  };
  const years = ['2024', '2023', '2022', '2021'];
  const weeks = Array.from({ length: 17 }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Matchups</h1>
        <p className="mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-300">View weekly matchups and scores</p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">League</label>
          <select
            value={selectedLeague}
            onChange={(e) => setSelectedLeague(e.target.value as LeagueTier)}
            className="block w-full pl-2 sm:pl-3 pr-8 sm:pr-10 py-1.5 sm:py-2 text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-primary-500 focus:border-primary-500 rounded-md"
          >
            {leagues.map(league => (
              <option key={league} value={league}>{getLeagueName(league)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="block w-full pl-2 sm:pl-3 pr-8 sm:pr-10 py-1.5 sm:py-2 text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-primary-500 focus:border-primary-500 rounded-md"
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Week</label>
          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value === '0' ? 0 : parseInt(e.target.value))}
            className="block w-full pl-2 sm:pl-3 pr-8 sm:pr-10 py-1.5 sm:py-2 text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-primary-500 focus:border-primary-500 rounded-md"
          >
            <option value={0}>All Weeks</option>
            {weeks.map(week => (
              <option key={week} value={week}>Week {week}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Matchups Display */}
      {isLoading && (
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-2 sm:space-y-0">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">
                Loading Matchups...
              </h2>
              <div className="flex items-center space-x-2 mt-1 text-sm sm:text-base">
                <div className="w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <span className="text-gray-500 dark:text-gray-400">•</span>
                <span className="text-gray-600 dark:text-gray-300">Loading...</span>
              </div>
            </div>
          </div>

          <div className="flex justify-center items-center min-h-64">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      )}

      {error && <ErrorMessage error={error} />}

      {/* Single Week Display */}
      {matchupsData && (
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-2 sm:space-y-0">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">
                Week {matchupsData.week} Matchups
              </h2>
              <div className="flex items-center space-x-2 mt-1 text-sm sm:text-base">
                <LeagueBadge league={matchupsData.league} />
                <span className="text-gray-500 dark:text-gray-400">•</span>
                <span className="text-gray-600 dark:text-gray-300">{matchupsData.year} Season</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {matchupsData.matchups?.map((matchup, index: number) => (
              <div key={index} className="transition-colors">
                {/* Mobile Stacked Layout */}
                <div className="sm:hidden space-y-0.5 border border-gray-100 dark:border-gray-800">
                  {/* Winner Row */}
                  <div className="flex items-center space-x-2 py-1.5 px-2 bg-green-50/50 dark:bg-green-900/10 rounded">
                    <div className="flex-shrink-0">
                      <TeamLogo
                        teamName={matchup.winnerInfo?.teamName || 'Unknown Team'}
                        abbreviation={matchup.winnerInfo?.abbreviation}
                        size="sm"
                      />
                    </div>
                    <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                      {matchup.winnerInfo?.teamName || 'Unknown Team'}
                    </div>
                  </div>

                  {/* Score Row */}
                  <div className="text-center py-1.5 border-y border-gray-200/50 dark:border-gray-600/50">
                    <div className="text-base font-bold">
                      <span className="text-green-600 dark:text-green-400 font-mono">{matchup.winnerScore?.toFixed(2)}</span>
                      <span className="text-gray-500 dark:text-gray-400 mx-2">-</span>
                      <span className="text-red-600 dark:text-red-400 font-mono">{matchup.loserScore?.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Loser Row */}
                  <div className="flex items-center justify-end space-x-2 py-1.5 px-2 bg-red-50/50 dark:bg-red-900/10 rounded">
                    <div className="font-medium text-gray-900 dark:text-gray-100 text-sm text-right">
                      {matchup.loserInfo?.teamName || 'Unknown Team'}
                    </div>
                    <div className="flex-shrink-0">
                      <TeamLogo
                        teamName={matchup.loserInfo?.teamName || 'Unknown Team'}
                        abbreviation={matchup.loserInfo?.abbreviation}
                        size="sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Desktop Horizontal Layout */}
                <div className="hidden sm:flex items-center justify-between gap-4 border border-gray-100 dark:border-gray-800 p-2">
                  {/* Winner Side */}
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      <TeamLogo
                        teamName={matchup.winnerInfo?.teamName || 'Unknown Team'}
                        abbreviation={matchup.winnerInfo?.abbreviation}
                        size="md"
                      />
                    </div>
                    <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                      {matchup.winnerInfo?.teamName || 'Unknown Team'}
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-center flex-shrink-0 px-4">
                    <div className="text-lg font-bold whitespace-nowrap">
                      <span className="text-green-600 dark:text-green-400 font-mono">{matchup.winnerScore?.toFixed(2)}</span>
                      <span className="text-gray-500 dark:text-gray-400 mx-2">-</span>
                      <span className="text-red-600 dark:text-red-400 font-mono">{matchup.loserScore?.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Loser Side */}
                  <div className="flex items-center justify-end space-x-3 flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-gray-100 text-right text-sm">
                      {matchup.loserInfo?.teamName || 'Unknown Team'}
                    </div>
                    <div className="flex-shrink-0">
                      <TeamLogo
                        teamName={matchup.loserInfo?.teamName || 'Unknown Team'}
                        abbreviation={matchup.loserInfo?.abbreviation}
                        size="md"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {matchupsData.matchups?.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No matchups found for this week
            </div>
          )}
        </div>
      )}

      {/* All Weeks Display */}
      {allWeeksData && (
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-2 sm:space-y-0">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">
                All Season Matchups
              </h2>
              <div className="flex items-center space-x-2 mt-1 text-sm sm:text-base">
                <LeagueBadge league={selectedLeague} />
                <span className="text-gray-500 dark:text-gray-400">•</span>
                <span className="text-gray-600 dark:text-gray-300">{selectedYear} Season</span>
              </div>
            </div>
          </div>

          <div className="space-y-6 sm:space-y-8">
            {allWeeksData.map((weekData) => (
              <div key={weekData.week}>
                <h3 className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-200 mb-4 border-b border-gray-200 dark:border-gray-600 pb-2">
                  Week {weekData.week}
                </h3>
                <div className="space-y-3 sm:space-y-2">
                  {weekData.matchups?.map((matchup, index: number) => (
                    <div key={index} className="transition-colors">
                      {/* Mobile Stacked Layout */}
                      <div className="sm:hidden space-y-0.5 border border-gray-100 dark:border-gray-800">
                        {/* Winner Row */}
                        <div className="flex items-center space-x-2 py-1.5 px-2 bg-green-50/50 dark:bg-green-900/10 rounded">
                          <div className="flex-shrink-0">
                            <TeamLogo
                              teamName={matchup.winnerInfo?.teamName || 'Unknown Team'}
                              abbreviation={matchup.winnerInfo?.abbreviation}
                              size="sm"
                            />
                          </div>
                          <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                            {matchup.winnerInfo?.teamName || 'Unknown Team'}
                          </div>
                        </div>

                        {/* Score Row */}
                        <div className="text-center py-1.5 border-y border-gray-200/50 dark:border-gray-600/50">
                          <div className="text-base font-bold">
                            <span className="text-green-600 dark:text-green-400 font-mono">{matchup.winnerScore?.toFixed(2)}</span>
                            <span className="text-gray-500 dark:text-gray-400 mx-2">-</span>
                            <span className="text-red-600 dark:text-red-400 font-mono">{matchup.loserScore?.toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Loser Row */}
                        <div className="flex items-center justify-end space-x-2 py-1.5 px-2 bg-red-50/50 dark:bg-red-900/10 rounded">
                          <div className="font-medium text-gray-900 dark:text-gray-100 text-sm text-right">
                            {matchup.loserInfo?.teamName || 'Unknown Team'}
                          </div>
                          <div className="flex-shrink-0">
                            <TeamLogo
                              teamName={matchup.loserInfo?.teamName || 'Unknown Team'}
                              abbreviation={matchup.loserInfo?.abbreviation}
                              size="sm"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Desktop Horizontal Layout */}
                      <div className="hidden sm:flex items-center justify-between gap-4 border border-gray-100 dark:border-gray-800 p-2">
                        {/* Winner Side */}
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="flex-shrink-0">
                            <TeamLogo
                              teamName={matchup.winnerInfo?.teamName || 'Unknown Team'}
                              abbreviation={matchup.winnerInfo?.abbreviation}
                              size="md"
                            />
                          </div>
                          <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                            {matchup.winnerInfo?.teamName || 'Unknown Team'}
                          </div>
                        </div>

                        {/* Score */}
                        <div className="text-center flex-shrink-0 px-4">
                          <div className="text-lg font-bold whitespace-nowrap">
                            <span className="text-green-600 dark:text-green-400 font-mono">{matchup.winnerScore?.toFixed(2)}</span>
                            <span className="text-gray-500 dark:text-gray-400 mx-2">-</span>
                            <span className="text-red-600 dark:text-red-400 font-mono">{matchup.loserScore?.toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Loser Side */}
                        <div className="flex items-center justify-end space-x-3 flex-1 min-w-0">
                          <div className="font-medium text-gray-900 dark:text-gray-100 text-right text-sm">
                            {matchup.loserInfo?.teamName || 'Unknown Team'}
                          </div>
                          <div className="flex-shrink-0">
                            <TeamLogo
                              teamName={matchup.loserInfo?.teamName || 'Unknown Team'}
                              abbreviation={matchup.loserInfo?.abbreviation}
                              size="md"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {allWeeksData.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No matchups found for this season
            </div>
          )}
        </div>
      )}
    </div>
  );
};