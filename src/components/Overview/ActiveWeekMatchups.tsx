import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { TeamLogo } from '../Common/TeamLogo';
import { LoadingSpinner } from '../Common/LoadingSpinner';
import { RosterModal } from '../Common/RosterModal';
import { leagueApi } from '../../services/api';
import { getCurrentNFLWeek, shouldShowMatchupColors } from '../../utils/nfl-schedule';
import { isSleeperEra } from '../../utils/era-detection';
import { getLeagueId } from '../../config/constants';
import type { LeagueTier, WeekMatchupsResponse } from '../../types';
import { useTeamProfileModal } from '../../contexts/TeamProfileModalContext';

interface LeagueMatchupsData {
  league: LeagueTier;
  data: WeekMatchupsResponse | null;
  isLoading: boolean;
  error?: string;
}

export const ActiveWeekMatchups = () => {
  const [matchupsData, setMatchupsData] = useState<LeagueMatchupsData[]>([
    { league: 'PREMIER', data: null, isLoading: true },
    { league: 'MASTERS', data: null, isLoading: true },
    { league: 'NATIONAL', data: null, isLoading: true }
  ]);
  
  const { openTeamProfile } = useTeamProfileModal();
  const currentNFLWeek = getCurrentNFLWeek();
  
  const [showUnavailablePopup, setShowUnavailablePopup] = useState<boolean>(false);
  const [rosterModal, setRosterModal] = useState<{
    isOpen: boolean;
    leagueId: string;
    winnerUserId: string;
    loserUserId: string;
    week: number;
    winnerTeamName: string;
    loserTeamName: string;
    winnerAbbreviation: string;
    loserAbbreviation: string;
  }>({
    isOpen: false,
    leagueId: '',
    winnerUserId: '',
    loserUserId: '',
    week: 0,
    winnerTeamName: '',
    loserTeamName: '',
    winnerAbbreviation: '',
    loserAbbreviation: ''
  });

  const colorMap = {
    PREMIER: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-300 dark:border-yellow-700',
      borderHeavy: 'border-yellow-500',
      text: 'text-yellow-800 dark:text-yellow-300',
      iconBg: 'bg-yellow-500',
      highlight: 'bg-yellow-100 dark:bg-yellow-900/30',
      matchupBg: 'bg-yellow-50/50 dark:bg-white/10 hover:bg-yellow-50 dark:hover:bg-white/20'
    },
    MASTERS: {
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      border: 'border-purple-300 dark:border-purple-700',
      borderHeavy: 'border-purple-500',
      text: 'text-purple-800 dark:text-purple-300',
      iconBg: 'bg-purple-500',
      highlight: 'bg-purple-100 dark:bg-purple-900/30',
      matchupBg: 'bg-purple-50/50 dark:bg-white/10 hover:bg-purple-50 dark:hover:bg-white/20'
    },
    NATIONAL: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-300 dark:border-red-700',
      borderHeavy: 'border-red-500',
      text: 'text-red-800 dark:text-red-300',
      iconBg: 'bg-red-500',
      highlight: 'bg-red-100 dark:bg-red-900/30',
      matchupBg: 'bg-red-50/50 dark:bg-white/10 hover:bg-red-50 dark:hover:bg-white/20'
    }
  };

  useEffect(() => {
    const fetchMatchups = async () => {
      if (!currentNFLWeek) {
        // No active NFL week, mark all as loaded with no data
        setMatchupsData(prev => prev.map(league => ({
          ...league,
          isLoading: false,
          error: 'No active NFL week'
        })));
        return;
      }

      const leagues: LeagueTier[] = ['PREMIER', 'MASTERS', 'NATIONAL'];
      
      // Fetch matchups for each league
      for (const league of leagues) {
        try {
          const data = await leagueApi.getWeekMatchups(league, '2025', currentNFLWeek);
          
          setMatchupsData(prev => prev.map(item => 
            item.league === league 
              ? { ...item, data, isLoading: false, error: undefined }
              : item
          ));
        } catch (error) {
          console.error(`Failed to fetch ${league} matchups:`, error);
          setMatchupsData(prev => prev.map(item => 
            item.league === league 
              ? { ...item, isLoading: false, error: `Failed to load ${league} matchups` }
              : item
          ));
        }
      }
    };

    fetchMatchups();
  }, [currentNFLWeek]);

  // Helper function to open roster modal for matchup
  const openMatchupRosterModal = (matchup: any, week: number, league: LeagueTier) => {
    // For ESPN era data, show unavailable message
    if (!isSleeperEra('2025')) {
      setShowUnavailablePopup(true);
      return;
    }
    const leagueId = getLeagueId(league, '2025');
    if (!leagueId) {
      console.warn('League ID not found for selected league/year');
      return;
    }
    setRosterModal({
      isOpen: true,
      leagueId,
      winnerUserId: matchup.winner,
      loserUserId: matchup.loser,
      week,
      winnerTeamName: matchup.winnerInfo?.teamName || 'Unknown Team',
      loserTeamName: matchup.loserInfo?.teamName || 'Unknown Team',
      winnerAbbreviation: matchup.winnerInfo?.abbreviation || '',
      loserAbbreviation: matchup.loserInfo?.abbreviation || ''
    });
  };

  const closeRosterModal = () => {
    setRosterModal(prev => ({ ...prev, isOpen: false }));
  };

  // Helper function to determine font size based on team name length
  const getTeamNameFontClass = (teamName: string) => {
    const length = teamName.length;
    if (length <= 12) {
      return 'text-xs lg:text-sm'; // Normal size for short names
    } else if (length <= 18) {
      return 'text-xs'; // Smaller for medium length names
    } else if (length <= 25) {
      return 'text-xs'; // Same small size but will rely more on truncation
    } else {
      return 'text-xs leading-tight'; // Very long names - tighter line height
    }
  };

  const getLeagueName = (league: LeagueTier) => {
    switch (league) {
      case 'PREMIER': return 'Premier League';
      case 'MASTERS': return 'Masters League';
      case 'NATIONAL': return 'National League';
    }
  };

  // Calculate highest scores for styling
  const getHighestScores = () => {
    const leagueHighScores: Record<LeagueTier, number> = {
      PREMIER: 0,
      MASTERS: 0,
      NATIONAL: 0
    };
    
    matchupsData.forEach(leagueData => {
      if (leagueData.data?.matchups) {
        let leagueHigh = 0;
        
        leagueData.data.matchups.forEach(matchup => {
          const winnerScore = matchup.winnerScore || 0;
          const loserScore = matchup.loserScore || 0;
          
          leagueHigh = Math.max(leagueHigh, winnerScore, loserScore);
        });
        
        leagueHighScores[leagueData.league] = leagueHigh;
      }
    });
    
    return { leagueHighScores };
  };

  const { leagueHighScores } = getHighestScores();

  // Check if matchup is complete (both teams have points > 0)
  const isMatchupComplete = (matchup: any) => {
    return matchup.winnerScore > 0 && matchup.loserScore > 0;
  };

  // Check if we should show winner/loser color coding based on NFL schedule
  const shouldShowColors = (matchup: any, week: number) => {
    // First check if matchup is complete (has scores)
    const hasScores = isMatchupComplete(matchup);
    // Then check if the NFL week has ended (Tuesday after)
    const weekEnded = shouldShowMatchupColors('2025', week);
    // Show colors only if both conditions are met
    return hasScores && weekEnded;
  };

  // Helper function to get score styling for league high scores
  const getScoreDisplay = (score: number, league: LeagueTier, isWinner?: boolean, showColors?: boolean) => {
    const isLeagueHigh = score === leagueHighScores[league] && score > 0;
    
    let classes = 'text-xs font-mono font-bold text-gray-800 dark:text-gray-200';
    let bgClasses = '';
    
    if (isLeagueHigh) {
      classes = 'text-xs font-mono font-bold text-yellow-600 dark:text-yellow-400';
      bgClasses = 'bg-yellow-50 dark:bg-yellow-900/20 py-2 px-2 rounded-full';
    } else if (isWinner && showColors) {
      classes = 'text-xs font-mono font-bold text-green-700 dark:text-green-300';
    }
    
    return { classes, bgClasses };
  };

  if (!currentNFLWeek) {
    return (
      <div className="card">
        <h1 className="py-4 text-3xl font-bold text-gray-900 dark:text-gray-100">
          Active Week Matchups
        </h1>
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500 dark:text-gray-400">
            No active NFL week right now
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="py-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Week {currentNFLWeek} Matchups
        </h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {matchupsData.map((leagueData) => {
          const colors = colorMap[leagueData.league];
          
          return (
            <div
              key={leagueData.league}
              className={`champion-highlight  py-4 lg:py-6 px-2 lg:px-3 relative overflow-hidden border-l4 ${colors.highlight}`}
            >
              <div className="mb-3 lg:mb-4">
                <span className={`text-base lg:text-lg font-black ${colors.text} tracking-wide`}>
                  {getLeagueName(leagueData.league)}
                </span>
              </div>

              {leagueData.isLoading && (
                <div className="flex flex-col items-center justify-center py-6 lg:py-8">
                  <LoadingSpinner size="sm" />
                  <span className="mt-2 text-xs lg:text-sm text-gray-500 dark:text-gray-400">Loading...</span>
                </div>
              )}

              {leagueData.error && (
                <div className="py-3 lg:py-4">
                  <div className="text-center text-xs lg:text-sm text-red-500 dark:text-red-400">
                    Failed to load
                  </div>
                </div>
              )}

              {leagueData.data && leagueData.data.matchups && (
                <div className="space-y-2 lg:space-y-3">
                  {leagueData.data.matchups.map((matchup, index) => {
                    const showColors = shouldShowColors(matchup, currentNFLWeek);
                    return (
                    <div
                      key={index}
                      className={`${colors.matchupBg}  py-2 lg:py-3 px-2 transition-colors cursor-pointer`}
                      onClick={() => openMatchupRosterModal(matchup, currentNFLWeek, leagueData.league)}
                    >
                      {/* Compact Layout for Horizontal Display */}
                      <div className="space-y-1.5">
                        {/* Winner */}
                        <div className={`flex items-center justify-between ${showColors ? 'bg-green-50 dark:bg-green-900/20 rounded-full' : ''}`}>
                          <div className="flex items-center space-x-1.5">
                            <TeamLogo
                              teamName={matchup.winnerInfo?.teamName || 'Unknown Team'}
                              abbreviation={matchup.winnerInfo?.abbreviation}
                              size="sm"
                              clickable
                              onClick={() => {
                                if (matchup.winner && matchup.winnerInfo?.teamName) {
                                  openTeamProfile(matchup.winner, matchup.winnerInfo.teamName);
                                }
                              }}
                            />
                            <div className="min-w-0 flex-1">
                              <div className={`font-medium ${getTeamNameFontClass(matchup.winnerInfo?.teamName || 'Unknown Team')} ${showColors ? 'text-green-700 dark:text-green-300' : 'text-gray-900 dark:text-gray-100'} truncate`}>
                                {matchup.winnerInfo?.teamName || 'Unknown Team'}
                              </div>
                              {matchup.winnerRecord && (
                                <div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono hidden lg:block">
                                  ({matchup.winnerRecord})
                                </div>
                              )}
                            </div>
                          </div>
                          <div className={(() => {
                            const { bgClasses } = getScoreDisplay(matchup.winnerScore || 0, leagueData.league, true, showColors);
                            return (bgClasses || '') + ' px-2';
                          })()}>
                            <div className={(() => {
                              const { classes } = getScoreDisplay(matchup.winnerScore || 0, leagueData.league, true, showColors);
                              return classes;
                            })()}>
                              {matchup.winnerScore?.toFixed(2)}
                            </div>
                          </div>
                        </div>
                        
                        {/* Loser */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1.5">
                            <TeamLogo
                              teamName={matchup.loserInfo?.teamName || 'Unknown Team'}
                              abbreviation={matchup.loserInfo?.abbreviation}
                              size="sm"
                              clickable
                              onClick={() => {
                                if (matchup.loser && matchup.loserInfo?.teamName) {
                                  openTeamProfile(matchup.loser, matchup.loserInfo.teamName);
                                }
                              }}
                            />
                            <div className="min-w-0 flex-1">
                              <div className={`font-medium ${getTeamNameFontClass(matchup.loserInfo?.teamName || 'Unknown Team')} text-gray-900 dark:text-gray-100 truncate`}>
                                {matchup.loserInfo?.teamName || 'Unknown Team'}
                              </div>
                              {matchup.loserRecord && (
                                <div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono hidden lg:block">
                                  ({matchup.loserRecord})
                                </div>
                              )}
                            </div>
                          </div>
                          <div className={(() => {
                            const { bgClasses } = getScoreDisplay(matchup.loserScore || 0, leagueData.league, false, showColors);
                            return (bgClasses || '') + ' px-2';
                          })()}>
                            <div className={(() => {
                              const { classes } = getScoreDisplay(matchup.loserScore || 0, leagueData.league, false, showColors);
                              return classes;
                            })()}>
                              {matchup.loserScore?.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}

              {leagueData.data && (!leagueData.data.matchups || leagueData.data.matchups.length === 0) && (
                <div className="text-center py-3 lg:py-4">
                  <p className={`${colors.text} opacity-70 text-xs lg:text-sm`}>
                    No matchups for week {currentNFLWeek}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Roster Modal */}
      <RosterModal
        isOpen={rosterModal.isOpen}
        onClose={closeRosterModal}
        leagueId={rosterModal.leagueId}
        winnerUserId={rosterModal.winnerUserId}
        loserUserId={rosterModal.loserUserId}
        week={rosterModal.week}
        year="2025"
        winnerTeamName={rosterModal.winnerTeamName}
        loserTeamName={rosterModal.loserTeamName}
        winnerAbbreviation={rosterModal.winnerAbbreviation}
        loserAbbreviation={rosterModal.loserAbbreviation}
      />
      
      {/* Unavailable Popup */}
      {showUnavailablePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-sm mx-4">
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
              Feature Unavailable
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Roster details are only available for Sleeper era seasons (2022+).
            </p>
            <button
              onClick={() => setShowUnavailablePopup(false)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};