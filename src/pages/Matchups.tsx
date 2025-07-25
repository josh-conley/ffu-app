import { useState } from 'react';
import { useWeekMatchups } from '../hooks/useLeagues';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import { ErrorMessage } from '../components/Common/ErrorMessage';
import { TeamLogo } from '../components/Common/TeamLogo';
import { LeagueBadge } from '../components/League/LeagueBadge';
import type { LeagueTier } from '../types';

export const Matchups = () => {
  const [selectedLeague, setSelectedLeague] = useState<LeagueTier>('PREMIER');
  const [selectedYear, setSelectedYear] = useState<string>('2024');
  const [selectedWeek, setSelectedWeek] = useState<number>(1);

  const { data: matchupsData, isLoading, error } = useWeekMatchups(selectedLeague, selectedYear, selectedWeek);

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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Matchups</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">View weekly matchups and scores</p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">League</label>
          <select
            value={selectedLeague}
            onChange={(e) => setSelectedLeague(e.target.value as LeagueTier)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
          >
            {leagues.map(league => (
              <option key={league} value={league}>{getLeagueName(league)}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Week</label>
          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
          >
            {weeks.map(week => (
              <option key={week} value={week}>Week {week}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Matchups Display */}
      {isLoading && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Loading Matchups...
              </h2>
              <div className="flex items-center space-x-2 mt-1">
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

      {matchupsData && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Week {matchupsData.week} Matchups
              </h2>
              <div className="flex items-center space-x-2 mt-1">
                <LeagueBadge league={matchupsData.league} />
                <span className="text-gray-500 dark:text-gray-400">•</span>
                <span className="text-gray-600 dark:text-gray-300">{matchupsData.year} Season</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {matchupsData.matchups?.map((matchup, index: number) => (
              <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 transition-colors">
                <div className="flex items-center justify-between">
                  {/* Winner Side */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 rounded text-xs font-medium">
                        W
                      </div>
                      <TeamLogo 
                        teamName={matchup.winnerInfo?.teamName || 'Unknown Team'}
                        abbreviation={matchup.winnerInfo?.abbreviation}
                        size="sm"
                      />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {matchup.winnerInfo?.teamName || 'Unknown Team'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {matchup.winnerInfo?.abbreviation}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="px-6 text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {matchup.winnerScore?.toFixed(2)} - {matchup.loserScore?.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Final Score</div>
                  </div>

                  {/* Loser Side */}
                  <div className="flex-1 text-right">
                    <div className="flex items-center justify-end space-x-3">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {matchup.loserInfo?.teamName || 'Unknown Team'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {matchup.loserInfo?.abbreviation}
                        </div>
                      </div>
                      <TeamLogo 
                        teamName={matchup.loserInfo?.teamName || 'Unknown Team'}
                        abbreviation={matchup.loserInfo?.abbreviation}
                        size="sm"
                      />
                      <div className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 px-2 py-1 rounded text-xs font-medium">
                        L
                      </div>
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
    </div>
  );
};