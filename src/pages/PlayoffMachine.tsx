import { useState, useEffect } from 'react';
import { useUrlParams } from '../hooks/useUrlParams';
import { useLeagueStandings } from '../hooks/useLeagues';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import { ErrorMessage } from '../components/Common/ErrorMessage';
import { CompactStandingsTable } from '../components/League/CompactStandingsTable';
import { getLeagueName } from '../constants/leagues';
import { getCurrentNFLWeek, isNFLWeekComplete } from '../utils/nfl-schedule';
import { isActiveYear } from '../config/constants';
import type { LeagueTier, EnhancedLeagueSeasonData } from '../types';

const CURRENT_YEAR = '2025';

export const PlayoffMachine = () => {
  const { getParam, updateParams } = useUrlParams();
  const [selectedLeague, setSelectedLeague] = useState<LeagueTier>(
    (getParam('league', 'PREMIER') as LeagueTier) || 'PREMIER'
  );

  // Fetch league data
  const { data: leagueData, isLoading, error } = useLeagueStandings(selectedLeague, CURRENT_YEAR);

  const [matchupPredictions, setMatchupPredictions] = useState<Record<string, string>>({});
  const [simulatedStandings, setSimulatedStandings] = useState<EnhancedLeagueSeasonData | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  const currentWeek = getCurrentNFLWeek();
  const isCurrentSeason = isActiveYear(CURRENT_YEAR);

  // Calculate remaining weeks (only weeks that haven't been completed yet)
  const matchupsByWeek = leagueData ? ((leagueData as any).matchupsByWeek || {}) : {};
  const remainingWeeks = leagueData && currentWeek
    ? Object.keys(matchupsByWeek)
        .map(Number)
        .filter(week => week <= 14 && !isNFLWeekComplete(week)) // Only include incomplete weeks
        .sort((a, b) => a - b)
    : [];

  useEffect(() => {
    updateParams({ league: selectedLeague });
  }, [selectedLeague, updateParams]);

  useEffect(() => {
    if (leagueData) {
      setSimulatedStandings(leagueData);
    }
  }, [leagueData]);

  // Set initial selected week
  useEffect(() => {
    if (remainingWeeks.length > 0 && selectedWeek === null) {
      setSelectedWeek(remainingWeeks[0]);
    }
  }, [remainingWeeks.length, selectedWeek]);

  // Recalculate standings based on predictions
  useEffect(() => {
    if (!leagueData) return;

    // Clone the current standings
    const updatedStandings = leagueData.standings.map(s => ({ ...s }));

    // Deep clone matchupsByWeek to include predicted outcomes
    const updatedMatchupsByWeek: Record<number, any[]> = {};

    // First, copy all existing matchups
    Object.keys(matchupsByWeek).forEach(weekStr => {
      const week = parseInt(weekStr);
      updatedMatchupsByWeek[week] = [...matchupsByWeek[week]];
    });

    // Apply predictions to update win/loss records AND add predicted matchups
    Object.entries(matchupPredictions).forEach(([key, winnerId]) => {
      const [weekStr, idxStr] = key.split('-');
      const week = parseInt(weekStr);
      const idx = parseInt(idxStr);

      const matchup = matchupsByWeek[week]?.[idx];
      if (!matchup) return;

      const loserId = matchup.winner === winnerId ? matchup.loser : matchup.winner;

      // Find winner and loser in standings
      const winnerStanding = updatedStandings.find(s => s.userId === winnerId);
      const loserStanding = updatedStandings.find(s => s.userId === loserId);

      if (winnerStanding && loserStanding) {
        // Add a win to the winner
        winnerStanding.wins += 1;
        // Add a loss to the loser
        loserStanding.losses += 1;

        // Create a new matchup entry with the predicted outcome
        // Use a COMPLETED week number to ensure it's counted in H2H calculations
        // We'll add it to a past completed week (e.g., week 1) so it gets counted
        const predictedMatchup = {
          winner: winnerId,
          loser: loserId,
          winnerScore: 100, // Placeholder score
          loserScore: 50,
          winnerInfo: winnerStanding.userInfo,
          loserInfo: loserStanding.userInfo
        };

        // Add to week 1 (which is always completed) so it gets counted in H2H
        if (!updatedMatchupsByWeek[1]) {
          updatedMatchupsByWeek[1] = [];
        }
        updatedMatchupsByWeek[1].push(predictedMatchup);
      }
    });

    // Update simulated standings with updated matchups for tiebreaker calculation
    setSimulatedStandings({
      ...leagueData,
      standings: updatedStandings,
      matchupsByWeek: updatedMatchupsByWeek
    } as any);
  }, [matchupPredictions, leagueData, matchupsByWeek]);

  if (!isCurrentSeason) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="card">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">Playoff Machine</h1>
          <p className="text-gray-600 dark:text-gray-300">
            The playoff machine is only available for the current season.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="card">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">Playoff Machine</h1>
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorMessage error={error} />;
  }

  if (!leagueData || !currentWeek) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="card">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">Playoff Machine</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Unable to load playoff machine data.
          </p>
        </div>
      </div>
    );
  }

  // Create a map of userId to team info for quick lookups
  const userInfoMap = new Map<string, any>();
  if (leagueData) {
    leagueData.standings.forEach(standing => {
      userInfoMap.set(standing.userId, standing.userInfo);
    });
  }

  const getLeagueColors = (league: LeagueTier) => {
    const colorMap = {
      PREMIER: {
        bg: 'bg-yellow-600',
        hover: 'hover:bg-yellow-700',
        text: 'text-white'
      },
      MASTERS: {
        bg: 'bg-purple-600',
        hover: 'hover:bg-purple-700',
        text: 'text-white'
      },
      NATIONAL: {
        bg: 'bg-red-600',
        hover: 'hover:bg-red-700',
        text: 'text-white'
      }
    };
    return colorMap[league];
  };

  const handleMatchupSelect = (weekMatchupKey: string, winnerId: string) => {
    setMatchupPredictions(prev => {
      // If clicking the already selected winner, unselect it
      if (prev[weekMatchupKey] === winnerId) {
        const newPredictions = { ...prev };
        delete newPredictions[weekMatchupKey];
        return newPredictions;
      }
      // Otherwise, set the new winner
      return {
        ...prev,
        [weekMatchupKey]: winnerId
      };
    });
  };

  const handleClearAll = () => {
    setMatchupPredictions({});
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Playoff Machine</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Simulate remaining matchups to see playoff scenarios
        </p>
      </div>

      {/* League Selector */}
      <div className="flex flex-wrap items-center gap-2">
        {(['PREMIER', 'MASTERS', 'NATIONAL'] as LeagueTier[]).map(league => {
          const colors = getLeagueColors(league);
          return (
            <button
              key={league}
              onClick={() => setSelectedLeague(league)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                selectedLeague === league
                  ? `${colors.bg} ${colors.text} ${colors.hover}`
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {getLeagueName(league)}
            </button>
          );
        })}
      </div>

      {/* Simulated Standings */}
      {simulatedStandings && (
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Projected Standings
          </h2>
          <CompactStandingsTable
            standings={simulatedStandings.standings}
            league={selectedLeague}
            year={CURRENT_YEAR}
            matchupsByWeek={(simulatedStandings as any).matchupsByWeek || matchupsByWeek}
            divisionNames={simulatedStandings.divisionNames}
          />
        </div>
      )}

      {/* Remaining Matchups */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Remaining Regular Season Matchups
          </h2>
          {Object.keys(matchupPredictions).length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
            >
              Clear All
            </button>
          )}
        </div>

        {remainingWeeks.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-300">
            No remaining regular season matchups.
          </p>
        ) : (
          <div className="space-y-4">
            {/* Week Tabs */}
            <div className="flex flex-wrap gap-2">
              {remainingWeeks.map(week => (
                <button
                  key={week}
                  onClick={() => setSelectedWeek(week)}
                  className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                    selectedWeek === week
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Week {week}
                </button>
              ))}
            </div>

            {/* Matchups for Selected Week */}
            {selectedWeek && matchupsByWeek[selectedWeek] && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {matchupsByWeek[selectedWeek].map((matchup: any, idx: number) => {
                  const matchupKey = `${selectedWeek}-${idx}`;
                  const selectedWinner = matchupPredictions[matchupKey];

                  // Skip if matchup doesn't have proper data
                  if (!matchup || !matchup.winner || !matchup.loser) {
                    return null;
                  }

                  // Get team names from the standings data
                  const winnerInfo = matchup.winnerInfo || userInfoMap.get(matchup.winner);
                  const loserInfo = matchup.loserInfo || userInfoMap.get(matchup.loser);

                  const team1Name = winnerInfo?.teamName || 'Team 1';
                  const team2Name = loserInfo?.teamName || 'Team 2';

                  return (
                    <div
                      key={matchupKey}
                      className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 p-3 rounded border-l-4 border-gray-300 dark:border-gray-600"
                    >
                      <div className="flex items-center gap-2 sm:gap-3">
                        {/* Team 1 Button */}
                        <button
                          onClick={() => handleMatchupSelect(matchupKey, matchup.winner)}
                          className={`w-[calc(50%-1.5rem)] sm:flex-1 px-2 sm:px-4 py-3 text-xs sm:text-sm font-bold rounded transition-all ${
                            selectedWinner === matchup.winner
                              ? 'bg-green-500 text-white shadow-lg scale-105'
                              : selectedWinner === matchup.loser
                              ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 opacity-60'
                              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                          }`}
                        >
                          <div className="text-left truncate">{team1Name}</div>
                        </button>

                        <div className="flex flex-col items-center flex-shrink-0 w-6">
                          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">vs</span>
                        </div>

                        {/* Team 2 Button */}
                        <button
                          onClick={() => handleMatchupSelect(matchupKey, matchup.loser)}
                          className={`w-[calc(50%-1.5rem)] sm:flex-1 px-2 sm:px-4 py-3 text-xs sm:text-sm font-bold rounded transition-all ${
                            selectedWinner === matchup.loser
                              ? 'bg-green-500 text-white shadow-lg scale-105'
                              : selectedWinner === matchup.winner
                              ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 opacity-60'
                              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                          }`}
                        >
                          <div className="text-right truncate">{team2Name}</div>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
