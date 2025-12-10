import { useState, useMemo } from 'react';
import type { EnhancedSeasonStandings, LeagueTier } from '../../types';
import { TeamLogo } from '../Common/TeamLogo';
import { Trophy, Medal, Award, Star, LayoutGrid, List, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { getLeagueName } from '../../constants/leagues';
import { getDisplayTeamName, getCurrentTeamName, getCurrentAbbreviation, isActiveYear } from '../../config/constants';
import { useTeamProfileModal } from '../../contexts/TeamProfileModalContext';
import { calculateRankings, getTiebreakerInfo, groupStandingsByDivision, identifyDivisionLeaders } from '../../utils/ranking';
import { StandingsTooltip } from '../Common/StandingsTooltip';

type SortField = 'rank' | 'team' | 'wins' | 'pointsFor' | 'pointsAgainst' | 'highGame' | 'lowGame' | 'upr';
type SortDirection = 'asc' | 'desc';

interface StandingsTableProps {
  standings: EnhancedSeasonStandings[];
  league: string;
  year: string;
  matchupsByWeek?: Record<number, any[]>;
  divisionNames?: Record<number, string>;
}

export const StandingsTable = ({ standings, league, year, matchupsByWeek, divisionNames }: StandingsTableProps) => {
  const isActiveSeason = isActiveYear(year);
  const { openTeamProfile } = useTeamProfileModal();
  const [viewMode, setViewMode] = useState<'all' | 'divisions'>('divisions');
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Only calculate rankings for active seasons, use original for historical
  const rankedStandings = isActiveSeason ? calculateRankings(standings, matchupsByWeek, year) : standings;

  // Group by divisions if division data exists (Sleeper era only, 2021+)
  const divisionGroups = groupStandingsByDivision(rankedStandings, divisionNames);
  const hasDivisions = divisionGroups !== null;

  // Identify division leaders for star icons (only for active season)
  const divisionLeaderInfo = isActiveSeason ? identifyDivisionLeaders(rankedStandings, matchupsByWeek, year) : null;

  // Determine which view to show based on toggle
  const shouldShowDivisions = hasDivisions && viewMode === 'divisions';

  // Handle column sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if clicking same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field with appropriate default direction
      setSortField(field);
      // Most fields should default to descending (higher is better), except rank
      setSortDirection(field === 'rank' || field === 'lowGame' ? 'asc' : 'desc');
    }
  };

  // Sort standings when in "all teams" view
  const sortedStandings = useMemo(() => {
    if (viewMode === 'divisions') {
      return rankedStandings; // Don't sort in division view
    }

    const sorted = [...rankedStandings].sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;

      switch (sortField) {
        case 'rank':
          aVal = a.rank;
          bVal = b.rank;
          break;
        case 'team':
          aVal = getDisplayTeamName(a.userId, a.userInfo.teamName, year);
          bVal = getDisplayTeamName(b.userId, b.userInfo.teamName, year);
          break;
        case 'wins':
          aVal = a.wins;
          bVal = b.wins;
          break;
        case 'pointsFor':
          aVal = a.pointsFor || 0;
          bVal = b.pointsFor || 0;
          break;
        case 'pointsAgainst':
          aVal = a.pointsAgainst || 0;
          bVal = b.pointsAgainst || 0;
          break;
        case 'highGame':
          aVal = a.highGame || 0;
          bVal = b.highGame || 0;
          break;
        case 'lowGame':
          aVal = a.lowGame || 0;
          bVal = b.lowGame || 0;
          break;
        case 'upr':
          aVal = a.unionPowerRating || 0;
          bVal = b.unionPowerRating || 0;
          break;
      }

      // Handle string vs number comparison
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

    return sorted;
  }, [rankedStandings, sortField, sortDirection, viewMode, year]);

  // Get the standings to display based on view mode
  const displayStandings = viewMode === 'all' ? sortedStandings : rankedStandings;

  const getLeagueColors = (leagueType: string) => {
    const colorMap = {
      PREMIER: {
        bg: 'bg-yellow-50 dark:bg-yellow-900/20',
        border: 'border-yellow-300 dark:border-yellow-700',
        borderHeavy: 'border-yellow-500',
        text: 'text-yellow-800 dark:text-yellow-300',
        iconBg: 'bg-yellow-500 dark:bg-yellow-600',
        highlight: 'bg-yellow-100 dark:bg-yellow-900/30'
      },
      MASTERS: {
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        border: 'border-purple-300 dark:border-purple-700',
        borderHeavy: 'border-purple-500',
        text: 'text-purple-800 dark:text-purple-300',
        iconBg: 'bg-purple-500 dark:bg-purple-600',
        highlight: 'bg-purple-100 dark:bg-purple-900/30'
      },
      NATIONAL: {
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-300 dark:border-red-700',
        borderHeavy: 'border-red-500',
        text: 'text-red-800 dark:text-red-300',
        iconBg: 'bg-red-500 dark:bg-red-600',
        highlight: 'bg-red-100 dark:bg-red-900/30'
      }
    };
    return colorMap[leagueType as keyof typeof colorMap] || colorMap.NATIONAL;
  };

  const leagueColors = getLeagueColors(league);

  const getRowClasses = (rank: number) => {
    let classes = 'table-row';
    
    if (!isActiveSeason) {
      if (rank === 1) {
        classes += ` champion-highlight font-bold border-l-4 ${leagueColors.borderHeavy} ${leagueColors.highlight}`;
      } else if (rank <= 3) {
        classes += ` ${leagueColors.bg} ${leagueColors.border} border-l-2 ${leagueColors.borderHeavy}/50`;
      }
    }
    
    return classes;
  };

  const getRankIcon = (standing: EnhancedSeasonStandings) => {
    // For active seasons, show division leader stars
    if (isActiveSeason && divisionLeaderInfo) {
      if (standing.userId === divisionLeaderInfo.firstDivisionLeader) {
        return <Star className="h-4 w-4 text-yellow-500" fill="currentColor" />;
      }
      if (standing.userId === divisionLeaderInfo.secondDivisionLeader) {
        return <Star className="h-4 w-4 text-gray-400" fill="currentColor" />;
      }
      if (standing.userId === divisionLeaderInfo.thirdDivisionLeader) {
        return <Star className="h-4 w-4 text-amber-600" fill="currentColor" />;
      }
    }

    // For historical seasons, show trophy/medals
    if (standing.rank === 1) return <Trophy className={`h-5 w-5 ${leagueColors.text}`} />;
    if (standing.rank === 2) return <Medal className="h-4 w-4 text-gray-600 dark:text-gray-300" />;
    if (standing.rank === 3) return <Award className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
    return null;
  };

  // Helper to render sort icon
  const getSortIcon = (field: SortField) => {
    if (viewMode === 'divisions') return null; // Don't show sort icons in division view

    if (sortField === field) {
      return sortDirection === 'asc'
        ? <ArrowUp className="h-3 w-3 inline-block ml-1" />
        : <ArrowDown className="h-3 w-3 inline-block ml-1" />;
    }
    return <ArrowUpDown className="h-3 w-3 inline-block ml-1 opacity-0 group-hover:opacity-50" />;
  };

  // Helper function to render table rows for standings
  const renderStandingsRows = (standingsToRender: EnhancedSeasonStandings[]) => {
    return standingsToRender.map((standing) => {
      const tiebreakerInfo = getTiebreakerInfo(rankedStandings, rankedStandings.indexOf(standing), matchupsByWeek, year);

      return (
        <tr key={standing.userId} className={getRowClasses(standing.rank)}>
          <td className="text-left pl-2 sm:pl-4">
            <div className="flex items-center space-x-1 min-h-[28px]">
              {!isActiveSeason && getRankIcon(standing)}
              {isActiveSeason && (
                <>
                  <span className="font-bold text-sm sm:text-lg text-gray-900 dark:text-gray-100">
                    {standing.rank}
                  </span>
                  {divisionLeaderInfo?.firstDivisionLeader === standing.userId && (
                    <Star className="h-3 w-3 text-yellow-500" fill="currentColor" />
                  )}
                  {divisionLeaderInfo?.secondDivisionLeader === standing.userId && (
                    <Star className="h-3 w-3 text-gray-400" fill="currentColor" />
                  )}
                  {divisionLeaderInfo?.thirdDivisionLeader === standing.userId && (
                    <Star className="h-3 w-3 text-amber-600" fill="currentColor" />
                  )}
                </>
              )}
              {!isActiveSeason && (
                <span className={`font-black text-sm sm:text-lg ${standing.rank === 1 ? leagueColors.text : 'text-gray-900 dark:text-gray-100'}`}>
                  #{standing.rank}
                </span>
              )}
              <span className="inline-flex items-center" style={{ minWidth: tiebreakerInfo ? 'auto' : '24px', minHeight: '24px' }}>
                {tiebreakerInfo && (
                  <StandingsTooltip tiebreakerInfo={tiebreakerInfo} size="md" />
                )}
              </span>
            </div>
          </td>
        <td>
          <div className="flex items-center space-x-2 sm:space-x-3">
            <TeamLogo
              teamName={getCurrentTeamName(standing.userId, standing.userInfo.teamName)}
              abbreviation={getCurrentAbbreviation(standing.userId, standing.userInfo.abbreviation)}
              size="sm"
              clickable
              onClick={() => openTeamProfile(standing.userId, standing.userInfo.teamName)}
            />
            <div>
              <div className="font-bold text-gray-900 dark:text-gray-100 text-xs sm:text-sm">
                {getDisplayTeamName(standing.userId, standing.userInfo.teamName, year)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 sm:hidden font-mono">{getCurrentAbbreviation(standing.userId, standing.userInfo.abbreviation)}</div>
            </div>
          </div>
        </td>
        <td className="text-center">
          <span className="font-black text-gray-900 dark:text-gray-100 font-mono text-xs sm:text-sm">
            {standing.wins}-{standing.losses}{standing.ties ? `-${standing.ties}` : ''}
          </span>
        </td>
        <td className="text-center">
          <span className="font-bold text-gray-900 dark:text-gray-100 font-mono text-xs sm:text-sm">
            {standing.pointsFor?.toFixed(2) || '0.00'}
          </span>
        </td>
        <td className="text-center">
          <span className="font-bold text-gray-900 dark:text-gray-100 font-mono text-xs sm:text-sm">
            {standing.pointsAgainst?.toFixed(2) || '0.00'}
          </span>
        </td>
        <td className="text-center hidden lg:table-cell">
          <span className="font-bold text-green-600 dark:text-green-400 font-mono text-xs sm:text-sm">
            {standing.highGame?.toFixed(2) || '0.00'}
          </span>
        </td>
        <td className="text-center hidden lg:table-cell">
          <span className="font-bold text-red-600 dark:text-red-400 font-mono text-xs sm:text-sm">
            {standing.lowGame?.toFixed(2) || '0.00'}
          </span>
        </td>
        <td className="text-center">
          <span className="font-bold text-blue-600 dark:text-blue-400 font-mono text-xs sm:text-sm">
            {standing.unionPowerRating?.toFixed(2) || '0.00'}
          </span>
        </td>
      </tr>
      );
    });
  };

  return (
    <div className="card" style={{ overflow: 'visible', height: 'auto' }}>
      {/* Champion Highlight */}
      {!isActiveSeason && rankedStandings[0] && (
        <div className={`champion-highlight angular-cut p-6 mb-6 relative overflow-hidden border-l4 ${leagueColors.highlight}`}>
          <div className="flex items-center space-x-3 mb-3">
            <div className={`p-2 ${leagueColors.iconBg} rounded-full`}>
              <Trophy className="h-6 w-6 text-white" />
            </div>
            <span className={`text-lg font-black ${leagueColors.text} tracking-wide uppercase`}>
              {getLeagueName(league as LeagueTier)} League Champion - {year}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <TeamLogo
                teamName={getCurrentTeamName(rankedStandings[0].userId, rankedStandings[0].userInfo.teamName)}
                abbreviation={getCurrentAbbreviation(rankedStandings[0].userId, rankedStandings[0].userInfo.abbreviation)}
                size="lg"
                clickable
                onClick={() => openTeamProfile(rankedStandings[0].userId, rankedStandings[0].userInfo.teamName)}
              />
            </div>
            <div>
              <div className="font-black text-gray-900 dark:text-gray-100 text-xl tracking-wide">
                {getDisplayTeamName(rankedStandings[0].userId, rankedStandings[0].userInfo.teamName, year)}
              </div>
              <div className={`text-lg font-bold ${leagueColors.text}`}>
                {rankedStandings[0].wins}-{rankedStandings[0].losses}{rankedStandings[0].ties ? `-${rankedStandings[0].ties}` : ''} • {rankedStandings[0].pointsFor?.toFixed(2)} pts
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header with toggle */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className={`text-xl font-black tracking-wide uppercase ${leagueColors.text}`}>
            {getLeagueName(league as LeagueTier)} League
          </h3>

          {/* Toggle button - only show if divisions exist */}
          {hasDivisions && (
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded p-1">
              <button
                onClick={() => setViewMode('all')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  viewMode === 'all'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                <List className="h-3.5 w-3.5" />
                All Teams
              </button>
              <button
                onClick={() => setViewMode('divisions')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  viewMode === 'divisions'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                By Division
              </button>
            </div>
          )}
        </div>
        <div className={`h-0.5 ${leagueColors.iconBg}`}></div>
      </div>

      {/* Display divisions if toggle is set to divisions, otherwise single table */}
      {shouldShowDivisions ? (
        // Multiple divisions - show separate tables
        <div className="space-y-6">
          {divisionGroups.map((divisionGroup) => (
            <div key={divisionGroup.division}>
              {/* Division Header */}
              <div className="mb-3 relative pb-2">
                <h4 className={`text-lg font-bold tracking-wide uppercase ${leagueColors.text}`}>
                  {divisionGroup.name} Division
                </h4>
                <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${leagueColors.iconBg} opacity-50`}></div>
              </div>

              <div className="overflow-x-auto -mx-4 sm:mx-0" style={{ overflowY: 'visible', height: 'auto', touchAction: 'pan-x' }}>
                <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                  <table className="table min-w-full">
                    <thead className={`table-header ${leagueColors.iconBg} border-0`}>
                      <tr>
                        <th className="text-left text-white font-bold pl-2 sm:pl-4 text-xs sm:text-sm">Rank</th>
                        <th className="text-white font-bold text-xs sm:text-sm">Team</th>
                        <th className="text-center text-white font-bold text-xs sm:text-sm">Record</th>
                        <th className="text-center text-white font-bold text-xs sm:text-sm">PF</th>
                        <th className="text-center text-white font-bold text-xs sm:text-sm">PA</th>
                        <th className="text-center text-white font-bold hidden lg:table-cell text-xs sm:text-sm">High</th>
                        <th className="text-center text-white font-bold hidden lg:table-cell text-xs sm:text-sm">Low</th>
                        <th className="text-center text-white font-bold text-xs sm:text-sm">UPR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {renderStandingsRows(divisionGroup.standings)}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // No divisions - single table with sortable columns
        <div className="overflow-x-auto -mx-4 sm:mx-0" style={{ overflowY: 'visible', height: 'auto', touchAction: 'pan-x' }}>
          <div className="inline-block min-w-full align-middle px-4 sm:px-0">
            <table className="table min-w-full">
              <thead className={`table-header ${leagueColors.iconBg} border-0`}>
                <tr>
                  <th
                    className="text-left text-white font-bold pl-2 sm:pl-4 text-xs sm:text-sm cursor-pointer hover:bg-white/10 transition-colors group"
                    onClick={() => handleSort('rank')}
                  >
                    Rank{getSortIcon('rank')}
                  </th>
                  <th
                    className="text-white font-bold text-xs sm:text-sm cursor-pointer hover:bg-white/10 transition-colors group"
                    onClick={() => handleSort('team')}
                  >
                    Team{getSortIcon('team')}
                  </th>
                  <th
                    className="text-center text-white font-bold text-xs sm:text-sm cursor-pointer hover:bg-white/10 transition-colors group"
                    onClick={() => handleSort('wins')}
                  >
                    Record{getSortIcon('wins')}
                  </th>
                  <th
                    className="text-center text-white font-bold text-xs sm:text-sm cursor-pointer hover:bg-white/10 transition-colors group"
                    onClick={() => handleSort('pointsFor')}
                  >
                    PF{getSortIcon('pointsFor')}
                  </th>
                  <th
                    className="text-center text-white font-bold text-xs sm:text-sm cursor-pointer hover:bg-white/10 transition-colors group"
                    onClick={() => handleSort('pointsAgainst')}
                  >
                    PA{getSortIcon('pointsAgainst')}
                  </th>
                  <th
                    className="text-center text-white font-bold hidden lg:table-cell text-xs sm:text-sm cursor-pointer hover:bg-white/10 transition-colors group"
                    onClick={() => handleSort('highGame')}
                  >
                    High{getSortIcon('highGame')}
                  </th>
                  <th
                    className="text-center text-white font-bold hidden lg:table-cell text-xs sm:text-sm cursor-pointer hover:bg-white/10 transition-colors group"
                    onClick={() => handleSort('lowGame')}
                  >
                    Low{getSortIcon('lowGame')}
                  </th>
                  <th
                    className="text-center text-white font-bold text-xs sm:text-sm cursor-pointer hover:bg-white/10 transition-colors group"
                    onClick={() => handleSort('upr')}
                  >
                    UPR{getSortIcon('upr')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {renderStandingsRows(displayStandings)}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};