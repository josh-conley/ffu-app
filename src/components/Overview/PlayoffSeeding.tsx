import { useAllStandings } from '../../hooks/useLeagues';
import { TeamLogo } from '../Common/TeamLogo';
import { Trophy, Star } from 'lucide-react';
import { getDisplayTeamName, getCurrentTeamName, getCurrentAbbreviation } from '../../config/constants';
import { getLeagueName } from '../../constants/leagues';
import type { LeagueTier } from '../../types';
import { useTeamProfileModal } from '../../contexts/TeamProfileModalContext';
import { calculateRankings, identifyDivisionLeaders, getDivisionName } from '../../utils/ranking';

const CURRENT_YEAR = '2025';
const PLAYOFF_SPOTS = 6;

export const PlayoffSeeding = () => {
  const { data: allStandings, isLoading, error } = useAllStandings();
  const { openTeamProfile } = useTeamProfileModal();

  if (isLoading) {
    return (
      <div className="card">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Playoff Seeding</h2>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading playoff seeding...</div>
      </div>
    );
  }

  if (error || !allStandings) {
    return null;
  }

  // Filter to current year only
  const currentYearStandings = allStandings.filter(s => s.year === CURRENT_YEAR);

  if (currentYearStandings.length === 0) {
    return null;
  }

  const getLeagueColors = (league: LeagueTier) => {
    const colorMap = {
      PREMIER: {
        bg: 'bg-yellow-50 dark:bg-yellow-900/20',
        border: 'border-yellow-300 dark:border-yellow-700',
        text: 'text-yellow-800 dark:text-yellow-300',
        iconBg: 'bg-yellow-500 dark:bg-yellow-600',
        header: 'bg-yellow-600'
      },
      MASTERS: {
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        border: 'border-purple-300 dark:border-purple-700',
        text: 'text-purple-800 dark:text-purple-300',
        iconBg: 'bg-purple-500 dark:bg-purple-600',
        header: 'bg-purple-600'
      },
      NATIONAL: {
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-300 dark:border-red-700',
        text: 'text-red-800 dark:text-red-300',
        iconBg: 'bg-red-500 dark:bg-red-600',
        header: 'bg-red-600'
      }
    };
    return colorMap[league];
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Trophy className="h-8 w-8 text-yellow-500" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Playoff Seeding</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Unofficial • Pending commissioner verification
            </p>
          </div>
        </div>

        {/* Legend - shown once for entire section */}
        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
          <Star className="w-3.5 h-3.5 text-gray-400" fill="currentColor" />
          <span>Division Winner</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {(['PREMIER', 'MASTERS', 'NATIONAL'] as LeagueTier[]).map(league => {
          const leagueData = currentYearStandings.find(s => s.league === league);

          if (!leagueData) return null;

          const colors = getLeagueColors(league);

          // Get matchups for tiebreaker calculation
          const matchupsByWeek = (leagueData as any).matchupsByWeek;

          // Calculate rankings using the same logic as standings page
          const rankedStandings = calculateRankings(leagueData.standings, matchupsByWeek, CURRENT_YEAR);

          // Get top 6 teams (playoff teams)
          const playoffTeams = rankedStandings.slice(0, PLAYOFF_SPOTS);

          // Identify division leaders
          const divisionLeaderInfo = identifyDivisionLeaders(rankedStandings, matchupsByWeek, CURRENT_YEAR);

          // Get division names
          const divisionNames = (leagueData as any).divisionNames;
          const hasDivisions = rankedStandings.some(s => s.division !== undefined && s.division !== null);

          // Division dot colors
          const getDivisionDotColor = (divNum: number) => {
            const dotColors: Record<number, string> = {
              1: 'bg-blue-400 dark:bg-blue-500',
              2: 'bg-green-400 dark:bg-green-500',
              3: 'bg-orange-400 dark:bg-orange-500',
              4: 'bg-purple-400 dark:bg-purple-500'
            };
            return dotColors[divNum] || dotColors[1];
          };

          return (
            <div key={league} className={`overflow-hidden border ${colors.border}`}>
              {/* Header */}
              <div className={`${colors.header} p-4`}>
                <h3 className="text-xl font-black text-white tracking-wide uppercase text-center">
                  {getLeagueName(league)} League
                </h3>
              </div>

              {/* Playoff teams */}
              <div className={`${colors.bg} p-4`}>
                {/* First Round Bye header */}
                <div className="relative pb-3 mb-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t-2 border-gray-400 dark:border-gray-500"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-gray-50 dark:bg-gray-900 px-3 text-xs font-medium text-gray-600 dark:text-gray-400">
                      First Round Bye
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {/* Render seeds 1 and 2 (First Round Bye) */}
                  {playoffTeams.slice(0, 2).map((team) => {
                    const isFirstDivisionLeader = divisionLeaderInfo?.firstDivisionLeader === team.userId;
                    const isSecondDivisionLeader = divisionLeaderInfo?.secondDivisionLeader === team.userId;
                    const isThirdDivisionLeader = divisionLeaderInfo?.thirdDivisionLeader === team.userId;

                    return (
                      <div
                        key={team.userId}
                        className="flex items-center space-x-3 bg-white dark:bg-gray-800 p-3 rounded shadow-sm"
                      >
                        {/* Seed number */}
                        <div className={`w-8 h-8 flex items-center justify-center ${colors.iconBg} text-white font-black text-sm flex-shrink-0`}>
                          {team.rank}
                        </div>

                        {/* Team logo */}
                        <div className="hidden sm:block">
                          <TeamLogo
                            teamName={getCurrentTeamName(team.userId, team.userInfo.teamName)}
                            abbreviation={getCurrentAbbreviation(team.userId, team.userInfo.abbreviation)}
                            size="sm"
                            clickable
                            onClick={() => openTeamProfile(team.userId, team.userInfo.teamName)}
                          />
                        </div>

                        {/* Team info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                              {getDisplayTeamName(team.userId, team.userInfo.teamName, CURRENT_YEAR)}
                            </span>
                            {(isFirstDivisionLeader || isSecondDivisionLeader || isThirdDivisionLeader) && (
                              <Star className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="currentColor" />
                            )}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono">
                              {team.wins}-{team.losses}{team.ties ? `-${team.ties}` : ''}
                            </span>
                            {hasDivisions && team.division && (
                              <>
                                <span className="text-gray-400 dark:text-gray-500">•</span>
                                <span className="inline-flex items-center gap-1">
                                  <span className={`w-1.5 h-1.5 rounded-full ${getDivisionDotColor(team.division)}`}></span>
                                  <span>{getDivisionName(team.division, divisionNames)}</span>
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Quarterfinals Divider */}
                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t-2 border-gray-400 dark:border-gray-500"></div>
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-gray-50 dark:bg-gray-900 px-3 text-xs font-medium text-gray-600 dark:text-gray-400">
                        Quarterfinals
                      </span>
                    </div>
                  </div>

                  {/* Matchup 1: 3 vs 6 */}
                  {playoffTeams[2] && playoffTeams[5] && (
                    <div className="space-y-2 p-2 bg-white/50 dark:bg-gray-700/30 rounded">
                      {[playoffTeams[2], playoffTeams[5]].map((team, idx) => {
                        const isFirstDivisionLeader = divisionLeaderInfo?.firstDivisionLeader === team.userId;
                        const isSecondDivisionLeader = divisionLeaderInfo?.secondDivisionLeader === team.userId;
                        const isThirdDivisionLeader = divisionLeaderInfo?.thirdDivisionLeader === team.userId;

                        return (
                          <>
                            <div
                              key={team.userId}
                              className="flex items-center space-x-3 bg-white dark:bg-gray-800 p-3 rounded shadow-sm"
                            >
                            {/* Seed number */}
                            <div className={`w-8 h-8 flex items-center justify-center ${colors.iconBg} text-white font-black text-sm flex-shrink-0`}>
                              {team.rank}
                            </div>

                            {/* Team logo */}
                            <div className="hidden sm:block">
                              <TeamLogo
                                teamName={getCurrentTeamName(team.userId, team.userInfo.teamName)}
                                abbreviation={getCurrentAbbreviation(team.userId, team.userInfo.abbreviation)}
                                size="sm"
                                clickable
                                onClick={() => openTeamProfile(team.userId, team.userInfo.teamName)}
                              />
                            </div>

                            {/* Team info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                                  {getDisplayTeamName(team.userId, team.userInfo.teamName, CURRENT_YEAR)}
                                </span>
                                {(isFirstDivisionLeader || isSecondDivisionLeader || isThirdDivisionLeader) && (
                                  <Star className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="currentColor" />
                                )}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono">
                                  {team.wins}-{team.losses}{team.ties ? `-${team.ties}` : ''}
                                </span>
                                {hasDivisions && team.division && (
                                  <>
                                    <span className="text-gray-400 dark:text-gray-500">•</span>
                                    <span className="inline-flex items-center gap-1">
                                      <span className={`w-1.5 h-1.5 rounded-full ${getDivisionDotColor(team.division)}`}></span>
                                      <span>{getDivisionName(team.division, divisionNames)}</span>
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          {/* VS divider between teams */}
                          {idx === 0 && (
                            <div className="flex items-center justify-center -my-1">
                              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">vs</span>
                            </div>
                          )}
                        </>
                        );
                      })}
                    </div>
                  )}

                  {/* Matchup 2: 4 vs 5 */}
                  {playoffTeams[3] && playoffTeams[4] && (
                    <div className="space-y-2 p-2 bg-white/50 dark:bg-gray-700/30 rounded">
                      {[playoffTeams[3], playoffTeams[4]].map((team, idx) => {
                        const isFirstDivisionLeader = divisionLeaderInfo?.firstDivisionLeader === team.userId;
                        const isSecondDivisionLeader = divisionLeaderInfo?.secondDivisionLeader === team.userId;
                        const isThirdDivisionLeader = divisionLeaderInfo?.thirdDivisionLeader === team.userId;

                        return (
                          <>
                            <div
                              key={team.userId}
                              className="flex items-center space-x-3 bg-white dark:bg-gray-800 p-3 rounded shadow-sm"
                            >
                            {/* Seed number */}
                            <div className={`w-8 h-8 flex items-center justify-center ${colors.iconBg} text-white font-black text-sm flex-shrink-0`}>
                              {team.rank}
                            </div>

                            {/* Team logo */}
                            <div className="hidden sm:block">
                              <TeamLogo
                                teamName={getCurrentTeamName(team.userId, team.userInfo.teamName)}
                                abbreviation={getCurrentAbbreviation(team.userId, team.userInfo.abbreviation)}
                                size="sm"
                                clickable
                                onClick={() => openTeamProfile(team.userId, team.userInfo.teamName)}
                              />
                            </div>

                            {/* Team info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                                  {getDisplayTeamName(team.userId, team.userInfo.teamName, CURRENT_YEAR)}
                                </span>
                                {(isFirstDivisionLeader || isSecondDivisionLeader || isThirdDivisionLeader) && (
                                  <Star className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="currentColor" />
                                )}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono">
                                  {team.wins}-{team.losses}{team.ties ? `-${team.ties}` : ''}
                                </span>
                                {hasDivisions && team.division && (
                                  <>
                                    <span className="text-gray-400 dark:text-gray-500">•</span>
                                    <span className="inline-flex items-center gap-1">
                                      <span className={`w-1.5 h-1.5 rounded-full ${getDivisionDotColor(team.division)}`}></span>
                                      <span>{getDivisionName(team.division, divisionNames)}</span>
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          {/* VS divider between teams */}
                          {idx === 0 && (
                            <div className="flex items-center justify-center -my-1">
                              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">vs</span>
                            </div>
                          )}
                        </>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
