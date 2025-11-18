import { useState, useMemo, useEffect } from 'react';
import { useAllStandings } from '../hooks/useLeagues';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import { ErrorMessage } from '../components/Common/ErrorMessage';
import { TeamLogo } from '../components/Common/TeamLogo';
import { LeagueBadge } from '../components/League/LeagueBadge';
import { ChevronDown, X, Calendar } from 'lucide-react';
import { useUrlParams } from '../hooks/useUrlParams';
import { useTeamProfileModal } from '../contexts/TeamProfileModalContext';
import { USERS, CURRENT_YEAR } from '../config/constants';
import type { LeagueTier } from '../types';

interface H2HRecord {
  wins: number;
  losses: number;
  ties: number;
  totalGames: number;
}

interface TeamInfo {
  userId: string;
  teamName: string;
  abbreviation: string;
}

interface MatchupDetail {
  year: string;
  league: LeagueTier;
  week: number;
  winner: string;
  loser: string;
  winnerScore: number;
  loserScore: number;
  winnerInfo: TeamInfo;
  loserInfo: TeamInfo;
  placementType?: string;
  isTie?: boolean;
}

export const H2HMatrix = () => {
  const { getParam, updateParams } = useUrlParams();
  const [selectedLeague, setSelectedLeague] = useState<LeagueTier>('PREMIER');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMatchups, setSelectedMatchups] = useState<MatchupDetail[]>([]);
  const [modalTeam1, setModalTeam1] = useState<TeamInfo | null>(null);
  const [modalTeam2, setModalTeam2] = useState<TeamInfo | null>(null);
  const { data: standings, isLoading, error } = useAllStandings();
  const { openTeamProfile } = useTeamProfileModal();

  // Initialize from URL params on mount
  useEffect(() => {
    const league = getParam('league', 'PREMIER');
    if (['PREMIER', 'MASTERS', 'NATIONAL'].includes(league)) {
      setSelectedLeague(league as LeagueTier);
    }
  }, []);

  const leagues: LeagueTier[] = ['PREMIER', 'MASTERS', 'NATIONAL'];

  const getLeagueName = (league: LeagueTier): string => {
    switch (league) {
      case 'PREMIER': return 'Premier';
      case 'MASTERS': return 'Masters';
      case 'NATIONAL': return 'National';
    }
  };

  // Get current season members for the selected league
  const currentSeasonMembers = useMemo(() => {
    if (!standings || standings.length === 0) return [];

    // Find the current year standings for the selected league
    const currentLeagueData = standings.find(
      s => s.league === selectedLeague && s.year === CURRENT_YEAR
    );

    if (!currentLeagueData) return [];

    // Get team info for each member
    const members: TeamInfo[] = currentLeagueData.standings.map(standing => ({
      userId: standing.userId,
      teamName: standing.userInfo.teamName,
      abbreviation: standing.userInfo.abbreviation
    }));

    // Sort alphabetically by team name
    return members.sort((a, b) => a.teamName.localeCompare(b.teamName));
  }, [standings, selectedLeague]);

  // Calculate H2H records and store matchup details for all matchups across all time
  const { h2hMatrix, matchupDetails } = useMemo(() => {
    if (!standings || standings.length === 0) return {
      h2hMatrix: new Map<string, Map<string, H2HRecord>>(),
      matchupDetails: new Map<string, MatchupDetail[]>()
    };

    const matrix = new Map<string, Map<string, H2HRecord>>();
    const details = new Map<string, MatchupDetail[]>();

    // Initialize matrix for current season members
    currentSeasonMembers.forEach(team1 => {
      const team1Map = new Map<string, H2HRecord>();
      currentSeasonMembers.forEach(team2 => {
        if (team1.userId !== team2.userId) {
          team1Map.set(team2.userId, { wins: 0, losses: 0, ties: 0, totalGames: 0 });
          // Initialize matchup details with sorted key
          const key = [team1.userId, team2.userId].sort().join('-');
          if (!details.has(key)) {
            details.set(key, []);
          }
        }
      });
      matrix.set(team1.userId, team1Map);
    });

    // Process all matchup data from all seasons
    standings.forEach(leagueData => {
      if (!leagueData.matchupsByWeek) return;

      Object.entries(leagueData.matchupsByWeek).forEach(([weekStr, weekMatchups]: [string, any]) => {
        if (!Array.isArray(weekMatchups)) return;

        weekMatchups.forEach((matchup: any) => {
          const winner = matchup.winner;
          const loser = matchup.loser;

          if (!winner || !loser) return;

          // Skip unplayed matchups (both scores are 0)
          if (matchup.winnerScore === 0 && matchup.loserScore === 0) return;

          // Check if it's a tie
          const isTie = matchup.winnerScore === matchup.loserScore;

          // Only count matchups where both teams are in current season
          const winnerInMatrix = matrix.has(winner);
          const loserInMatrix = matrix.has(loser);

          if (winnerInMatrix && loserInMatrix) {
            if (isTie) {
              // For ties, increment ties and total games for both teams
              const record1 = matrix.get(winner)?.get(loser);
              const record2 = matrix.get(loser)?.get(winner);
              if (record1) {
                record1.ties++;
                record1.totalGames++;
              }
              if (record2) {
                record2.ties++;
                record2.totalGames++;
              }
            } else {
              // Winner's record vs loser
              const winnerRecord = matrix.get(winner)?.get(loser);
              if (winnerRecord) {
                winnerRecord.wins++;
                winnerRecord.totalGames++;
              }

              // Loser's record vs winner
              const loserRecord = matrix.get(loser)?.get(winner);
              if (loserRecord) {
                loserRecord.losses++;
                loserRecord.totalGames++;
              }
            }

            // Store matchup detail
            const key = [winner, loser].sort().join('-');
            const winnerTeam = currentSeasonMembers.find(t => t.userId === winner);
            const loserTeam = currentSeasonMembers.find(t => t.userId === loser);

            if (winnerTeam && loserTeam) {
              details.get(key)?.push({
                year: leagueData.year,
                league: leagueData.league,
                week: parseInt(weekStr),
                winner,
                loser,
                winnerScore: matchup.winnerScore,
                loserScore: matchup.loserScore,
                winnerInfo: winnerTeam,
                loserInfo: loserTeam,
                placementType: matchup.placementType,
                isTie
              });
            }
          }
        });
      });
    });

    // Sort matchup details by year and week (most recent first)
    details.forEach((matchups) => {
      matchups.sort((a, b) => {
        if (a.year !== b.year) return b.year.localeCompare(a.year);
        return b.week - a.week;
      });
    });

    return { h2hMatrix: matrix, matchupDetails: details };
  }, [standings, currentSeasonMembers]);

  // Handle cell click to show matchup details
  const handleCellClick = (team1: TeamInfo, team2: TeamInfo) => {
    const key = [team1.userId, team2.userId].sort().join('-');
    const matchups = matchupDetails.get(key) || [];

    if (matchups.length > 0) {
      setModalTeam1(team1);
      setModalTeam2(team2);
      setSelectedMatchups(matchups);
      setModalOpen(true);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Head-to-Head Matrix</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Compare matchup records between all teams</p>
          </div>
          <div className="flex justify-center items-center min-h-96">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorMessage error={error} />;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Head-to-Head Matrix</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">All-time head-to-head records for current season members</p>
        </div>

        {/* H2H Matrix Table */}
        {currentSeasonMembers.length > 0 ? (
          <div className="card overflow-x-auto">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {getLeagueName(selectedLeague)} League - {CURRENT_YEAR}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  All-time records between current season members (rows beat columns)
                </p>
              </div>

              {/* League Filter */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-heading font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide whitespace-nowrap">
                  League
                </label>
                <div className="relative w-40">
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
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-20 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 p-2 text-xs font-bold text-gray-700 dark:text-gray-300">
                      Team
                    </th>
                    {currentSeasonMembers.map(team => (
                      <th
                        key={team.userId}
                        className="bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 p-2 min-w-[60px]"
                      >
                        <div className="flex flex-col items-center gap-1">
                          <TeamLogo
                            teamName={team.teamName}
                            abbreviation={team.abbreviation}
                            size="xs"
                            clickable
                            onClick={() => openTeamProfile(team.userId, team.teamName)}
                          />
                          <span className="text-xs font-bold text-gray-900 dark:text-gray-100 font-mono">
                            {team.abbreviation}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentSeasonMembers.map(rowTeam => (
                    <tr key={rowTeam.userId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="sticky left-0 z-10 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 p-2">
                        <div className="flex items-center gap-2">
                          <TeamLogo
                            teamName={rowTeam.teamName}
                            abbreviation={rowTeam.abbreviation}
                            size="sm"
                            clickable
                            onClick={() => openTeamProfile(rowTeam.userId, rowTeam.teamName)}
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                              {rowTeam.teamName}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                              {rowTeam.abbreviation}
                            </div>
                          </div>
                        </div>
                      </td>
                      {currentSeasonMembers.map(colTeam => {
                        if (rowTeam.userId === colTeam.userId) {
                          return (
                            <td
                              key={colTeam.userId}
                              className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 p-2 text-center"
                            >
                              <span className="text-xs text-gray-400 dark:text-gray-600">—</span>
                            </td>
                          );
                        }

                        const record = h2hMatrix.get(rowTeam.userId)?.get(colTeam.userId);
                        const wins = record?.wins || 0;
                        const losses = record?.losses || 0;
                        const ties = record?.ties || 0;
                        const totalGames = record?.totalGames || 0;

                        // Determine cell color based on record
                        let cellColor = 'bg-white dark:bg-gray-900';
                        if (totalGames > 0) {
                          const winPct = wins / totalGames;
                          if (winPct > 0.6) {
                            cellColor = 'bg-green-50 dark:bg-green-900/20';
                          } else if (winPct < 0.4) {
                            cellColor = 'bg-red-50 dark:bg-red-900/20';
                          } else {
                            cellColor = 'bg-yellow-50 dark:bg-yellow-900/20';
                          }
                        }

                        return (
                          <td
                            key={colTeam.userId}
                            className={`${cellColor} border border-gray-300 dark:border-gray-600 p-2 text-center ${totalGames > 0 ? 'cursor-pointer hover:opacity-75 transition-opacity' : ''}`}
                            onClick={() => totalGames > 0 && handleCellClick(rowTeam, colTeam)}
                          >
                            {totalGames > 0 ? (
                              <div className="flex flex-col items-center">
                                <span className="text-sm font-bold font-mono text-gray-900 dark:text-gray-100">
                                  {wins}-{losses}{ties > 0 ? `-${ties}` : ''}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  ({totalGames})
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 dark:text-gray-600">0-0</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
              <p>• Green indicates winning record (60%+), Yellow indicates even record (40-60%), Red indicates losing record (&lt;40%)</p>
              <p>• Records show: Wins-Losses (Total Games)</p>
            </div>
          </div>
        ) : (
          <div className="card">
            <p className="text-center text-gray-500 dark:text-gray-400">
              No data available for {getLeagueName(selectedLeague)} league in {CURRENT_YEAR}
            </p>
          </div>
        )}

        {/* Matchup Details Modal */}
        {modalOpen && modalTeam1 && modalTeam2 && (
          <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => setModalOpen(false)}>
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              {/* Background overlay */}
              <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75" />

              {/* Center modal */}
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

              {/* Modal panel */}
              <div
                className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full sm:p-6"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close button */}
                <div className="absolute top-0 right-0 pt-4 pr-4">
                  <button
                    onClick={() => setModalOpen(false)}
                    className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Modal content */}
                <div className="space-y-4">
                  {/* Header with team info and record in one compact section */}
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded">
                    <div className="flex items-center justify-between gap-4">
                      {/* Team 1 */}
                      <div className="flex items-center gap-3">
                        <TeamLogo
                          teamName={modalTeam1.teamName}
                          abbreviation={modalTeam1.abbreviation}
                          size="sm"
                        />
                        <div>
                          <div className="font-bold text-gray-900 dark:text-gray-100">
                            {modalTeam1.teamName}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {modalTeam1.abbreviation}
                          </div>
                        </div>
                      </div>

                      {/* Record */}
                      <div className="text-center">
                        <div className="flex items-center gap-2">
                          {(() => {
                            const team1Wins = selectedMatchups.filter(m => !m.isTie && m.winner === modalTeam1.userId).length;
                            const team2Wins = selectedMatchups.filter(m => !m.isTie && m.winner === modalTeam2.userId).length;
                            const ties = selectedMatchups.filter(m => m.isTie).length;

                            return (
                              <>
                                <span className={`text-2xl font-bold ${
                                  team1Wins > team2Wins ? 'text-green-600' : 'text-gray-600 dark:text-gray-400'
                                }`}>
                                  {team1Wins}
                                </span>
                                <span className="text-lg text-gray-400">-</span>
                                <span className={`text-2xl font-bold ${
                                  team2Wins > team1Wins ? 'text-green-600' : 'text-gray-600 dark:text-gray-400'
                                }`}>
                                  {team2Wins}
                                </span>
                                {ties > 0 && (
                                  <>
                                    <span className="text-lg text-gray-400">-</span>
                                    <span className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                                      {ties}
                                    </span>
                                  </>
                                )}
                              </>
                            );
                          })()}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {selectedMatchups.length} game{selectedMatchups.length !== 1 ? 's' : ''}
                        </div>
                      </div>

                      {/* Team 2 */}
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="font-bold text-gray-900 dark:text-gray-100">
                            {modalTeam2.teamName}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {modalTeam2.abbreviation}
                          </div>
                        </div>
                        <TeamLogo
                          teamName={modalTeam2.teamName}
                          abbreviation={modalTeam2.abbreviation}
                          size="sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Matchup List */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      All Games
                    </h3>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {selectedMatchups.map((matchup, index) => (
                        <div key={index} className="border border-gray-200 dark:border-gray-700 p-4 rounded">
                          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            <div className="flex items-center space-x-4">
                              <LeagueBadge league={matchup.league} />
                              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                                <Calendar className="w-4 h-4" />
                                <span>{matchup.year} • Week {matchup.week}</span>
                              </div>
                              {matchup.placementType && (
                                <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 text-xs font-semibold rounded">
                                  {matchup.placementType}
                                </span>
                              )}
                              {matchup.isTie && (
                                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded">
                                  TIE
                                </span>
                              )}
                            </div>

                            <div className="flex items-center justify-between lg:justify-end space-x-3">
                              <div className="flex items-center space-x-2">
                                <TeamLogo
                                  teamName={matchup.winnerInfo.teamName}
                                  abbreviation={matchup.winnerInfo.abbreviation}
                                  size="sm"
                                />
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {matchup.winnerInfo.abbreviation}
                                </span>
                              </div>

                              <div className="text-center">
                                <div className="font-bold text-lg">
                                  <span className={matchup.isTie ? 'text-gray-600 dark:text-gray-400' : 'text-emerald-600'}>
                                    {matchup.winnerScore.toFixed(1)}
                                  </span>
                                  <span className="text-gray-400 mx-2">-</span>
                                  <span className={matchup.isTie ? 'text-gray-600 dark:text-gray-400' : 'text-red-600'}>
                                    {matchup.loserScore.toFixed(1)}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {matchup.loserInfo.abbreviation}
                                </span>
                                <TeamLogo
                                  teamName={matchup.loserInfo.teamName}
                                  abbreviation={matchup.loserInfo.abbreviation}
                                  size="sm"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
