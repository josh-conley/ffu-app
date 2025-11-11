import { useMemo, useState } from 'react';
import { useAllStandings, useHeadToHeadMatchups } from '../hooks/useLeagues';
import { useUrlPlayerState } from '../hooks/useUrlPlayerState';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import { ErrorMessage } from '../components/Common/ErrorMessage';
import { TeamLogo } from '../components/Common/TeamLogo';
import { LeagueBadge } from '../components/League/LeagueBadge';
import { CompareMembers } from '../components/Members/CompareMembers';
import { PlayerSelector } from '../components/Members/PlayerSelector';
import { LeagueProgressionChart } from '../components/Members/LeagueProgressionChart';
import { getFFUIdBySleeperId, isActiveYear } from '../config/constants';
import type { LeagueTier, UserInfo } from '../types';
import { Trophy, Medal, Award, TrendingDown, ChevronDown, ChevronUp, Share2, Check } from 'lucide-react';

type SeasonSortKey = 'year' | 'league' | 'wins' | 'winPct' | 'pointsFor' | 'pointsAgainst' | 'placement' | 'upr';
type SortOrder = 'asc' | 'desc';

// Helper function to calculate playoff wins/losses based on placement
// Uses more realistic estimates based on common playoff bracket structures
const calculatePlayoffRecord = (placement: number): { wins: number; losses: number } => {
  // Based on typical 6-team playoff bracket:
  // - Top 2 seeds get byes to semifinals
  // - Seeds 3-6 play in quarterfinals 
  // - Championship and 3rd place games in final week

  switch (placement) {
    case 1: {
      // Champion - Analysis of typical paths:
      // High seed (1-2): Bye + Win semifinal + Win championship = 2 wins, 0 losses
      // Lower seed (3-6): Win quarterfinal + Win semifinal + Win championship = 3 wins, 0 losses
      // Average across all champions, most are higher seeds, so 2-2.5 wins is typical
      return { wins: 2, losses: 0 };
    }
    case 2: {
      // Runner-up - Made championship but lost
      // High seed path: Bye + Win semifinal + Lose championship = 1 win, 1 loss
      // Lower seed path: Win quarterfinal + Win semifinal + Lose championship = 2 wins, 1 loss
      // Most runner-ups are higher seeds, so average ~1.5 wins, 1 loss
      return { wins: 2, losses: 1 };
    }
    case 3: {
      // Third place - Won 3rd place game (if exists) or lost in semifinals
      // Typical path: Some playoff wins but lost semifinal, then won 3rd place game
      // Conservative estimate: 1 win (made it to 3rd somehow), 1-2 losses
      return { wins: 1, losses: 2 };
    }
    case 4: {
      // Fourth place - Lost 3rd place game or lost in semifinals
      // Typical path: Made semifinals but lost both semifinal and 3rd place game
      // Or lost in quarterfinals in some bracket structures
      return { wins: 1, losses: 2 };
    }
    case 5: {
      // Fifth place - Lost in quarterfinals typically
      // Some brackets have 5th place games, others don't
      // Most likely: Lost in first round of playoffs
      return { wins: 0, losses: 1 };
    }
    case 6: {
      // Sixth place - Also likely first round loser
      return { wins: 0, losses: 1 };
    }
    default: {
      // Shouldn't happen for playoff participants, but safety fallback
      return { wins: 0, losses: 0 };
    }
  }
};


// Utility function to extract past team names from season history
const getPastTeamNames = (standings: any[], currentTeamName: string, ffuUserId: string): string[] => {
  const teamNames = new Set<string>();

  standings.forEach(leagueData => {
    leagueData.standings.forEach((standing: any) => {
      // Match by FFU ID (primary) or fall back to legacy user ID
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
  userId: string; // Deprecated: use ffuUserId instead
  ffuUserId: string; // Primary identifier
  userInfo: UserInfo;
  totalWins: number;
  totalLosses: number;
  totalTies: number;
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
    ties?: number;
    pointsFor: number;
    pointsAgainst: number;
    rank: number;
    playoffFinish?: number;
    unionPowerRating?: number;
  }[];
}


export const Members = () => {
  const { data: standings, isLoading, error } = useAllStandings();
  const [shareSuccess, setShareSuccess] = useState(false);
  const [sortKey, setSortKey] = useState<SeasonSortKey>('year');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // URL-based state management
  const {
    selectedPlayerId,
    selectedPlayer2Id,
    isCompareMode,
    setSelectedPlayer,
    setSelectedPlayer2,
    setCompareMode
  } = useUrlPlayerState();

  const playerStats = useMemo(() => {
    console.log(standings)
    if (!standings.length) return [];

    const playerMap: Record<string, PlayerCareerStats> = {};

    // Process all standings data
    standings.forEach(leagueData => {
      leagueData.standings.forEach(standing => {
        // Use FFU ID as primary key, with robust fallback logic
        let playerId = standing.ffuUserId;

        // If no FFU ID, try to convert from legacy user ID
        if (!playerId || playerId === 'unknown') {
          playerId = getFFUIdBySleeperId(standing.userId) || standing.userId;
        }
        if (!playerMap[playerId]) {
          playerMap[playerId] = {
            userId: standing.userId, // Legacy ID
            ffuUserId: standing.ffuUserId || standing.userId, // Primary ID
            userInfo: standing.userInfo,
            totalWins: 0,
            totalLosses: 0,
            totalTies: 0,
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
        player.totalTies += standing.ties || 0;
        player.totalPointsFor += standing.pointsFor || 0;
        player.totalPointsAgainst += standing.pointsAgainst || 0;

        // Track career high and low games (only use actual scores, not undefined/null values)
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

        // Check for playoff appearance (rank 6 or better = playoff berth, exclude active seasons)
        // In FFU, top 6 teams make playoffs regardless of league size
        if (standing.rank <= 6 && !isActiveYear(leagueData.year)) {
          player.playoffAppearances++;

          // Use playoff results if available, otherwise use regular season rank
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
          ties: standing.ties,
          pointsFor: standing.pointsFor || 0,
          pointsAgainst: standing.pointsAgainst || 0,
          rank: standing.rank,
          playoffFinish: standing.rank <= 6 ? (playoffFinish?.placement || standing.rank) : undefined,
          unionPowerRating: standing.unionPowerRating
        });
      });
    });

    // Calculate past team names and other derived stats
    Object.values(playerMap).forEach(player => {
      // Extract past team names
      player.pastTeamNames = getPastTeamNames(standings, player.userInfo.teamName, player.ffuUserId);

      // Sort season history by year (newest first)
      player.seasonHistory.sort((a, b) => b.year.localeCompare(a.year));

      // Calculate win percentage
      const totalGames = player.totalWins + player.totalLosses + player.totalTies;
      player.winPercentage = totalGames > 0 ? ((player.totalWins + player.totalTies * 0.5) / totalGames) * 100 : 0;

      // Calculate average season rank (exclude active seasons)
      if (player.seasonHistory.length > 0) {
        const completedSeasons = player.seasonHistory.filter(season => !isActiveYear(season.year));
        if (completedSeasons.length > 0) {
          const totalRank = completedSeasons.reduce((sum, season) => sum + season.rank, 0);
          player.averageSeasonRank = totalRank / completedSeasons.length;
        }
      }

      // Calculate point differential
      player.pointDifferential = player.totalPointsFor - player.totalPointsAgainst;

      // Calculate average UPR (exclude active seasons)
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

  const selectedPlayer = playerStats.find(p => p.userId === selectedPlayerId);
  const selectedPlayer2 = playerStats.find(p => p.userId === selectedPlayer2Id);

  // Share functionality
  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

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
      case 'league':
        const leagueOrder: Record<string, number> = { 'PREMIER': 1, 'MASTERS': 2, 'NATIONAL': 3 };
        return leagueOrder[season.league] || 4;
      case 'wins':
        return season.wins;
      case 'winPct':
        return (season.wins + season.losses + (season.ties || 0)) > 0 ? ((season.wins + (season.ties || 0) * 0.5) / (season.wins + season.losses + (season.ties || 0))) : 0;
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

  // Check if we have something worth sharing
  const hasSelectionToShare = selectedPlayerId && (!isCompareMode || selectedPlayer2Id);

  // Fetch head-to-head data when in compare mode
  const { data: headToHeadData } = useHeadToHeadMatchups(
    isCompareMode ? selectedPlayerId : '',
    isCompareMode ? selectedPlayer2Id : ''
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Members</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">View career statistics for any FFU league member</p>
        </div>

        {/* Player Selection Loading */}
        <div className="card">
          <div className="space-y-2">
            <label className="block text-sm font-heading font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide">Select a Member</label>
            <div className="relative">
              <select
                disabled
                className="block w-full pl-4 pr-12 py-3 text-base font-medium bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 rounded appearance-none"
              >
                <option>Loading members...</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <ChevronDown className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="text-center py-12">
          <LoadingSpinner size="lg" />
          <div className="mt-4 text-gray-500 dark:text-gray-400">
            Loading player statistics...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorMessage error={error} />;
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {isCompareMode ? 'Compare Members' : 'Members'}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">View career statistics for any FFU league member</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCompareMode(!isCompareMode)}
            className={`px-3 py-1.5 text-sm rounded border transition-colors ${
              isCompareMode
                ? 'bg-ffu-red text-white border-ffu-red hover:bg-red-700'
                : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
            }`}
          >
            {isCompareMode ? 'Single View' : 'Compare'}
          </button>
        </div>
        {hasSelectionToShare && (
          <button
            onClick={handleShare}
            className="px-3 py-1.5 text-sm rounded border bg-blue-600 text-white border-blue-600 hover:bg-blue-700 flex items-center space-x-1.5"
          >
            {shareSuccess ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="h-3.5 w-3.5" />
                <span>Share</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Player Selection */}
      <PlayerSelector
        players={playerStats.map(player => ({
          sleeperId: player.userId,
          userInfo: player.userInfo,
          totalWins: player.totalWins,
          totalLosses: player.totalLosses,
          totalTies: player.totalTies,
          winPercentage: player.winPercentage,
          championships: player.firstPlaceFinishes
        }))}
        selectedPlayerId={selectedPlayerId}
        selectedPlayer2Id={selectedPlayer2Id}
        onSelectPlayer={setSelectedPlayer}
        onSelectPlayer2={setSelectedPlayer2}
        isCompareMode={isCompareMode}
      />

      {/* Compare Mode Display */}
      {isCompareMode ? (
        <CompareMembers
          selectedPlayer={selectedPlayer ? {
            ...selectedPlayer,
            championships: selectedPlayer.firstPlaceFinishes,
            playoffAppearances: selectedPlayer.playoffAppearances
          } : null}
          selectedPlayer2={selectedPlayer2 ? {
            ...selectedPlayer2,
            championships: selectedPlayer2.firstPlaceFinishes,
            playoffAppearances: selectedPlayer2.playoffAppearances
          } : null}
          headToHeadData={headToHeadData}
        />
      ) : (
        /* Single Player View */
        selectedPlayer && (
        <div className="space-y-6">
          {/* Player Overview Card */}
          <div className="card">
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
                    {selectedPlayer.totalWins}-{selectedPlayer.totalLosses}{selectedPlayer.totalTies > 0 ? `-${selectedPlayer.totalTies}` : ''}
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
                    {((selectedPlayer.totalWins + selectedPlayer.totalLosses + selectedPlayer.totalTies) > 0 ?
                      (selectedPlayer.totalPointsFor / (selectedPlayer.totalWins + selectedPlayer.totalLosses + selectedPlayer.totalTies)).toFixed(1) :
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

              {/* All Other Stats */}
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
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Season History</h3>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full table">
                <thead className="table-header">
                  <tr>
                    <th
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
                      onClick={() => handleSort('year')}
                    >
                      <div className="flex items-center justify-center text-xs">
                        Year
                        <div className="flex flex-col ml-1">
                          <ChevronUp className={`h-3 w-3 ${sortKey === 'year' && sortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                          <ChevronDown className={`h-3 w-3 -mt-1 ${sortKey === 'year' && sortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                        </div>
                      </div>
                    </th>
                    <th
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
                      onClick={() => handleSort('league')}
                    >
                      <div className="flex items-center justify-center text-xs">
                        League
                        <div className="flex flex-col ml-1">
                          <ChevronUp className={`h-3 w-3 ${sortKey === 'league' && sortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                          <ChevronDown className={`h-3 w-3 -mt-1 ${sortKey === 'league' && sortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                        </div>
                      </div>
                    </th>
                    <th
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
                      onClick={() => handleSort('wins')}
                    >
                      <div className="flex items-center justify-center text-xs">
                        Record
                        <div className="flex flex-col ml-1">
                          <ChevronUp className={`h-3 w-3 ${sortKey === 'wins' && sortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                          <ChevronDown className={`h-3 w-3 -mt-1 ${sortKey === 'wins' && sortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                        </div>
                      </div>
                    </th>
                    <th
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
                      onClick={() => handleSort('winPct')}
                    >
                      <div className="flex items-center justify-center text-xs">
                        Win %
                        <div className="flex flex-col ml-1">
                          <ChevronUp className={`h-3 w-3 ${sortKey === 'winPct' && sortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                          <ChevronDown className={`h-3 w-3 -mt-1 ${sortKey === 'winPct' && sortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                        </div>
                      </div>
                    </th>
                    <th
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none hidden sm:table-cell"
                      onClick={() => handleSort('pointsFor')}
                    >
                      <div className="flex items-center justify-center text-xs">
                        Points For
                        <div className="flex flex-col ml-1">
                          <ChevronUp className={`h-3 w-3 ${sortKey === 'pointsFor' && sortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                          <ChevronDown className={`h-3 w-3 -mt-1 ${sortKey === 'pointsFor' && sortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                        </div>
                      </div>
                    </th>
                    <th
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none hidden sm:table-cell"
                      onClick={() => handleSort('pointsAgainst')}
                    >
                      <div className="flex items-center justify-center text-xs">
                        Points Against
                        <div className="flex flex-col ml-1">
                          <ChevronUp className={`h-3 w-3 ${sortKey === 'pointsAgainst' && sortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                          <ChevronDown className={`h-3 w-3 -mt-1 ${sortKey === 'pointsAgainst' && sortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                        </div>
                      </div>
                    </th>
                    <th
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
                      onClick={() => handleSort('upr')}
                    >
                      <div className="flex items-center justify-center text-xs">
                        UPR
                        <div className="flex flex-col ml-1">
                          <ChevronUp className={`h-3 w-3 ${sortKey === 'upr' && sortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                          <ChevronDown className={`h-3 w-3 -mt-1 ${sortKey === 'upr' && sortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                        </div>
                      </div>
                    </th>
                    <th
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
                      onClick={() => handleSort('placement')}
                    >
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
                          <span className="font-mono">{season.wins}-{season.losses}{season.ties ? `-${season.ties}` : ''}</span>
                        </td>
                        <td>
                          <span className="font-mono">
                            {((season.wins + season.losses + (season.ties || 0)) > 0 ?
                              (((season.wins + (season.ties || 0) * 0.5) / (season.wins + season.losses + (season.ties || 0))) * 100).toFixed(1) :
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
                            {season.unionPowerRating ? season.unionPowerRating.toFixed(2) : (isActiveYear(season.year) ? 'TBD' : '—')}
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
        )
      )}

      {/* Empty States */}
      {!isCompareMode && !selectedPlayer && (
        <div className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400">
            Select a member above to view their career statistics
          </div>
        </div>
      )}

      </div>
    </div>
  );
}