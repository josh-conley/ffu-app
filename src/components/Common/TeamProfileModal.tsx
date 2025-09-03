import { useMemo, useState } from 'react';
import { useAllStandings } from '../../hooks/useLeagues';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import { TeamLogo } from './TeamLogo';
import { LeagueBadge } from '../League/LeagueBadge';
import { LeagueProgressionChart } from '../Members/LeagueProgressionChart';
import { getFFUIdBySleeperId, getSleeperIdByFFUId, isActiveYear } from '../../config/constants';
import type { LeagueTier, UserInfo } from '../../types';
import { Trophy, Medal, Award, TrendingDown, ChevronDown, ChevronUp, X } from 'lucide-react';

type SeasonSortKey = 'year' | 'league' | 'wins' | 'winPct' | 'pointsFor' | 'pointsAgainst' | 'placement' | 'upr';
type SortOrder = 'asc' | 'desc';

interface TeamProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamUserId: string;
  teamName?: string;
}

// Helper function to calculate playoff wins/losses based on placement
const calculatePlayoffRecord = (placement: number): { wins: number; losses: number } => {
  switch (placement) {
    case 1: return { wins: 2, losses: 0 };
    case 2: return { wins: 2, losses: 1 };
    case 3: return { wins: 1, losses: 2 };
    case 4: return { wins: 1, losses: 2 };
    case 5: return { wins: 0, losses: 1 };
    case 6: return { wins: 0, losses: 1 };
    default: return { wins: 0, losses: 0 };
  }
};

// Utility function to extract past team names from season history
const getPastTeamNames = (standings: unknown[], currentTeamName: string, ffuUserId: string): string[] => {
  const teamNames = new Set<string>();

  standings.forEach((leagueData: any) => {
    leagueData.standings.forEach((standing: any) => {
      if ((standing.ffuUserId && standing.ffuUserId === ffuUserId) ||
        (standing.userId === ffuUserId)) {
        const teamName = standing.userInfo?.teamName;
        if (teamName && teamName !== currentTeamName) {
          teamNames.add(teamName);
        }
      }
    });
  });

  return Array.from(teamNames);
};

interface PlayerCareerStats {
  userId: string;
  ffuUserId: string;
  userInfo: UserInfo;
  totalWins: number;
  totalLosses: number;
  totalPointsFor: number;
  totalPointsAgainst: number;
  firstPlaceFinishes: number;
  secondPlaceFinishes: number;
  thirdPlaceFinishes: number;
  lastPlaceFinishes: number;
  playoffAppearances: number;
  playoffWins: number;
  playoffLosses: number;
  winPercentage: number;
  averageSeasonRank: number;
  pointDifferential: number;
  averageUPR: number;
  careerHighGame?: number;
  careerLowGame?: number;
  pastTeamNames: string[];
  seasonHistory: {
    year: string;
    league: LeagueTier;
    wins: number;
    losses: number;
    pointsFor: number;
    pointsAgainst: number;
    rank: number;
    playoffFinish?: number;
    unionPowerRating?: number;
  }[];
}

export const TeamProfileModal = ({ isOpen, onClose, teamUserId }: TeamProfileModalProps) => {
  const { data: standings, isLoading, error } = useAllStandings();
  const [sortKey, setSortKey] = useState<SeasonSortKey>('year');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const allPlayers = useMemo(() => {
    if (!standings || !standings.length) {
      return [];
    }

    const playerMap: Record<string, PlayerCareerStats> = {};

    // Process all standings data (same logic as Members page)
    standings.forEach((leagueData) => {
      leagueData.standings.forEach((standing) => {
        // Use FFU ID as primary key, with robust fallback logic
        let playerId = standing.ffuUserId;

        // If no FFU ID, try to convert from legacy user ID
        if (!playerId || playerId === 'unknown') {
          playerId = getFFUIdBySleeperId(standing.userId) || standing.userId;
        }

        if (!playerMap[playerId]) {
          playerMap[playerId] = {
            userId: standing.userId,
            ffuUserId: standing.ffuUserId || standing.userId,
            userInfo: standing.userInfo,
            totalWins: 0,
            totalLosses: 0,
            totalPointsFor: 0,
            totalPointsAgainst: 0,
            firstPlaceFinishes: 0,
            secondPlaceFinishes: 0,
            thirdPlaceFinishes: 0,
            lastPlaceFinishes: 0,
            playoffAppearances: 0,
            playoffWins: 0,
            playoffLosses: 0,
            winPercentage: 0,
            averageSeasonRank: 0,
            pointDifferential: 0,
            averageUPR: 0,
            careerHighGame: undefined,
            careerLowGame: undefined,
            pastTeamNames: [],
            seasonHistory: []
          };
        }

        const player = playerMap[playerId];

        // Accumulate totals
        player.totalWins += standing.wins;
        player.totalLosses += standing.losses;
        player.totalPointsFor += standing.pointsFor || 0;
        player.totalPointsAgainst += standing.pointsAgainst || 0;

        // Track career high and low games
        if (standing.highGame !== undefined && standing.highGame !== null && standing.highGame > 0) {
          if (player.careerHighGame === undefined || standing.highGame > player.careerHighGame) {
            player.careerHighGame = standing.highGame;
          }
        }
        if (standing.lowGame !== undefined && standing.lowGame !== null && standing.lowGame > 0) {
          if (player.careerLowGame === undefined || standing.lowGame < player.careerLowGame) {
            player.careerLowGame = standing.lowGame;
          }
        }

        // Count finishes (exclude active seasons)
        if (!isActiveYear(leagueData.year)) {
          if (standing.rank === 1) player.firstPlaceFinishes++;
          else if (standing.rank === 2) player.secondPlaceFinishes++;
          else if (standing.rank === 3) player.thirdPlaceFinishes++;
          else if (standing.rank === leagueData.standings.length) player.lastPlaceFinishes++;
        }

        // Check for playoff appearance
        if (standing.rank <= 6 && !isActiveYear(leagueData.year)) {
          player.playoffAppearances++;

          const playoffFinish = leagueData.playoffResults?.find(p =>
            (p.ffuUserId && p.ffuUserId === standing.ffuUserId) ||
            (p.userId === standing.userId)
          );

          const finalPlacement = playoffFinish ? playoffFinish.placement : standing.rank;
          const { wins, losses } = calculatePlayoffRecord(finalPlacement);
          player.playoffWins += wins;
          player.playoffLosses += losses;
        }

        // Add to season history
        const playoffFinish = leagueData.playoffResults?.find(p =>
          (p.ffuUserId && p.ffuUserId === standing.ffuUserId) ||
          (p.userId === standing.userId)
        );

        player.seasonHistory.push({
          year: leagueData.year,
          league: leagueData.league as LeagueTier,
          wins: standing.wins,
          losses: standing.losses,
          pointsFor: standing.pointsFor || 0,
          pointsAgainst: standing.pointsAgainst || 0,
          rank: standing.rank,
          playoffFinish: standing.rank <= 6 ? (playoffFinish?.placement || standing.rank) : undefined,
          unionPowerRating: standing.unionPowerRating
        });
      });
    });

    // Calculate derived stats
    Object.values(playerMap).forEach(player => {
      player.pastTeamNames = getPastTeamNames(standings, player.userInfo.teamName, player.ffuUserId);
      player.seasonHistory.sort((a, b) => b.year.localeCompare(a.year));

      const totalGames = player.totalWins + player.totalLosses;
      player.winPercentage = totalGames > 0 ? (player.totalWins / totalGames) * 100 : 0;

      if (player.seasonHistory.length > 0) {
        const completedSeasons = player.seasonHistory.filter(season => !isActiveYear(season.year));
        if (completedSeasons.length > 0) {
          const totalRank = completedSeasons.reduce((sum, season) => sum + season.rank, 0);
          player.averageSeasonRank = totalRank / completedSeasons.length;
        }
      }

      player.pointDifferential = player.totalPointsFor - player.totalPointsAgainst;

      const seasonsWithUPR = player.seasonHistory.filter(season =>
        !isActiveYear(season.year) && season.unionPowerRating !== undefined && season.unionPowerRating !== null
      );
      if (seasonsWithUPR.length > 0) {
        const totalUPR = seasonsWithUPR.reduce((sum, season) => sum + (season.unionPowerRating || 0), 0);
        player.averageUPR = totalUPR / seasonsWithUPR.length;
      }
    });

    return Object.values(playerMap).sort((a, b) =>
      a.userInfo.teamName.localeCompare(b.userInfo.teamName)
    );
  }, [standings]);

  // Find the specific player we want to show
  // Try to match by multiple ID types for maximum compatibility
  const selectedPlayer = useMemo(() => {
    if (!teamUserId || !allPlayers.length) return undefined;
    
    // Try exact matches first
    let player = allPlayers.find(p => p.userId === teamUserId);
    if (player) return player;
    
    // Try FFU ID match
    player = allPlayers.find(p => p.ffuUserId === teamUserId);
    if (player) return player;
    
    // Try converting Sleeper ID to FFU ID and matching
    const ffuId = getFFUIdBySleeperId(teamUserId);
    if (ffuId) {
      player = allPlayers.find(p => p.ffuUserId === ffuId);
      if (player) return player;
    }
    
    // Try converting FFU ID to Sleeper ID and matching  
    const sleeperId = getSleeperIdByFFUId(teamUserId);
    if (sleeperId) {
      player = allPlayers.find(p => p.userId === sleeperId);
      if (player) return player;
    }
    
    return undefined;
  }, [teamUserId, allPlayers]);

  // Sort handling functions
  const handleSort = (key: SeasonSortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const getSortValue = (season: any, key: SeasonSortKey) => {
    switch (key) {
      case 'year':
        return season.year;
      case 'league': {
        const leagueOrder: Record<string, number> = { 'PREMIER': 1, 'MASTERS': 2, 'NATIONAL': 3 };
        return leagueOrder[season.league] || 4;
      }
      case 'wins':
        return season.wins;
      case 'winPct':
        return (season.wins + season.losses) > 0 ? (season.wins / (season.wins + season.losses)) : 0;
      case 'pointsFor':
        return season.pointsFor;
      case 'pointsAgainst':
        return season.pointsAgainst;
      case 'placement':
        return season.playoffFinish || season.rank;
      case 'upr':
        return season.unionPowerRating || 0;
      default:
        return 0;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="relative inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>

          {/* Modal content */}
          <div className="bg-white dark:bg-gray-800 px-6 pt-6 pb-6 max-h-[80vh] overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-12">
                <LoadingSpinner size="lg" />
                <div className="mt-4 text-gray-500 dark:text-gray-400">
                  Loading team profile...
                </div>
              </div>
            ) : error ? (
              <ErrorMessage error={error} />
            ) : !selectedPlayer ? (
              <div className="text-center py-12">
                <div className="text-gray-500 dark:text-gray-400">
                  Team profile not found
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Player Overview Card */}
                <div>
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 mb-8">
                    <TeamLogo
                      teamName={selectedPlayer.userInfo.teamName}
                      abbreviation={selectedPlayer.userInfo.abbreviation}
                      size="lg"
                      className="w-36 h-36"
                    />
                    <div className="text-center">
                      <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        {selectedPlayer.userInfo.teamName}
                      </h2>
                      <div className="flex items-center justify-center space-x-3 mb-2">
                        <p className="text-lg text-gray-600 dark:text-gray-400">
                          {selectedPlayer.userInfo.abbreviation}
                        </p>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300">
                          {selectedPlayer.seasonHistory.length} seasons
                        </span>
                      </div>
                      {selectedPlayer.pastTeamNames.length > 0 && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Previously: {selectedPlayer.pastTeamNames.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Primary Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="text-center p-3 bg-gray-50 dark:bg-gray-700">
                        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          {selectedPlayer.totalWins}-{selectedPlayer.totalLosses}
                        </div>
                        <div className="text-xs font-medium text-gray-600 dark:text-gray-400">Record</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 dark:bg-gray-700">
                        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          {selectedPlayer.winPercentage.toFixed(1)}%
                        </div>
                        <div className="text-xs font-medium text-gray-600 dark:text-gray-400">Win %</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 dark:bg-gray-700">
                        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          {((selectedPlayer.totalWins + selectedPlayer.totalLosses) > 0 ?
                            (selectedPlayer.totalPointsFor / (selectedPlayer.totalWins + selectedPlayer.totalLosses)).toFixed(1) :
                            '0.0')}
                        </div>
                        <div className="text-xs font-medium text-gray-600 dark:text-gray-400">PPG</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 dark:bg-gray-700">
                        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          {selectedPlayer.averageUPR ? selectedPlayer.averageUPR.toFixed(1) : '—'}
                        </div>
                        <div className="text-xs font-medium text-gray-600 dark:text-gray-400">Avg UPR</div>
                      </div>
                    </div>

                    {/* Additional Stats */}
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 p-3">
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                            {selectedPlayer.playoffWins}-{selectedPlayer.playoffLosses}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">Playoff</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{selectedPlayer.totalPointsFor.toFixed(0)}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">Points For</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{selectedPlayer.totalPointsAgainst.toFixed(0)}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">Points Against</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-lg font-bold ${selectedPlayer.pointDifferential >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {selectedPlayer.pointDifferential > 0 ? '+' : ''}{selectedPlayer.pointDifferential.toFixed(1)}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">Diff</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-green-600">{selectedPlayer.careerHighGame ? selectedPlayer.careerHighGame.toFixed(1) : '—'}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">High</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-red-600">{selectedPlayer.careerLowGame ? selectedPlayer.careerLowGame.toFixed(1) : '—'}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">Low</div>
                        </div>
                      </div>
                      <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                          <div className="text-center">
                            <div className="flex items-center justify-center space-x-1 mb-1">
                              <Trophy className="h-4 w-4 text-yellow-600" />
                              <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{selectedPlayer.firstPlaceFinishes}</span>
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">1st</div>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center space-x-1 mb-1">
                              <Medal className="h-4 w-4 text-gray-500" />
                              <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{selectedPlayer.secondPlaceFinishes}</span>
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">2nd</div>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center space-x-1 mb-1">
                              <Award className="h-4 w-4 text-amber-600" />
                              <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{selectedPlayer.thirdPlaceFinishes}</span>
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">3rd</div>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center space-x-1 mb-1">
                              <TrendingDown className="h-4 w-4 text-red-600" />
                              <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{selectedPlayer.lastPlaceFinishes}</span>
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Last</div>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center space-x-1 mb-1">
                              <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                #{selectedPlayer.averageSeasonRank.toFixed(1)}
                              </span>
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Avg Rank</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* League Tier Progression Chart */}
                <LeagueProgressionChart seasonHistory={selectedPlayer.seasonHistory} />

                {/* Season History */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Season History</h3>
                  <div className="overflow-x-auto">
                    <div className="inline-block min-w-full align-middle">
                      <table className="min-w-full table">
                        <thead className="table-header">
                          <tr>
                            <th className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none" onClick={() => handleSort('year')}>
                              <div className="flex items-center justify-center text-xs">
                                Year
                                <div className="flex flex-col ml-1">
                                  <ChevronUp className={`h-3 w-3 ${sortKey === 'year' && sortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                                  <ChevronDown className={`h-3 w-3 -mt-1 ${sortKey === 'year' && sortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                                </div>
                              </div>
                            </th>
                            <th className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none" onClick={() => handleSort('league')}>
                              <div className="flex items-center justify-center text-xs">
                                League
                                <div className="flex flex-col ml-1">
                                  <ChevronUp className={`h-3 w-3 ${sortKey === 'league' && sortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                                  <ChevronDown className={`h-3 w-3 -mt-1 ${sortKey === 'league' && sortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                                </div>
                              </div>
                            </th>
                            <th className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none" onClick={() => handleSort('wins')}>
                              <div className="flex items-center justify-center text-xs">
                                Record
                                <div className="flex flex-col ml-1">
                                  <ChevronUp className={`h-3 w-3 ${sortKey === 'wins' && sortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                                  <ChevronDown className={`h-3 w-3 -mt-1 ${sortKey === 'wins' && sortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                                </div>
                              </div>
                            </th>
                            <th className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none" onClick={() => handleSort('winPct')}>
                              <div className="flex items-center justify-center text-xs">
                                Win %
                                <div className="flex flex-col ml-1">
                                  <ChevronUp className={`h-3 w-3 ${sortKey === 'winPct' && sortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                                  <ChevronDown className={`h-3 w-3 -mt-1 ${sortKey === 'winPct' && sortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                                </div>
                              </div>
                            </th>
                            <th className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none hidden sm:table-cell" onClick={() => handleSort('pointsFor')}>
                              <div className="flex items-center justify-center text-xs">
                                Points For
                                <div className="flex flex-col ml-1">
                                  <ChevronUp className={`h-3 w-3 ${sortKey === 'pointsFor' && sortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                                  <ChevronDown className={`h-3 w-3 -mt-1 ${sortKey === 'pointsFor' && sortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                                </div>
                              </div>
                            </th>
                            <th className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none hidden sm:table-cell" onClick={() => handleSort('pointsAgainst')}>
                              <div className="flex items-center justify-center text-xs">
                                Points Against
                                <div className="flex flex-col ml-1">
                                  <ChevronUp className={`h-3 w-3 ${sortKey === 'pointsAgainst' && sortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                                  <ChevronDown className={`h-3 w-3 -mt-1 ${sortKey === 'pointsAgainst' && sortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                                </div>
                              </div>
                            </th>
                            <th className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none" onClick={() => handleSort('upr')}>
                              <div className="flex items-center justify-center text-xs">
                                UPR
                                <div className="flex flex-col ml-1">
                                  <ChevronUp className={`h-3 w-3 ${sortKey === 'upr' && sortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                                  <ChevronDown className={`h-3 w-3 -mt-1 ${sortKey === 'upr' && sortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                                </div>
                              </div>
                            </th>
                            <th className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none" onClick={() => handleSort('placement')}>
                              <div className="flex items-center justify-center text-xs">
                                Rank
                                <div className="flex flex-col ml-1">
                                  <ChevronUp className={`h-3 w-3 ${sortKey === 'placement' && sortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                                  <ChevronDown className={`h-3 w-3 -mt-1 ${sortKey === 'placement' && sortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                                </div>
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...selectedPlayer.seasonHistory]
                            .sort((a, b) => {
                              const aValue = getSortValue(a, sortKey);
                              const bValue = getSortValue(b, sortKey);

                              if (typeof aValue === 'string' && typeof bValue === 'string') {
                                return sortOrder === 'asc'
                                  ? aValue.localeCompare(bValue)
                                  : bValue.localeCompare(aValue);
                              }

                              return sortOrder === 'asc'
                                ? (aValue as number) - (bValue as number)
                                : (bValue as number) - (aValue as number);
                            })
                            .map((season) => (
                              <tr key={`${season.year}-${season.league}`} className="table-row">
                                <td>
                                  <span className="font-medium">{season.year}</span>
                                </td>
                                <td>
                                  <LeagueBadge league={season.league} />
                                </td>
                                <td>
                                  <span className="font-mono">{season.wins}-{season.losses}</span>
                                </td>
                                <td>
                                  <span className="font-mono">
                                    {((season.wins + season.losses) > 0 ?
                                      ((season.wins / (season.wins + season.losses)) * 100).toFixed(1) :
                                      '0.0')}%
                                  </span>
                                </td>
                                <td className="hidden sm:table-cell">
                                  <span className="font-mono">{season.pointsFor.toFixed(2)}</span>
                                </td>
                                <td className="hidden sm:table-cell">
                                  <span className="font-mono">{season.pointsAgainst.toFixed(2)}</span>
                                </td>
                                <td>
                                  <span className="font-mono">
                                    {isActiveYear(season.year) ? 'TBD' : (season.unionPowerRating ? season.unionPowerRating.toFixed(2) : '—')}
                                  </span>
                                </td>
                                <td>
                                  {isActiveYear(season.year) ? (
                                    <span className="text-sm text-gray-500 dark:text-gray-400 italic">TBD</span>
                                  ) : season.playoffFinish ? (
                                    <div className="flex items-center space-x-1">
                                      {season.playoffFinish === 1 && <Trophy className="h-4 w-4 text-yellow-600" />}
                                      {season.playoffFinish === 2 && <Medal className="h-4 w-4 text-gray-500" />}
                                      {season.playoffFinish === 3 && <Award className="h-4 w-4 text-amber-600" />}
                                      <span className="font-medium">
                                        {season.playoffFinish === 1 ? '1st' :
                                          season.playoffFinish === 2 ? '2nd' :
                                            season.playoffFinish === 3 ? '3rd' :
                                              `${season.playoffFinish}th`}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center space-x-1">
                                      {season.rank === 1 && <Trophy className="h-4 w-4 text-yellow-600" />}
                                      {season.rank === 2 && <Medal className="h-4 w-4 text-gray-500" />}
                                      {season.rank === 3 && <Award className="h-4 w-4 text-amber-600" />}
                                      <span className="font-medium">
                                        {season.rank === 1 ? '1st' :
                                          season.rank === 2 ? '2nd' :
                                            season.rank === 3 ? '3rd' :
                                              `${season.rank}th`}
                                      </span>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};