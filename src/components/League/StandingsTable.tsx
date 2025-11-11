import type { EnhancedSeasonStandings, LeagueTier } from '../../types';
import { TeamLogo } from '../Common/TeamLogo';
import { Trophy, Medal, Award } from 'lucide-react';
import { getLeagueName } from '../../constants/leagues';
import { getDisplayTeamName, getCurrentTeamName, getCurrentAbbreviation, isActiveYear } from '../../config/constants';
import { useTeamProfileModal } from '../../contexts/TeamProfileModalContext';
import { calculateRankings, getTiebreakerInfo, groupStandingsByDivision } from '../../utils/ranking';
import { StandingsTooltip } from '../Common/StandingsTooltip';


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

  // Only calculate rankings for active seasons, use original for historical
  const rankedStandings = isActiveSeason ? calculateRankings(standings, matchupsByWeek, year) : standings;

  // Group by divisions if division data exists (Sleeper era only, 2021+)
  const divisionGroups = groupStandingsByDivision(rankedStandings, divisionNames);

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

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className={`h-5 w-5 ${leagueColors.text}`} />;
    if (rank === 2) return <Medal className="h-4 w-4 text-gray-600 dark:text-gray-300" />;
    if (rank === 3) return <Award className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
    return null;
  };

  // Helper function to render table rows for standings
  const renderStandingsRows = (standingsToRender: EnhancedSeasonStandings[]) => {
    return standingsToRender.map((standing) => {
      const tiebreakerInfo = getTiebreakerInfo(rankedStandings, rankedStandings.indexOf(standing), matchupsByWeek, year);

      return (
        <tr key={standing.userId} className={getRowClasses(standing.rank)}>
          <td className="text-left pl-4">
            <div className="flex items-center space-x-1">
              {!isActiveSeason && getRankIcon(standing.rank)}
              {isActiveSeason && (
                <span className="font-bold text-lg text-gray-900 dark:text-gray-100">
                  {standing.rank}
                </span>
              )}
              {!isActiveSeason && (
                <span className={`font-black text-lg ${standing.rank === 1 ? leagueColors.text : 'text-gray-900 dark:text-gray-100'}`}>
                  #{standing.rank}
                </span>
              )}
              {tiebreakerInfo && (
                <StandingsTooltip tiebreakerInfo={tiebreakerInfo} size="md" />
              )}
            </div>
          </td>
        <td>
          <div className="flex items-center space-x-3">
            <TeamLogo
              teamName={getCurrentTeamName(standing.userId, standing.userInfo.teamName)}
              abbreviation={getCurrentAbbreviation(standing.userId, standing.userInfo.abbreviation)}
              size="sm"
              clickable
              onClick={() => openTeamProfile(standing.userId, standing.userInfo.teamName)}
            />
            <div>
              <div className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                {getDisplayTeamName(standing.userId, standing.userInfo.teamName, year)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 sm:hidden font-mono">{getCurrentAbbreviation(standing.userId, standing.userInfo.abbreviation)}</div>
            </div>
          </div>
        </td>
        <td className="text-center">
          <span className="font-black text-gray-900 dark:text-gray-100 font-mono">
            {standing.wins}-{standing.losses}{standing.ties ? `-${standing.ties}` : ''}
          </span>
        </td>
        <td className="text-center">
          <span className="font-bold text-gray-900 dark:text-gray-100 font-mono">
            {standing.pointsFor?.toFixed(2) || '0.00'}
          </span>
        </td>
        <td className="text-center">
          <span className="font-bold text-gray-900 dark:text-gray-100 font-mono">
            {standing.pointsAgainst?.toFixed(2) || '0.00'}
          </span>
        </td>
        <td className="text-center">
          <span className="font-bold text-green-600 dark:text-green-400 font-mono">
            {standing.highGame?.toFixed(2) || '0.00'}
          </span>
        </td>
        <td className="text-center">
          <span className="font-bold text-red-600 dark:text-red-400 font-mono">
            {standing.lowGame?.toFixed(2) || '0.00'}
          </span>
        </td>
        <td className="text-center">
          <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">
            {standing.unionPowerRating?.toFixed(2) || '0.00'}
          </span>
        </td>
      </tr>
      );
    });
  };

  return (
    <div className="card">
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

      <div className="mb-6 relative pb-3">
        <h3 className={`text-xl font-black tracking-wide uppercase ${leagueColors.text}`}>
          {getLeagueName(league as LeagueTier)} League
        </h3>
        <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${leagueColors.iconBg}`}></div>
      </div>
      
      {/* Display divisions if available, otherwise single table */}
      {divisionGroups ? (
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

              <div className="table-container overflow-visible">
                <table className="table">
                  <thead className={`table-header ${leagueColors.iconBg} border-0`}>
                    <tr>
                      <th className="text-left text-white font-bold pl-4">Rank</th>
                      <th className="text-white font-bold">Team</th>
                      <th className="text-center text-white font-bold">Record</th>
                      <th className="text-center text-white font-bold">Points For</th>
                      <th className="text-center text-white font-bold">Points Against</th>
                      <th className="text-center text-white font-bold">High Game</th>
                      <th className="text-center text-white font-bold">Low Game</th>
                      <th className="text-center text-white font-bold">UPR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {renderStandingsRows(divisionGroup.standings)}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // No divisions - single table
        <div className="table-container overflow-visible">
          <table className="table">
            <thead className={`table-header ${leagueColors.iconBg} border-0`}>
              <tr>
                <th className="text-left text-white font-bold pl-4">Rank</th>
                <th className="text-white font-bold">Team</th>
                <th className="text-center text-white font-bold">Record</th>
                <th className="text-center text-white font-bold">Points For</th>
                <th className="text-center text-white font-bold">Points Against</th>
                <th className="text-center text-white font-bold">High Game</th>
                <th className="text-center text-white font-bold">Low Game</th>
                <th className="text-center text-white font-bold">UPR</th>
              </tr>
            </thead>
            <tbody>
              {renderStandingsRows(rankedStandings)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};