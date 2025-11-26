import type { EnhancedSeasonStandings } from '../../types';
import { Star } from 'lucide-react';
import { getDisplayTeamName, isActiveYear } from '../../config/constants';
import { calculateRankings, groupStandingsByDivision, identifyDivisionLeaders, getDivisionName, getTiebreakerInfo } from '../../utils/ranking';
import { StandingsTooltip } from '../Common/StandingsTooltip';

interface CompactStandingsTableProps {
  standings: EnhancedSeasonStandings[];
  league: string;
  year: string;
  matchupsByWeek?: Record<number, any[]>;
  divisionNames?: Record<number, string>;
}

export const CompactStandingsTable = ({ standings, league, year, matchupsByWeek, divisionNames }: CompactStandingsTableProps) => {
  const isActiveSeason = isActiveYear(year);

  // Only calculate rankings for active seasons, use original for historical
  const rankedStandings = isActiveSeason ? calculateRankings(standings, matchupsByWeek, year) : standings;

  // Group by divisions if division data exists (Sleeper era only, 2021+)
  const divisionGroups = groupStandingsByDivision(rankedStandings, divisionNames);

  // Identify division leaders for star icons (only for active season)
  const divisionLeaderInfo = isActiveSeason ? identifyDivisionLeaders(rankedStandings, matchupsByWeek, year) : null;

  const getLeagueColors = (leagueType: string) => {
    const colorMap = {
      PREMIER: {
        iconBg: 'bg-yellow-500 dark:bg-yellow-600',
      },
      MASTERS: {
        iconBg: 'bg-purple-500 dark:bg-purple-600',
      },
      NATIONAL: {
        iconBg: 'bg-red-500 dark:bg-red-600',
      }
    };
    return colorMap[leagueType as keyof typeof colorMap] || colorMap.NATIONAL;
  };

  const leagueColors = getLeagueColors(league);

  // Render standings rows for a division
  const renderDivisionRows = (standingsToRender: EnhancedSeasonStandings[]) => {
    return standingsToRender.map((standing) => {
      const isFirstDivisionLeader = divisionLeaderInfo?.firstDivisionLeader === standing.userId;
      const isSecondDivisionLeader = divisionLeaderInfo?.secondDivisionLeader === standing.userId;
      const isThirdDivisionLeader = divisionLeaderInfo?.thirdDivisionLeader === standing.userId;

      // Get tiebreaker info for this standing
      const tiebreakerInfo = getTiebreakerInfo(rankedStandings, rankedStandings.indexOf(standing), matchupsByWeek, year);

      return (
        <tr key={standing.userId} className="border-b border-gray-200 dark:border-gray-700 last:border-0">
          <td className="py-1.5 px-2">
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                {standing.rank}
              </span>
              {isActiveSeason && isFirstDivisionLeader && (
                <Star className="h-2.5 w-2.5 text-yellow-500" fill="currentColor" />
              )}
              {isActiveSeason && isSecondDivisionLeader && (
                <Star className="h-2.5 w-2.5 text-gray-400" fill="currentColor" />
              )}
              {isActiveSeason && isThirdDivisionLeader && (
                <Star className="h-2.5 w-2.5 text-amber-600" fill="currentColor" />
              )}
              {tiebreakerInfo && (
                <StandingsTooltip tiebreakerInfo={tiebreakerInfo} size="sm" />
              )}
            </div>
          </td>
          <td className="py-1.5 px-2">
            <div className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
              {getDisplayTeamName(standing.userId, standing.userInfo.teamName, year)}
            </div>
          </td>
          <td className="py-1.5 px-2 text-center">
            <span className="text-xs font-bold text-gray-900 dark:text-gray-100 font-mono">
              {standing.wins}-{standing.losses}{standing.ties ? `-${standing.ties}` : ''}
            </span>
          </td>
        </tr>
      );
    });
  };

  return (
    <div className="space-y-4">
      {/* Display divisions side by side if available */}
      {divisionGroups ? (
        <div className="grid grid-cols-3 gap-3">
          {divisionGroups.map((divisionGroup) => (
            <div key={divisionGroup.division} className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
              {/* Division Header */}
              <div className={`${leagueColors.iconBg} px-2 py-1.5`}>
                <h4 className="text-xs font-bold text-white uppercase tracking-wide truncate">
                  {getDivisionName(divisionGroup.division, divisionNames)}
                </h4>
              </div>

              {/* Division Table */}
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="text-left text-xs font-semibold text-gray-700 dark:text-gray-300 py-1 px-2">#</th>
                    <th className="text-left text-xs font-semibold text-gray-700 dark:text-gray-300 py-1 px-2">Team</th>
                    <th className="text-center text-xs font-semibold text-gray-700 dark:text-gray-300 py-1 px-2">Record</th>
                  </tr>
                </thead>
                <tbody>
                  {renderDivisionRows(divisionGroup.standings)}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ) : (
        // No divisions - single compact table
        <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
          <div className={`${leagueColors.iconBg} px-3 py-2`}>
            <h4 className="text-sm font-bold text-white uppercase tracking-wide">
              Standings
            </h4>
          </div>

          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-700 dark:text-gray-300 py-1.5 px-2">#</th>
                <th className="text-left text-xs font-semibold text-gray-700 dark:text-gray-300 py-1.5 px-2">Team</th>
                <th className="text-center text-xs font-semibold text-gray-700 dark:text-gray-300 py-1.5 px-2">Record</th>
              </tr>
            </thead>
            <tbody>
              {renderDivisionRows(rankedStandings)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
