import { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { SleeperService } from '../../services/sleeper.service';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import { TeamLogo } from './TeamLogo';
import { getUserInfoBySleeperId } from '../../config/constants';
import { shouldShowMatchupColors } from '../../utils/nfl-schedule';
import type { SleeperRoster, SleeperUser, SleeperPlayer } from '../../types';

interface RosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  leagueId: string;
  winnerUserId: string;
  loserUserId: string;
  week: number;
  year: string;
  winnerTeamName: string;
  loserTeamName: string;
  winnerAbbreviation: string;
  loserAbbreviation: string;
}

interface TeamRosterData {
  roster: SleeperRoster;
  user: SleeperUser;
  starters: string[];
  bench: string[];
  matchupData: any;
  totalPoints: number;
}

interface MatchupRosterData {
  winnerData: TeamRosterData;
  loserData: TeamRosterData;
  players: Record<string, SleeperPlayer>;
}

export const RosterModal = ({ isOpen, onClose, leagueId, winnerUserId, loserUserId, week, year, winnerTeamName, loserTeamName, winnerAbbreviation, loserAbbreviation }: RosterModalProps) => {
  const [matchupData, setMatchupData] = useState<MatchupRosterData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sleeperService = useMemo(() => new SleeperService(), []);
  const baseUrl = import.meta.env.MODE === 'production' ? '/ffu-app' : '';

  // Check if matchup is complete (both teams have points > 0)
  const isMatchupComplete = useMemo(() => {
    if (!matchupData) return false;
    return matchupData.winnerData.totalPoints > 0 && matchupData.loserData.totalPoints > 0;
  }, [matchupData]);

  // Check if we should show winner/loser color coding based on NFL schedule
  const shouldShowColors = useMemo(() => {
    // First check if matchup is complete (has scores)
    const hasScores = isMatchupComplete;
    // Then check if the NFL week has ended (Tuesday after)
    const weekEnded = shouldShowMatchupColors(year, week);
    // Show colors only if both conditions are met
    return hasScores && weekEnded;
  }, [isMatchupComplete, year, week]);

  useEffect(() => {
    if (!isOpen || !leagueId || !winnerUserId || !loserUserId) {
      return;
    }

    const fetchMatchupData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const [rosters, users, matchups, playersResponse] = await Promise.all([
          sleeperService.getLeagueRosters(leagueId),
          sleeperService.getLeagueUsers(leagueId),
          sleeperService.getMatchupsForWeek(leagueId, week),
          fetch(`${baseUrl}/data/players/nfl-players-compressed.json`).then(res => res.json())
        ]);

        const players = playersResponse.players || playersResponse;

        // Find rosters for both teams
        const winnerRoster = rosters.find(r => r.owner_id === winnerUserId);
        const loserRoster = rosters.find(r => r.owner_id === loserUserId);
        
        if (!winnerRoster || !loserRoster) {
          throw new Error('Could not find rosters for both teams');
        }

        // Find users for both teams
        const winnerUser = users.find(u => u.user_id === winnerUserId);
        const loserUser = users.find(u => u.user_id === loserUserId);
        
        if (!winnerUser || !loserUser) {
          throw new Error('Could not find users for both teams');
        }

        // Find matchup data for both teams
        const winnerMatchup = matchups.find(m => m.roster_id === winnerRoster.roster_id);
        const loserMatchup = matchups.find(m => m.roster_id === loserRoster.roster_id);
        
        if (!winnerMatchup || !loserMatchup) {
          throw new Error('Could not find matchup data for both teams');
        }

        // Process winner data - use matchup data for both starters and players
        const winnerPlayerPoints = winnerMatchup.players_points || {};
        const winnerStarters = winnerMatchup.starters || Object.keys(winnerPlayerPoints);
        const winnerAllPlayers = winnerMatchup.players || [];
        const winnerBench = winnerAllPlayers.filter((playerId: string) => !winnerStarters.includes(playerId));

        // Process loser data - use matchup data for both starters and players  
        const loserPlayerPoints = loserMatchup.players_points || {};
        const loserStarters = loserMatchup.starters || Object.keys(loserPlayerPoints);
        const loserAllPlayers = loserMatchup.players || [];
        const loserBench = loserAllPlayers.filter((playerId: string) => !loserStarters.includes(playerId));

        setMatchupData({
          winnerData: {
            roster: winnerRoster,
            user: winnerUser,
            starters: winnerStarters,
            bench: winnerBench,
            matchupData: winnerMatchup,
            totalPoints: winnerMatchup.points || 0
          },
          loserData: {
            roster: loserRoster,
            user: loserUser,
            starters: loserStarters,
            bench: loserBench,
            matchupData: loserMatchup,
            totalPoints: loserMatchup.points || 0
          },
          players
        });

      } catch (err) {
        console.error('Failed to fetch matchup roster data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load matchup roster data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMatchupData();
  }, [isOpen, leagueId, winnerUserId, loserUserId, week, sleeperService]);

  const getPlayerInfo = (playerId: string) => {
    const player = matchupData?.players[playerId];
    if (!player) {
      return {
        name: 'Unknown Player',
        position: 'N/A',
        team: 'N/A'
      };
    }

    return {
      name: `${player.first_name || ''} ${player.last_name || ''}`.trim() || 'Unknown Player',
      position: player.position || 'N/A',
      team: player.team || 'N/A'
    };
  };

  const getPlayerPoints = (playerId: string, teamData: TeamRosterData) => {
    if (!teamData.matchupData || !teamData.matchupData.players_points) return 0;
    return teamData.matchupData.players_points[playerId] || 0;
  };

  const getPositionBadgeClass = (position: string) => {
    switch (position) {
      case 'QB': return 'pos-qb-badge';
      case 'RB': return 'pos-rb-badge';
      case 'WR': return 'pos-wr-badge';
      case 'TE': return 'pos-te-badge';
      case 'DEF': return 'pos-def-badge';
      case 'FLEX': return 'pos-flex-badge';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
          onClick={onClose}
        />

        <div className="relative inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>

          <div className="bg-white dark:bg-gray-800 px-4 sm:px-6 pt-4 sm:pt-6 pb-4 sm:pb-6 max-h-[85vh] sm:max-h-[80vh] overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-12">
                <LoadingSpinner size="lg" />
                <div className="mt-4 text-gray-500 dark:text-gray-400">
                  Loading roster data...
                </div>
              </div>
            ) : error ? (
              <ErrorMessage error={error} />
            ) : !matchupData ? (
              <div className="text-center py-12">
                <div className="text-gray-500 dark:text-gray-400">
                  No matchup roster data available
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Matchup Header */}
                <div className="text-center">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 sm:mb-4">
                    Week {week} Matchup Rosters
                  </h2>
                </div>

                {/* Starting Lineups with Positions */}
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 sm:mb-4">
                      Starting Lineups
                    </h3>
                  </div>

                  {/* Team Headers */}
                  <div className="grid grid-cols-5 gap-2 sm:gap-4 mb-3 sm:mb-4 items-center">
                    <div className={`text-center p-2 sm:p-3 rounded-lg ${shouldShowColors ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-700/20'}`}>
                      <div className="flex flex-col items-center space-y-1 sm:space-y-2">
                        <TeamLogo
                          teamName={winnerTeamName}
                          abbreviation={getUserInfoBySleeperId(winnerUserId)?.abbreviation || winnerAbbreviation}
                          size="sm"
                        />
                        <h4 className={`font-bold text-xs sm:text-sm leading-tight ${shouldShowColors ? 'text-green-700 dark:text-green-300' : 'text-gray-700 dark:text-gray-300'}`}>
                          {winnerTeamName}
                        </h4>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                        {matchupData.winnerData.totalPoints.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-center p-1 sm:p-3">
                      <h4 className="font-bold text-gray-900 dark:text-gray-100 text-xs sm:text-base">Position</h4>
                    </div>
                    <div className="text-center">
                      <div className="text-lg sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                        {matchupData.loserData.totalPoints.toFixed(2)}
                      </div>
                    </div>
                    <div className={`text-center p-2 sm:p-3 rounded-lg ${shouldShowColors ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-700/20'}`}>
                      <div className="flex flex-col items-center space-y-1 sm:space-y-2">
                        <TeamLogo
                          teamName={loserTeamName}
                          abbreviation={getUserInfoBySleeperId(loserUserId)?.abbreviation || loserAbbreviation}
                          size="sm"
                        />
                        <h4 className={`font-bold text-xs sm:text-sm leading-tight ${shouldShowColors ? 'text-red-700 dark:text-red-300' : 'text-gray-700 dark:text-gray-300'}`}>
                          {loserTeamName}
                        </h4>
                      </div>
                    </div>
                  </div>

                  {/* Lineup Positions */}
                  <div className="space-y-2">
                    {['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'FLEX', 'DEF'].map((position, index) => {
                      const winnerPlayer = matchupData.winnerData.starters[index];
                      const loserPlayer = matchupData.loserData.starters[index];
                      
                      const winnerPlayerInfo = winnerPlayer ? getPlayerInfo(winnerPlayer) : null;
                      const loserPlayerInfo = loserPlayer ? getPlayerInfo(loserPlayer) : null;
                      
                      const winnerPoints = winnerPlayer ? getPlayerPoints(winnerPlayer, matchupData.winnerData) : 0;
                      const loserPoints = loserPlayer ? getPlayerPoints(loserPlayer, matchupData.loserData) : 0;

                      return (
                        <div key={index} className="grid grid-cols-5 gap-1 sm:gap-4 p-1 sm:p-2 bg-white dark:bg-gray-800 items-center">
                          {/* Winner Player */}
                          <div className="text-right">
                            {winnerPlayerInfo ? (
                              <div>
                                <div className="font-medium text-xs sm:text-sm text-gray-900 dark:text-gray-100 leading-tight">
                                  {winnerPlayerInfo.name}
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400 hidden sm:block">
                                  {winnerPlayerInfo.position} • {winnerPlayerInfo.team}
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Empty</div>
                            )}
                          </div>

                          {/* Winner Score */}
                          <div className="text-center">
                            <div className="text-sm sm:text-lg font-bold text-gray-900 dark:text-gray-100">
                              {winnerPoints.toFixed(1)}
                            </div>
                          </div>

                          {/* Position */}
                          <div className="text-center">
                            <div className={`font-bold px-2 sm:px-3 py-0.5 sm:py-1 rounded text-xs sm:text-sm ${getPositionBadgeClass(position)}`}>
                              {position}
                            </div>
                          </div>

                          {/* Loser Score */}
                          <div className="text-center">
                            <div className="text-sm sm:text-lg font-bold text-gray-900 dark:text-gray-100">
                              {loserPoints.toFixed(1)}
                            </div>
                          </div>

                          {/* Loser Player */}
                          <div className="text-left">
                            {loserPlayerInfo ? (
                              <div>
                                <div className="font-medium text-xs sm:text-sm text-gray-900 dark:text-gray-100 leading-tight">
                                  {loserPlayerInfo.name}
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400 hidden sm:block">
                                  {loserPlayerInfo.position} • {loserPlayerInfo.team}
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Empty</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bench Players */}
                <div className="space-y-3 sm:space-y-4">
                  <div className="text-center">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 sm:mb-4">
                      Bench Players
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:gap-6">
                    {/* Winner Bench */}
                    <div className="space-y-2 sm:space-y-4">
                      <div className={`text-center p-2 sm:p-3 rounded-lg ${shouldShowColors ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-700/20'}`}>
                        <h4 className={`font-bold text-sm sm:text-base ${shouldShowColors ? 'text-green-700 dark:text-green-300' : 'text-gray-700 dark:text-gray-300'}`}>
                          {winnerTeamName}
                        </h4>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                          {matchupData.winnerData.bench.length} players
                        </p>
                      </div>
                      <div className="space-y-1 sm:space-y-2">
                        {matchupData.winnerData.bench.map((playerId) => {
                          const playerInfo = getPlayerInfo(playerId);
                          const points = getPlayerPoints(playerId, matchupData.winnerData);
                          
                          return (
                            <div key={playerId} className="flex items-center justify-between p-2 sm:p-3">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-xs sm:text-sm text-gray-900 dark:text-gray-100 truncate">
                                  {playerInfo.name}
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400 hidden sm:block">
                                  {playerInfo.position} • {playerInfo.team}
                                </div>
                              </div>
                              <div className="text-right ml-2">
                                <div className="font-bold text-sm sm:text-lg text-gray-900 dark:text-gray-100">
                                  {points.toFixed(1)}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                                  pts
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {matchupData.winnerData.bench.length === 0 && (
                          <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                            No bench players
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Loser Bench */}
                    <div className="space-y-2 sm:space-y-4">
                      <div className={`text-center p-2 sm:p-3 rounded-lg ${shouldShowColors ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-700/20'}`}>
                        <h4 className={`font-bold text-sm sm:text-base ${shouldShowColors ? 'text-red-700 dark:text-red-300' : 'text-gray-700 dark:text-gray-300'}`}>
                          {loserTeamName}
                        </h4>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                          {matchupData.loserData.bench.length} players
                        </p>
                      </div>
                      <div className="space-y-1 sm:space-y-2">
                        {matchupData.loserData.bench.map((playerId) => {
                          const playerInfo = getPlayerInfo(playerId);
                          const points = getPlayerPoints(playerId, matchupData.loserData);
                          
                          return (
                            <div key={playerId} className="flex items-center justify-between p-2 sm:p-3">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-xs sm:text-sm text-gray-900 dark:text-gray-100 truncate">
                                  {playerInfo.name}
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400 hidden sm:block">
                                  {playerInfo.position} • {playerInfo.team}
                                </div>
                              </div>
                              <div className="text-right ml-2">
                                <div className="font-bold text-sm sm:text-lg text-gray-900 dark:text-gray-100">
                                  {points.toFixed(1)}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                                  pts
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {matchupData.loserData.bench.length === 0 && (
                          <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                            No bench players
                          </div>
                        )}
                      </div>
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