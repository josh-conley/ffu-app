import type { EnhancedSeasonStandings, LeagueTier } from '../../types';
import { TeamLogo } from '../Common/TeamLogo';
import { Trophy, Medal, Award, Info } from 'lucide-react';
import { getLeagueName } from '../../constants/leagues';
import { getDisplayTeamName, getCurrentTeamName, getCurrentAbbreviation, isActiveYear } from '../../config/constants';
import { useTeamProfileModal } from '../../contexts/TeamProfileModalContext';
import { calculateRankings, getHeadToHeadRecord } from '../../utils/ranking';


interface StandingsTableProps {
  standings: EnhancedSeasonStandings[];
  league: string;
  year: string;
  matchupsByWeek?: Record<number, any[]>;
}

export const StandingsTable = ({ standings, league, year, matchupsByWeek }: StandingsTableProps) => {
  const isActiveSeason = isActiveYear(year);
  const { openTeamProfile } = useTeamProfileModal();

  console.log('🏈 StandingsTable props:', {
    league,
    year,
    isActiveSeason,
    hasMatchupsByWeek: !!matchupsByWeek,
    matchupsByWeekKeys: matchupsByWeek ? Object.keys(matchupsByWeek).length : 0,
    standingsCount: standings.length
  });

  // Only calculate rankings for active seasons, use original for historical
  const rankedStandings = isActiveSeason ? calculateRankings(standings, matchupsByWeek, year) : standings;


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

  // Calculate win percentage for a team
  const getWinPct = (standing: EnhancedSeasonStandings) => {
    const totalGames = standing.wins + standing.losses + (standing.ties || 0);
    if (totalGames === 0) return 0;
    return (standing.wins + (standing.ties || 0) * 0.5) / totalGames;
  };

  // Check if current team is tied with another team (same record)
  const getTiebreaker = (currentIndex: number): { h2hRecords: string[]; usesPointsFor: boolean; pointsFor?: number } | null => {
    if (!isActiveSeason || !matchupsByWeek) {
      return null;
    }

    const currentStanding = rankedStandings[currentIndex];
    const currentWinPct = getWinPct(currentStanding);

    // Find ALL teams with the same win percentage (tied teams)
    const tiedTeams = rankedStandings.filter((standing, idx) =>
      idx !== currentIndex && getWinPct(standing) === currentWinPct
    );

    if (tiedTeams.length === 0) {
      return null; // No tied teams
    }

    // Build individual H2H records against each tied team
    const h2hRecords: string[] = [];
    let totalWins = 0;
    let totalLosses = 0;
    let totalGames = 0;

    tiedTeams.forEach(tiedTeam => {
      const h2h = getHeadToHeadRecord(currentStanding.userId, tiedTeam.userId, matchupsByWeek, year);
      totalWins += h2h.team1Wins;
      totalLosses += h2h.team2Wins;
      totalGames += h2h.totalGames;

      if (h2h.totalGames > 0) {
        const teamName = getDisplayTeamName(tiedTeam.userId, tiedTeam.userInfo.teamName, year);
        h2hRecords.push(`${h2h.team1Wins}-${h2h.team2Wins} vs ${teamName}`);
      }
    });

    if (h2hRecords.length > 0) {
      // Show individual H2H records if any games were played
      if (totalWins !== totalLosses) {
        return { h2hRecords, usesPointsFor: false };
      }
      // H2H is tied overall, so points for is the tiebreaker
      return { h2hRecords, usesPointsFor: true, pointsFor: currentStanding.pointsFor };
    }

    // No H2H games played, points for is the tiebreaker
    return { h2hRecords: [], usesPointsFor: true, pointsFor: currentStanding.pointsFor };
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
            {rankedStandings.map((standing, index) => {
              const tiebreakerText = getTiebreaker(index);

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
                      {tiebreakerText && (
                        <div className="group relative inline-block">
                          <Info className="h-4 w-4 text-gray-600 dark:text-gray-300 cursor-help" />
                          <div className="invisible group-hover:visible absolute z-[9999] w-64 px-3 py-2 text-sm text-white bg-gray-900/75 dark:bg-gray-800/75 rounded-lg shadow-xl whitespace-normal pointer-events-none left-full ml-2 top-1/2 -translate-y-1/2 backdrop-blur-sm">
                            <div className="font-bold mb-2 pb-2 border-b border-gray-700">Tiebreaker</div>
                            {tiebreakerText.h2hRecords.length > 0 && (
                              <div className="space-y-1 mb-2">
                                {tiebreakerText.h2hRecords.map((record, idx) => (
                                  <div key={idx} className="text-sm">{record}</div>
                                ))}
                              </div>
                            )}
                            {tiebreakerText.usesPointsFor && (
                              <div className="text-sm mt-2 pt-2 border-t border-gray-700">
                                {tiebreakerText.h2hRecords.length > 0 && '(H2H tied) '}
                                Using Points For {tiebreakerText.pointsFor ? `(${tiebreakerText.pointsFor.toFixed(2)})` : ''}
                              </div>
                            )}
                            <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-gray-900/75 dark:bg-gray-800/75 transform rotate-45"></div>
                          </div>
                        </div>
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
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};