import { useMemo, useState } from 'react';
import { useAllStandings, useHeadToHeadMatchups } from '../hooks/useLeagues';
import { useUrlPlayerState } from '../hooks/useUrlPlayerState';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import { ErrorMessage } from '../components/Common/ErrorMessage';
import { TeamLogo } from '../components/Common/TeamLogo';
import { LeagueBadge } from '../components/League/LeagueBadge';
import { getFFUIdBySleeperId } from '../config/constants';
import type { LeagueTier, UserInfo } from '../types';
import { Trophy, Medal, Award, TrendingDown, Calendar, Target, BarChart3, ChevronDown, ChevronUp, Percent, TrendingUp, Share2, Check, Zap } from 'lucide-react';

type SeasonSortKey = 'year' | 'league' | 'wins' | 'winPct' | 'pointsFor' | 'pointsAgainst' | 'placement';
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

interface PlayerCareerStats {
  userId: string; // Deprecated: use ffuUserId instead
  ffuUserId: string; // Primary identifier
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
  seasonHistory: {
    year: string;
    league: LeagueTier;
    wins: number;
    losses: number;
    pointsFor: number;
    pointsAgainst: number;
    rank: number;
    playoffFinish?: number;
  }[];
}


export const PlayerStats = () => {
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
            seasonHistory: []
          };
        }

        const player = playerMap[playerId];
        
        // Accumulate totals
        player.totalWins += standing.wins;
        player.totalLosses += standing.losses;
        player.totalPointsFor += standing.pointsFor || 0;
        player.totalPointsAgainst += standing.pointsAgainst || 0;

        // Count finishes
        if (standing.rank === 1) player.firstPlaceFinishes++;
        else if (standing.rank === 2) player.secondPlaceFinishes++;
        else if (standing.rank === 3) player.thirdPlaceFinishes++;
        else if (standing.rank === leagueData.standings.length) player.lastPlaceFinishes++;

        // Check for playoff appearance (rank 6 or better = playoff berth)
        // In FFU, top 6 teams make playoffs regardless of league size
        if (standing.rank <= 6) {
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
          pointsFor: standing.pointsFor || 0,
          pointsAgainst: standing.pointsAgainst || 0,
          rank: standing.rank,
          playoffFinish: standing.rank <= 6 ? (playoffFinish?.placement || standing.rank) : undefined
        });
      });
    });

    // Sort season history by year (newest first) and calculate derived stats
    Object.values(playerMap).forEach(player => {
      player.seasonHistory.sort((a, b) => b.year.localeCompare(a.year));
      
      // Calculate win percentage
      const totalGames = player.totalWins + player.totalLosses;
      player.winPercentage = totalGames > 0 ? (player.totalWins / totalGames) * 100 : 0;
      
      // Calculate average season rank
      if (player.seasonHistory.length > 0) {
        const totalRank = player.seasonHistory.reduce((sum, season) => sum + season.rank, 0);
        player.averageSeasonRank = totalRank / player.seasonHistory.length;
      }
      
      // Calculate point differential
      player.pointDifferential = player.totalPointsFor - player.totalPointsAgainst;
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
        return (season.wins + season.losses) > 0 ? (season.wins / (season.wins + season.losses)) : 0;
      case 'pointsFor':
        return season.pointsFor;
      case 'pointsAgainst':
        return season.pointsAgainst;
      case 'placement':
        return season.playoffFinish || season.rank;
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">League Members</h1>
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {isCompareMode ? 'Compare Members' : 'League Members'}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {isCompareMode 
              ? 'Compare career statistics and head-to-head record between two FFU league members'
              : 'View career statistics for any FFU league member'
            }
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          {hasSelectionToShare && (
            <button
              onClick={handleShare}
              className="px-4 py-2 rounded-lg font-medium transition-colors duration-200 bg-green-600 text-white hover:bg-green-700 flex items-center space-x-2"
            >
              {shareSuccess ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4" />
                  <span>Share</span>
                </>
              )}
            </button>
          )}
          <button
            onClick={() => {
              setCompareMode(!isCompareMode);
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
              isCompareMode
                ? 'bg-ffu-red text-white hover:bg-red-700'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {isCompareMode ? 'Exit Compare' : 'Compare Mode'}
          </button>
        </div>
      </div>

      {/* Player Selection */}
      <div className="card">
        {!isCompareMode ? (
          <div className="space-y-2">
            <label className="block text-sm font-heading font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide">Select a Member</label>
            <div className="relative">
              <select
                value={selectedPlayerId}
                onChange={(e) => setSelectedPlayer(e.target.value)}
                className="block w-full pl-4 pr-12 py-3 text-base font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-ffu-red focus:border-ffu-red rounded hover:border-gray-400 dark:hover:border-gray-500 transition-colors duration-200 appearance-none"
              >
                <option value="">Choose a member...</option>
                {playerStats.map(player => (
                  <option key={player.userId} value={player.userId}>
                    {player.userInfo.teamName}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <ChevronDown className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-heading font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide">Player 1</label>
              <div className="relative">
                <select
                  value={selectedPlayerId}
                  onChange={(e) => setSelectedPlayer(e.target.value)}
                  className="block w-full pl-4 pr-12 py-3 text-base font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-ffu-red focus:border-ffu-red rounded hover:border-gray-400 dark:hover:border-gray-500 transition-colors duration-200 appearance-none"
                >
                  <option value="">Choose first player...</option>
                  {playerStats.map(player => (
                    <option key={player.userId} value={player.userId} disabled={player.userId === selectedPlayer2Id}>
                      {player.userInfo.teamName}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-heading font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide">Player 2</label>
              <div className="relative">
                <select
                  value={selectedPlayer2Id}
                  onChange={(e) => setSelectedPlayer2(e.target.value)}
                  className="block w-full pl-4 pr-12 py-3 text-base font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-ffu-red focus:border-ffu-red rounded hover:border-gray-400 dark:hover:border-gray-500 transition-colors duration-200 appearance-none"
                >
                  <option value="">Choose second player...</option>
                  {playerStats.map(player => (
                    <option key={player.userId} value={player.userId} disabled={player.userId === selectedPlayerId}>
                      {player.userInfo.teamName}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Player Stats Display */}
      {!isCompareMode && selectedPlayer && (
        <div className="space-y-6">
          {/* Player Header */}
          <div className="card">
            <div className="flex items-center space-x-4">
              <TeamLogo 
                teamName={selectedPlayer.userInfo.teamName}
                abbreviation={selectedPlayer.userInfo.abbreviation}
                size="lg"
                className="w-16 h-16 text-xl"
              />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{selectedPlayer.userInfo.teamName}</h2>
                <p className="text-gray-600 dark:text-gray-400">{selectedPlayer.userInfo.abbreviation}</p>
              </div>
            </div>
          </div>

          {/* Career Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="card text-center py-3">
              <BarChart3 className="h-6 w-6 text-green-600 mx-auto mb-1" />
              <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{selectedPlayer.totalWins}-{selectedPlayer.totalLosses}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Record</div>
            </div>
            <div className="card text-center py-3">
              <Zap className="h-6 w-6 text-indigo-600 mx-auto mb-1" />
              <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{selectedPlayer.playoffWins}-{selectedPlayer.playoffLosses}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Playoff Record</div>
            </div>
            <div className="card text-center py-3">
              <Percent className="h-6 w-6 text-blue-600 mx-auto mb-1" />
              <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{selectedPlayer.winPercentage.toFixed(1)}%</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Win Rate</div>
            </div>
            <div className="card text-center py-3">
              <Target className="h-6 w-6 text-purple-600 mx-auto mb-1" />
              <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {((selectedPlayer.totalWins + selectedPlayer.totalLosses) > 0 ? 
                  (selectedPlayer.totalPointsFor / (selectedPlayer.totalWins + selectedPlayer.totalLosses)).toFixed(1) : 
                  '0.0')}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">PPG</div>
            </div>
            <div className="card text-center py-3">
              <TrendingUp className="h-6 w-6 text-orange-600 mx-auto mb-1" />
              <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {selectedPlayer.pointDifferential > 0 ? '+' : ''}{selectedPlayer.pointDifferential.toFixed(1)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Point Diff</div>
            </div>
            <div className="card text-center py-3">
              <Award className="h-6 w-6 text-amber-600 mx-auto mb-1" />
              <div className="text-lg font-bold text-gray-900 dark:text-gray-100">#{selectedPlayer.averageSeasonRank.toFixed(1)}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Avg Rank</div>
            </div>
            <div className="card text-center py-3">
              <Calendar className="h-6 w-6 text-gray-600 mx-auto mb-1" />
              <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{selectedPlayer.seasonHistory.length}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Seasons</div>
            </div>
          </div>

          {/* Achievements */}
          <div className="card">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">Achievements</h3>
            <div className="grid grid-cols-5 gap-3">
              <div className="text-center">
                <Trophy className="h-5 w-5 text-yellow-600 mx-auto mb-1" />
                <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{selectedPlayer.firstPlaceFinishes}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">1st</div>
              </div>
              <div className="text-center">
                <Medal className="h-5 w-5 text-gray-500 mx-auto mb-1" />
                <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{selectedPlayer.secondPlaceFinishes}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">2nd</div>
              </div>
              <div className="text-center">
                <Award className="h-5 w-5 text-amber-600 mx-auto mb-1" />
                <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{selectedPlayer.thirdPlaceFinishes}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">3rd</div>
              </div>
              <div className="text-center">
                <TrendingDown className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{selectedPlayer.lastPlaceFinishes}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Last</div>
              </div>
              <div className="text-center">
                <Calendar className="h-5 w-5 text-green-600 mx-auto mb-1" />
                <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{selectedPlayer.playoffAppearances}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Playoffs</div>
              </div>
            </div>
          </div>

          {/* Season History */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Season History</h3>
            <div className="table-container">
              <table className="table">
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
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
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
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
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
                      onClick={() => handleSort('placement')}
                    >
                      <div className="flex items-center justify-center text-xs">
                        Final Placement
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
                      <td>
                        <span className="font-mono">{season.pointsFor.toFixed(2)}</span>
                      </td>
                      <td>
                        <span className="font-mono">{season.pointsAgainst.toFixed(2)}</span>
                      </td>
                      <td>
                        {season.playoffFinish ? (
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
                            <span className="font-medium">#{season.rank}</span>
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
      )}

      {/* Compare Mode Display */}
      {isCompareMode && selectedPlayer && selectedPlayer2 && (
        <div className="space-y-6">
          {/* Player Headers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card">
              <div className="flex items-center space-x-4">
                <TeamLogo 
                  teamName={selectedPlayer.userInfo.teamName}
                  abbreviation={selectedPlayer.userInfo.abbreviation}
                  size="lg"
                  className="w-16 h-16 text-xl"
                />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{selectedPlayer.userInfo.teamName}</h2>
                  <p className="text-gray-600 dark:text-gray-400">{selectedPlayer.userInfo.abbreviation}</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center space-x-4">
                <TeamLogo 
                  teamName={selectedPlayer2.userInfo.teamName}
                  abbreviation={selectedPlayer2.userInfo.abbreviation}
                  size="lg"
                  className="w-16 h-16 text-xl"
                />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{selectedPlayer2.userInfo.teamName}</h2>
                  <p className="text-gray-600 dark:text-gray-400">{selectedPlayer2.userInfo.abbreviation}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Head-to-Head Summary */}
          {headToHeadData && headToHeadData.totalGames > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Head-to-Head Record</h3>
              <div className="flex items-center justify-center space-x-8 mb-6">
                <div className="text-center">
                  <div className={`text-4xl font-bold ${headToHeadData.player1Wins > headToHeadData.player2Wins ? 'text-green-600' : headToHeadData.player1Wins < headToHeadData.player2Wins ? 'text-red-600' : 'text-gray-900 dark:text-gray-100'}`}>
                    {headToHeadData.player1Wins}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                    {selectedPlayer.userInfo.abbreviation}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-400 dark:text-gray-500">-</div>
                </div>
                <div className="text-center">
                  <div className={`text-4xl font-bold ${headToHeadData.player2Wins > headToHeadData.player1Wins ? 'text-green-600' : headToHeadData.player2Wins < headToHeadData.player1Wins ? 'text-red-600' : 'text-gray-900 dark:text-gray-100'}`}>
                    {headToHeadData.player2Wins}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                    {selectedPlayer2.userInfo.abbreviation}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-center">
                  <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{headToHeadData.player1AvgScore.toFixed(1)}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Avg Score vs {selectedPlayer2.userInfo.abbreviation}</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{headToHeadData.player2AvgScore.toFixed(1)}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Avg Score vs {selectedPlayer.userInfo.abbreviation}</div>
                </div>
              </div>
            </div>
          )}

          {/* Comparison Stats */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Career Comparison</h3>
            <div className="space-y-4">
              {/* Win-Loss Record */}
              <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="text-right">
                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {selectedPlayer.totalWins}-{selectedPlayer.totalLosses}
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Record</span>
                </div>
                <div className="text-left">
                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {selectedPlayer2.totalWins}-{selectedPlayer2.totalLosses}
                  </span>
                </div>
              </div>

              {/* Playoff Record */}
              <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="text-right">
                  <span className={`text-lg font-bold ${
                    selectedPlayer.playoffWins > selectedPlayer2.playoffWins ||
                    (selectedPlayer.playoffWins === selectedPlayer2.playoffWins && selectedPlayer.playoffLosses < selectedPlayer2.playoffLosses)
                    ? 'text-green-600' : 'text-gray-900 dark:text-gray-100'
                  }`}>
                    {selectedPlayer.playoffWins}-{selectedPlayer.playoffLosses}
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Playoff Record</span>
                </div>
                <div className="text-left">
                  <span className={`text-lg font-bold ${
                    selectedPlayer2.playoffWins > selectedPlayer.playoffWins ||
                    (selectedPlayer2.playoffWins === selectedPlayer.playoffWins && selectedPlayer2.playoffLosses < selectedPlayer.playoffLosses)
                    ? 'text-green-600' : 'text-gray-900 dark:text-gray-100'
                  }`}>
                    {selectedPlayer2.playoffWins}-{selectedPlayer2.playoffLosses}
                  </span>
                </div>
              </div>

              {/* Win Percentage */}
              <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="text-right">
                  <span className={`text-lg font-bold ${selectedPlayer.winPercentage > selectedPlayer2.winPercentage ? 'text-green-600' : 'text-gray-900 dark:text-gray-100'}`}>
                    {selectedPlayer.winPercentage.toFixed(1)}%
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Win Rate</span>
                </div>
                <div className="text-left">
                  <span className={`text-lg font-bold ${selectedPlayer2.winPercentage > selectedPlayer.winPercentage ? 'text-green-600' : 'text-gray-900 dark:text-gray-100'}`}>
                    {selectedPlayer2.winPercentage.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Points Per Game */}
              <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="text-right">
                  <span className={`text-lg font-bold ${
                    ((selectedPlayer.totalWins + selectedPlayer.totalLosses) > 0 ? (selectedPlayer.totalPointsFor / (selectedPlayer.totalWins + selectedPlayer.totalLosses)) : 0) >
                    ((selectedPlayer2.totalWins + selectedPlayer2.totalLosses) > 0 ? (selectedPlayer2.totalPointsFor / (selectedPlayer2.totalWins + selectedPlayer2.totalLosses)) : 0)
                    ? 'text-green-600' : 'text-gray-900 dark:text-gray-100'
                  }`}>
                    {((selectedPlayer.totalWins + selectedPlayer.totalLosses) > 0 ? 
                      (selectedPlayer.totalPointsFor / (selectedPlayer.totalWins + selectedPlayer.totalLosses)).toFixed(1) : 
                      '0.0')}
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">PPG</span>
                </div>
                <div className="text-left">
                  <span className={`text-lg font-bold ${
                    ((selectedPlayer2.totalWins + selectedPlayer2.totalLosses) > 0 ? (selectedPlayer2.totalPointsFor / (selectedPlayer2.totalWins + selectedPlayer2.totalLosses)) : 0) >
                    ((selectedPlayer.totalWins + selectedPlayer.totalLosses) > 0 ? (selectedPlayer.totalPointsFor / (selectedPlayer.totalWins + selectedPlayer.totalLosses)) : 0)
                    ? 'text-green-600' : 'text-gray-900 dark:text-gray-100'
                  }`}>
                    {((selectedPlayer2.totalWins + selectedPlayer2.totalLosses) > 0 ? 
                      (selectedPlayer2.totalPointsFor / (selectedPlayer2.totalWins + selectedPlayer2.totalLosses)).toFixed(1) : 
                      '0.0')}
                  </span>
                </div>
              </div>

              {/* Point Differential */}
              <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="text-right">
                  <span className={`text-lg font-bold ${selectedPlayer.pointDifferential > selectedPlayer2.pointDifferential ? 'text-green-600' : 'text-gray-900 dark:text-gray-100'}`}>
                    {selectedPlayer.pointDifferential > 0 ? '+' : ''}{selectedPlayer.pointDifferential.toFixed(1)}
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Point Diff</span>
                </div>
                <div className="text-left">
                  <span className={`text-lg font-bold ${selectedPlayer2.pointDifferential > selectedPlayer.pointDifferential ? 'text-green-600' : 'text-gray-900 dark:text-gray-100'}`}>
                    {selectedPlayer2.pointDifferential > 0 ? '+' : ''}{selectedPlayer2.pointDifferential.toFixed(1)}
                  </span>
                </div>
              </div>

              {/* Average Rank */}
              <div className="grid grid-cols-3 gap-4 py-3">
                <div className="text-right">
                  <span className={`text-lg font-bold ${selectedPlayer.averageSeasonRank < selectedPlayer2.averageSeasonRank ? 'text-green-600' : 'text-gray-900 dark:text-gray-100'}`}>
                    #{selectedPlayer.averageSeasonRank.toFixed(1)}
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Rank</span>
                </div>
                <div className="text-left">
                  <span className={`text-lg font-bold ${selectedPlayer2.averageSeasonRank < selectedPlayer.averageSeasonRank ? 'text-green-600' : 'text-gray-900 dark:text-gray-100'}`}>
                    #{selectedPlayer2.averageSeasonRank.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Head-to-Head Matchup History */}
          {headToHeadData && headToHeadData.matchups.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Matchup History</h3>
              <div className="space-y-3">
                {headToHeadData.matchups.map((matchup, index) => (
                  <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center space-x-3">
                        <LeagueBadge league={matchup.league} />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {matchup.year} • Week {matchup.week}
                        </span>
                        {matchup.placementType && (
                          <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 px-2 py-1 rounded">
                            {matchup.placementType}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between sm:justify-end space-x-4">
                        <div className="flex items-center space-x-2 min-w-0">
                          <TeamLogo
                            teamName={matchup.winnerInfo?.teamName || 'Unknown Team'}
                            abbreviation={matchup.winnerInfo?.abbreviation || 'UNK'}
                            size="sm"
                          />
                          <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {matchup.winnerInfo?.abbreviation || 'UNK'}
                          </span>
                        </div>
                        
                        <div className="text-center flex-shrink-0">
                          <div className="font-bold text-base sm:text-lg">
                            <span className="text-green-600">{matchup.winnerScore.toFixed(1)}</span>
                            <span className="text-gray-500 dark:text-gray-400 mx-1 sm:mx-2">-</span>
                            <span className="text-red-600">{matchup.loserScore.toFixed(1)}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 min-w-0">
                          <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {matchup.loserInfo?.abbreviation || 'UNK'}
                          </span>
                          <TeamLogo
                            teamName={matchup.loserInfo?.teamName || 'Unknown Team'}
                            abbreviation={matchup.loserInfo?.abbreviation || 'UNK'}
                            size="sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {headToHeadData && headToHeadData.totalGames === 0 && (
            <div className="card">
              <div className="text-center py-8">
                <div className="text-gray-500 dark:text-gray-400">
                  These players have never faced each other in league play.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty States */}
      {!isCompareMode && !selectedPlayer && (
        <div className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400">
            Select a member above to view their career statistics
          </div>
        </div>
      )}
      
      {isCompareMode && (!selectedPlayer || !selectedPlayer2) && (
        <div className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400">
            Select two members above to compare their career statistics
          </div>
        </div>
      )}

    </div>
  );
};