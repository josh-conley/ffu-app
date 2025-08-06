import { useState, useEffect } from 'react';
import { useUrlParams } from '../hooks/useUrlParams';
import { useAllStandings } from '../hooks/useLeagues';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import { ErrorMessage } from '../components/Common/ErrorMessage';
import { StandingsTable } from '../components/League/StandingsTable';
import { ChevronDown } from 'lucide-react';

export const Standings = () => {
  const { getParam, updateParams } = useUrlParams();
  const { data: standings, isLoading, error } = useAllStandings();
  const [selectedYear, setSelectedYear] = useState<string>('');

  // Get available years (safe even when standings is empty)
  const availableYears = standings ? [...new Set(standings.map(s => s.year))].sort((a, b) => b.localeCompare(a)) : [];
  const currentYear = selectedYear || availableYears[0] || '';

  // Initialize from URL params on mount
  useEffect(() => {
    const urlYear = getParam('year', '');
    if (urlYear) {
      setSelectedYear(urlYear);
    }
  }, []); // Empty dependency array - only run on mount

  // Update selectedYear when data loads if no year is selected
  useEffect(() => {
    if (!selectedYear && availableYears.length > 0) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">League Standings</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Current standings and historical results across all FFU leagues</p>
        </div>

        {/* Year Filter Loading */}
        <div className="flex justify-center">
          <div className="space-y-2">
            <label className="block text-sm font-heading font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide">Season</label>
            <div className="relative">
              <select
                disabled
                className="block w-full pl-4 pr-12 py-3 text-base font-medium bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 rounded appearance-none"
              >
                <option>Loading years...</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <ChevronDown className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Loading Standings Display */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {['Premier', 'Masters', 'National'].map((league) => (
            <div key={league} className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{league} League</h2>
              </div>
              <div className="flex justify-center items-center min-h-64">
                <LoadingSpinner size="md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorMessage error={error} />;
  }

  // Filter standings by selected year
  const yearStandings = standings.filter(s => s.year === currentYear);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">League Standings</h1>
        </div>
        
        <div className="mt-4 sm:mt-0">
          <div className="space-y-2">
            <div className="relative">
              <select
                value={currentYear}
                onChange={(e) => {
                  const year = e.target.value;
                  setSelectedYear(year);
                  updateParams({ year });
                }}
                className="block w-full pl-4 pr-12 py-3 text-base font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-ffu-red focus:border-ffu-red rounded hover:border-gray-400 dark:hover:border-gray-500 transition-colors duration-200 appearance-none"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year} Season</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <ChevronDown className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>
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