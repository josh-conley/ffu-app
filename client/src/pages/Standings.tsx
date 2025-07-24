import { useState } from 'react';
import { useAllStandings } from '../hooks/useLeagues';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import { ErrorMessage } from '../components/Common/ErrorMessage';
import { StandingsTable } from '../components/League/StandingsTable';

export const Standings = () => {
  const { data: standings, isLoading, error } = useAllStandings();
  const [selectedYear, setSelectedYear] = useState<string>('');

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <ErrorMessage error={error} />;
  }

  // Get available years
  const availableYears = [...new Set(standings.map(s => s.year))].sort((a, b) => b.localeCompare(a));
  const currentYear = selectedYear || availableYears[0] || '';

  // Filter standings by selected year
  const yearStandings = standings.filter(s => s.year === currentYear);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">League Standings</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">View current standings across all FFU leagues</p>
        </div>
        
        <div className="mt-4 sm:mt-0">
          <select
            value={currentYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
          >
            {availableYears.map(year => (
              <option key={year} value={year}>{year} Season</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-8">
        {['PREMIER', 'MASTERS', 'NATIONAL'].map(league => {
          const leagueData = yearStandings.find(s => s.league === league);
          
          if (!leagueData) return null;

          return (
            <StandingsTable
              key={`${league}-${currentYear}`}
              standings={leagueData.standings}
              league={league}
              year={currentYear}
            />
          );
        })}
      </div>

      {yearStandings.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400">
            No standings data available for {currentYear}
          </div>
        </div>
      )}
    </div>
  );
};