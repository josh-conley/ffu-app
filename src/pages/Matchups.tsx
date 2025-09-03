import { useState, useMemo, useEffect } from 'react';
import { useUrlParams } from '../hooks/useUrlParams';
import { useWeekMatchups, useAllSeasonMatchups } from '../hooks/useLeagues';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import { ErrorMessage } from '../components/Common/ErrorMessage';
import { TeamLogo } from '../components/Common/TeamLogo';
import { LeagueBadge } from '../components/League/LeagueBadge';
import type { LeagueTier } from '../types';
import { USERS, getAllYears, getAvailableLeagues } from '../config/constants';
import { getSeasonLength } from '../utils/era-detection';
import { ChevronDown, Filter } from 'lucide-react';
import { useTeamProfileModal } from '../contexts/TeamProfileModalContext';

// Placement Tag Component
const PlacementTag = ({ placementType }: { placementType: string }) => {
  const getTagColor = (type: string) => {
    if (type === 'Championship') return 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-l-4 border-yellow-500';
    if (type === '3rd Place') return 'bg-orange-50 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-l-4 border-orange-500';
    if (type === 'Last Place') return 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-l-4 border-red-500';
    if (type.includes('Place')) return 'bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-l-4 border-blue-500';
    if (type.includes('Semifinal')) return 'bg-purple-50 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-l-4 border-purple-500';
    if (type.includes('Quarterfinal')) return 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-l-4 border-green-500';
    return 'bg-gray-50 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300 border-l-4 border-gray-500';
  };

  const getBorderColor = (type: string) => {
    if (type === 'Championship') return '!border-l-4 !border-l-yellow-500';
    if (type === '3rd Place') return '!border-l-4 !border-l-orange-500';
    if (type === 'Last Place') return '!border-l-4 !border-l-red-500';
    if (type.includes('Place')) return '!border-l-4 !border-l-blue-500';
    if (type.includes('Semifinal')) return '!border-l-4 !border-l-purple-500';
    if (type.includes('Quarterfinal')) return '!border-l-4 !border-l-green-500';
    return '!border-l-4 !border-l-gray-500';
  };

  return {
    tag: (
      <div className={`px-3 py-1 text-xs font-bold ${getTagColor(placementType)} shadow-sm inline-block`}>
        {placementType}
      </div>
    ),
    borderColor: getBorderColor(placementType)
  };
};

export const Matchups = () => {
  const { getParam, updateParams } = useUrlParams();
  const [selectedLeague, setSelectedLeague] = useState<LeagueTier>('PREMIER');
  const [selectedYear, setSelectedYear] = useState<string>('2025');
  const [selectedWeek, setSelectedWeek] = useState<number | 'ALL'>(0); // 0 represents "All Weeks"
  const [selectedTeam, setSelectedTeam] = useState<string>('ALL'); // Team filter
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState<boolean>(false);
  const { openTeamProfile } = useTeamProfileModal();

  // Initialize from URL params on mount
  useEffect(() => {
    const league = getParam('league', 'PREMIER');
    if (['PREMIER', 'MASTERS', 'NATIONAL'].includes(league)) {
      setSelectedLeague(league as LeagueTier);
    }

    setSelectedYear(getParam('year', '2025'));

    const week = getParam('week', '0');
    const weekNum = week === 'ALL' ? 0 : parseInt(week);
    setSelectedWeek(isNaN(weekNum) ? 0 : weekNum);

    setSelectedTeam(getParam('team', 'ALL'));
  }, []); // Empty dependency array - only run on mount

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

  // Era-aware leagues - filter based on selected year
  const leagues = useMemo(() => getAvailableLeagues(selectedYear), [selectedYear]);
  

  const getLeagueName = (league: LeagueTier): string => {
    switch (league) {
      case 'PREMIER': return 'Premier';
      case 'MASTERS': return 'Masters';
      case 'NATIONAL': return 'National';
    }
  };
  // Era-aware years - filter based on league availability
  const allYears = getAllYears();
  const years = useMemo(() => {
    // Filter years to only show those where the selected league exists
    return allYears.filter(year => getAvailableLeagues(year).includes(selectedLeague));
  }, [allYears, selectedLeague]);
  const weeks = useMemo(() => {
    const totalWeeks = getSeasonLength(selectedYear);
    return Array.from({ length: totalWeeks }, (_, i) => i + 1);
  }, [selectedYear]);

  // Get sorted list of active team members
  const teamOptions = useMemo(() => {
    const activeUsers = USERS.filter(user => user.isActive)
      .sort((a, b) => a.teamName.localeCompare(b.teamName));
    return [
      { sleeperId: 'ALL', teamName: 'All Teams', abbreviation: 'ALL' },
      ...activeUsers
    ];
  }, []);

  // Filter matchups by selected team
  const filterMatchupsByTeam = (matchups: any[]) => {
    if (selectedTeam === 'ALL') return matchups;
    return matchups.filter(matchup => 
      matchup.winner === selectedTeam || matchup.loser === selectedTeam
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Matchups</h1>
        <p className="mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-300">View weekly matchups and scores</p>
      </div>

      {/* Mobile Filter Toggle Button */}
      <div className="sm:hidden">
        <button
          onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
          className="w-full flex items-center justify-center space-x-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 px-4 py-3 rounded hover:border-gray-400 dark:hover:border-gray-500 transition-colors duration-200"
        >
          <Filter className="h-4 w-4" />
          <span className="font-medium">Filters</span>
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isFilterMenuOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Filters */}
      <div className={`${isFilterMenuOpen ? 'block' : 'hidden'} sm:block`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="space-y-2">
            <label className="block text-xs sm:text-sm font-heading font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide">League</label>
            <div className="relative">
              <select
                value={selectedLeague}
                onChange={(e) => {
                  const league = e.target.value as LeagueTier;
                  setSelectedLeague(league);
                  updateParams({ league });
                }}
                className="block w-full pl-3 pr-10 py-2 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-ffu-red focus:border-ffu-red rounded hover:border-gray-400 dark:hover:border-gray-500 transition-colors duration-200 appearance-none"
              >
                {leagues.map(league => (
                  <option key={league} value={league}>{getLeagueName(league)}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs sm:text-sm font-heading font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide">Year</label>
            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => {
                  const year = e.target.value;
                  setSelectedYear(year);
                  updateParams({ year });
                }}
                className="block w-full pl-3 pr-10 py-2 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-ffu-red focus:border-ffu-red rounded hover:border-gray-400 dark:hover:border-gray-500 transition-colors duration-200 appearance-none"
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs sm:text-sm font-heading font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide">Week</label>
            <div className="relative">
              <select
                value={selectedWeek}
                onChange={(e) => {
                  const week = e.target.value === '0' ? 0 : parseInt(e.target.value);
                  setSelectedWeek(week);
                  updateParams({ week: week === 0 ? '0' : week.toString() });
                }}
                className="block w-full pl-3 pr-10 py-2 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-ffu-red focus:border-ffu-red rounded hover:border-gray-400 dark:hover:border-gray-500 transition-colors duration-200 appearance-none"
              >
                <option value={0}>All Weeks</option>
                {weeks.map(week => (
                  <option key={week} value={week}>Week {week}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs sm:text-sm font-heading font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide">Team</label>
            <div className="relative">
              <select
                value={selectedTeam}
                onChange={(e) => {
                  const team = e.target.value;
                  setSelectedTeam(team);
                  updateParams({ team: team === 'ALL' ? null : team });
                }}
                className="block w-full pl-3 pr-10 py-2 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-ffu-red focus:border-ffu-red rounded hover:border-gray-400 dark:hover:border-gray-500 transition-colors duration-200 appearance-none"
              >
                {teamOptions.map(team => (
                  <option key={team.sleeperId} value={team.sleeperId}>{team.teamName}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>
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
            {filterMatchupsByTeam(matchupsData.matchups || []).map((matchup, index: number) => {
              const placementInfo = matchup.placementType ? PlacementTag({ placementType: matchup.placementType }) : null;
              return (
              <div key={index} className="transition-colors relative">
                {/* Placement Tag */}
                {placementInfo && placementInfo.tag}
                
                {/* Mobile Stacked Layout */}
                <div className={`sm:hidden space-y-0.5 border-gray-100 dark:border-gray-800 ${placementInfo ? placementInfo.borderColor : ''}`}>
                  {/* Winner Row */}
                  <div className="flex items-center space-x-2 py-1 px-2 bg-green-50 dark:bg-green-900/25 rounded">
                    <div className="flex-shrink-0">
                      <TeamLogo
                        teamName={matchup.winnerInfo?.teamName || 'Unknown Team'}
                        abbreviation={matchup.winnerInfo?.abbreviation}
                        size="sm"
                        clickable
                        onClick={() => matchup.winner && matchup.winnerInfo?.teamName && openTeamProfile(matchup.winner, matchup.winnerInfo.teamName)}
                      />
                    </div>
                    <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                      {matchup.winnerInfo?.teamName || 'Unknown Team'}
                      {matchup.winnerRecord && (
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 font-mono">
                          ({matchup.winnerRecord})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Score Row */}
                  <div className="text-center py-1 border-gray-200/50 dark:border-gray-600/50">
                    <div className="text-base font-bold">
                      <span className="text-green-600 dark:text-green-400 font-mono">{matchup.winnerScore?.toFixed(2)}</span>
                      <span className="text-gray-500 dark:text-gray-400 mx-2">-</span>
                      <span className="text-red-600 dark:text-red-400 font-mono">{matchup.loserScore?.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Loser Row */}
                  <div className="flex items-center justify-end space-x-2 py-1 px-2 bg-red-50 dark:bg-red-900/25 rounded">
                    {matchup.loserRecord && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        ({matchup.loserRecord})
                      </span>
                    )}
                    <div className="font-medium text-gray-900 dark:text-gray-100 text-sm text-right">
                      {matchup.loserInfo?.teamName || 'Unknown Team'}
                    </div>
                    <div className="flex-shrink-0">
                      <TeamLogo
                        teamName={matchup.loserInfo?.teamName || 'Unknown Team'}
                        abbreviation={matchup.loserInfo?.abbreviation}
                        size="sm"
                        clickable
                        onClick={() => matchup.loser && matchup.loserInfo?.teamName && openTeamProfile(matchup.loser, matchup.loserInfo.teamName)}
                      />
                    </div>
                  </div>
                </div>

                {/* Desktop Horizontal Layout */}
                <div className={`hidden sm:flex items-center justify-between gap-4 border-gray-100 dark:border-gray-800 p-2 ${placementInfo ? placementInfo.borderColor : ''}`}>
                  {/* Winner Side */}
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      <TeamLogo
                        teamName={matchup.winnerInfo?.teamName || 'Unknown Team'}
                        abbreviation={matchup.winnerInfo?.abbreviation}
                        size="md"
                        clickable
                        onClick={() => matchup.winner && matchup.winnerInfo?.teamName && openTeamProfile(matchup.winner, matchup.winnerInfo.teamName)}
                      />
                    </div>
                    <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                      {matchup.winnerInfo?.teamName || 'Unknown Team'}
                      {matchup.winnerRecord && (
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 font-mono">
                          ({matchup.winnerRecord})
                        </span>
                      )}
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
                    {matchup.loserRecord && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        ({matchup.loserRecord})
                      </span>
                    )}
                    <div className="font-medium text-gray-900 dark:text-gray-100 text-right text-sm">
                      {matchup.loserInfo?.teamName || 'Unknown Team'}
                    </div>
                    <div className="flex-shrink-0">
                      <TeamLogo
                        teamName={matchup.loserInfo?.teamName || 'Unknown Team'}
                        abbreviation={matchup.loserInfo?.abbreviation}
                        size="md"
                        clickable
                        onClick={() => matchup.loser && matchup.loserInfo?.teamName && openTeamProfile(matchup.loser, matchup.loserInfo.teamName)}
                      />
                    </div>
                  </div>
                </div>
              </div>
              );
            })}
          </div>

          {filterMatchupsByTeam(matchupsData.matchups || []).length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {selectedTeam === 'ALL' ? 'No matchups found for this week' : 'No matchups found for the selected team this week'}
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
            {allWeeksData.map((weekData) => {
              const filteredMatchups = filterMatchupsByTeam(weekData.matchups || []);
              if (filteredMatchups.length === 0) return null; // Hide weeks with no matching games
              
              return (
              <div key={weekData.week}>
                <h3 className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-200 mb-4 border-b border-gray-200 dark:border-gray-600 pb-2">
                  Week {weekData.week}
                </h3>
                <div className="space-y-3 sm:space-y-2">
                  {filteredMatchups.map((matchup, index: number) => {
                    const placementInfo = matchup.placementType ? PlacementTag({ placementType: matchup.placementType }) : null;
                    return (
                    <div key={index} className="transition-colors relative">
                      {/* Placement Tag */}
                      {placementInfo && placementInfo.tag}
                      
                      {/* Mobile Stacked Layout */}
                      <div className={`sm:hidden space-y-0.5 border-gray-100 dark:border-gray-800 ${placementInfo ? placementInfo.borderColor : ''}`}>
                        {/* Winner Row */}
                        <div className="flex items-center space-x-2 py-1 px-2 bg-green-50 dark:bg-green-900/25 rounded">
                          <div className="flex-shrink-0">
                            <TeamLogo
                              teamName={matchup.winnerInfo?.teamName || 'Unknown Team'}
                              abbreviation={matchup.winnerInfo?.abbreviation}
                              size="sm"
                              clickable
                              onClick={() => matchup.winner && matchup.winnerInfo?.teamName && openTeamProfile(matchup.winner, matchup.winnerInfo.teamName)}
                            />
                          </div>
                          <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                            {matchup.winnerInfo?.teamName || 'Unknown Team'}
                            {matchup.winnerRecord && (
                              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 font-mono">
                                ({matchup.winnerRecord})
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Score Row */}
                        <div className="text-center py-1 border-gray-200/50 dark:border-gray-600/50">
                          <div className="text-base font-bold">
                            <span className="text-green-600 dark:text-green-400 font-mono">{matchup.winnerScore?.toFixed(2)}</span>
                            <span className="text-gray-500 dark:text-gray-400 mx-2">-</span>
                            <span className="text-red-600 dark:text-red-400 font-mono">{matchup.loserScore?.toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Loser Row */}
                        <div className="flex items-center justify-end space-x-2 py-1 px-2 bg-red-50 dark:bg-red-900/25 rounded">
                          {matchup.loserRecord && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                              ({matchup.loserRecord})
                            </span>
                          )}
                          <div className="font-medium text-gray-900 dark:text-gray-100 text-sm text-right">
                            {matchup.loserInfo?.teamName || 'Unknown Team'}
                          </div>
                          <div className="flex-shrink-0">
                            <TeamLogo
                              teamName={matchup.loserInfo?.teamName || 'Unknown Team'}
                              abbreviation={matchup.loserInfo?.abbreviation}
                              size="sm"
                              clickable
                              onClick={() => matchup.loser && matchup.loserInfo?.teamName && openTeamProfile(matchup.loser, matchup.loserInfo.teamName)}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Desktop Horizontal Layout */}
                      <div className={`hidden sm:flex items-center justify-between gap-4 border-gray-100 dark:border-gray-800 p-2 ${placementInfo ? placementInfo.borderColor : ''}`}>
                        {/* Winner Side */}
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="flex-shrink-0">
                            <TeamLogo
                              teamName={matchup.winnerInfo?.teamName || 'Unknown Team'}
                              abbreviation={matchup.winnerInfo?.abbreviation}
                              size="md"
                              clickable
                              onClick={() => matchup.winner && matchup.winnerInfo?.teamName && openTeamProfile(matchup.winner, matchup.winnerInfo.teamName)}
                            />
                          </div>
                          <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                            {matchup.winnerInfo?.teamName || 'Unknown Team'}
                            {matchup.winnerRecord && (
                              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 font-mono">
                                ({matchup.winnerRecord})
                              </span>
                            )}
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
                          {matchup.loserRecord && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                              ({matchup.loserRecord})
                            </span>
                          )}
                          <div className="font-medium text-gray-900 dark:text-gray-100 text-right text-sm">
                            {matchup.loserInfo?.teamName || 'Unknown Team'}
                          </div>
                          <div className="flex-shrink-0">
                            <TeamLogo
                              teamName={matchup.loserInfo?.teamName || 'Unknown Team'}
                              abbreviation={matchup.loserInfo?.abbreviation}
                              size="md"
                              clickable
                              onClick={() => matchup.loser && matchup.loserInfo?.teamName && openTeamProfile(matchup.loser, matchup.loserInfo.teamName)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
              );
            })}
          </div>

          {allWeeksData.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {selectedTeam === 'ALL' ? 'No matchups found for this season' : 'No matchups found for the selected team this season'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};