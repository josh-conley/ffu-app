import { useState, useEffect } from 'react';
import { useUrlParams } from '../hooks/useUrlParams';
import { useAllStandings } from '../hooks/useLeagues';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import { ErrorMessage } from '../components/Common/ErrorMessage';
import { StandingsTable } from '../components/League/StandingsTable';
import { TeamLogo } from '../components/Common/TeamLogo';
import { getDisplayTeamName, isActiveYear } from '../config/constants';
import { getLeagueName } from '../constants/leagues';
import { ChevronDown, Crown } from 'lucide-react';
import type { LeagueTier } from '../types';

export const Standings = () => {
  const { getParam, updateParams } = useUrlParams();
  const { data: standings, isLoading, error } = useAllStandings();
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedLeague, setSelectedLeague] = useState<string | null>(null);

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

  // On mobile, default to showing Premier league
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (isMobile && !selectedLeague) {
      setSelectedLeague('PREMIER');
    }
  }, [selectedLeague]);

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
  const isActiveSeason = isActiveYear(currentYear);

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

      {/* Overview cards - hidden on mobile */}
      <div className="hidden md:block">
        {!selectedLeague && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {['PREMIER', 'MASTERS', 'NATIONAL'].map(league => {
                const leagueData = yearStandings.find(s => s.league === league);
                
                if (!leagueData) return null;

                const getLeagueColors = (leagueType: string) => {
                  const colorMap = {
                    PREMIER: {
                      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
                      border: 'border-yellow-300 dark:border-yellow-700',
                      text: 'text-yellow-800 dark:text-yellow-300',
                      iconBg: 'bg-yellow-500 dark:bg-yellow-600',
                      buttonBg: 'bg-yellow-500 hover:bg-yellow-600',
                    },
                    MASTERS: {
                      bg: 'bg-purple-50 dark:bg-purple-900/20',
                      border: 'border-purple-300 dark:border-purple-700',
                      text: 'text-purple-800 dark:text-purple-300',
                      iconBg: 'bg-purple-500 dark:bg-purple-600',
                      buttonBg: 'bg-purple-500 hover:bg-purple-600',
                    },
                    NATIONAL: {
                      bg: 'bg-red-50 dark:bg-red-900/20',
                      border: 'border-red-300 dark:border-red-700',
                      text: 'text-red-800 dark:text-red-300',
                      iconBg: 'bg-red-500 dark:bg-red-600',
                      buttonBg: 'bg-red-500 hover:bg-red-600',
                    }
                  };
                  return colorMap[leagueType as keyof typeof colorMap] || colorMap.NATIONAL;
                };

                const colors = getLeagueColors(league);

                return (
                  <div key={league} className={`card ${colors.bg}`}>
                    {/* League header */}
                    <div className={`${colors.iconBg} -mx-6 -mt-6 mb-4 p-4`}>
                      <h3 className="text-xl font-black text-white tracking-wide uppercase text-center">
                        {getLeagueName(league as LeagueTier)} League
                      </h3>
                    </div>
                    
                    {/* All teams */}
                    <div className="space-y-3 mb-4">
                      {leagueData.standings.map((standing, index) => (
                        <div key={standing.userId} className="flex items-center space-x-3">
                          <span className={`w-8 h-8 flex items-center justify-center text-sm font-bold ${colors.iconBg} text-white relative`}>
                            {index + 1}
                            {!isActiveSeason && index === 0 && (
                              <Crown className="absolute -top-1 -right-1 w-3 h-3 text-yellow-400" />
                            )}
                          </span>
                          <div className="hidden sm:block">
                            <TeamLogo 
                              teamName={standing.userInfo.teamName}
                              abbreviation={standing.userInfo.abbreviation}
                              size="sm"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-bold truncate flex items-center gap-1 ${
                              !isActiveSeason && index === 0 
                                ? `${colors.text} font-black` 
                                : 'text-gray-900 dark:text-gray-100'
                            }`}>
                              {getDisplayTeamName(standing.userId, standing.userInfo.teamName, currentYear)}
                              {!isActiveSeason && index === 0 && (
                                <Crown className="w-3 h-3 text-yellow-500" />
                              )}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {standing.wins}-{standing.losses}
                              {!isActiveSeason && index === 0 && (
                                <span className={`ml-1 text-xs font-medium ${colors.text}`}>Champion</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* View full table button */}
                    <button
                      onClick={() => setSelectedLeague(league)}
                      className={`w-full ${colors.buttonBg} text-white font-medium py-2 px-4 transition-colors`}
                    >
                      View Full Table
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Tab/Full table view */}
      {selectedLeague && (
        // Full table view for selected league
        <div className="space-y-4">
          {/* Back button and tabs */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <button
              onClick={() => setSelectedLeague(null)}
              className="hidden md:block px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              ← Back to Overview
            </button>
            {['PREMIER', 'MASTERS', 'NATIONAL'].map(league => {
              const leagueData = yearStandings.find(s => s.league === league);
              if (!leagueData) return null;
              
              const getLeagueTabColors = (leagueType: string) => {
                const colorMap = {
                  PREMIER: {
                    bg: 'bg-yellow-600',
                    overlay: 'bg-yellow-500',
                    text: 'text-white',
                    hover: 'hover:bg-yellow-700'
                  },
                  MASTERS: {
                    bg: 'bg-purple-600',
                    overlay: 'bg-purple-500',
                    text: 'text-white',
                    hover: 'hover:bg-purple-700'
                  },
                  NATIONAL: {
                    bg: 'bg-red-600',
                    overlay: 'bg-red-500',
                    text: 'text-white',
                    hover: 'hover:bg-red-700'
                  }
                };
                return colorMap[leagueType as keyof typeof colorMap] || colorMap.NATIONAL;
              };
              
              return (
                <button
                  key={league}
                  onClick={() => setSelectedLeague(league)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    selectedLeague === league 
                      ? `${getLeagueTabColors(league).bg} ${getLeagueTabColors(league).text} ${getLeagueTabColors(league).hover}`
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {getLeagueName(league as LeagueTier)}
                </button>
              );
            })}
          </div>
          
          {/* Full table for selected league */}
          {(() => {
            const leagueData = yearStandings.find(s => s.league === selectedLeague);
            if (!leagueData) return null;
            return (
              <StandingsTable
                key={`${selectedLeague}-${currentYear}`}
                standings={leagueData.standings}
                league={selectedLeague}
                year={currentYear}
              />
            );
          })()}
        </div>
      )}

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