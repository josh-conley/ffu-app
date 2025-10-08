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
  const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '');

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

        console.log('RosterModal debugging:', {
          winnerUserId,
          loserUserId,
          availableRosters: rosters.map(r => ({ owner_id: r.owner_id, roster_id: r.roster_id })),
          availableUsers: users.map(u => ({ user_id: u.user_id, display_name: u.display_name }))
        });

        // Find rosters for both teams
        const winnerRoster = rosters.find(r => r.owner_id === winnerUserId);
        const loserRoster = rosters.find(r => r.owner_id === loserUserId);

        console.log('Found rosters:', { winnerRoster: !!winnerRoster, loserRoster: !!loserRoster });

        if (!winnerRoster || !loserRoster) {
          console.error('Missing rosters. Winner found:', !!winnerRoster, 'Loser found:', !!loserRoster);
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
        name: '--',
        position: 'N/A',
        team: 'N/A'
      };
    }

    return {
      name: `${player.first_name || ''} ${player.last_name || ''}`.trim() || '--',
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

  const formatScore = (score: number) => {
    const rounded = Math.round(score * 100) / 100;
    return rounded % 0.1 === 0 ? rounded.toFixed(1) : rounded.toFixed(2);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
          onClick={onClose}
        />

        <div className="relative inline-block align-bottom bg-white dark:bg-[rgb(20,20,22)] text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>

          <div className="bg-white dark:bg-[rgb(20,20,22)] px-4 sm:px-6 pt-4 sm:pt-6 pb-4 sm:pb-6 max-h-[85vh] sm:max-h-[80vh] overflow-y-auto">
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

                  {/* Team Headers - Compact Layout */}
                  <div className="flex items-center justify-center gap-8 mb-3">
                    <div className={`text-center p-2 w-32 ${shouldShowColors ? 'bg-green-50 dark:bg-green-900/20' : ''}`}>
                      <div className="flex flex-col items-center h-32 justify-between">
                        <TeamLogo
                          teamName={winnerTeamName}
                          abbreviation={getUserInfoBySleeperId(winnerUserId)?.abbreviation || winnerAbbreviation}
                          size="md"
                        />
                        <div className="flex-1 flex items-center justify-center">
                          <h4 className={`font-bold text-xs sm:text-sm leading-tight text-center ${shouldShowColors ? 'text-green-700 dark:text-green-300' : 'text-gray-900 dark:text-gray-100'}`}>
                            {winnerTeamName}
                          </h4>
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                          {formatScore(matchupData.winnerData.totalPoints)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-center h-32 justify-between w-20">
                      <div></div>
                      <div className="flex-1 flex items-center justify-center">
                        <h4 className="font-bold text-gray-900 dark:text-gray-100 text-sm">VS</h4>
                      </div>
                      <h4 className="font-bold text-gray-900 dark:text-gray-100 text-xs sm:text-sm">Position</h4>
                    </div>
                    
                    <div className={`text-center p-2 w-32 ${shouldShowColors ? 'bg-red-50 dark:bg-red-900/20' : ''}`}>
                      <div className="flex flex-col items-center h-32 justify-between">
                        <TeamLogo
                          teamName={loserTeamName}
                          abbreviation={getUserInfoBySleeperId(loserUserId)?.abbreviation || loserAbbreviation}
                          size="md"
                        />
                        <div className="flex-1 flex items-center justify-center">
                          <h4 className={`font-bold text-xs sm:text-sm leading-tight text-center ${shouldShowColors ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-gray-100'}`}>
                            {loserTeamName}
                          </h4>
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                          {formatScore(matchupData.loserData.totalPoints)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Lineup Positions */}
                  <div className="space-y-1">
                    {['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'FLEX', 'DEF'].map((position, index) => {
                      const winnerPlayer = matchupData.winnerData.starters[index];
                      const loserPlayer = matchupData.loserData.starters[index];
                      
                      const winnerPlayerInfo = winnerPlayer ? getPlayerInfo(winnerPlayer) : null;
                      const loserPlayerInfo = loserPlayer ? getPlayerInfo(loserPlayer) : null;
                      
                      const winnerPoints = winnerPlayer ? getPlayerPoints(winnerPlayer, matchupData.winnerData) : 0;
                      const loserPoints = loserPlayer ? getPlayerPoints(loserPlayer, matchupData.loserData) : 0;

                      return (
                        <div key={index} className="flex items-center justify-center gap-2 p-1 sm:p-2 bg-white dark:bg-[rgb(20,20,22)]">
                          {/* Winner Player Info + Score */}
                          <div className="flex items-center gap-2 flex-1 justify-end">
                            <div className="text-right min-w-0 flex-1">
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
                            <div className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 w-8 sm:w-10 text-right">
                              {formatScore(winnerPoints)}
                            </div>
                          </div>

                          {/* Position - Fixed width, centered */}
                          <div className={`font-bold py-0.5 sm:py-1 rounded text-xs text-center ${getPositionBadgeClass(position)}`} style={{width: '50px'}}>
                            {position}
                          </div>

                          {/* Loser Score + Player Info */}
                          <div className="flex items-center gap-2 flex-1 justify-start">
                            <div className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 w-8 sm:w-10 text-left">
                              {formatScore(loserPoints)}
                            </div>
                            <div className="text-left min-w-0 flex-1">
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
                      <div className="space-y-1 sm:space-y-2">
                        {matchupData.winnerData.bench.map((playerId) => {
                          const playerInfo = getPlayerInfo(playerId);
                          const points = getPlayerPoints(playerId, matchupData.winnerData);
                          
                          return (
                            <div key={playerId} className="flex items-center p-2 sm:p-3">
                              <div className="flex items-center justify-between w-full">
                                <div className="text-right flex-1 mr-2">
                                  <div className="font-medium text-xs sm:text-sm text-gray-900 dark:text-gray-100 leading-tight">
                                    {playerInfo.name}
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400 hidden sm:block">
                                    {playerInfo.position} • {playerInfo.team}
                                  </div>
                                </div>
                                <div className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 w-10 sm:w-12 text-right">
                                  {formatScore(points)}
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
                      <div className="space-y-1 sm:space-y-2">
                        {matchupData.loserData.bench.map((playerId) => {
                          const playerInfo = getPlayerInfo(playerId);
                          const points = getPlayerPoints(playerId, matchupData.loserData);
                          
                          return (
                            <div key={playerId} className="flex items-center p-2 sm:p-3">
                              <div className="flex items-center justify-between w-full">
                                <div className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 w-10 sm:w-12 text-left">
                                  {formatScore(points)}
                                </div>
                                <div className="text-left flex-1 ml-2">
                                  <div className="font-medium text-xs sm:text-sm text-gray-900 dark:text-gray-100 leading-tight">
                                    {playerInfo.name}
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400 hidden sm:block">
                                    {playerInfo.position} • {playerInfo.team}
                                  </div>
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