import { useState } from 'react';
import { TeamLogo } from '../Common/TeamLogo';
import { Trophy, Medal, Award, TrendingDown, Calendar, Target, BarChart3, ChevronDown, ChevronUp, Percent, TrendingUp, Zap } from 'lucide-react';

interface PlayerCareerStats {
  userId: string; // Deprecated: use ffuUserId instead
  ffuUserId: string; // Primary identifier
  userInfo: {
    teamName: string;
    abbreviation: string;
  };
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
  seasonHistory: Array<{
    year: string;
    league: string;
    wins: number;
    losses: number;
    pointsFor: number;
    pointsAgainst: number;
    rank: number;
    playoffFinish?: number;
  }>;
}

type SortKey = 'teamName' | 'record' | 'playoffRecord' | 'winPercentage' | 'ppg' | 'pointDifferential' | 'averageRank' | 'seasons' | 'firstPlace' | 'playoffAppearances';
type SortOrder = 'asc' | 'desc';

interface AllMembersStatsTableProps {
  players: PlayerCareerStats[];
  onClose: () => void;
}

export const AllMembersStatsTable = ({ players, onClose }: AllMembersStatsTableProps) => {
  const [sortKey, setSortKey] = useState<SortKey>('winPercentage');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const getSortValue = (player: PlayerCareerStats, key: SortKey): number | string => {
    switch (key) {
      case 'teamName':
        return player.userInfo.teamName;
      case 'record':
        return player.totalWins;
      case 'playoffRecord':
        return player.playoffWins;
      case 'winPercentage':
        return player.winPercentage;
      case 'ppg':
        const totalGames = player.totalWins + player.totalLosses;
        return totalGames > 0 ? player.totalPointsFor / totalGames : 0;
      case 'pointDifferential':
        return player.pointDifferential;
      case 'averageRank':
        return -player.averageSeasonRank; // Negative so lower ranks (better) sort first when desc
      case 'seasons':
        return player.seasonHistory.length;
      case 'firstPlace':
        return player.firstPlaceFinishes;
      case 'playoffAppearances':
        return player.playoffAppearances;
      default:
        return 0;
    }
  };

  const sortedPlayers = [...players].sort((a, b) => {
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
  });

  const SortHeader = ({ sortKey: key, children }: { sortKey: SortKey; children: React.ReactNode }) => (
    <th 
      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none text-center"
      onClick={() => handleSort(key)}
    >
      <div className="flex items-center justify-center text-xs">
        {children}
        <div className="flex flex-col ml-1">
          <ChevronUp className={`h-3 w-3 ${sortKey === key && sortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
          <ChevronDown className={`h-3 w-3 -mt-1 ${sortKey === key && sortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
        </div>
      </div>
    </th>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">All Members Career Stats</h2>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Cumulative career statistics for all FFU league members. Click column headers to sort.
          </p>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-6">
          <div className="table-container">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <SortHeader sortKey="teamName">Team</SortHeader>
                  <SortHeader sortKey="record">Record</SortHeader>
                  <SortHeader sortKey="playoffRecord">Playoff Record</SortHeader>
                  <SortHeader sortKey="winPercentage">Win Rate</SortHeader>
                  <SortHeader sortKey="ppg">PPG</SortHeader>
                  <SortHeader sortKey="pointDifferential">Point Diff</SortHeader>
                  <SortHeader sortKey="averageRank">Avg Rank</SortHeader>
                  <SortHeader sortKey="seasons">Seasons</SortHeader>
                  <SortHeader sortKey="firstPlace">1st Place</SortHeader>
                  <th className="text-center text-xs">2nd Place</th>
                  <th className="text-center text-xs">3rd Place</th>
                  <th className="text-center text-xs">Last Place</th>
                  <SortHeader sortKey="playoffAppearances">Playoffs</SortHeader>
                </tr>
              </thead>
              <tbody>
                {sortedPlayers.map((player) => {
                  const totalGames = player.totalWins + player.totalLosses;
                  const ppg = totalGames > 0 ? player.totalPointsFor / totalGames : 0;
                  
                  return (
                    <tr key={player.ffuUserId || player.userId} className="table-row">
                      <td>
                        <div className="flex items-center space-x-3">
                          <TeamLogo 
                            teamName={player.userInfo.teamName}
                            abbreviation={player.userInfo.abbreviation}
                            size="sm"
                          />
                          <div>
                            <div className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                              {player.userInfo.teamName}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {player.userInfo.abbreviation}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <BarChart3 className="h-4 w-4 text-green-600" />
                          <span className="font-mono font-bold text-gray-900 dark:text-gray-100">
                            {player.totalWins}-{player.totalLosses}
                          </span>
                        </div>
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <Zap className="h-4 w-4 text-indigo-600" />
                          <span className="font-mono font-bold text-gray-900 dark:text-gray-100">
                            {player.playoffWins}-{player.playoffLosses}
                          </span>
                        </div>
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <Percent className="h-4 w-4 text-blue-600" />
                          <span className="font-mono font-bold text-gray-900 dark:text-gray-100">
                            {player.winPercentage.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <Target className="h-4 w-4 text-purple-600" />
                          <span className="font-mono font-bold text-gray-900 dark:text-gray-100">
                            {ppg.toFixed(1)}
                          </span>
                        </div>
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <TrendingUp className="h-4 w-4 text-orange-600" />
                          <span className={`font-mono font-bold ${
                            player.pointDifferential > 0 
                              ? 'text-green-600' 
                              : player.pointDifferential < 0 
                                ? 'text-red-600' 
                                : 'text-gray-900 dark:text-gray-100'
                          }`}>
                            {player.pointDifferential > 0 ? '+' : ''}{player.pointDifferential.toFixed(1)}
                          </span>
                        </div>
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <Award className="h-4 w-4 text-amber-600" />
                          <span className="font-mono font-bold text-gray-900 dark:text-gray-100">
                            #{player.averageSeasonRank.toFixed(1)}
                          </span>
                        </div>
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <Calendar className="h-4 w-4 text-gray-600" />
                          <span className="font-bold text-gray-900 dark:text-gray-100">
                            {player.seasonHistory.length}
                          </span>
                        </div>
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <Trophy className="h-4 w-4 text-yellow-600" />
                          <span className="font-bold text-gray-900 dark:text-gray-100">
                            {player.firstPlaceFinishes}
                          </span>
                        </div>
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <Medal className="h-4 w-4 text-gray-500" />
                          <span className="font-bold text-gray-900 dark:text-gray-100">
                            {player.secondPlaceFinishes}
                          </span>
                        </div>
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <Award className="h-4 w-4 text-amber-600" />
                          <span className="font-bold text-gray-900 dark:text-gray-100">
                            {player.thirdPlaceFinishes}
                          </span>
                        </div>
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <TrendingDown className="h-4 w-4 text-gray-400" />
                          <span className="font-bold text-gray-900 dark:text-gray-100">
                            {player.lastPlaceFinishes}
                          </span>
                        </div>
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <Calendar className="h-4 w-4 text-green-600" />
                          <span className="font-bold text-gray-900 dark:text-gray-100">
                            {player.playoffAppearances}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};